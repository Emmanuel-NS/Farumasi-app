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
    LoginResult,
    RefreshRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyRegistrationRequest,
    ResendRegistrationOtpRequest,
    RegistrationPendingResponse,
    GoogleOAuthRequest,
    TwoFactorCodeRequest,
    TwoFactorDisableRequest,
    TwoFactorLoginVerifyRequest,
    TwoFactorResendLoginRequest,
    TwoFactorStatusOut,
)
from app.schemas.user import ChangePasswordRequest
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService
from app.services.password_reset_service import PasswordResetService
from app.services.two_factor_service import TwoFactorService

router = APIRouter()


@router.post("/register", response_model=RegistrationPendingResponse, status_code=201)
async def register(data: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.register(data, ip_address=request.client.host if request.client else None)


@router.post("/verify-registration", response_model=TokenResponse)
async def verify_registration(data: VerifyRegistrationRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.verify_registration(data.email, data.code, data.role)


@router.post("/resend-registration-otp", response_model=RegistrationPendingResponse)
async def resend_registration_otp(
    data: ResendRegistrationOtpRequest, db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    return await service.resend_registration_otp(data.email, data.role)


@router.post("/login", response_model=LoginResult)
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.login(data, ip_address=request.client.host if request.client else None)


@router.post("/oauth/google", response_model=TokenResponse)
async def google_oauth(data: GoogleOAuthRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.google_oauth(data)


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
    current_user.fcm_token = None
    current_user.fcm_platform = None
    await db.flush()
    await AuditService(db).log(
        actor_user_id=current_user.id,
        action="user.sessions.invalidate_all",
        entity_type="User",
        entity_id=current_user.id,
    )
    return {"status": "ok", "message": "All other sessions have been signed out."}


@router.post("/forgot-password", status_code=200)
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    return await PasswordResetService(db).request_reset(data.email)


@router.post("/reset-password", status_code=200)
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    return await PasswordResetService(db).reset_password(
        data.email, data.code, data.new_password
    )


@router.get("/2fa/status", response_model=TwoFactorStatusOut)
async def two_factor_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TwoFactorService(db).status(current_user)


@router.post("/2fa/send-setup-code", status_code=200)
async def two_factor_send_setup_code(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TwoFactorService(db).send_setup_code(current_user)


@router.post("/2fa/enable", response_model=TwoFactorStatusOut)
async def two_factor_enable(
    data: TwoFactorCodeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TwoFactorService(db).enable(current_user, code=data.code)


@router.post("/2fa/send-disable-code", status_code=200)
async def two_factor_send_disable_code(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TwoFactorService(db).send_disable_code(current_user)


@router.post("/2fa/disable", response_model=TwoFactorStatusOut)
async def two_factor_disable(
    data: TwoFactorDisableRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await TwoFactorService(db).disable(
        current_user,
        password=data.password,
        code=data.code,
    )


@router.post("/2fa/verify-login", response_model=TokenResponse)
async def two_factor_verify_login(
    data: TwoFactorLoginVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    return await TwoFactorService(db).verify_login(
        data.pending_token,
        data.code,
        ip_address=request.client.host if request.client else None,
    )


@router.post("/2fa/resend-login", status_code=200)
async def two_factor_resend_login(
    data: TwoFactorResendLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    return await TwoFactorService(db).resend_login_code(data.pending_token)
