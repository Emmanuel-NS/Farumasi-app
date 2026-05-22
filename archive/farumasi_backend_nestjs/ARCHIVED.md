# Archived NestJS backend

This was the original NestJS + Prisma backend prototype for FARUMASI.
It has been **superseded by the FastAPI backend** at `farumasi_api/`.

This folder is kept for historical reference only:
- No frontend portal points at it.
- It is not started by `docker-compose.yml`.
- It is excluded from Phase 1 stability guarantees.

Do not add new features here. If anything in `farumasi_api/` needs a feature
that used to live in this codebase, port it forward into the FastAPI service.
