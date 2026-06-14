"""Tests for attachment URL normalization."""

from app.utils.media_urls import (
    is_product_attachment_url,
    normalize_attachment_url,
    resolve_attachment_type,
)


def test_normalize_relative_upload_path():
    assert normalize_attachment_url("/uploads/chat/abc.jpg") == "/uploads/chat/abc.jpg"


def test_normalize_absolute_api_url_to_relative():
    url = "https://farumasi-app.onrender.com/uploads/chat/abc.jpg"
    assert normalize_attachment_url(url) == "/uploads/chat/abc.jpg"


def test_preserve_s3_url():
    url = "https://my-bucket.s3.us-east-1.amazonaws.com/chat/abc.jpg"
    assert normalize_attachment_url(url) == url


def test_preserve_cloudinary_url():
    url = "https://res.cloudinary.com/demo/image/upload/v1/farumasi/chat/abc.jpg"
    assert normalize_attachment_url(url) == url


def test_upload_url_is_not_product():
    url = "/uploads/chat/abc123.jpg"
    assert is_product_attachment_url(url) is False
    assert resolve_attachment_type(url, "image") == "image"
    assert resolve_attachment_type(url, None) == "image"


def test_upload_pdf_is_file():
    url = "/uploads/chat/report.pdf"
    assert resolve_attachment_type(url, "file") == "file"
    assert resolve_attachment_type(url, None) == "file"


def test_store_path_is_product():
    url = "/store/abc-123"
    assert is_product_attachment_url(url) is True
    assert resolve_attachment_type(url, None) == "product"
