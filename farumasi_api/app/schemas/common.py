from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict


T = TypeVar("T")


class FarumasiBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class PaginatedResponse(FarumasiBaseModel, Generic[T]):
    items: List[T]
    total: int
    offset: int = 0
    limit: int = 20


class MessageResponse(FarumasiBaseModel):
    message: str


class IDResponse(FarumasiBaseModel):
    id: str
