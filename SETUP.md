# FARUMASI — Developer Setup Guide

## Repository Structure

```
farumasi/
├── farumasi_app/          ← Flutter (patient + pharmacist + rider)
├── farumasi_backend/      ← NestJS API
├── farumasi_landing/      ← React/Vite marketing site
├── docker-compose.yml     ← Local PostgreSQL + Redis
└── ARCHITECTURE.md        ← Full technical architecture
```

---

## Prerequisites

- Flutter SDK 3.10+
- Node.js 20 LTS
- Docker Desktop
- Git

---

## 1. Start Local Database

```bash
# From repo root
docker compose up -d
```

This starts:
- PostgreSQL 16 on port 5432
- Redis 7 on port 6379

---

## 2. Backend Setup

```bash
cd farumasi_backend

# Copy and fill environment variables
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# Install dependencies (already done if you cloned fresh)
npm install

# Run database migrations
npx prisma migrate dev --name init

# Seed sample data (optional)
# npx prisma db seed

# Start dev server (hot reload)
npm run start:dev
```

API running at: http://localhost:3001/api/v1

---

## 3. Flutter App Setup

```bash
# From repo root (not farumasi_backend)
flutter pub get

# Run on Android emulator (points to localhost:3001 via 10.0.2.2)
flutter run

# Run with production API URL
flutter run --dart-define=API_BASE_URL=https://api.farumasi.rw/api/v1 \
            --dart-define=SUPABASE_URL=https://xxx.supabase.co \
            --dart-define=SUPABASE_ANON_KEY=your_anon_key

# Run web
flutter run -d chrome
```

---

## 4. React Landing Site

```bash
cd farumasi_landing
npm install
npm run dev      # Dev server on port 5173
npm run build    # Production build
```

---

## 5. Environment Variables Reference

### Backend (`farumasi_backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string for JWT signing |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `PORT` | API port (default: 3001) |

### Flutter (`--dart-define`)

| Variable | Description |
|---|---|
| `API_BASE_URL` | NestJS API base URL |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |

---

## 6. Database Management

```bash
cd farumasi_backend

# Create a new migration after schema changes
npx prisma migrate dev --name describe_your_change

# Open Prisma Studio (GUI database browser)
npx prisma studio

# Reset database (dev only — destructive)
npx prisma migrate reset
```

---

## 7. API Endpoints Reference

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login (email or phone) |
| POST | `/api/v1/auth/sync` | Exchange Supabase token for API JWT |

### Medicines
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/medicines` | Search medicines (`?q=paracetamol&category=Pain`) |
| GET | `/api/v1/medicines/categories` | List categories |
| GET | `/api/v1/medicines/:id` | Medicine detail |

### Pharmacies
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/pharmacies/nearby` | `?lat=&lng=&radiusKm=` |
| GET | `/api/v1/pharmacies/:id` | Pharmacy + inventory |

### Recommendations (Phase 1 AI)
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/recommendations/pharmacies` | Smart pharmacy matching |

### Prescriptions
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/prescriptions` | Submit prescription |
| GET | `/api/v1/prescriptions/my` | Patient's prescriptions |
| GET | `/api/v1/prescriptions/pending` | Pharmacist review queue |
| PATCH | `/api/v1/prescriptions/:id/review` | Pharmacist reviews |

### Orders
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/orders` | Create order |
| GET | `/api/v1/orders` | My orders (role-filtered) |
| GET | `/api/v1/orders/:id` | Order detail |
| PATCH | `/api/v1/orders/:id/status` | Advance order state |

---

## 8. Deployment

### Backend (Railway)
1. Push to GitHub
2. Connect Railway to repo
3. Set environment variables in Railway dashboard
4. Set start command: `npm run start:prod`
5. Add PostgreSQL plugin (or use Supabase URL)

### Flutter Web (Firebase Hosting)
```bash
flutter build web --dart-define=API_BASE_URL=https://your-api.railway.app/api/v1
firebase deploy
```

### React Landing (Vercel)
1. Import `farumasi_landing/` from GitHub in Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
