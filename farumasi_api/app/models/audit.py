from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin
from sqlalchemy import DateTime, func
from datetime import datetime

if TYPE_CHECKING:
    from app.models.user import User


class AuditLog(Base, UUIDMixin):
    __tablename__ = "audit_logs"

    actor_user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    old_value: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_value: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False
    )

    actor: Mapped[Optional["User"]] = relationship(
        "User", back_populates="audit_logs", foreign_keys=[actor_user_id]
    )

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} on {self.entity_type}>"
