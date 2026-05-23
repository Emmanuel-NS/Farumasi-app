from __future__ import annotations

from typing import List

from fastapi import Depends, HTTPException, status

from app.core.constants import UserRole
from app.core.exceptions import AuthorizationError
from app.dependencies.auth import get_current_user
from app.models.user import User


def require_roles(*roles: str):
    """
    FastAPI dependency factory. Returns a dependency that verifies the current
    user has one of the specified roles.

    Usage:
        @router.get("/...", dependencies=[Depends(require_roles(UserRole.SUPER_ADMIN))])
    or:
        current_user: User = Depends(require_roles(UserRole.PHARMACIST, UserRole.SUPER_ADMIN))
    """
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if UserRole.SUPER_ADMIN in roles:
            # super_admin always allowed
            if current_user.role == UserRole.SUPER_ADMIN:
                return current_user

        if current_user.role not in roles:
            raise AuthorizationError(
                f"This action requires one of: {', '.join(roles)}"
            )
        return current_user

    return checker


def require_any_admin():
    """Allow any admin role."""
    return require_roles(
        UserRole.SUPER_ADMIN,
        UserRole.OPERATIONS_ADMIN,
        UserRole.FINANCE_ADMIN,
        UserRole.COMPLIANCE_ADMIN,
    )


def require_super_admin():
    return require_roles(UserRole.SUPER_ADMIN)


def require_finance():
    return require_roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN)


def require_compliance():
    return require_roles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_ADMIN)


def require_audit_reader():
    """Roles allowed to inspect audit logs."""
    return require_roles(
        UserRole.SUPER_ADMIN,
        UserRole.OPERATIONS_ADMIN,
        UserRole.COMPLIANCE_ADMIN,
        UserRole.FINANCE_ADMIN,
    )


def require_pharmacist():
    return require_roles(UserRole.SUPER_ADMIN, UserRole.PHARMACIST, UserRole.COMPLIANCE_ADMIN)


def require_provider():
    """Pharmacy admin or partner company admin."""
    return require_roles(
        UserRole.SUPER_ADMIN,
        UserRole.PHARMACY_ADMIN,
        UserRole.PARTNER_COMPANY_ADMIN,
        UserRole.OPERATIONS_ADMIN,
    )


def require_rider():
    return require_roles(UserRole.RIDER, UserRole.SUPER_ADMIN, UserRole.OPERATIONS_ADMIN)


def require_patient():
    return require_roles(UserRole.PATIENT, UserRole.SUPER_ADMIN)
