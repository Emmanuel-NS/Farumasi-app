from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError
from app.core.security import hash_password, verify_password
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
)
from app.schemas.user import ChangePasswordRequest
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.register(data, ip_address=request.client.host if request.client else None)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.login(data, ip_address=request.client.host if request.client else None)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.refresh(data.refresh_token)


@router.post("/change-password", status_code=200)
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise AuthenticationError("Current password is incorrect")
    if data.current_password == data.new_password:
        raise AuthenticationError("New password must be different from the current password")

    current_user.password_hash = hash_password(data.new_password)
    current_user.must_change_password = False
    current_user.session_invalidated_at = datetime.now(timezone.utc)
    await db.flush()
    await AuditService(db).log(
        actor_user_id=current_user.id,
        action="user.password.change",
        entity_type="User",
        entity_id=current_user.id,
    )
    return {"status": "ok", "message": "Password updated. Please sign in again on your other devices."}


@router.post("/logout-everywhere", status_code=200)
async def logout_everywhere(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.session_invalidated_at = datetime.now(timezone.utc)
    await db.flush()
    await AuditService(db).log(
        actor_user_id=current_user.id,
        action="user.sessions.invalidate_all",
        entity_type="User",
        entity_id=current_user.id,
    )
    return {"status": "ok", "message": "All other sessions have been signed out."}

