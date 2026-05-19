# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zanzibar Land Title Registration System — a Django REST API backend with a React + Vite SPA frontend. Deployed on Render.com with PostgreSQL.

## Development Commands

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py create_default_admin   # creates admin / Admin@Zanzibar2024!
python manage.py runserver              # http://localhost:8000
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev    # http://localhost:5173 — proxies /api → localhost:8000
pnpm build  # outputs to dist/
```

No test runner or linter config exists in either layer.

## Architecture

### Backend (`backend/`)

Single Django app: `apps/core`. The project config lives in `landreg_project/`.

**Models** (`apps/core/models.py`):
- `Owner` — land owner registry (national_id, name, contact)
- `UserProfile` — staff role: `admin`, `data_entry`, `reviewing_officer`, `registrar`
- `LandParcel` — plot record with Zanzibar-specific fields (district, region, shehia, ward, village); statuses: `available`, `registered`, `pending`, `disputed`, `suspended`
- `Application` — central workflow object; auto-numbered `APP-YYYY-NNNN`; types: `new_registration`, `transfer`, `subdivision`, `mortgage`, `correction`
- `Proprietor` — applicants nested inside an Application (exactly one must be `is_primary=True`)
- `ApplicationReview` — Step 2 data (registration_number, volume/folio refs, instrument type)
- `ApplicationApproval` — Step 3 data (registrar notes)
- `TitleDeed` — registered deed linked to parcel + owner; created when application is approved

**Application workflow** (3-step, role-gated):
1. `submit_step1` (data_entry) → status `step2`
2. `submit_step2` (reviewing_officer) → status `step3`; creates/updates `ApplicationReview`
3. `submit_step3` (registrar) → status `approved`; creates `ApplicationApproval`, creates `TitleDeed`, sets parcel status to `registered`. Side effects happen atomically inside `ApplicationViewSet.submit_step3`.

Any step can `return_to_step` the application back to a prior stage.

**Permissions**: Custom classes `IsAdminOrOfficer` and `IsAdmin` in `views.py` gate ViewSets by `UserProfile.role`.

**Auth**: JWT via `djangorestframework-simplejwt` — 8-hour access tokens, 7-day refresh with rotation. Endpoints: `POST /api/token/` and `POST /api/token/refresh/`.

**API**: DefaultRouter in `apps/core/urls.py` mounts 5 ViewSets at `/api/`: `users`, `owners`, `parcels`, `applications`, `deeds`. All support search, filter, and ordering. Pagination is 20 items.

### Frontend (`frontend/src/`)

- **Entry**: `main.jsx` wraps the app in `BrowserRouter` + `AuthProvider`
- **Routes** (`App.jsx`): public `/login`; all other routes inside `ProtectedLayout` (redirects to `/login` if no token)
- **Auth** (`hooks/useAuth.js`): tokens stored in `localStorage`; axios interceptor auto-attaches bearer token; auto-refreshes on 401 and retries the original request
- **API client** (`lib/api.js`): axios instance with all endpoint helpers grouped by resource
- **UI**: shadcn/ui + Radix UI + Tailwind CSS; charts via Recharts
- **Pages**: Dashboard (stats + chart + recent apps), Applications, Owners, Parcels, Deeds, Login — all use local `useState`/`useEffect`, no global state library

### Deployment (`render.yaml`)

Three Render resources: PostgreSQL DB, Python web service (gunicorn), static site (Vite build).
- Backend reads `DATABASE_URL`, `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` from env
- Frontend reads `VITE_API_URL` (set to backend service URL at build time)
- Build script: `backend/build.sh` — installs deps, runs migrations, runs `create_default_admin`
