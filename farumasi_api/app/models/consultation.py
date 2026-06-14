from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class Consultation(Base, UUIDMixin, TimestampMixin):
    """A consultation session between a patient and a pharmacist."""

    __tablename__ = "consultations"

    patient_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pharmacist_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # open | closed
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False)
    # When true the pharmacist sees the patient masked as "Anonymous Patient".
    is_anonymous: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, server_default="false"
    )

    patient: Mapped["User"] = relationship(
        "User", foreign_keys=[patient_id], back_populates="consultations_as_patient"
    )
    pharmacist: Mapped["User"] = relationship(
        "User", foreign_keys=[pharmacist_id], back_populates="consultations_as_pharmacist"
    )
    messages: Mapped[List["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="consultation", order_by="ChatMessage.created_at"
    )

    def __repr__(self) -> str:
        return f"<Consultation {self.id} patient={self.patient_id}>"


class ChatMessage(Base, UUIDMixin, TimestampMixin):
    """A single message inside a consultation."""

    __tablename__ = "chat_messages"

    consultation_id: Mapped[str] = mapped_column(
        ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Optional attachment metadata. attachment_type is one of "image" | "file".
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    attachment_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    attachment_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    attachment_size: Mapped[Optional[int]] = mapped_column(nullable=True)
    reply_to_message_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("chat_messages.id", ondelete="SET NULL"), nullable=True, index=True
    )
    edited_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    reply_to: Mapped[Optional["ChatMessage"]] = relationship(
        "ChatMessage", remote_side="ChatMessage.id", foreign_keys=[reply_to_message_id]
    )
    consultation: Mapped["Consultation"] = relationship(
        "Consultation", back_populates="messages"
    )
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])

    def __repr__(self) -> str:
        return f"<ChatMessage {self.id} from={self.sender_id}>"
