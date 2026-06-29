from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_roles
from app.core.constants import UserRole
from app.models.user import User
from app.schemas.content_page import (
    ContentPageAdminOut,
    ContentPageNotify,
    ContentPageNotifyResult,
    ContentPageUpdate,
)
from app.services.content_page_service import ContentPageService

router = APIRouter()


def _content_manager():
    return require_roles(
        UserRole.SUPER_ADMIN,
        UserRole.COMPLIANCE_ADMIN,
        UserRole.OPERATIONS_ADMIN,
    )


@router.get("", response_model=list[ContentPageAdminOut])
async def list_content_pages(
    _: User = Depends(_content_manager()),
    db: AsyncSession = Depends(get_db),
):
    return await ContentPageService(db).list_admin()


@router.get("/{page_id}", response_model=ContentPageAdminOut)
async def get_content_page(
    page_id: str,
    _: User = Depends(_content_manager()),
    db: AsyncSession = Depends(get_db),
):
    return await ContentPageService(db).get_admin(page_id)


@router.put("/{page_id}", response_model=ContentPageAdminOut)
async def update_content_page(
    page_id: str,
    data: ContentPageUpdate,
    actor: User = Depends(_content_manager()),
    db: AsyncSession = Depends(get_db),
):
    return await ContentPageService(db).update_page(page_id, data, actor)


@router.post("/{page_id}/publish", response_model=ContentPageAdminOut)
async def publish_content_page(
    page_id: str,
    actor: User = Depends(_content_manager()),
    db: AsyncSession = Depends(get_db),
):
    return await ContentPageService(db).publish_page(page_id, actor)


@router.post("/{page_id}/notify", response_model=ContentPageNotifyResult)
async def notify_content_page_users(
    page_id: str,
    data: ContentPageNotify,
    actor: User = Depends(_content_manager()),
    db: AsyncSession = Depends(get_db),
):
    return await ContentPageService(db).notify_users(page_id, data, actor)
