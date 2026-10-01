# SalonBookr

A salon appointment scheduling platform: a public customer booking flow plus an
admin dashboard for managing locations, services, employees, bookings and
customers.

## Architecture

```
React (CRA + craco + Tailwind + shadcn/ui)
        │  REST / JSON over HTTP
        ▼
FastAPI (async, motor)
        │
        ▼
MongoDB
```

- **Frontend** — `frontend/`. React 19, react-router, axios, Tailwind with
  shadcn/ui primitives, date-fns, sonner toasts. Three selectable color themes
  (Earthy Minimal, Midnight Luxe, Soft Blush) driven by CSS custom properties.
- **Backend** — `backend/server.py`. A single FastAPI app; all routes live under
  the `/api` prefix. Swagger UI is served at `/docs`, ReDoc at `/redoc`.
- **Database** — MongoDB via the async `motor` driver. On startup the backend
  seeds demo data if the collections are empty: 2 locations, 3 employees, 5
  services with add-ons, and default settings.

## Features

Admin dashboard (no login):

- **Schedule** — day-by-day booking calendar with admin cancel and reschedule
- **Booking Link** — shareable `/book` URL
- **Services** — CRUD with price, duration, category and per-service add-ons
- **Employees** — CRUD with per-weekday working hours
- **Locations** — CRUD
- **Customers** — customer list with search
- **Profile** — business contact and plan details
- **Settings** — business name, email, website and theme switcher

Customer-facing (public):

- Four-step booking flow: location → services → date/time → confirm
- Availability derived from existing bookings (`GET /api/timeslots`)
- Mock payment step before the booking is written
- Self-service cancel / reschedule at `/manage-booking/:id`, gated on matching
  the phone number on the booking
- `+91` phone validation, optional WhatsApp updates, prices in ₹

## Running locally

Prerequisites: Node 18+, Python 3.10+, and a MongoDB instance reachable at
`MONGO_URL`.

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --port 8001 --reload
```

API is then available at `http://localhost:8001`, with docs at
`http://localhost:8001/docs`.

### Frontend

```bash
cd frontend
npm install
npm start
```

App is then available at `http://localhost:3000`.

## Environment variables

`backend/.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URL` | yes | MongoDB connection string, e.g. `mongodb://localhost:27017` |
| `DB_NAME` | yes | Database name |
| `FRONTEND_URL` | no | Allowed CORS origin. Defaults to `http://localhost:3000` |
| `CORS_ORIGINS` | no | Extra comma-separated origins. `*` is ignored |

`frontend/.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `REACT_APP_BACKEND_URL` | yes | Backend base URL, e.g. `http://localhost:8001` |

## Notes

- **Authentication is intentionally removed.** This is a portfolio/demo export,
  so there are no logins, sessions, JWTs or user records. Every `/api` route is
  open. Do not deploy it as-is.
- **Multi-tenancy is intentionally removed.** The original app scoped every
  record to an owning account. That has been flattened: there is a single set of
  locations/services/employees, and `settings` and `profile` are singleton
  documents.
- **Razorpay is mocked.** `POST /api/payments/create-order` and
  `POST /api/payments/verify` return generated IDs and mark the booking paid
  without contacting a payment provider.
- **WhatsApp is mocked.** Notification sends are written to the backend log with
  a `[MOCK WhatsApp]` prefix rather than dispatched to a real number.
