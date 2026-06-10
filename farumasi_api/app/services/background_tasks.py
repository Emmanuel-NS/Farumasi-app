from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import OrderStatus, PaymentStatus, UserRole
from app.core.database import AsyncSessionLocal
from app.core.platform_defaults import DEFAULT_DELIVERY_CONFIG
from app.models.data_export_job import DataExportJob
from app.models.order import Order
from app.models.patient import Address, PatientProfile
from app.models.prescription import DigitalPrescription
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.email_delivery_service import send_data_export_email
from app.services.notification_service import NotificationService
from app.services.order_service import OrderService
from app.services.platform_settings_service import PlatformSettingsService

logger = logging.getLogger(__name__)

_background_tasks: list[asyncio.Task] = []


async def start_background_tasks() -> None:
    _background_tasks.append(asyncio.create_task(_auto_cancel_loop()))
    _background_tasks.append(asyncio.create_task(_data_export_loop()))


async def stop_background_tasks() -> None:
    for task in _background_tasks:
        task.cancel()
    if _background_tasks:
        await asyncio.gather(*_background_tasks, return_exceptions=True)
    _background_tasks.clear()


async def _auto_cancel_loop() -> None:
    while True:
        try:
            await auto_cancel_unpaid_orders()
        except Exception as exc:  # noqa: BLE001
            logger.exception("auto_cancel_unpaid_orders failed: %s", exc)
        await asyncio.sleep(60)


async def _data_export_loop() -> None:
    while True:
        try:
            await process_pending_data_exports()
        except Exception as exc:  # noqa: BLE001
            logger.exception("process_pending_data_exports failed: %s", exc)
        await asyncio.sleep(120)


async def auto_cancel_unpaid_orders() -> int:
    async with AsyncSessionLocal() as db:
        cfg = await PlatformSettingsService(db).get_delivery_config()
        ttl_minutes = int(cfg.get("unpaid_order_ttl_minutes", 30))
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=ttl_minutes)

        result = await db.execute(
            select(Order).where(
                Order.payment_status.in_([PaymentStatus.UNPAID, PaymentStatus.PENDING, PaymentStatus.FAILED]),
                Order.order_status.in_([
                    OrderStatus.PENDING,
                    OrderStatus.ACCEPTED,
                ]),
                Order.created_at <= cutoff,
            )
        )
        orders = list(result.scalars().all())
        if not orders:
            return 0

        system_user = (
            await db.execute(
                select(User).where(User.role == UserRole.SUPER_ADMIN).limit(1)
            )
        ).scalar_one_or_none()
        if not system_user:
            system_user = (
                await db.execute(select(User).limit(1))
            ).scalar_one_or_none()
        if not system_user:
            logger.warning("auto_cancel_unpaid_orders: no system user found")
            return 0

        svc = OrderService(db)
        cancelled = 0
        for order in orders:
            from app.schemas.order import OrderStatusUpdate

            await svc.update_status(
                order.id,
                OrderStatusUpdate(order_status=OrderStatus.CANCELLED),
                system_user,
            )
            await AuditService(db).log(
                actor_user_id=system_user.id,
                action="order.auto_cancel_unpaid",
                entity_type="Order",
                entity_id=order.id,
                new_value={"ttl_minutes": ttl_minutes},
            )
            cancelled += 1

        await db.commit()
        logger.info("Auto-cancelled %s unpaid orders older than %s minutes", cancelled, ttl_minutes)
        return cancelled


async def process_pending_data_exports() -> int:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(DataExportJob)
            .where(DataExportJob.status == "pending")
            .order_by(DataExportJob.created_at.asc())
            .limit(5)
        )
        jobs = list(result.scalars().all())
        processed = 0
        for job in jobs:
            job.status = "processing"
            await db.flush()
            try:
                payload = await _build_user_export(db, job.user_id)
                export_dir = Path(settings.UPLOAD_DIR) / "exports"
                export_dir.mkdir(parents=True, exist_ok=True)
                filename = f"export_{job.user_id}_{job.id}.json"
                filepath = export_dir / filename
                filepath.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
                job.file_url = f"/uploads/exports/{filename}"
                job.status = "completed"
                job.completed_at = datetime.now(timezone.utc)

                user = await db.get(User, job.user_id)
                if user:
                    send_data_export_email(
                        to_email=user.email,
                        full_name=user.full_name,
                        download_path=job.file_url,
                    )
                    await NotificationService(db).send(
                        user_id=user.id,
                        title="Data export ready",
                        message="Your personal data export is ready. Check your email for the download link.",
                        category="account",
                    )
                processed += 1
            except Exception as exc:  # noqa: BLE001
                job.status = "failed"
                job.error_message = str(exc)[:500]
                logger.exception("Data export job %s failed", job.id)
        await db.commit()
        return processed


async def _build_user_export(db: AsyncSession, user_id: str) -> dict:
    user = await db.get(User, user_id)
    if not user:
        raise ValueError("User not found")

    patient = (
        await db.execute(select(PatientProfile).where(PatientProfile.user_id == user_id))
    ).scalar_one_or_none()

    addresses: list = []
    prescriptions: list = []
    if patient:
        addr_rows = await db.execute(select(Address).where(Address.patient_id == patient.id))
        addresses = [
            {
                "label": a.label,
                "line1": a.line1,
                "district": a.district,
                "city": a.city,
            }
            for a in addr_rows.scalars()
        ]
        rx_rows = await db.execute(
            select(DigitalPrescription).where(DigitalPrescription.patient_id == patient.id)
        )
        prescriptions = [
            {
                "id": rx.id,
                "status": rx.status,
                "type": rx.prescription_type,
                "created_at": rx.created_at.isoformat() if rx.created_at else None,
            }
            for rx in rx_rows.scalars()
        ]

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "preferred_language": getattr(user, "preferred_language", "en"),
        },
        "patient_profile": {
            "date_of_birth": str(patient.date_of_birth) if patient and patient.date_of_birth else None,
            "gender": patient.gender if patient else None,
            "allergies": patient.allergies if patient else None,
        },
        "addresses": addresses,
        "prescriptions_summary": prescriptions,
    }
