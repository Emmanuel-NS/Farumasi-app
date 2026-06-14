from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field


class UserSnippet(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    full_name: str
    email: str
    profile_image_url: Optional[str] = None


class ChatMessageReplyPreview(BaseModel):
    id: str
    sender_id: str
    sender_name: str = ""
    content: Optional[str] = ""
    attachment_type: Optional[str] = None
    attachment_name: Optional[str] = None
    is_deleted: bool = False


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    consultation_id: str
    sender_id: str
    content: Optional[str] = ""
    is_read: bool
    created_at: datetime
    sender: Optional[UserSnippet] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_type: Optional[str] = None
    attachment_size: Optional[int] = None
    reply_to_message_id: Optional[str] = None
    edited_at: Optional[datetime] = None
    is_deleted: bool = False
    reply_to: Optional[ChatMessageReplyPreview] = None

    @computed_field  # type: ignore[misc]
    @property
    def sender_name(self) -> str:
        return self.sender.full_name if self.sender else ""

    @computed_field  # type: ignore[misc]
    @property
    def sent_at(self) -> datetime:
        return self.created_at


class ChatMessageCreate(BaseModel):
    content: Optional[str] = ""
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_type: Optional[str] = None  # "image" | "file" | "product"
    attachment_size: Optional[int] = None
    reply_to_message_id: Optional[str] = None


class ChatMessageUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class ConsultationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    patient_id: str
    pharmacist_id: str
    status: str
    is_anonymous: bool = False
    created_at: datetime
    patient: Optional[UserSnippet] = None
    pharmacist: Optional[UserSnippet] = None
    messages: list[ChatMessageOut] = []

    @computed_field  # type: ignore[misc]
    @property
    def patient_name(self) -> str:
        return self.patient.full_name if self.patient else ""

    @computed_field  # type: ignore[misc]
    @property
    def pharmacist_name(self) -> str:
        return self.pharmacist.full_name if self.pharmacist else ""


class ConsultationCreate(BaseModel):
    pharmacist_id: str
    is_anonymous: bool = False
