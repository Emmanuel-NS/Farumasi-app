from __future__ import annotations

from app.core.constants import UserRole, ROLE_PERMISSIONS


def has_permission(role: str, permission: str) -> bool:
    """
    Check if a given role has a specific permission.
    Super admin has wildcard access.
    Supports wildcard permissions like 'hospitals:*'.
    """
    perms = ROLE_PERMISSIONS.get(role, set())
    if "*" in perms:
        return True
    if permission in perms:
        return True
    # Check namespace wildcard, e.g. 'hospitals:*' covers 'hospitals:read'
    namespace = permission.split(":")[0]
    return f"{namespace}:*" in perms


def require_roles(*allowed_roles: str) -> list[str]:
    """Return list of allowed roles (helper for FastAPI deps)."""
    return list(allowed_roles)


# ── Common role groups for convenience ────────────────────────────────────────
ADMIN_ROLES = [
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_ADMIN,
    UserRole.FINANCE_ADMIN,
    UserRole.COMPLIANCE_ADMIN,
]

PROVIDER_ROLES = [
    UserRole.PHARMACY_ADMIN,
    UserRole.PARTNER_COMPANY_ADMIN,
]

CLINICAL_ROLES = [
    UserRole.DOCTOR,
    UserRole.PHARMACIST,
    UserRole.HOSPITAL_ADMIN,
]
