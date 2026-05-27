from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, AccountSuspendedError, AccountRestrictedError
from app.core.security import verify_access_token
from app.core.constants import UserStatus
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise AuthenticationError("Authentication credentials not provided")

    payload = verify_access_token(credentials.credentials)
    if not payload:
        raise AuthenticationError("Invalid or expired token")

    user_id: str = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Token missing subject")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise AuthenticationError("User not found")

    if user.status == UserStatus.SUSPENDED:
        raise AccountSuspendedError()

    if user.status == UserStatus.RESTRICTED:
        raise AccountRestrictedError()

    if user.status == UserStatus.ARCHIVED:
        raise AuthenticationError("This account has been archived")

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Same as get_current_user but makes intent explicit."""
    return current_user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[str]:
    """Returns user_id if authenticated, None otherwise — for public endpoints."""
    if not credentials:
        return None
    payload = verify_access_token(credentials.credentials)
    return payload.get("sub") if payload else None


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Returns User if a valid token is provided, None otherwise — for public-browseable endpoints."""
    if not credentials:
        return None
    payload = verify_access_token(credentials.credentials)
    if not payload:
        return None
    user_id: str = payload.get("sub", "")
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
