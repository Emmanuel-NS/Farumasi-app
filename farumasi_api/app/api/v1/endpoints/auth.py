from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.register(data, ip_address=request.client.host if request.client else None)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.login(data, ip_address=request.client.host if request.client else None)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    return await service.refresh(data.refresh_token)
