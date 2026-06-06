from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.upload_service import UploadService

router = APIRouter()


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    url = await UploadService().upload_image(file)
    return {"url": url, "file_key": url.split("/")[-1]}


@router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    url = await UploadService().upload_document(file)
    return {"url": url, "file_key": url.split("/")[-1]}


@router.post("/prescription")
async def upload_prescription(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    """Upload a prescription image/document and return its public URL.

    The returned `url` should be passed to `POST /patients/me/prescriptions/upload`
    as `uploaded_file_url` to create the prescription record.
    """
    content_type = (file.content_type or "").lower()
    if content_type.startswith("image/"):
        url = await UploadService().upload_image(file, folder="prescriptions")
    else:
        url = await UploadService().upload_document(file, folder="prescriptions")
    return {"url": url, "file_key": url.split("/")[-1]}


@router.post("/payment-proof")
async def upload_payment_proof(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    """Upload payment proof (screenshot or PDF) when recording a manual payout."""
    content_type = (file.content_type or "").lower()
    if content_type.startswith("image/"):
        url = await UploadService().upload_image(file, folder="payment-proofs")
    elif content_type == "application/pdf":
        url = await UploadService().upload_document(file, folder="payment-proofs")
    else:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=400,
            detail="Payment proof must be an image (JPEG, PNG, WebP) or PDF",
        )
    return {"url": url, "file_key": url.split("/")[-1]}
