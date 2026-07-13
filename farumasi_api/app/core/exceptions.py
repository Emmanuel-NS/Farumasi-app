from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from fastapi.responses import JSONResponse


class FarumasiException(Exception):
    """Base exception for FARUMASI platform."""

    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class NotFoundError(FarumasiException):
    def __init__(self, entity: str = "Resource", entity_id: str | int | None = None):
        msg = f"{entity} not found" if entity_id is None else f"{entity} '{entity_id}' not found"
        super().__init__(msg, status.HTTP_404_NOT_FOUND)


class AuthenticationError(FarumasiException):
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(detail, status.HTTP_401_UNAUTHORIZED)


class AuthorizationError(FarumasiException):
    def __init__(self, detail: str = "You do not have permission to perform this action"):
        super().__init__(detail, status.HTTP_403_FORBIDDEN)


class ValidationError(FarumasiException):
    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_422_UNPROCESSABLE_ENTITY)


class ConflictError(FarumasiException):
    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_409_CONFLICT)


class BusinessRuleError(FarumasiException):
    def __init__(self, detail: str):
        super().__init__(detail, status.HTTP_400_BAD_REQUEST)


class PermissionDenied(FarumasiException):
    def __init__(self, detail: str = "You do not have permission to perform this action"):
        super().__init__(detail, status.HTTP_403_FORBIDDEN)


class AccountSuspendedError(FarumasiException):
    def __init__(self):
        super().__init__("Your account has been suspended. Contact support.", status.HTTP_403_FORBIDDEN)


class AccountRestrictedError(FarumasiException):
    def __init__(self):
        super().__init__("Your account is restricted. Contact support.", status.HTTP_403_FORBIDDEN)


def _cors_headers_for(request: Request) -> dict[str, str]:
    """Ensure browser clients always see ACAO even if middleware is skipped."""
    import re

    from app.core.config import settings

    origin = request.headers.get("origin")
    if not origin:
        return {}
    allowed = set(settings.cors_origins)
    if origin in allowed or re.fullmatch(
        r"http://(localhost|127\.0\.0\.1):\d+|https://([a-z0-9-]+\.)?farumasi\.com",
        origin,
    ):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin",
        }
    return {}


def register_exception_handlers(app: FastAPI) -> None:
    import logging

    log = logging.getLogger("farumasi.api")

    @app.exception_handler(FarumasiException)
    async def farumasi_exception_handler(request: Request, exc: FarumasiException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "type": type(exc).__name__},
            headers=_cors_headers_for(request),
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors(), "type": "RequestValidationError"},
            headers=_cors_headers_for(request),
        )

    @app.exception_handler(ResponseValidationError)
    async def response_validation_handler(request: Request, exc: ResponseValidationError):
        log.exception("Response validation failed on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Server response validation failed while saving product",
                "type": "ResponseValidationError",
                "errors": exc.errors(),
            },
            headers=_cors_headers_for(request),
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        # Never leak internal details in production
        from app.core.config import settings

        log.exception("Unhandled error on %s %s", request.method, request.url.path)
        exc_name = type(exc).__name__
        # Surface asyncpg cache invalidation clearly — usually after DDL / Neon pooler
        if "InvalidCachedStatement" in exc_name or "InvalidCachedStatement" in str(exc):
            detail = (
                "Database connection cache was reset after a schema change. "
                "Please retry the request."
            )
        elif settings.DEBUG:
            detail = str(exc)
        else:
            detail = "An internal server error occurred"
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": detail, "type": exc_name},
            headers=_cors_headers_for(request),
        )
