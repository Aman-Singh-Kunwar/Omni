# Omni Features

## Shared UX + Platform Features
1. Role-based monorepo with 4 frontends: landing, customer, worker, broker.
2. Token handoff flow (`?authToken=...`) from landing to role apps with `/auth/me` validation.
3. Per-role local session persistence (`customer`, `worker`, `broker`) with logout cleanup.
4. Guest preview mode with auto-redirect to login when clicking interactive actions.
5. Auto-collapse quick menus for notifications, profile menu, and mobile 3-line navbar menu.
6. Auto-collapse triggers include scroll, resize, window blur, outside click/tap, `Escape`, and route change.
7. Notification dropdowns support unread badge, single-item read, mark-all-read, and clear notifications.
8. Notification read/cleared state is persisted in localStorage per user/role.
9. Role switch modal in each dashboard (calls `/auth/switch-role`) and redirects with fresh token.
10. Collapsible edit sections used across profile and settings forms.
11. Success and error states shown with green/red banners in UI.
12. Success collapse behavior after updates (profile, notification settings, password update).
13. Short error message helper to avoid very long UI error strings.
14. Backend logs success/warn/error events for key account actions and API failures.

## Landing Frontend
1. Public role cards for customer, worker, and broker with direct login/signup actions.
2. URL role query support (`?role=customer|worker|broker`) that auto-redirects to role auth page.
3. Dynamic frontend URL config fetched from backend `/api/config`.
4. Fallback local URLs when config endpoint is unavailable.
5. Shared multi-role auth page with role selector and role-aware routing.
6. Login/signup forms with show/hide password controls and confirm-password in signup.
7. API-based authentication against backend `/auth/login` and `/auth/signup`.
8. Successful auth redirects user to selected role app with auth token.
9. Service showcase, trust sections, and footer contact/location content.
10. Responsive layout for desktop/mobile.

## Customer Frontend
1. Dashboard tabs: Home, Book Service, Bookings, Favorites, Profile, Settings.
2. Service and worker search on home page.
3. Dynamic provider count per service based on currently available workers.
4. Service cards with deterministic price/rating/provider display.
5. Available worker cards with quick booking and favorites toggle.
6. Favorites list persisted per customer in localStorage.
7. Booking form supports:
8. Service-based booking (auto assignment from eligible available workers).
9. Worker-based booking (select one worker and one of that worker services).
10. Discount toggle and payment receipt preview (total, discount, final amount).
11. Date picker and 12-hour time selection (hour/minute/AM-PM).
12. Location and description capture.
13. Booking lifecycle actions:
14. Create booking.
15. Cancel within live 10-minute countdown window.
16. Pay after cancellation window closes.
17. Mark service as not provided.
18. Submit or edit review (rating + feedback).
19. Delete booking entry.
20. Booking cards show status badges and worker contact details when available.
21. Customer notifications for booking confirmed, payment done, and feedback updates.
22. Notification click marks item read and routes user to relevant tab/page.
23. Profile editor for name, email, phone, gender, DOB, bio.
24. Customer DOB rule in UI (`>10 years`) and backend validation.
25. Settings include notification preferences, account password update, logout, and delete account.

## Worker Frontend
1. Dashboard tabs: Overview, Job Requests, Schedule, Earnings, Reviews, Profile, Settings.
2. Worker signup supports optional referral code input (toggle to show/hide field).
3. Referral code validation on client (6 alphanumeric chars, uppercase normalized).
4. Overview cards for total earnings, completed jobs, average rating, pending requests.
5. Job requests list with Accept/Decline actions.
6. Schedule page for assigned/confirmed jobs.
7. Earnings page with recent paid jobs and broker commission visibility.
8. Reviews page showing customer ratings and feedback entries.
9. Worker notifications for new requests, job completion, and earning credits.
10. Notification click marks read and routes to Job Requests, Earnings, or Overview.
11. Profile editor includes name, email, phone, gender, DOB, bio.
12. Worker DOB rule in UI (`18-60`) and backend validation.
13. Services multi-select dropdown with outside-click close behavior.
14. Availability toggle (`isAvailable`) for worker listing control.
15. Broker-linked info shown in profile: broker code (read-only), broker name, commission usage.
16. Broker code is locked in profile and cannot be edited after signup.
17. Settings include notification preferences, account password update, logout, and delete account.

## Broker Frontend
1. Dashboard tabs: Overview, Workers, Bookings, Earnings, Profile, Settings.
2. Overview cards for total workers, active bookings, and broker earnings.
3. Top worker list with ratings, jobs, and broker-side earnings.
4. Workers page shows only workers linked via broker code.
5. Workers page includes availability, services, total/completed jobs, ratings, and broker earnings.
6. Bookings page lists completed linked bookings with customer/worker/service/time/amount.
7. Bookings page highlights broker 5% commission per completed booking.
8. Earnings page summarizes commission totals and recent commission credits.
9. Broker notifications for booking requests, completed jobs, active bookings, and commission credits.
10. Notification click marks read and routes to Bookings or Earnings pages.
11. Profile editor includes name, email, phone, gender, DOB, bio.
12. Broker DOB rule in UI (`18-60`) and backend validation.
13. Broker code displayed read-only for sharing with workers.
14. Settings include notification preferences, account password update, logout, and delete account.

## Backend Features Supporting Frontends
1. Modular route structure (`auth`, `profile`, `customer`, `worker`, `broker`, `catalog`, `health`).
2. Auth split into smaller routers: `publicRoutes`, `roleRoutes`, `accountRoutes`.
3. Profile split into smaller routers: `readRoutes`, `updateRoutes`, `notificationRoutes`.
4. Gmail-only account policy for signup and profile email updates.
5. Role-specific signup/login and role switch flow using JWT.
6. Worker referral (broker code) accepted during worker signup only.
7. Worker broker code update blocked in profile update route after signup.
8. Broker code auto-generation and uniqueness handling for broker accounts.
9. Role-wise DOB validation:
10. Worker/Broker: `18-60`.
11. Customer: older than `10`.
12. Notification settings API with strict boolean validation.
13. Update password API with old-password check and same-password prevention.
14. Delete account API verifies username + password before action.
15. Delete account keeps history/transactions but revokes credentials (`passwordHash` rotation + `deletedCredentialsAt`).
16. Deleted credentials cannot login (`Invalid credentials`).
17. Re-signup for deleted account (same email+role) restores access with new password.
18. Worker deleted-credentials flow sets availability false so deleted workers are excluded from active listings.
19. Account/profile sync helper keeps shared name/email/password/common profile fields aligned across same-email role-family users.
20. Structured backend logging for success actions and short failure reasons.
