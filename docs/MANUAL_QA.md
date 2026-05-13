# tpv-mobile — Manual QA Checklist

> **Date:** May 2026  
> **App version:** see `app.json` → `version`  
> **Scope:** Phone (Android/iOS) and Tablet physical-device testing against a real backend.  
> **Do not test against mocked/stubbed servers.** All flows require a live `core-platform` instance.

---

## 1. Environment Setup

### 1.1 Prerequisites

| Requirement | Notes |
|---|---|
| Node ≥ 20 | `node -v` |
| Expo Go ≥ SDK 51 **or** dev-build APK/IPA | Preferred: dev-build for full native module support |
| Physical Android ≥ 10 or iOS ≥ 16 device | Emulators are acceptable only for smoke checks |
| `core-platform` running and reachable on LAN | See §2 |
| Postgres seeded | See §4 |
| `.env` or `app.json` `extra.apiBaseUrl` set | See §2 |

### 1.2 Starting the dev server

```powershell
# from tpv-mobile/
npx expo start --clear
```

Scan the QR code with Expo Go, or run `npx expo run:android` / `npx expo run:ios` for a dev-build.

### 1.3 Environment variables

| Variable | Example value | Required |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `http://192.168.1.100:3000` | Yes |

Set in a `.env` file at the tpv-mobile root:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000
```

Restart Metro bundler after changing env vars.

---

## 2. Backend URL / LAN Testing Notes

- The app talks directly to `core-platform` REST API; there is no BFF or proxy layer.
- The host machine running `core-platform` and the test device **must be on the same LAN** (same Wi-Fi SSID / no AP isolation).
- Use the **LAN IP** of the host, not `localhost` — `localhost` on a physical device resolves to the device itself.
- Find the LAN IP on macOS/Linux: `ipconfig getifaddr en0`; Windows: `ipconfig` → IPv4 Address.
- Verify reachability before starting: `curl http://<LAN_IP>:3000/health` should return `{"status":"ok"}`.
- If the device cannot reach the backend, check:
  - Firewall rules on the host (allow port 3000 inbound).
  - AP isolation disabled on the router.
  - Both on same VLAN/subnet.
- HTTPS is not required for LAN testing. Production builds must use HTTPS.
- For card-terminal flows, the Adyen/card-terminal device must also be on the same LAN and paired to the same `core-platform` instance.

---

## 3. Test Accounts / Roles Needed

Create the following accounts in `core-platform` before testing. All passwords are test-only.

| Role | Email | PIN | Purpose |
|---|---|---|---|
| `ADMIN` | `admin@test.local` | `1111` | Full access, settings, pairing |
| `MANAGER` | `manager@test.local` | `2222` | Reduced settings, reports |
| `CASHIER` | `cashier@test.local` | `3333` | POS, checkout, card terminal |
| `WAITER` | `waiter@test.local` | `4444` | Dining floor, restaurant orders |
| `KITCHEN` | `kitchen@test.local` | — | Kitchen display (no PIN required in current build) |

> The quick-access / PIN flow requires the account to have a PIN set via `PATCH /auth/change-password` or the web admin panel.

---

## 4. Required Seed Data

All seed data must exist in the database **before** starting manual tests. Use `DEV_SEEDING_EXAMPLES.js` at the workspace root or the Postman collection in `core-platform/postman/`.

### 4.1 Terminals

| Terminal name | Mode | Notes |
|---|---|---|
| `Terminal Retail` | `RETAIL` | For phone POS checklist |
| `Terminal Restaurant` | `RESTAURANT` | For dining floor / restaurant checklist |
| `Terminal Personalizado` | `PERSONALIZED` | For appointments checklist |

### 4.2 Products & Categories

- At least 3 categories with at least 3 products each.
- At least 1 product with a modifier/variant.
- At least 1 product with a kitchen-routed category (tagged for kitchen display).

### 4.3 Customers

- At least 2 customers with name, phone, and email.

### 4.4 Staff / Users

- At least 1 staff member assignable to appointments.

### 4.5 Appointments

- At least 2 upcoming appointments (future date/time) assigned to staff.
- At least 1 past appointment (for history view).

### 4.6 Restaurant Tables

- At least 6 tables with varied zones (e.g., `Terraza`, `Interior`).
- At least 2 tables pre-occupied with open orders (for restaurant flow starting mid-service).

### 4.7 Card Terminal (optional, for payment checklist)

- At least 1 Adyen terminal paired to `core-platform` and reachable on LAN.
- Terminal ID available from `/payment-terminals/terminals`.

---

## 5. Phone Test Checklist

> Device type: **Phone** (portrait-primary). Use `Terminal Retail` mode.

### 5.1 Authentication

- [ ] Cold launch: splash screen shows, then navigates to Login screen.
- [ ] Login with `admin@test.local` + password → lands on Home screen.
- [ ] Logout via More → Logout → confirms session end → returns to Login.
- [ ] Login with wrong password → error toast shown, no crash.
- [ ] Quick-access list loads after successful login (≥ 1 entry if PIN was configured).
- [ ] PIN login via quick-access → enters PIN → lands on Home.
- [ ] PIN login with wrong PIN → error shown, no crash.
- [ ] Session expiry: wait for token expiry or revoke server-side → app redirects to Login automatically.

### 5.2 Device Pairing

- [ ] After first login, pairing wizard appears if no terminal is paired.
- [ ] Select `Terminal Retail` from list → pairing completes → Home visible.
- [ ] Unpair from More → Settings → Device → Unpair → confirm → returns to pairing wizard.
- [ ] Re-pair with a different terminal → context updates without restart.

### 5.3 Terminal Selection

- [ ] If multiple terminals available, selection list shows all terminals.
- [ ] Selecting a terminal persists across app restarts (AsyncStorage backed).
- [ ] Terminal name visible on Home screen header or settings.

### 5.4 Home Screen

- [ ] Home screen loads without error after pairing.
- [ ] Quick-action buttons visible (New Sale, etc.).
- [ ] Metrics section renders (values may be placeholder/zero if no sales yet — this is P2, non-blocking).
- [ ] No crash or blank screen on any data-loading state.

### 5.5 POS / Catalog

- [ ] Product catalog loads: categories listed, tapping a category shows products.
- [ ] Add product to cart → quantity and price update correctly.
- [ ] Add multiple products → totals correct.
- [ ] Remove product from cart → totals update.
- [ ] Clear cart → cart empty.
- [ ] Modifier/variant selection works (if applicable to seeded product).

### 5.6 Checkout (Cash)

- [ ] Proceed to checkout → order summary correct.
- [ ] Select cash payment → confirm → sale created (`POST /sales`).
- [ ] Receipt screen shown after completion.
- [ ] Sale appears in history (if history view is available).

### 5.7 More / Navigation

- [ ] More tab accessible from bottom navigation.
- [ ] All enabled menu items navigate without crash.
- [ ] Locked/unlicensed modules show lock indicator and do not navigate to a fake screen.

---

## 6. Tablet Test Checklist

> Device type: **Tablet** (landscape-primary). Use `Terminal Retail` mode initially, then switch to `Terminal Restaurant`.

### 6.1 Layout & Shell

- [ ] App launches in tablet shell (split-pane or side-nav layout, not phone bottom-nav).
- [ ] Catalog panel and cart panel visible simultaneously in landscape.
- [ ] Rotation to portrait: layout adapts gracefully (no overlap, no cut-off text).
- [ ] All phone checklist items (§5) also pass on tablet.

### 6.2 Dining Floor (Restaurant mode)

- [ ] Switch terminal to `Terminal Restaurant` → app shows Dining Floor as primary screen.
- [ ] Floor map renders all seeded tables with correct zone labels.
- [ ] Table status colours correct: free (default), occupied (highlighted).
- [ ] Tap occupied table → order detail opens.
- [ ] Tap free table → new order starts.

### 6.3 Tablet-Specific UI

- [ ] Font sizes and tap targets are tablet-appropriate (not phone-scaled).
- [ ] Modal dialogs do not overflow screen bounds.
- [ ] Keyboard (soft) does not obscure input fields.

---

## 7. Kitchen Display Checklist

> Device type: Phone or Tablet. Use `Terminal Restaurant` mode. Kitchen account or admin account.

- [ ] Kitchen Display screen accessible from Home or More navigation.
- [ ] Pending orders load from `GET /kitchen/orders` after entering the screen.
- [ ] Each order card shows: table number (or order ID), item list, item statuses.
- [ ] Tap an item to mark as `READY` → `PATCH /kitchen/orders/{orderId}/items/{itemId}/status` called.
- [ ] Item status updates immediately in the UI after server response.
- [ ] Completed order (all items `READY`) moves to completed section or disappears.
- [ ] Sending a new order from POS/restaurant (on a different device/session) → kitchen display updates (pull-to-refresh or auto-poll).
- [ ] Empty state shown when no pending orders.
- [ ] No crash when order list is large (≥ 10 simultaneous orders if seed allows).

---

## 8. Payment / Card Terminal Checklist

> Requires physical Adyen terminal paired to `core-platform`. Skip if no card terminal available; mark N/A.

- [ ] Card payment option visible on Checkout screen when card terminal is configured.
- [ ] Initiate card payment → request sent to `POST /payments/card-transactions/initiate` (or equivalent).
- [ ] Card terminal prompts for card on the physical device.
- [ ] Approved transaction → app shows success, receipt screen displayed.
- [ ] Declined transaction → app shows decline message, user can retry or cancel.
- [ ] Cancelled by user on terminal → app returns to checkout, no orphaned sale.
- [ ] Network loss mid-transaction → app handles gracefully (timeout or error shown, no phantom charge).
- [ ] Card terminal settings accessible (terminal ID, timeout) from Settings screen (ADMIN/MANAGER role).

---

## 9. Restaurant Checkout Checklist

> Device type: Tablet preferred. `Terminal Restaurant` mode. WAITER or CASHIER role.

- [ ] Open table with active order → order summary shown.
- [ ] Add items to existing table order → `POST /restaurant/orders` or item append endpoint called.
- [ ] Remove item from table order → order updates.
- [ ] Send items to kitchen → kitchen display (§7) reflects new items.
- [ ] Full table checkout → payment flow initiated → `POST /restaurant/orders/{id}/payment` or equivalent.
- [ ] Cash payment for full table → sale completed, table freed.
- [ ] Card payment for full table → see §8 steps for card flow.
- [ ] **P1 (not yet implemented — skip and log):** Split bill per seat.
- [ ] **P1 (not yet implemented — skip and log):** Group payment / partial settlement.
- [ ] Umbrella sale (combined table items) → sale structure correct in receipt.
- [ ] Closed table returns to free state on floor map.
- [ ] Multiple tables can have simultaneous open orders (no state bleed between tables).

---

## 10. Appointment Checklist

> Device type: Phone or Tablet. `Terminal Personalizado` (personalized) mode. MANAGER or ADMIN role.

- [ ] Appointments screen loads from Home or More navigation.
- [ ] Upcoming appointments list loads (`GET /appointments`).
- [ ] Appointment card shows: customer name, staff, service, date/time.
- [ ] Tap appointment → detail view opens with full info.
- [ ] Cancel appointment → `POST /appointments/{id}/cancel` called → appointment removed from upcoming list.
- [ ] Send reminder → `POST /appointments/{id}/remind` called → success toast shown.
- [ ] Check availability → `GET /appointments/availability` called for a given date/staff.
- [ ] Customer list accessible (`GET /customers`) from appointment creation (if creation is implemented).
- [ ] Staff list accessible (`GET /users`) from appointment assignment.
- [ ] Past appointments accessible in history tab (if present).
- [ ] Empty state shown when no upcoming appointments.
- [ ] No crash with concurrent appointments for same time slot.

---

## 11. Reduced Settings Checklist

> MANAGER role (not ADMIN). Verifies that settings are scoped to non-destructive operations.

- [ ] Settings screen accessible from More navigation.
- [ ] MANAGER sees reduced settings list (not full admin options).
- [ ] Profile / account info: name and email readable.
- [ ] Change password flow: `POST /auth/change-password` called → success confirmation.
- [ ] Language/locale selector: changes app language, persists on restart.
- [ ] Theme selector (if present): changes theme, persists.
- [ ] Device info section: shows terminal name, pairing status.
- [ ] Logout all sessions option: `POST /auth/logout-all` called → redirects to Login.
- [ ] ADMIN-only settings (e.g., terminal management, license) are **not visible** to MANAGER.
- [ ] No setting action crashes the app when confirmed.
- [ ] Settings changes (language, theme) do not reset the active session or cart.

---

## 12. Known P1 / P2 Items

These items are **accepted as non-blocking** for the current release. Do not file them as new bugs — they are already tracked.

| Priority | Area | Description | Expected behaviour |
|---|---|---|---|
| P1 | Restaurant | Split bill per seat not implemented | Option not shown in UI — correct. Do not expose fake split UI. |
| P1 | Restaurant | Group payment / partial settlement not implemented | Option not shown in UI — correct. Do not expose fake group-pay UI. |
| P2 | Home | Business metrics / activity feed not connected to a dedicated backend feed | Metrics section renders but may show zeros or static values. Not a crash. |
| P2 | Terminal selection | Presentational copy / i18n polish pending | Text may be in default locale; functionality correct. |
| P2 | Codebase | `ModulePlaceholder.tsx` artifact exists but is unreachable at runtime | No user-facing impact. No navigation path reaches it. |

If you encounter a screen that **shows fake/mocked data silently without a lock indicator**, that is a **P0 regression** — file immediately.

---

## 13. Bug Report Template

Copy and fill in for each issue found during manual QA.

```
## Bug Report

**Date:** YYYY-MM-DD
**Tester:**
**Device:** (e.g., Samsung Galaxy S23, Android 14)
**App build:** (version from app.json or Expo build ID)
**Backend version:** (core-platform git hash or version tag)
**Terminal mode:** (RETAIL / RESTAURANT / PERSONALIZED)
**Role:** (ADMIN / MANAGER / CASHIER / WAITER)

### Priority
[ ] P0 – Crash / data loss / fake data silently shown
[ ] P1 – Core flow broken, workaround exists
[ ] P2 – Cosmetic / copy / minor UX

### Section
(Refer to checklist section number, e.g., §5.6 Checkout)

### Steps to Reproduce
1.
2.
3.

### Expected Result


### Actual Result


### Screenshot / Screen recording
(attach or paste link)

### Network log (if applicable)
(API call that failed, status code, response body excerpt)

### Additional notes

```

---

*End of MANUAL_QA.md*
