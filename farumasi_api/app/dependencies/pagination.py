from __future__ import annotations

from typing import Optional

from fastapi import Query


class PaginationParams:
    def __init__(
        self,
        page: int = Query(default=1, ge=1, description="Page number"),
        size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    ):
        self.page = page
        self.size = size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size

    @property
    def limit(self) -> int:
        return self.size
