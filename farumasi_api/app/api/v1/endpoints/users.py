from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_super_admin
from app.models.user import User
from app.schemas.user import UserOut, UserUpdate, UserStatusUpdate
from app.schemas.common import PaginatedResponse
from app.services.user_service import UserService

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
async def update_me(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UserService(db).update_user(current_user.id, data, actor=current_user)


@router.get("/{user_id}", response_model=UserOut, dependencies=[Depends(require_super_admin())])
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    return await UserService(db).get_user(user_id)


@router.patch("/{user_id}/status", response_model=UserOut, dependencies=[Depends(require_super_admin())])
async def change_user_status(
    user_id: str,
    data: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await UserService(db).change_status(user_id, data, actor=actor)


@router.get("/", response_model=PaginatedResponse[UserOut], dependencies=[Depends(require_super_admin())])
async def list_users(
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await UserService(db).list_users(role=role, status=status, offset=offset, limit=limit)
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)
