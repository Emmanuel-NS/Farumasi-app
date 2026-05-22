# FARUMASI API

Production-ready **FastAPI + PostgreSQL** backend for the FARUMASI healthcare platform — connecting patients, doctors, hospitals, pharmacies, riders, and partners across Rwanda.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115+ (async) |
| ORM | SQLAlchemy 2.x async (`asyncpg`) |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 (optional) |
| Storage | Local disk / AWS S3 (configurable) |
| Container | Docker + docker-compose |

---

## Project Structure

```
farumasi_api/
├── alembic/              # Database migrations
├── app/
│   ├── api/v1/
│   │   └── endpoints/    # 21 endpoint modules
│   ├── core/             # Config, database, security, exceptions, constants
│   ├── dependencies/     # Auth, roles, pagination
│   ├── models/           # 22 SQLAlchemy models
│   ├── repositories/     # Data access layer
│   ├── schemas/          # Pydantic v2 schemas
│   ├── services/         # Business logic
│   └── utils/            # QR, scoring engine, distance, pagination
├── scripts/
│   └── seed.py           # Demo data seeder
└── tests/                # Async pytest test suite
```

---

## Quick Start

### 1. Prerequisites
- Docker + Docker Compose  
- Python 3.11+

### 2. Clone and configure

```bash
cd farumasi_api
cp .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY, etc.
```

### 3. Start services

```bash
docker-compose up -d   # Starts PostgreSQL + Redis
```

### 4. Install dependencies

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Run migrations

```bash
alembic upgrade head
```

### 6. Seed demo data

```bash
python scripts/seed.py
```

### 7. Start the server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/api/v1/docs

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@farumasi.com | Admin@12345 |
| Doctor | doctor@farumasi.com | Doctor@12345 |
| Patient | patient@farumasi.com | Patient@12345 |
| Pharmacist | pharmacist@farumasi.com | Pharmacist@12345 |
| Pharmacy Admin | pharmacy_admin@farumasi.com | Pharmacy@12345 |
| Partner Admin | partner_admin@farumasi.com | Partner@12345 |
| Rider | rider@farumasi.com | Rider@12345 |
| Hospital Admin | hospital_admin@farumasi.com | Hospital@12345 |

---

## Key Business Rules

- **Pharmacy names are hidden** until the order is paid and completed  
- **Expired medicine** is never recommended (availability_score → 0)  
- **QR confirmation** is required to complete a delivery  
- **Withdrawal amount** cannot exceed available balance  
- **Platform commission** is configurable via `PLATFORM_COMMISSION_RATE` env var (default 10%)  
- Revenue status flow: `pending` → `available` (after order completed) → `withdrawn`

---

## API Endpoints

Base path: `/api/v1`

| Tag | Base |
|---|---|
| Authentication | `/auth` |
| Users | `/users` |
| Patients | `/patients` |
| Doctors | `/doctors` |
| Hospitals | `/hospitals` |
| Pharmacists | `/pharmacists` |
| Pharmacies | `/pharmacies` |
| Partners | `/partners` |
| Riders | `/riders` |
| Products | `/products` |
| Prescriptions | `/prescriptions` |
| Recommendations | `/recommendations` |
| Orders | `/orders` |
| Deliveries | `/deliveries` |
| Revenue | `/revenue` |
| Withdrawals | `/withdrawals` |
| Articles | `/articles` |
| Notifications | `/notifications` |
| Analytics | `/analytics` |
| Uploads | `/uploads` |
| Admin | `/admin` |

---

## Running Tests

```bash
pip install pytest pytest-asyncio httpx aiosqlite
pytest tests/ -v
```

---

## Pharmacy Recommendation Engine

The scoring engine (`app/utils/scoring.py`) ranks pharmacies across 7 weighted dimensions:

| Dimension | Weight |
|---|---|
| Insurance coverage | 25% |
| Product availability | 25% |
| Price competitiveness | 20% |
| Distance from patient | 15% |
| Delivery capability | 7% |
| Reliability (rating) | 5% |
| Expiry safety | 3% |

---

## Environment Variables

See `.env.example` for the full list. Key variables:

```
DATABASE_URL=postgresql://farumasi:farumasi@localhost:5432/farumasi
ASYNC_DATABASE_URL=postgresql+asyncpg://farumasi:farumasi@localhost:5432/farumasi
SECRET_KEY=your-super-secret-key-here
PLATFORM_COMMISSION_RATE=0.10
STORAGE_BACKEND=local
```
