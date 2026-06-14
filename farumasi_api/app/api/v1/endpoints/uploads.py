from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.upload_service import UploadService

router = APIRouter()


def _upload_error(exc: ValueError) -> HTTPException:
    return HTTPException(status_code=400, detail=str(exc))


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    try:
        url = await UploadService().upload_image(file)
    except ValueError as exc:
        raise _upload_error(exc) from exc
    return {"url": url, "file_key": url.split("/")[-1]}


@router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    try:
        url = await UploadService().upload_document(file)
    except ValueError as exc:
        raise _upload_error(exc) from exc
    return {"url": url, "file_key": url.split("/")[-1]}


@router.post("/chat")
async def upload_chat_attachment(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    """Upload an image or document for consult chat (persisted under chat/ folder)."""
    try:
        url, attachment_type = await UploadService().upload_chat_file(file)
    except ValueError as exc:
        raise _upload_error(exc) from exc
    return {
        "url": url,
        "attachment_type": attachment_type,
        "file_key": url.split("/")[-1],
    }


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
