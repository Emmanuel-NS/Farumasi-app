"""Tests for attachment URL normalization."""

from app.utils.media_urls import normalize_attachment_url


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
