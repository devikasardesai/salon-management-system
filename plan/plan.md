# SalonBookr — Portfolio Export: Final Implementation Plan

A salon appointment scheduling platform simplified for portfolio/demo use.
React frontend → FastAPI backend → MongoDB. No authentication, no multi-tenancy, no Emergent dependencies.

---

## Scope — Exactly What Changes

### 1. Remove Authentication Completely
**Backend (server.py):**
- Delete: `bcrypt`, `jwt` imports and all auth helper functions (`get_jwt_secret`, `hash_password`, `verify_password`, `create_access_token`, `create_refresh_token`, `set_auth_cookies`, `get_current_user`, `check_brute_force`, `record_failed_login`, `clear_failed_logins`)
- Delete: `JWT_ALGORITHM`, `MAX_LOGIN_ATTEMPTS`, `LOCKOUT_MINUTES` constants
- Delete: `LoginInput`, `RegisterInput` Pydantic models
- Delete: `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /auth/me` endpoints
- Delete: `seed_admin()` function and `users` collection usage
- Delete: `login_attempts` collection and its index
- Remove: `user=Depends(get_current_user)` parameter from all 22 endpoints that have it
- Remove: `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` from backend `.env`

**Frontend:**
- Delete files: `contexts/AuthContext.js`, `pages/admin/LoginPage.js`
- `App.js`: Remove `AuthProvider`, `ProtectedRoute`, `useAuth` import, `/admin/login` route. Admin routes render directly inside `AdminLayout`.
- `AdminLayout.js`: Remove `useAuth()`, `logout()`, `user?.email` display, `LogOut` icon, logout button. Keep full sidebar and top navigation.
- `lib/api.js`: Remove `getToken`, `setToken`, `clearToken`, `sessionStorage` operations, token request interceptor, 401 redirect interceptor. Keep plain axios instance with `baseURL`.

### 2. Remove Multi-Tenancy
**Backend:**
- Remove `owner_id` from all `insert_one`, `find`, `find_one`, `update_one`, `delete_one` operations
- Remove `?owner=` query parameters from `GET /locations`, `GET /services`, `GET /employees`, `GET /settings`
- Delete `/me` endpoint variants: `GET /locations/me`, `GET /services/me`, `GET /employees/me`, `GET /settings/me`
- `GET /bookings` becomes open (no auth, no owner filter — just optional `location_id` filter)
- `PUT /settings` and `PUT /profile` operate on singleton documents (no owner scoping)
- `serialize_doc()`: Remove `owner_id` stripping (field won't exist)
- `seed_data()`: Remove `admin_id` parameter threading. Seed locations/services/employees without `owner_id`.

**Frontend:**
- `BookingPage.js`: Remove `ownerParam` / `?owner=` URL parsing. Fetch `/locations`, `/services`, `/settings` directly.
- `BookingLinkPage.js`: Remove `useAuth()` import and `user?.id` in URL. Link is plain `/book`.
- `AdminLayout.js`: Customer View link is plain `/book` (no `?owner=`).
- Admin pages: Change `/locations/me` → `/locations`, `/services/me` → `/services`, `/employees/me` → `/employees`, `/settings/me` → `/settings` in all API calls.

### 3. Keep Existing Functionality (No Changes)
- All 8 admin pages: Schedule, Booking Link, Services, Employees, Locations, Customers, Profile, Settings
- Customer booking flow: Location → Services → Date/Time → Confirm → Mock payment → Success
- Customer cancel/reschedule with phone verification at `/manage-booking/:id`
- Mock Razorpay payment (order creation + verification)
- Mock WhatsApp logging
- 3 color themes and theme switcher
- Phone validation (+91), WhatsApp checkbox, ₹ currency
- Input sanitization, ObjectId validation
- Seed data (2 locations, 3 employees, 5 services with add-ons, default settings)

### 4. Remove Emergent-Specific Dependencies
- `craco.config.js`: Remove `@emergentbase/visual-edits` wrapper (lines 84-98). Remove health-check plugin loading (lines 14-23, 54-57, 64-78). Keep `@` path alias and eslint config.
- `package.json`: Remove `@emergentbase/visual-edits` from devDependencies.
- Delete: `plugins/health-check/` directory entirely.
- Frontend `.env`: Remove `WDS_SOCKET_PORT=443`, `ENABLE_HEALTH_CHECK=false`. Set `REACT_APP_BACKEND_URL=http://localhost:8001`.
- Backend `.env`: Set `FRONTEND_URL=http://localhost:3000`. Remove `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
- `requirements.txt`: Remove `emergentintegrations`. Slim to actually-imported packages only.
- `server.py seed_data()`: Remove `/app/memory/test_credentials.md` writing.

### 5. Re-enable Swagger
- Change `FastAPI(docs_url=None, redoc_url=None)` to `FastAPI()` — Swagger at `/docs`, ReDoc at `/redoc`.

### 6. Add/Update README
Brief README covering:
- What the project does
- Architecture (React → FastAPI → MongoDB)
- How to run frontend (`npm install && npm start`)
- How to run backend (`pip install -r requirements.txt && uvicorn server:app`)
- Required environment variables
- Note: auth intentionally removed (portfolio/demo)
- Note: Razorpay and WhatsApp are mocked
- No deployment instructions. No Docker.

---

## What Is NOT Done
- No new features
- No UI redesign
- No Docker / Docker Compose / Kubernetes / CI/CD
- No dependency additions
- No code optimization beyond auth/tenant/Emergent removal
- No additional suggestions after completion

---

## Verification (Phase 4)
After all changes, run testing agent to confirm:
1. Backend starts, frontend starts, MongoDB connects
2. `/docs` loads Swagger UI
3. All 8 admin pages load without auth
4. CRUD works for services, employees, locations, settings
5. Customer booking flow end-to-end with mock payment
6. Customer cancel/reschedule with phone verification
7. Mock WhatsApp log appears in backend
8. No remaining `/auth/*` endpoints, tenant-specific `/me` API calls (`/locations/me`, `/services/me`, `/employees/me`, `/settings/me`), `?owner=` parameters, `Authorization: Bearer` headers, `sessionStorage` token operations, or `*.emergentagent.com` references in served code
9. Fix any issues before declaring complete
