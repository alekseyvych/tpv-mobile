# tpv-mobile — Beta Readiness Assessment

> **Date:** May 2026  
> **Version:** see `app.json` → `version`  
> **Scope:** tpv-mobile only. Backend (`core-platform`) readiness is tracked separately.  
> **Assessment basis:** Phase 1–5 implementation, permission audit, and full validation suite.

---

## Table of Contents

1. [What Is Done](#1-what-is-done)
2. [Known Limitations](#2-known-limitations)
3. [Must-Pass Flows Before Beta Release](#3-must-pass-flows-before-beta-release)
4. [Release Blockers (P0)](#4-release-blockers-p0)
5. [Non-Blocking Items (P1 / P2)](#5-non-blocking-items-p1--p2)
6. [Validation State](#6-validation-state)

---

## 1. What Is Done

### 1.1 Foundation

- Expo SDK 51 + React Native + TypeScript foundation.
- ESLint, TypeScript strict-mode, Jest, and expo-doctor validation gates all passing.
- i18n foundation: English and Spanish at full parity (all keys present in both locales).
- Design token system aligned with tpv-front (`colors.ts`, `spacing.ts`, `typography.ts`, `theme.ts`).
- Shared primitive component library: `ScreenLayout`, `Topbar`, `Typography`, `Button`, `Input`, `Card`, `ListItemCard`, `StatusPill`, `EmptyState`, `ErrorState`, `LoadingState`.
- Breakpoints and device profile detection (`useDeviceProfile`, `useDevicePairing`).

### 1.2 Authentication and authorization

- Full-credential login (`POST /auth/login`) with error handling.
- Quick-access / PIN login with role-switching account swap.
- Account swap: clears previous user's restaurant context (`selectedTableId`, `selectedOrderId`) on every swap.
- Centralized auth policy (`src/auth/access.ts`): role hierarchy (`WAITER < CASHIER < MANAGER < ADMIN < SUPER_ADMIN`), permission keyword matching.
- Route-level guards via `canAccessAuthRoute()`: DiningFloor (WAITER+), KitchenDisplay (MANAGER+/KITCHEN), Appointments (MANAGER+), DeviceInfo (MANAGER+), TerminalSelection (TERMINALS_READ or TERMINAL permission).
- 403 error handling with **permission-specific messages** in ProfileScreen and DeviceInfoScreen (not generic errors).
- MANAGER role guard on embedded ProfileScreen: WAITER/CASHIER cannot access the Change Password form even after an account swap.
- Auto-lock: short inactivity (PIN re-entry prompt) and long inactivity (full session end), with configurable timeouts.
- Secure storage: auth tokens in `expo-secure-store`; preferences in `AsyncStorage`.
- Logout does not clear `LocalInstallationContext` (terminal pairing survives logout).

### 1.3 Device pairing

- Pairing wizard with QR scan and manual code entry paths.
- Pairing error, loading, and success screens.
- Unpair and re-pair workflow.
- Terminal context persisted in `AsyncStorage` across restarts.

### 1.4 Terminal selection

- Multi-terminal selection list with mode detection (`RETAIL`, `RESTAURANT`, `PERSONALIZED`).
- Cash shift management: open shift modal with opening balance input.
- `activeCashShiftId` stored in terminal store and required by all POS and restaurant checkout flows.

### 1.5 POS retail checkout

- Catalog browsing: categories and products from backend with loading/empty/error states.
- Cart management: add, quantity increment/decrement, remove, clear.
- Checkout: cash (with change calculation), card, and mixed (cash + card) payment methods.
- Sale lifecycle: `POST /sales` (OPEN) → `POST /sales/{id}/complete` (COMPLETED).
- Idempotency: completion key (UUID) prevents double submission on rapid confirmation.
- Receipt screen after successful sale.
- Pre-sale (`prepareSale`) error handling with retry.

### 1.6 Card payment runtime

- Terminal profile loading from backend with 403, 404, 5xx-specific error messages.
- Card transaction state machine: `idle → loading_profiles → selecting_terminal → executing → done`.
- Status polling every 3 seconds with automatic stop on terminal states (`approved`, `declined`, `cancelled`, `timeout`, `unknown`).
- Cancel, retry, and fallback-to-external actions.
- Polling cleanup on unmount.
- Dev simulator available in `__DEV__` builds (outcome, delay, snapshot inspection).

### 1.7 Restaurant dining flow

- Dining Floor: Skia canvas floor map with zones, panning, and pinch-to-zoom.
- Table status colours and states (available, reserved, occupied).
- Table Detail: order items with status pills, guest count editing.
- Order Creation: product catalog with **extras**, **removable ingredients**, **option groups** (required/optional/multi-select), and **allergen display**.
- Item status advancement: `pending → preparing → ready → served`.
- Payment lock acquisition and conflict detection.
- Resume context: `useWaiterHomeStore` preserves table/order context across navigation.

### 1.8 Restaurant checkout

- Cash, card, and mixed payment methods on restaurant orders.
- Partial item selection (selective checkout of specific order items).
- Dev simulator for card outcome testing in development builds.
- Table freed on successful settlement; returns to available state on floor map.

### 1.9 Kitchen display

- Kitchen order list from `GET /kitchen/orders?station=...`.
- Station selection and switching.
- Per-item status advancement with single in-flight guard.
- **Timing indicator system**: elapsed time label + colour (green < 10min, amber 10–19min, red ≥ 20min).
- Priority classification: `normal`, `high`, `rush` based on elapsed time.
- Legend modal explaining timing colours.
- Auto-poll every 12 seconds.
- 403-specific permission error message.

### 1.10 Appointments

- Appointments list with status tabs (all, scheduled, confirmed, completed, cancelled, no-show).
- Search and status filter.
- List view and calendar view toggle.
- Appointment detail: full info, cancel, send reminder.
- Book new appointment: staff selector, availability check, customer selector, confirmation.
- Access-guarded: requires MANAGER or APPOINTMENT permission.

### 1.11 Settings

- Profile screen with role-guarded Change Password (requires MANAGER+).
- Device Info screen with terminal context refresh/save/clear — all 403 errors caught and shown with permission-specific messages.
- Inactivity settings: configurable short and long timeouts with `minutes + seconds` granularity and validation.
- Quick reentry method: PIN_ONLY, PIN_OR_PASSWORD, PASSWORD_ONLY.
- Language settings: English / Spanish with instant apply and persistence.
- Logout with confirmation.

### 1.12 Offline detection

- `useOfflineDetection` hook via `@react-native-community/netinfo`.
- Online/offline status subscribed reactively.
- Offline mutation queue infrastructure in place (`offline.store.ts`, `storage.ts`).
- API client queues mutations when request does not reach backend.
- Home screen shows online/offline/syncing indicators.

### 1.13 Analytics

- `AnalyticsService` tracks `sale.completed` and `payment.completed` events.
- `useAnalytics` hook available for additional event tracking.

---

## 2. Known Limitations

These limitations are known, documented, and accepted for the beta release. They are not regressions.

### 2.1 Auth and session management

| Limitation | Detail |
|---|---|
| No mid-session permission sync | If backend permissions change during an active session, the new permissions take effect only on next full login or account swap. No real-time sync on token refresh. |
| No account lockout after wrong PINs | Three (or more) consecutive wrong PINs do not lock the account client-side. Backend enforcement is the control. |
| No audit log for permission denials | 403 errors are shown to the user but not logged client-side. Server logs are authoritative. |
| Terminal selection not cleared after role-downgrade swap | Terminal context is device-scoped. After swap to lower-role user, terminal persists; the backend will enforce on checkout if the new user lacks permission. Error message will display. |

### 2.2 Restaurant features

| Limitation | Detail |
|---|---|
| Split bill per seat | Not implemented. No UI exposed. Backend support pending. |
| Group payment / partial settlement | Not implemented. No UI exposed. Backend support pending. |
| No refund / discount UI guards | Refund and discount actions (if any) do not have frontend role guards. Backend enforces authorization. |

### 2.3 Business intelligence and metrics

| Limitation | Detail |
|---|---|
| Home metrics not live | Metrics section on Home screen renders but values may be zero or placeholder. A dedicated backend metrics feed is not yet connected. |
| Activity feed | Recent activity list may be empty or show incomplete data until the metrics feed is integrated. |

### 2.4 Offline / sync

| Limitation | Detail |
|---|---|
| Offline mutation queue not fully exercised | Queue infrastructure exists but replay on reconnect is not fully tested in all flows. Primarily serves as a safety net. |

---

## 3. Must-Pass Flows Before Beta Release

Every flow in this section must pass on at least one physical **phone** and one physical **tablet** before beta release sign-off. Use `MANUAL_QA.md` (§5–§20) for detailed steps.

| # | Flow | Roles | Terminal mode | Checklist ref |
|---|---|---|---|---|
| 1 | Cold launch → fresh install → pairing wizard → pair terminal | ADMIN | RETAIL | §5 |
| 2 | Full credential login | ADMIN, MANAGER, CASHIER, WAITER | Any | §6.1 |
| 3 | PIN login / quick access | WAITER, CASHIER | Any | §6.3 |
| 4 | Account swap ADMIN→WAITER: permission downgrade and context clear | ADMIN → WAITER | RESTAURANT | §7.1, §7.2 |
| 5 | Account swap WAITER→ADMIN: permission upgrade | WAITER → ADMIN | RESTAURANT | §7.3 |
| 6 | Invalid PIN does not change session | Any | Any | §7.4 |
| 7 | Terminal selection and cash shift open | ADMIN, CASHIER | RETAIL | §8 |
| 8 | POS catalog browse, add to cart, cash checkout | CASHIER | RETAIL | §9 |
| 9 | Card payment: approved transaction | CASHIER | RETAIL | §10.2 |
| 10 | Card payment: declined transaction | CASHIER | RETAIL | §10.3 |
| 11 | Restaurant floor map renders, tables selectable | WAITER | RESTAURANT | §11.1 |
| 12 | Order creation with extras, removables, option groups | WAITER | RESTAURANT | §11.3 |
| 13 | Restaurant cash checkout → table freed | CASHIER | RESTAURANT | §12.1 |
| 14 | Kitchen display loads, item status advancement | MANAGER/KITCHEN | RESTAURANT | §13 |
| 15 | Kitchen timing indicators: green/amber/red correctly shown | MANAGER/KITCHEN | RESTAURANT | §14.1 |
| 16 | Appointments list, detail view, book new | MANAGER | PERSONALIZED | §15 |
| 17 | MANAGER role: Profile Change Password, Device Info accessible | MANAGER | Any | §16.1, §16.3 |
| 18 | WAITER role: Change Password NOT shown; Device Info NOT accessible | WAITER | Any | §16.2 |
| 19 | Language switch EN/ES instant and persistent | Any | Any | §16.5 |
| 20 | Auto-lock short timeout → PIN prompt; long timeout → Login | Any | Any | §6.4 |
| 21 | Offline: network loss during catalog → error shown, retry works | Any | RETAIL | §17.2 |
| 22 | Offline: network loss during card payment polling → no crash | Any | RETAIL | §17.4 |
| 23 | Phone layout: bottom tabs, safe area, loading/empty/error states | Any | RETAIL | §18 |
| 24 | Tablet layout: sidebar nav, split catalog+cart | Any | RETAIL | §19 |

---

## 4. Release Blockers (P0)

The following conditions are **hard blockers** — they must be resolved before any beta distribution.

| ID | Condition | How to detect |
|---|---|---|
| B1 | Any screen shows fake/mocked data silently (no lock indicator, no placeholder label) | QA any data screen with network disconnected or backend unseeded |
| B2 | Auth bypass: user can access a route they are not authorized for by navigating directly | Attempt direct navigation to guarded routes with lower-role account |
| B3 | Crash on any must-pass flow (§3) | Run §3 flows end-to-end |
| B4 | Sale or payment double-charged or phantom charge created | Rapid confirm taps; network loss during checkout |
| B5 | Account swap leaves previous user's protected data visible to new user | §7.1, §7.2 |
| B6 | Card payment leaves OPEN/orphaned transaction on backend | Decline, cancel, and timeout flows in §10 |
| B7 | Permission-specific 403 errors silently swallowed (no message shown to user) | Trigger 403 on ProfileScreen, DeviceInfoScreen |

If any B-level item is observed during QA, **stop the release process** and file a P0 bug using the template in `MANUAL_QA.md §22`.

---

## 5. Non-Blocking Items (P1 / P2)

These items are tracked and accepted for the beta milestone. They must be resolved before production release unless individually re-triaged.

### P1 — Must fix before production, non-blocking for beta

| ID | Area | Description |
|---|---|---|
| P1-1 | Restaurant | Split bill per seat not implemented |
| P1-2 | Restaurant | Group payment / partial settlement not implemented |
| P1-3 | Auth | No mid-session permission sync on token refresh |
| P1-4 | Auth | Terminal selection not cleared after swap to lower-role user |
| P1-5 | Auth | No refund/discount button frontend guards |

### P2 — Polish, low-risk, post-beta

| ID | Area | Description |
|---|---|---|
| P2-1 | Home | Business metrics not connected to live backend feed |
| P2-2 | Auth | No client-side audit log for permission denials |
| P2-3 | Terminal | i18n/copy polish on terminal selection screen |
| P2-4 | Codebase | `ModulePlaceholder.tsx` artifact unreachable but not deleted |
| P2-5 | Auth | No account lockout after consecutive wrong PINs (client-side) |
| P2-6 | Kitchen | Screen brightness / always-on not managed by app on kitchen devices |
| P2-7 | Offline | Offline mutation queue replay not fully exercised in all flows |

---

## 6. Validation State

Last validation run against the code as of this assessment:

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | ✅ Pass — 0 errors |
| Type check | `npm run typecheck` | ✅ Pass — 0 errors |
| Unit / integration tests | `npm run test` | ✅ Pass — 220 / 220 |
| Expo doctor | `npm run doctor` | ✅ Pass — 17 / 17 checks |

> **Validation must be re-run** after any code change before beta distribution. No release should be cut with failing gates.
>
> To re-run all gates:
>
> ```powershell
> # from tpv-mobile/
> npm run lint
> npm run typecheck
> npm run test
> npm run doctor
> ```

---

*End of BETA_READINESS.md*
