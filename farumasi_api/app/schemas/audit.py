from __future__ import annotations
from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    actor_user_id: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    ip_address: Optional[str] = None
    created_at: datetime
