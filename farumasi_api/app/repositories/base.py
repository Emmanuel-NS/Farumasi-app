from __future__ import annotations

from typing import Any, Generic, List, Optional, Sequence, Tuple, Type, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    model: Type[ModelT]

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, entity_id: str) -> Optional[ModelT]:
        result = await self.db.execute(
            select(self.model).where(self.model.id == entity_id)  # type: ignore
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        *filters: Any,
        offset: int = 0,
        limit: int = 20,
    ) -> Tuple[List[ModelT], int]:
        query = select(self.model)
        count_query = select(func.count()).select_from(self.model)
        if filters:
            query = query.where(*filters)
            count_query = count_query.where(*filters)

        query = query.offset(offset).limit(limit)
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def create(self, **kwargs: Any) -> ModelT:
        instance = self.model(**kwargs)  # type: ignore
        self.db.add(instance)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def update(self, instance: ModelT, **kwargs: Any) -> ModelT:
        for key, value in kwargs.items():
            setattr(instance, key, value)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def delete(self, instance: ModelT) -> None:
        await self.db.delete(instance)
        await self.db.flush()

    async def count(self, *filters: Any) -> int:
        query = select(func.count()).select_from(self.model)
        if filters:
            query = query.where(*filters)
        result = await self.db.execute(query)
        return result.scalar_one()
