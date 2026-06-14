from __future__ import annotations

import io
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_DOCUMENT_TYPES = {"application/pdf"}
CHAT_DOCUMENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class UploadService:
    """Storage abstraction: local disk, S3, or Cloudinary."""

    def __init__(self):
        self.backend = (settings.STORAGE_BACKEND or "local").lower()
        self.local_root = settings.UPLOAD_DIR or "uploads"

    def _require_durable_storage_for_chat(self) -> None:
        """Chat history outlives server restarts — never rely on ephemeral local disk in prod."""
        env = (settings.ENVIRONMENT or "development").lower()
        if env == "development":
            return
        if self.backend in ("s3", "cloudinary"):
            return
        raise ValueError(
            "Chat attachments require permanent storage in production. "
            "Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET "
            "on the API (recommended), or set STORAGE_BACKEND=s3 with AWS credentials."
        )

    async def upload_image(self, file: UploadFile, folder: str = "images") -> str:
        return await self._upload(file, folder, allowed_types=ALLOWED_IMAGE_TYPES)

    async def upload_document(self, file: UploadFile, folder: str = "documents") -> str:
        return await self._upload(file, folder, allowed_types=ALLOWED_DOCUMENT_TYPES)

    async def upload_chat_file(self, file: UploadFile) -> tuple[str, str]:
        """Upload a consult chat attachment. Returns (url, attachment_type)."""
        self._require_durable_storage_for_chat()
        content_type = (file.content_type or "").lower()
        if content_type in ALLOWED_IMAGE_TYPES:
            url = await self._upload(file, "chat", allowed_types=ALLOWED_IMAGE_TYPES)
            return url, "image"
        if content_type in CHAT_DOCUMENT_TYPES:
            url = await self._upload(file, "chat", allowed_types=CHAT_DOCUMENT_TYPES)
            return url, "file"
        raise ValueError(
            "Unsupported file type. Use JPEG/PNG/WebP/GIF images or PDF/Word/Excel/text documents."
        )

    async def _upload(
        self,
        file: UploadFile,
        folder: str,
        allowed_types: set[str],
    ) -> str:
        content_type = (file.content_type or "").lower()
        if content_type not in allowed_types:
            raise ValueError(f"File type '{file.content_type}' is not allowed")

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise ValueError("File exceeds maximum allowed size (10 MB)")

        ext = Path(file.filename or "file").suffix or ".bin"
        filename = f"{uuid.uuid4().hex}{ext}"

        if self.backend == "s3":
            return await self._upload_s3(contents, folder, filename, content_type)
        if self.backend == "cloudinary":
            return await self._upload_cloudinary(contents, folder, filename, content_type)
        return await self._upload_local(contents, folder, filename)

    async def _upload_local(self, contents: bytes, folder: str, filename: str) -> str:
        dest_dir = Path(self.local_root) / folder
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / filename
        dest_path.write_bytes(contents)
        return f"/uploads/{folder}/{filename}"

    async def _upload_s3(
        self, contents: bytes, folder: str, filename: str, content_type: str
    ) -> str:
        try:
            import boto3
        except ImportError as exc:
            raise RuntimeError(
                "boto3 is required for S3 uploads. Install it or switch STORAGE_BACKEND=local"
            ) from exc

        bucket = settings.AWS_BUCKET_NAME
        if not bucket:
            raise RuntimeError("AWS_BUCKET_NAME must be set when STORAGE_BACKEND=s3")

        key = f"{folder}/{filename}"
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=contents,
            ContentType=content_type,
        )
        if settings.AWS_S3_ENDPOINT_URL:
            base = settings.AWS_S3_ENDPOINT_URL.rstrip("/")
            return f"{base}/{bucket}/{key}"
        return f"https://{bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"

    async def _upload_cloudinary(
        self, contents: bytes, folder: str, filename: str, content_type: str
    ) -> str:
        try:
            import cloudinary
            import cloudinary.uploader
        except ImportError as exc:
            raise RuntimeError(
                "cloudinary is required for Cloudinary uploads. "
                "Install it or switch STORAGE_BACKEND=local"
            ) from exc

        if not settings.CLOUDINARY_CLOUD_NAME:
            raise RuntimeError("CLOUDINARY_CLOUD_NAME must be set when STORAGE_BACKEND=cloudinary")

        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )
        resource_type = "image" if content_type.startswith("image/") else "raw"
        result = cloudinary.uploader.upload(
            io.BytesIO(contents),
            folder=f"farumasi/{folder}",
            public_id=Path(filename).stem,
            resource_type=resource_type,
            overwrite=False,
        )
        return result["secure_url"]
