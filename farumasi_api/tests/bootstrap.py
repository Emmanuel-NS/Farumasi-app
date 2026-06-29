"""Test user helpers — bypass OTP for staff roles; full API path for patient/rider."""
from __future__ import annotations

import uuid

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole, UserStatus
from app.core.security import hash_password
from app.models.email_verification_challenge import EmailVerificationChallenge
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.email_verification_service import PURPOSE_REGISTRATION

TEST_OTP = "123456"
_DEFAULT_PASSWORD = "Pass@12345"
_PUBLIC_REGISTER_ROLES = frozenset({UserRole.PATIENT, UserRole.RIDER})


def _test_db(client: AsyncClient) -> AsyncSession:
    db = getattr(client, "_test_db", None)
    if db is None:
        raise RuntimeError("Test client missing _test_db — check tests/conftest.py")
    return db


async def register_test_user(
    client: AsyncClient,
    db: AsyncSession,
    role: str,
    *,
    email: str | None = None,
    password: str = _DEFAULT_PASSWORD,
    full_name: str | None = None,
) -> dict:
    """Create an active user in the DB and return login tokens."""
    email = (email or f"{role}_{uuid.uuid4().hex[:12]}@farumasi.com").lower()
    full_name = full_name or f"Test {role.replace('_', ' ').title()}"
    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        status=UserStatus.ACTIVE,
        email_verified=True,
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


async def bootstrap_test_user(
    client: AsyncClient,
    db: AsyncSession,
    role: str,
    *,
    password: str = _DEFAULT_PASSWORD,
) -> dict:
    return await register_test_user(client, db, role, password=password)


async def register_for_test(
    client: AsyncClient,
    db: AsyncSession,
    *,
    role: str,
    email: str | None = None,
    password: str = _DEFAULT_PASSWORD,
    full_name: str | None = None,
) -> dict:
    """Register a user for integration tests (API path for patient/rider, DB for staff)."""
    if role in _PUBLIC_REGISTER_ROLES:
        return await register_via_api(
            client,
            db,
            role=role,
            email=email,
            password=password,
            full_name=full_name or f"Test {role.replace('_', ' ').title()}",
        )
    return await register_test_user(
        client,
        db,
        role,
        email=email,
        password=password,
        full_name=full_name,
    )


async def register_via_api(
    client: AsyncClient,
    db: AsyncSession,
    *,
    role: str = UserRole.PATIENT,
    email: str | None = None,
    password: str = _DEFAULT_PASSWORD,
    full_name: str = "API Test User",
    otp: str = TEST_OTP,
) -> dict:
    """Register patient/rider through public API + pinned OTP verification."""
    email = (email or f"{role}_{uuid.uuid4().hex[:12]}@farumasi.com").lower()
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "full_name": full_name,
            "role": role,
        },
    )
    assert resp.status_code == 201, resp.text

    await _pin_registration_otp(db, email=email, role=role, code=otp)

    verify = await client.post(
        "/api/v1/auth/verify-registration",
        json={"email": email, "code": otp, "role": role},
    )
    assert verify.status_code == 200, verify.text
    data = verify.json()
    data["email"] = email
    return data


async def _pin_registration_otp(
    db: AsyncSession,
    *,
    email: str,
    role: str,
    code: str,
) -> None:
    user = await UserRepository(db).get_by_email_and_role(email.lower(), role)
    assert user is not None, f"No user for {email} ({role})"
    result = await db.execute(
        select(EmailVerificationChallenge)
        .where(
            EmailVerificationChallenge.user_id == user.id,
            EmailVerificationChallenge.purpose == PURPOSE_REGISTRATION,
        )
        .order_by(EmailVerificationChallenge.created_at.desc())
    )
    challenge = result.scalars().first()
    assert challenge is not None, "No registration OTP challenge found"
    challenge.code_hash = hash_password(code)
    await db.flush()


async def mark_order_paid(db: AsyncSession, order_id: str) -> None:
    from datetime import datetime, timedelta, timezone

    from app.core.constants import PaymentStatus
    from app.models.order import Order

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one()
    order.payment_status = PaymentStatus.PAID
    order.amount_paid_snapshot = float(order.total_amount)
    order.partner_response_due_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.flush()


async def mark_pharmacy_verified(db: AsyncSession, pharmacy_id: str) -> None:
    from app.core.constants import EntityStatus, VerificationStatus
    from app.models.pharmacy import Pharmacy

    result = await db.execute(select(Pharmacy).where(Pharmacy.id == pharmacy_id))
    pharmacy = result.scalar_one()
    pharmacy.verification_status = VerificationStatus.VERIFIED
    pharmacy.onboarding_completed = True
    pharmacy.status = EntityStatus.ACTIVE
    await db.flush()


async def mark_partner_verified(db: AsyncSession, partner_id: str) -> None:
    from app.core.constants import EntityStatus, VerificationStatus
    from app.models.partner import PartnerCompany

    result = await db.execute(select(PartnerCompany).where(PartnerCompany.id == partner_id))
    partner = result.scalar_one()
    partner.verification_status = VerificationStatus.VERIFIED
    partner.onboarding_completed = True
    partner.status = EntityStatus.ACTIVE
    await db.flush()


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
