# Omni Monorepo

A role-based service marketplace built as a JavaScript monorepo with one Express API and four React apps:
- Landing app
- Customer app
- Broker app
- Worker app

This README covers complete local setup from clone to first run, including environment variables for every app.

## Table of Contents

1. [What This Project Includes](#what-this-project-includes)
2. [Tech Stack](#tech-stack)
3. [Monorepo Structure](#monorepo-structure)
4. [Feature Summary](#feature-summary)
5. [Port Map](#port-map)
6. [Prerequisites](#prerequisites)
7. [Clone and Install](#clone-and-install)
8. [Environment Setup (.env)](#environment-setup-env)
9. [Run the Project Locally](#run-the-project-locally)
10. [Build for Production](#build-for-production)
11. [Application Workflow](#application-workflow)
12. [API Overview](#api-overview)
13. [Data Model Overview](#data-model-overview)
14. [Troubleshooting](#troubleshooting)
15. [Security Notes](#security-notes)

## What This Project Includes

- `backend`: Main REST API for auth, profile, booking lifecycle, dashboards, and cross-app config.
- `landing-page/frontend`: Public landing experience plus shared login/signup entry routes.
- `frontend/customer-frontend`: Customer dashboard and booking flows.
- `frontend/broker-frontend`: Broker dashboard for worker management and commission views.
- `frontend/worker-frontend`: Worker dashboard for requests, schedule, earnings, and reviews.

## Feature Summary

Short feature list by frontend is available in:

- `features.md`

## Tech Stack

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- CORS + JSON middleware
- `dotenv` for environment variables
- `nodemon` for local development

### Frontend
- React 18
- React Router v6
- Vite 5
- Tailwind CSS
- Axios (role-based frontends)
- Lucide React icons

### Monorepo Tooling
- npm workspaces (single root install for all packages)

## Monorepo Structure

```text
Omni/
  backend/
    src/
      app.js
      server.js
      config/db.js
      routes/
      models/
      schemas/
    package.json
    .env

  landing-page/
    frontend/
      src/
      package.json
      vite.config.js
      .env

  frontend/
    customer-frontend/
      src/
      package.json
      vite.config.js
      .env
    broker-frontend/
      src/
      package.json
      vite.config.js
      .env
    worker-frontend/
      src/
      package.json
      vite.config.js
      .env

  package.json
  README.md
```

## Port Map

These ports are fixed via each app's Vite/server config:

- Backend API: `5000`
- Landing frontend: `5173`
- Customer frontend: `5174`
- Broker frontend: `5175`
- Worker frontend: `5176`

## Prerequisites

Install the following first:

1. Node.js `18+` (Node 20 LTS recommended)
2. npm `9+` (comes with Node)
3. MongoDB connection string (local MongoDB or MongoDB Atlas)

## Clone and Install

1. Clone from GitHub:

```bash
git clone https://github.com/Aman-Singh-Kunwar/Omni.git
cd Omni
```

2. Install all dependencies from root:

```bash
npm install
```

Because this repo uses npm workspaces, this single install command sets up backend + all frontends.

## Environment Setup (.env)

This project uses separate `.env` files for backend and each frontend app.

### 1) Backend `.env`

Create/edit: `backend/.env`

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>?retryWrites=true&w=majority
LANDING_APP_URL=http://localhost:5173
CUSTOMER_APP_URL=http://localhost:5174
BROKER_APP_URL=http://localhost:5175
WORKER_APP_URL=http://localhost:5176
MAIN_API_URL=http://localhost:5000/api
JWT_SECRET=replace-with-a-strong-secret
SYNC_INDEXES=true
MAIL_USER=your-gmail-address@gmail.com
MAIL_APP_PASSWORD=your-16-char-gmail-app-password
MAIL_FROM=your-gmail-address@gmail.com
SIGNUP_VERIFICATION_EXPIRY_MINUTES=10
FORGOT_PASSWORD_EXPIRY_MINUTES=10
```

Variable reference:

- `PORT`: backend HTTP port.
- `MONGODB_URI`: MongoDB connection URI.
- `LANDING_APP_URL`: landing app URL returned by `/api/config`.
- `CUSTOMER_APP_URL`: customer app URL returned by `/api/config`.
- `BROKER_APP_URL`: broker app URL returned by `/api/config`.
- `WORKER_APP_URL`: worker app URL returned by `/api/config`.
- `MAIN_API_URL`: API base URL returned by `/api/config`.
- `JWT_SECRET`: signing secret for JWT tokens.
- `SYNC_INDEXES`: optional. If set to `false`, backend skips `mongoose.syncIndexes()` at startup.
- `MAIL_USER`: Gmail address used to send verification emails.
- `MAIL_APP_PASSWORD`: Gmail app password for `MAIL_USER`.
- `MAIL_FROM`: optional sender address shown in outgoing emails.
- `SIGNUP_VERIFICATION_EXPIRY_MINUTES`: optional OTP expiry window for signup verification.
- `FORGOT_PASSWORD_EXPIRY_MINUTES`: optional OTP expiry window for forgot-password verification.

Render production URL values (recommended):

- `LANDING_APP_URL=https://omni-landing-page.onrender.com`
- `CUSTOMER_APP_URL=https://omni-customer.onrender.com`
- `BROKER_APP_URL=https://omni-broker.onrender.com`
- `WORKER_APP_URL=https://omni-worker.onrender.com`
- `MAIN_API_URL=https://omni-backend-4t7s.onrender.com/api`

### 2) Landing frontend `.env`

Create/edit: `landing-page/frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
```

### 3) Customer frontend `.env`

Create/edit: `frontend/customer-frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_LANDING_APP_URL=http://localhost:5173
VITE_BROKER_APP_URL=http://localhost:5175
VITE_WORKER_APP_URL=http://localhost:5176
VITE_PAGE_CACHE_TTL_MS=30000
```

### 4) Broker frontend `.env`

Create/edit: `frontend/broker-frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_LANDING_APP_URL=http://localhost:5173
VITE_CUSTOMER_APP_URL=http://localhost:5174
VITE_WORKER_APP_URL=http://localhost:5176
VITE_PAGE_CACHE_TTL_MS=30000
```

### 5) Worker frontend `.env`

Create/edit: `frontend/worker-frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_LANDING_APP_URL=http://localhost:5173
VITE_CUSTOMER_APP_URL=http://localhost:5174
VITE_BROKER_APP_URL=http://localhost:5175
VITE_PAGE_CACHE_TTL_MS=30000
```

Frontend cache reference:

- `VITE_PAGE_CACHE_TTL_MS`: optional GET-response cache TTL (milliseconds) for faster page reloads in customer/broker/worker apps.

Render production API value for frontend services:

- `VITE_API_URL=https://omni-backend-4t7s.onrender.com/api`

## Run the Project Locally

Open separate terminals (recommended) and run from repo root.

1. Start backend:

```bash
npm run dev:backend
```

2. Start landing app:

```bash
npm run dev:landing:frontend
```

3. Start customer app:

```bash
npm run dev:customer
```

4. Start broker app:

```bash
npm run dev:broker
```

5. Start worker app:

```bash
npm run dev:worker
```

After startup:
- Landing: http://localhost:5173
- Customer: http://localhost:5174
- Broker: http://localhost:5175
- Worker: http://localhost:5176
- API health: http://localhost:5000/api/health

## Build for Production

From root:

```bash
npm run build
```

This runs `build` for all workspaces where the script exists.

## Application Workflow

### 1) Config + App Linking

- Landing app calls `GET /api/config`.
- Backend returns role app URLs and main API URL from backend env.
- Landing uses those values for role redirects.

### 2) Authentication Flow

- Signup/login endpoints:
  - `POST /api/auth/signup`
  - `POST /api/auth/signup/verify`
  - `POST /api/auth/forgot-password/request`
  - `POST /api/auth/forgot-password/verify`
  - `POST /api/auth/login`
- On success, backend returns user + JWT token.
- Signup now requires email verification: first call `/auth/signup`, then verify OTP with `/auth/signup/verify`.
- Forgot password flow uses email OTP: request code, then verify and set a new password.
- Email notifications sent by backend:
  - Signup verification OTP email.
  - Signup success/welcome email after verification.
  - Forgot-password OTP email.
  - Password reset success email.
  - Account deletion confirmation email.
- Role apps verify token using `GET /api/auth/me`.
- Session is stored in localStorage per role app.

### 3) Cross-Role Navigation

- Landing provides role-based entry points.
- Role apps support dedicated `/login` and `/signup` routes.
- If a user is unauthenticated, interactive actions route to login pages.
- Role switching is supported via `POST /api/auth/switch-role`.
- Dashboard logo image + logo text in role apps navigate to the landing app (`VITE_LANDING_APP_URL` with local/prod fallback).

### 4) Booking Lifecycle (high level)

1. Customer creates booking (`POST /api/bookings`).
2. Matching workers see pending requests.
3. Worker accepts/rejects (`PATCH /api/worker/bookings/:bookingId`).
4. Customer can cancel within a 10-minute window.
5. Completed jobs can be paid/reviewed by customer.
6. Broker commission and worker net values are computed by backend helpers.

### 5) Broker-Worker Linking

- Broker accounts have a generated 6-char broker code.
- Worker profile can attach to broker via broker code.
- Broker dashboards aggregate linked worker data and completed booking commissions.

### 6) Dashboard UX Behavior

- Mobile nav uses a 3-dot menu for route sections only.
- Profile menu is separate on mobile and contains account actions (profile/switch role/logout).
- Quick menus (notification/profile/mobile-nav) auto-collapse on outside click/tap, `Escape`, resize, blur, route changes, and real scroll movement.
- Scroll auto-collapse includes a small mobile jitter guard so menus still open reliably at any scroll position.
- Modal overlays use blur backgrounds (`backdrop-blur`) across auth/role-switch flows.
- Settings header includes a plain text navigation link: `← back to dashboard`.
- Browser tab icon (favicon) uses the Omni logo in landing + all role apps.

## API Overview

Main route prefix: `/api`

Core routes:

- Root:
  - `GET /` (returns HTML UI for browser requests, JSON for API clients)
  - `GET /api` (returns HTML UI for browser requests, JSON for API clients)

- Health/config:
  - `GET /health`
  - `GET /config`

- Auth:
  - `POST /auth/signup`
  - `POST /auth/signup/verify`
  - `POST /auth/forgot-password/request`
  - `POST /auth/forgot-password/verify`
  - `POST /auth/login`
  - `GET /auth/me`
  - `POST /auth/switch-role`

- Profile:
  - `GET /profile`
  - `PUT /profile`

- Catalog:
  - `GET /services`
  - `GET /workers/available`

- Customer:
  - `GET /customer/dashboard`
  - `POST /bookings`
  - `PATCH /customer/bookings/:bookingId/cancel`
  - `DELETE /customer/bookings/:bookingId`
  - `PATCH /customer/bookings/:bookingId/not-provided`
  - `PATCH /customer/bookings/:bookingId/pay`
  - `PATCH /customer/bookings/:bookingId/review`

- Broker:
  - `GET /broker/dashboard`
  - `GET /broker/workers`
  - `GET /broker/bookings`

- Worker:
  - `GET /worker/dashboard`
  - `GET /worker/reviews`
  - `PATCH /worker/bookings/:bookingId`

## Data Model Overview

### User
- Single user collection with role-based profiles:
  - `customerProfile`
  - `brokerProfile` (includes `brokerCode`)
  - `workerProfile` (includes `servicesProvided`, availability, broker link)
- Unique index on `(email, role)`.

### Booking
- Stores customer, worker, broker linkage, service/time details, pricing, status, rating/feedback.
- Status values include:
  - `pending`, `confirmed`, `in-progress`, `completed`, `cancelled`, `upcoming`, `failed`, `not-provided`

### Service
- Catalog service documents with base price, category, provider count, and rating.

## Troubleshooting

### Port already in use

- Vite servers use `strictPort: true`, so startup fails if taken.
- Free the conflicting process or update the port in:
  - `landing-page/frontend/vite.config.js`
  - `frontend/customer-frontend/vite.config.js`
  - `frontend/broker-frontend/vite.config.js`
  - `frontend/worker-frontend/vite.config.js`

### Backend starts but DB is not connected

- Verify `MONGODB_URI` in `backend/.env`.
- If missing, API runs but without DB-backed features.

### JWT or auth errors

- Ensure `JWT_SECRET` is set and stable while server is running.
- Clear localStorage in browser if using old tokens.

### CORS/API URL issues

- Confirm `VITE_API_URL` values point to `http://localhost:5000/api`.
- Confirm backend is running before opening frontends.

### Logo/Favicon not updating in browser

- Browser favicon and static logo assets are aggressively cached.
- Use a hard refresh (`Ctrl+F5`) after deploy/update.

### Empty dashboards

- This is expected for new databases with no seed data.
- Create users and bookings via UI flows first.

## Security Notes

- Do not commit production secrets to Git.
- Use a strong, unique `JWT_SECRET` per environment.
- Use separate MongoDB users/databases for dev, staging, and production.
- Rotate any credential that has ever been committed publicly.

## Root Scripts

From `package.json`:

- `npm run dev:backend`
- `npm run dev:landing:frontend`
- `npm run dev:customer`
- `npm run dev:broker`
- `npm run dev:worker`
- `npm run build`
