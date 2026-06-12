# Monorepo fallback: used when the host builds from the repository root
# without rootDir / dockerContext configured (e.g. some Render setups).
# Canonical API image: farumasi_api/Dockerfile

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY farumasi_api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY farumasi_api/ .

RUN mkdir -p uploads \
    && chmod +x docker-entrypoint.sh \
    && useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS "http://localhost:${PORT}/health" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
