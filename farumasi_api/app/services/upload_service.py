from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Literal

from fastapi import UploadFile

from app.core.config import settings


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_DOCUMENT_TYPES = {"application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class UploadService:
    """Storage abstraction that supports local disk and S3."""

    def __init__(self):
        self.backend = getattr(settings, "STORAGE_BACKEND", "local")
        self.local_root = getattr(settings, "LOCAL_UPLOAD_DIR", "uploads")

    async def upload_image(self, file: UploadFile, folder: str = "images") -> str:
        return await self._upload(file, folder, allowed_types=ALLOWED_IMAGE_TYPES)

    async def upload_document(self, file: UploadFile, folder: str = "documents") -> str:
        return await self._upload(file, folder, allowed_types=ALLOWED_DOCUMENT_TYPES)

    async def _upload(
        self,
        file: UploadFile,
        folder: str,
        allowed_types: set,
    ) -> str:
        if file.content_type not in allowed_types:
            raise ValueError(f"File type '{file.content_type}' is not allowed")

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise ValueError("File exceeds maximum allowed size (10 MB)")

        ext = Path(file.filename or "file").suffix or ".bin"
        filename = f"{uuid.uuid4().hex}{ext}"

        if self.backend == "s3":
            return await self._upload_s3(contents, folder, filename, file.content_type)
        else:
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
            from botocore.exceptions import BotoCoreError, ClientError
        except ImportError:
            raise RuntimeError("boto3 is required for S3 uploads. Install it or switch STORAGE_BACKEND=local")

        bucket = settings.AWS_BUCKET_NAME
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
        return f"https://{bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"
