"""Create active test users directly in the DB (bypasses email verification)."""
from __future__ import annotations

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import EntityStatus, UserRole, UserStatus, VerificationStatus
from app.core.security import hash_password
from app.models.user import User


async def bootstrap_test_user(
    client: AsyncClient,
    db: AsyncSession,
    role: str,
    *,
    password: str = "Pass@12345",
) -> dict:
    email = f"{role}_{uuid.uuid4().hex[:12]}@farumasi.com"
    user = User(
        full_name=f"Test {role.replace('_', ' ').title()}",
        email=email,
        password_hash=hash_password(password),
        role=role,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    await db.flush()
    await _ensure_profile(db, user)
    await db.flush()

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password, "role": role},
    )
    assert login.status_code == 200, login.text
    data = login.json()
    data["email"] = email
    return data


async def _ensure_profile(db: AsyncSession, user: User) -> None:
    if user.role == UserRole.PATIENT:
        from app.models.patient import PatientProfile

        db.add(PatientProfile(user_id=user.id))
    elif user.role == UserRole.DOCTOR:
        from app.models.doctor import DoctorProfile

        db.add(DoctorProfile(user_id=user.id))
    elif user.role == UserRole.PHARMACIST:
        from app.models.pharmacist import PharmacistProfile

        db.add(PharmacistProfile(user_id=user.id))
    elif user.role == UserRole.RIDER:
        from app.models.rider import RiderProfile

        db.add(RiderProfile(user_id=user.id))
    elif user.role == UserRole.PARTNER_COMPANY_ADMIN:
        from app.models.partner import PartnerCompany

        db.add(
            PartnerCompany(
                owner_user_id=user.id,
                name=f"{user.full_name}'s Company",
                email=user.email,
                status=EntityStatus.ACTIVE,
                verification_status=VerificationStatus.VERIFIED,
                commission_rate_percent=10.0,
            )
        )
    elif user.role == UserRole.PHARMACY_ADMIN:
        from app.models.pharmacy import Pharmacy

        db.add(
            Pharmacy(
                owner_user_id=user.id,
                name=f"{user.full_name}'s Pharmacy",
                email=user.email,
                status=EntityStatus.ACTIVE,
                verification_status=VerificationStatus.VERIFIED,
                is_open=True,
            )
        )
