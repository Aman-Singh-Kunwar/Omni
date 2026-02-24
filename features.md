# Omni Features

## Shared UX + Platform Features

- Role-based monorepo with 4 frontends: landing, customer, worker, broker.
- Token handoff flow (`?authToken=...`) from landing to role apps with `/auth/me` validation.
- Per-role session persistence (`customer`, `worker`, `broker`) with `Remember me` support:
  - checked: persistent login (`localStorage`)
  - unchecked: session login (`sessionStorage`, clears on tab/window close)
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
- Loading screens show animated Omni logo spinner (spinning ring + logo centered) with message text instead of plain text placeholders.
- Shared map utility library (`@shared/utils/mapUtils`) centralises Haversine distance, ETA formatting, OSRM route fetching, and Nominatim geocoding used by both live-tracking modals — eliminating duplication between customer and worker frontends.

## Landing Frontend

- Public role cards for customer, worker, and broker with direct login/signup actions.
- URL role query support (`?role=customer|worker|broker`) with role-aware routing.
- Dynamic frontend URL config fetched from backend `/api/config` with local fallbacks.
- Shared multi-role auth page with mobile role rail and slide-in role panel.
- Mobile role panel transition is suppressed on first render to prevent a brief flash of the panel on page refresh.
- Login/signup forms with eye-based show/hide password and signup confirm-password.
- Login/signup forms include `Remember me` option for persistent or session-only auth.
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
- Booking location includes manual text entry plus map-picker modal with:
  - blur backdrop over full page (including navbar)
  - map search field and pin selection
  - current location shortcut
  - street/satellite style switch
  - map wheel zoom only while hovering the map area
- Booking lifecycle actions: create, cancel (10-minute window), pay, mark not-provided, review/edit, delete.
- Booking cards show status badges and worker contact details when available.
- "Track Worker" button on bookings with confirmed/in-progress/upcoming status (when worker is assigned).
- Live Tracking modal shows worker's real-time GPS position on a Leaflet map with:
  - Road route between worker and customer via OSRM routing API (re-fetched every 5 s as worker moves; stale requests cancelled with AbortController)
  - Distance and ETA display (Haversine great-circle distance at 30 km/h)
  - Street/Satellite tile toggle (OpenStreetMap vs Esri World Imagery)
  - Distinct map pins: blue standard pin for exact customer GPS location, green dot for worker position
  - When no GPS coordinates are stored, customer text address is geocoded via Nominatim with progressive comma-split fallback (tries increasingly broad sub-strings, rejects results wider than 50 km) and shown as a blue approximate-area circle
- Customer notifications for booking confirm, payment done, and feedback updates.
- Notification click marks read and routes user to relevant tab/page.
- "Chat" button on confirmed/in-progress/upcoming bookings (when worker is assigned); opens real-time chat modal:
  - WhatsApp-style delivery ticks: single gray ✓ (sending), double gray ✓✓ (delivered), double blue ✓✓ (read by other side)
  - Real-time Online/Offline presence indicator — shows when the worker has the chat open
  - Select messages by double-click; toggle additional messages via circular tick; delete or edit own messages
  - Edit mode with banner indicator and Escape-to-cancel; edited messages marked with "(edited)" label
  - Chat locked (view-only) once booking is completed, cancelled, or not-provided
  - Message history loaded from server on open; messages persist in MongoDB (capped at 200 per booking)
  - Mobile: slide-up animation when opening; message bubbles capped at 75% of chat panel width
- Profile editor for name, email, phone, gender, DOB, bio.
- Profile save button is disabled until data changes; status banners auto-hide after 5 seconds.
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
- "View Customer Location" button on schedule jobs that include a GPS location or typed address.
- Customer Location modal shows customer's GPS pin on a Leaflet map with:
  - Start/stop location sharing toggle — streams worker's live GPS to customer via Socket.IO (`worker:location` events)
  - Road route between worker and customer via OSRM routing API (stale requests cancelled with AbortController)
  - Street/Satellite tile toggle (OpenStreetMap vs Esri World Imagery)
  - Red pin for exact customer GPS location, blue dot for worker's live position
  - When no GPS coordinates are stored, customer text address is geocoded via Nominatim with progressive comma-split fallback and shown as a red approximate-area circle
- Earnings page with paid-job history and broker commission visibility.
- Reviews page for customer ratings and feedback entries.
- Worker notifications for requests, job completion, and earning credits.
- Notification click routes to Job Requests, Earnings, or Overview and marks notification read.
- "Chat" button on each scheduled job; opens real-time chat modal with the customer (same feature set as customer chat: ticks, presence, select/delete/edit, lock, history, mobile slide-up).
- Profile editor includes name, email, phone, gender, DOB, bio, services, availability, and broker linkage details.
- Worker profile broker code is read-only after signup.
- Profile save button is disabled until data changes; status banners auto-hide after 5 seconds.
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
- Profile save button is disabled until data changes; status banners auto-hide after 5 seconds.
- Phone validation enforced in profile UI: digits only, length 10-13.
- Gender options are limited to: prefer not to say, male, female, other.
- Settings include notification preferences, password update, logout, and delete account.

## Backend Features Supporting Frontends

- Modular route structure (`auth`, `profile`, `customer`, `worker`, `broker`, `catalog`, `health`).
- Auth routes split into grouped modules:
  - `auth/public/*` (signup/password/session public flows)
  - `auth/roleRoutes.js`
  - `auth/account/*` (update-password/delete-account/logout)
- Profile split routers: `readRoutes`, `updateRoutes`, `notificationRoutes`.
- Customer booking routes split into sub-routers:
  - `customer/booking/createRoutes.js`
  - `customer/booking/lifecycleRoutes.js`
  - `customer/booking/settlementRoutes.js`
- Shared backend route helpers split into dedicated modules (`helpers/auth`, `helpers/broker`, `helpers/booking`, `helpers/worker`) with barrel export.
- Gmail-only account policy for signup and profile email updates.
- Role-specific signup/login and role switch flow using JWT.
- Socket.IO server with authenticated connections and role/user rooms.
- Realtime booking event broadcast (`booking:changed`) consumed by customer/worker/broker dashboards.
- `join:booking` socket event creates authenticated per-booking rooms (`booking:{id}`) for live location data.
- `worker:location` socket event validates worker role and broadcasts GPS coordinates to the booking room.
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
- Booking model default location is now empty (no hardcoded city fallback).
- Booking model stores `locationLat` and `locationLng` GPS fields persisted at booking creation for live tracking use.
- GPS coordinate validation on booking creation: latitude clamped to −90…90, longitude to −180…180; out-of-range values stored as null.
- Socket `worker:location` handler validates coordinate bounds before broadcasting to prevent garbage data reaching the tracking map.
- Real-time customer–worker chat:
  - `chatMessages` embedded array added to Booking model (`_id:false`, `messageId`, `senderId`, `senderName`, `senderRole`, `text`, `edited`, `timestamp`); capped at 200 messages per booking via `$push` + `$slice: -200`.
  - `GET /bookings/:bookingId/chat` REST endpoint: authenticated, participant-only access (matched by userId, name, or email); returns message history.
  - Socket events: `chat:send` (persist + broadcast), `chat:read` (broadcast read receipt), `chat:delete` (own-message-only `$pull`), `chat:edit` (own-message-only `$set` via `$elemMatch` + positional operator), `chat:presence` (relay online/offline status to booking room participants).
  - Chat eligible statuses: `confirmed`, `in-progress`, `upcoming`; messages rejected for other statuses.
  - Sender name populated from authenticated socket user (`name` field included in socket auth User projection).
