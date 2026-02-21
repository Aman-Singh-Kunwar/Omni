# Omni Features

## Shared UX + Platform Features
- Role-based monorepo with 4 frontends: landing, customer, worker, broker.
- Token handoff flow (`?authToken=...`) from landing to role apps with `/auth/me` validation.
- Per-role local session persistence (`customer`, `worker`, `broker`) with logout cleanup.
- Guest preview mode with auto-redirect to login when interactive actions are clicked.
- Quick-menu auto-close for notifications, profile menu, and mobile 3-dot navbar menu.
- Auto-close triggers include outside click/tap, scroll, resize, window blur, `Escape`, and route change.
- Notification dropdowns support unread badge, single-item read, mark-all-read, and clear notifications.
- Notification read/cleared state is persisted in localStorage per user and role.
- Role switch modal in each dashboard (calls `/auth/switch-role`) and redirects with fresh token.
- Realtime booking updates via Socket.IO (`booking:changed`) for faster cross-role sync.
- Modal overlays use blur backgrounds (`backdrop-blur`) for auth/share/switch-role flows.
- Mobile page headers use `ArrowLeft + Back` pattern with previous-route navigation and dashboard fallback.
- Dashboard logo image and text navigate to landing app URL (`VITE_LANDING_APP_URL`).
- Browser favicon uses Omni logo across landing and all role apps.

## Landing Frontend
- Public role cards for customer, worker, and broker with direct login/signup actions.
- URL role query support (`?role=customer|worker|broker`) with role-aware routing.
- Dynamic frontend URL config fetched from backend `/api/config` with local fallbacks.
- Shared multi-role auth page with mobile role rail and slide-in role panel.
- Login/signup forms with show/hide password and signup confirm-password.
- API-based authentication against backend `/auth/login` and `/auth/signup`.
- Successful auth redirects users to selected role app with auth token.
- Responsive marketing sections, FAQ accordion with plus-toggle icon, and footer contact blocks.

## Customer Frontend
- Dashboard tabs: Home, Book Service, Bookings, Favorites, Profile, Settings.
- Service and worker search on home page.
- Dynamic provider count per service based on currently available workers.
- Service cards with deterministic price/rating/provider display.
- Available worker cards with quick booking and favorites toggle.
- Favorites persisted per customer in localStorage.
- Booking form supports service-based auto assignment and worker-based direct booking.
- Booking receipt preview supports discount toggle (total, discount, final amount).
- Booking form captures date, 12-hour time (hour/minute/AM-PM), location, and description.
- Booking lifecycle actions: create, cancel (10-minute window), pay, mark not-provided, review/edit, delete.
- Booking cards show status badges and worker contact details when available.
- Customer notifications for booking confirm, payment done, and feedback updates.
- Notification click marks read and routes user to relevant tab/page.
- Profile editor for name, email, phone, gender, DOB, bio.
- Profile save button is disabled until data changes; success banner auto-hides after 5 seconds.
- Phone validation enforced in profile UI: digits only, length 10-13.
- Gender options are limited to: prefer not to say, male, female, other.
- Settings include notification preferences, password update, logout, and delete account.
- Mobile navigation keeps section links in 3-dot menu and account actions in profile dropdown.

## Worker Frontend
- Dashboard tabs: Overview, Job Requests, Schedule, Earnings, Reviews, Profile, Settings.
- Worker signup supports optional referral code with client-side uppercase 6-char validation.
- Overview cards for total earnings, completed jobs, average rating, and pending requests.
- Job request management with Accept/Decline actions.
- Schedule page for assigned/confirmed jobs.
- Earnings page with paid-job history and broker commission visibility.
- Reviews page for customer ratings and feedback entries.
- Worker notifications for requests, job completion, and earning credits.
- Notification click routes to Job Requests, Earnings, or Overview and marks notification read.
- Profile editor includes name, email, phone, gender, DOB, bio, services, availability, and broker linkage details.
- Worker profile broker code is read-only after signup.
- Profile save button is disabled until data changes; success banner auto-hides after 5 seconds.
- Phone validation enforced in profile UI: digits only, length 10-13.
- Gender options are limited to: prefer not to say, male, female, other.
- Settings include notification preferences, password update, logout, and delete account.

## Broker Frontend
- Dashboard tabs: Overview, Workers, Bookings, Earnings, Profile, Settings.
- Overview cards for total workers, active bookings, and broker earnings.
- Top worker list shows commission, rating, and jobs; mobile keeps stats aligned on right side.
- Workers page shows only workers linked via broker code.
- Workers page includes availability, services, total/completed jobs, ratings, and broker earnings.
- Bookings page lists completed linked bookings with customer/worker/service/time/amount and broker 5% commission.
- Earnings page summarizes commission totals and recent commission credits.
- Broker notifications for booking requests, completed jobs, active bookings, and commission credits.
- Notification click routes to Bookings or Earnings and marks notification read.
- Broker profile includes read-only broker code plus share popup with blur backdrop, copy icon, rules, and stats.
- Workers page includes matching share-code popup flow (mobile and desktop variants).
- Mobile workers header uses right-side 2-row controls: Back (top) and Share (bottom).
- Profile save button is disabled until data changes; success banner auto-hides after 5 seconds.
- Phone validation enforced in profile UI: digits only, length 10-13.
- Gender options are limited to: prefer not to say, male, female, other.
- Settings include notification preferences, password update, logout, and delete account.

## Backend Features Supporting Frontends
- Modular route structure (`auth`, `profile`, `customer`, `worker`, `broker`, `catalog`, `health`).
- Auth split routers: `publicRoutes`, `roleRoutes`, `accountRoutes`.
- Profile split routers: `readRoutes`, `updateRoutes`, `notificationRoutes`.
- Gmail-only account policy for signup and profile email updates.
- Role-specific signup/login and role switch flow using JWT.
- Socket.IO server with authenticated connections and role/user rooms.
- Realtime booking event broadcast (`booking:changed`) consumed by customer/worker/broker dashboards.
- Worker referral (broker code) accepted during worker signup only.
- Worker broker code update blocked in profile update route after signup.
- Broker code auto-generation and uniqueness handling for broker accounts.
- Role-wise DOB validation:
  - Worker/Broker: 18-60.
  - Customer: older than 10.
- Phone validation in profile updates: optional but if provided must be digits only and 10-13 chars.
- Gender validation accepts: `male`, `female`, `prefer_not_to_say`, `other`.
- Notification settings API with strict boolean validation.
- Update password API with old-password check and same-password prevention.
- Delete account API verifies username + password before action.
- Delete-account flow preserves records but revokes credentials (`passwordHash` rotation + `deletedCredentialsAt`).
- Re-signup for deleted account (same email + role) restores access with new password.
- Worker deleted-credentials flow sets availability false to remove from active listings.
- Same-email role-family sync helper keeps shared name/email/password/common profile fields aligned.
- Signup and forgot-password OTP persisted in pending collections with expiry indexes and attempt controls.
- OTP expiry windows configurable via env.
- Professional email templates for verification, welcome, reset, and account deletion.
- Root API endpoints (`/` and `/api`) return browser-friendly HTML and JSON for API clients.
