# tpv-mobile — Manual QA Checklist

> **Date:** May 2026  
> **App version:** see `app.json` → `version`  
> **Scope:** Phone (Android/iOS) and Tablet physical-device testing against a real backend.  
> **Do not test against mocked/stubbed servers.** All flows require a live `core-platform` instance.

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Backend URL / LAN Setup](#2-backend-url--lan-setup)
3. [Required Users / Roles](#3-required-users--roles)
4. [Required Seed Data](#4-required-seed-data)
5. [Fresh Install / Pairing Tests](#5-fresh-install--pairing-tests)
6. [Auth / Quick Access / PIN Tests](#6-auth--quick-access--pin-tests)
7. [Swap Account Tests](#7-swap-account-tests)
8. [Terminal Selection Tests](#8-terminal-selection-tests)
9. [POS Retail Checkout Tests](#9-pos-retail-checkout-tests)
10. [Card Payment Tests](#10-card-payment-tests)
11. [Restaurant Dining Flow Tests](#11-restaurant-dining-flow-tests)
12. [Restaurant Checkout / Settlement Tests](#12-restaurant-checkout--settlement-tests)
13. [Kitchen / Bar Board Tests](#13-kitchen--bar-board-tests)
14. [Kitchen Timing Tests](#14-kitchen-timing-tests)
15. [Appointments Tests](#15-appointments-tests)
16. [Settings Tests](#16-settings-tests)
17. [Offline / Degraded Behavior Checks](#17-offline--degraded-behavior-checks)
18. [Phone Layout Checklist](#18-phone-layout-checklist)
19. [Tablet Layout Checklist](#19-tablet-layout-checklist)
20. [Kitchen Display Device Checklist](#20-kitchen-display-device-checklist)
21. [Known P1 / P2 Items](#21-known-p1--p2-items)
22. [Bug Report Template](#22-bug-report-template)

---

## 1. Environment Setup

### 1.1 Prerequisites

| Requirement | Notes |
|---|---|
| Node ≥ 20 | `node -v` |
| Expo Go ≥ SDK 51 **or** dev-build APK/IPA | Preferred: dev-build for full native module support |
| Physical Android ≥ 10 or iOS ≥ 16 device | Emulators acceptable only for smoke checks |
| `core-platform` running and reachable on LAN | See §2 |
| Postgres seeded with all required data | See §4 |
| `.env` with `EXPO_PUBLIC_API_BASE_URL` set | See §2 |

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

Create a `.env` file at the tpv-mobile root:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000
```

Restart the Metro bundler after changing env vars.

---

## 2. Backend URL / LAN Setup

- The app talks directly to the `core-platform` REST API — there is no BFF or proxy layer.
- The host machine running `core-platform` and the test device **must be on the same LAN** (same Wi-Fi SSID, AP isolation disabled).
- Use the **LAN IP** of the host, not `localhost`. `localhost` on a physical device resolves to the device itself.
- Find LAN IP — macOS/Linux: `ipconfig getifaddr en0`; Windows: `ipconfig` → IPv4 Address.
- Verify reachability before testing: `curl http://<LAN_IP>:3000/health` must return `{"status":"ok"}`.
- If unreachable, check: firewall rules on host (allow port 3000 inbound), AP isolation disabled, same VLAN/subnet.
- HTTPS is not required for LAN testing. Production builds must use HTTPS.
- For card-terminal flows, the physical card terminal must also be on the same LAN and paired to the same `core-platform` instance.

---

## 3. Required Users / Roles

Create the following accounts in `core-platform` before testing. All passwords are test-only values.

| Role | Email | Password | PIN | Purpose |
|---|---|---|---|---|
| `ADMIN` | `admin@test.local` | `Admin123!` | `1111` | Full access, settings, pairing, device management |
| `MANAGER` | `manager@test.local` | `Manager123!` | `2222` | Reduced settings, reports, kitchen, appointments |
| `CASHIER` | `cashier@test.local` | `Cashier123!` | `3333` | POS, checkout, card terminal |
| `WAITER` | `waiter@test.local` | `Waiter123!` | `4444` | Dining floor, restaurant orders only |
| `KITCHEN` | `kitchen@test.local` | `Kitchen123!` | — | Kitchen display (no PIN configured) |

> **Quick access / PIN login** requires the account to have a PIN set. PINs are set via `PATCH /auth/change-password` or the web admin panel.
>
> **Role hierarchy** (lowest → highest): `WAITER < CASHIER < MANAGER < ADMIN < SUPER_ADMIN`. Each role inherits all lower-role access.

---

## 4. Required Seed Data

All data below must exist **before** starting manual tests. Use `DEV_SEEDING_EXAMPLES.js` at the workspace root or the Postman collection in `core-platform/postman/`.

### 4.1 POS Terminals

| Terminal name | Mode | Notes |
|---|---|---|
| `Terminal Retail` | `RETAIL` | POS / retail checkout checklist |
| `Terminal Restaurant` | `RESTAURANT` | Dining floor / restaurant flow checklist |
| `Terminal Personalizado` | `PERSONALIZED` | Appointments flow checklist |

### 4.2 Products & Categories

- At least 3 categories with at least 3 products each.
- At least 1 product with **extras** (e.g., extra cheese) — used in §11 order creation.
- At least 1 product with **removable ingredients** (e.g., "sin cebolla") — used in §11 order creation.
- At least 1 product with **option groups** (required modifiers, e.g., size: small/medium/large).
- At least 1 product with a **kitchen-routed category** (tagged for kitchen display) — used in §13/§14.
- At least 1 product with **allergen metadata** (for OrderCreation allergen display check).

### 4.3 Customers

- At least 2 customers with name, phone, and email.

### 4.4 Staff / Users

- At least 2 staff members assignable to appointments.
- Staff must have overlapping availability slots for testing concurrent appointment edge cases.

### 4.5 Appointments

- At least 2 **upcoming** appointments (future date/time) assigned to staff.
- At least 1 **past** appointment (for history / completed view).

### 4.6 Restaurant Tables

- At least 8 tables across at least 2 zones (e.g., `Terraza`, `Interior`).
- At least 2 tables pre-occupied with **open orders** (for mid-service join scenarios).
- At least 1 group of joined tables (join group) — if the backend supports table joins.

### 4.7 Card Terminal Payment Profiles

- At least 1 payment terminal profile configured in `core-platform` (`/payment-terminals/terminals`).
- Profile must be reachable on LAN and paired to `core-platform`.
- Terminal ID must be known before starting §10.
- If no physical card terminal is available, **mark §10 items as N/A** and test the dev simulator path instead.

---

## 5. Fresh Install / Pairing Tests

> **Pre-condition:** App installed fresh (or storage cleared). No paired terminal, no stored session. ADMIN account available.

- [ ] Cold launch: splash screen shows briefly, then navigates to Login screen (no crash, no blank screen).
- [ ] Login screen renders: email field, password field, Login button.
- [ ] Login with `admin@test.local` + password → no pairing found → Pairing Wizard appears.
- [ ] Pairing Wizard: FirstInit screen shows device welcome / setup message.
- [ ] Select pairing method: QR scan or manual code entry.
- [ ] **QR scan path:** Camera opens, scan QR from `core-platform` admin panel → pairing completes → `PairingSuccess` screen shown → navigates to Home.
- [ ] **Manual code path:** Enter terminal code manually → pairing completes → `PairingSuccess` screen shown → navigates to Home.
- [ ] After successful pairing, terminal name visible in Home header or Settings.
- [ ] Restart app after pairing → returns directly to Home (no repeat pairing required).
- [ ] Pairing error: enter invalid QR or wrong code → `PairingError` screen shown with retry option.
- [ ] Unpair via Settings → Device Info → Unpair action → confirmation prompt → on confirm, returns to Pairing Wizard.
- [ ] Re-pair with a **different terminal** (e.g., switch from `Terminal Retail` to `Terminal Restaurant`) → terminal context updates without requiring a full logout.
- [ ] After re-pairing, app routes to Home with the new terminal's mode (tab/module visibility reflects new mode).

---

## 6. Auth / Quick Access / PIN Tests

> **Pre-condition:** Multiple accounts with PINs configured (§3). Terminal paired.

### 6.1 Full credential login

- [ ] Login with correct email + password → lands on Home.
- [ ] Login with wrong password → error message shown (not a crash, not a blank screen).
- [ ] Login with non-existent email → error message shown.
- [ ] Login button disabled / loading state active while request is in flight.

### 6.2 Quick access list

- [ ] After login, Home or Login screen shows quick-access list if ≥ 1 user has a PIN configured.
- [ ] Quick-access list shows display name and role of each user.
- [ ] WAITER account entry visible in list (has PIN `4444`).
- [ ] KITCHEN account **not** in quick-access list (no PIN configured).

### 6.3 PIN login

- [ ] Tap WAITER entry in quick-access list → PIN entry prompt appears.
- [ ] Enter correct PIN `4444` → session switches to WAITER → Home visible.
- [ ] Enter wrong PIN → error shown, session NOT changed, no crash.
- [ ] Three consecutive wrong PINs → account not locked in current build (P2 — not blocking, document if behaviour changes).
- [ ] After PIN login as WAITER, tabs and actions reflect WAITER role (no admin options visible).

### 6.4 Auto-lock (inactivity)

- [ ] With default inactivity settings, leave app idle past the short timeout → PIN prompt appears (short lock).
- [ ] Enter correct PIN → session resumes, same screen.
- [ ] Leave app idle past the long timeout → app fully returns to Login screen (long lock / session end).
- [ ] Auth flow routes (Login, Pairing) are exempt from auto-lock (no lock triggers on those screens).
- [ ] Returning app to foreground after background resets the inactivity clock.

### 6.5 Session expiry / token revocation

- [ ] Revoke server-side token (or wait for expiry) → next API call returns 401 → app redirects to Login automatically.
- [ ] Redirected Login screen does not show stale user data.

---

## 7. Swap Account Tests

> **Pre-condition:** Terminal paired. Admin account active. Quick-access list has WAITER and CASHIER entries.
>
> **Purpose:** Verify that after an account swap, the new user's role context replaces the previous user's context with no state bleed.

### 7.1 Context cleanup on swap

- [ ] Login as ADMIN.
- [ ] Navigate to Restaurant Dining Floor — verify ADMIN can see floor and orders.
- [ ] Swap to WAITER via quick-access PIN (`4444`).
- [ ] **Expected:** WAITER lands on Home. Any previously selected restaurant table/order from the ADMIN session is cleared — WAITER does not inherit ADMIN's table context.
- [ ] Navigate to More → verify no ADMIN-only options are visible.

### 7.2 Permission downgrade on swap (ADMIN → WAITER)

- [ ] While active as ADMIN: Settings → Profile → Change Password form visible and actionable.
- [ ] Swap to WAITER via PIN.
- [ ] Settings → Profile — if WAITER has access: Change Password form **not** shown (WAITER lacks MANAGER role required for password change).
- [ ] Settings → Device Info — WAITER cannot access this screen (route requires MANAGER). Attempting navigation shows access-denied message or redirects.
- [ ] Kitchen Display — WAITER cannot access (requires MANAGER or KITCHEN permission). Attempting navigation shows access-denied or no route visible.

### 7.3 Permission upgrade on swap (WAITER → ADMIN)

- [ ] Login as WAITER via PIN.
- [ ] Confirm WAITER has limited access: no Device Info, no Kitchen Display (unless permitted), no Profile password form.
- [ ] Swap to ADMIN via quick-access PIN (`1111`).
- [ ] Settings → Device Info now accessible.
- [ ] Settings → Profile → Change Password form now visible.
- [ ] Kitchen Display tab/button now visible and navigable.

### 7.4 Invalid PIN keeps current session

- [ ] While active as WAITER, attempt quick-access swap to ADMIN but enter wrong PIN.
- [ ] **Expected:** Session remains as WAITER. No partial swap. No crash.

### 7.5 Terminal persistence across swap

- [ ] Select `Terminal Retail` before swap.
- [ ] Swap from ADMIN to CASHIER.
- [ ] **Expected:** `Terminal Retail` remains selected (terminal context is device-scoped, not user-scoped). New user operates on same terminal.

### 7.6 Permission-specific error messages on 403

- [ ] As WAITER, trigger a 403 from a protected action (e.g., navigate to a route that does a protected API call).
- [ ] **Expected:** Error message is specific to the permission denied, not a generic "An error occurred".

---

## 8. Terminal Selection Tests

> **Pre-condition:** Multiple terminals seeded (§4.1). Admin or Manager account active.

- [ ] Terminal Selection screen accessible from Home → "Select terminal" action or Settings → Device Info.
- [ ] List of available terminals fetched from backend and displayed.
- [ ] Each terminal entry shows: name, mode (RETAIL / RESTAURANT / PERSONALIZED), and current status.
- [ ] Select `Terminal Retail` → mode set to RETAIL → bottom tabs reflect RETAIL modules (POS visible, Dining Floor not as primary).
- [ ] Select `Terminal Restaurant` → mode set to RESTAURANT → bottom tabs reflect RESTAURANT modules (Dining Floor prominent).
- [ ] Select `Terminal Personalizado` → mode set to PERSONALIZED → Appointments accessible.
- [ ] Terminal selection **persists across app restarts** (backed by AsyncStorage).
- [ ] Terminal name visible in Home screen header or status block after selection.
- [ ] If no active cash shift for selected terminal → app prompts to open a shift before allowing sales.
- [ ] Open Shift modal: enter opening balance → confirm → shift opens → `activeCashShiftId` stored → POS flow unblocked.
- [ ] Selecting a terminal with ADMIN account works; selecting with CASHIER account works (both have terminal access).
- [ ] WAITER attempting terminal selection: if server-side permission check returns 403, app shows permission-specific error (not generic crash).

---

## 9. POS Retail Checkout Tests

> **Pre-condition:** `Terminal Retail` selected and active shift open. CASHIER or ADMIN account. Products seeded.

### 9.1 Catalog browsing

- [ ] TPV tab / POS screen loads: categories listed, no crash.
- [ ] Tap category → product list for that category loads.
- [ ] Product card shows: name, price. No placeholder "lorem ipsum" text.
- [ ] Loading state shown during fetch. Empty state shown if category has no products.
- [ ] Error state shown (not a crash) if API call fails.

### 9.2 Cart management

- [ ] Tap product → added to cart with quantity 1.
- [ ] Tap same product again → quantity increments.
- [ ] Long-press or decrement control → quantity decrements; at 0, line removed.
- [ ] Multiple different products → all lines in cart, totals correct.
- [ ] Cart total = sum of (unit price × quantity) for all lines.
- [ ] Clear cart → cart empty, total shows 0.

### 9.3 Cash payment

- [ ] Proceed to Checkout → order summary matches cart.
- [ ] Select Cash method.
- [ ] Enter cash tendered amount ≥ total → change calculated correctly (e.g., total €10.00, tendered €20.00 → change €10.00).
- [ ] Confirm → `POST /sales` called → sale `OPEN` created, then `POST /sales/{id}/complete` called → sale `COMPLETED`.
- [ ] Receipt screen shown: sale ID, items, total, payment method.
- [ ] Cart is cleared after successful sale.
- [ ] Back from receipt → returns to empty POS catalog.

### 9.4 Mixed payment (cash + card)

- [ ] Select Mixed method → enter cash portion and card portion.
- [ ] Cash + card amounts must equal total — validation error if not.
- [ ] Confirm → cash portion processed, card portion triggers card runtime (see §10).
- [ ] Both payments recorded on receipt.

### 9.5 Prepare sale error handling

- [ ] If `POST /sales` fails (network error) → error state shown on Checkout/Payment screen, retry button available.
- [ ] If no active cash shift → specific error shown, not a generic crash.
- [ ] Double-tap Confirm (rapid) → only one sale created (idempotency key enforced via UUID on each attempt).

---

## 10. Card Payment Tests

> **Pre-condition:** Physical card terminal paired to `core-platform` (§4.7). `Terminal Retail` or `Terminal Restaurant`. CASHIER/ADMIN account with active cash shift.
>
> If no physical terminal, use the **dev simulator** (visible in `__DEV__` builds) and mark physical terminal steps as N/A.

### 10.1 Terminal profile loading

- [ ] On Payment screen, selecting Card method → terminal profiles fetched (`GET /payment-terminals/terminals` or equivalent).
- [ ] Profile list shows paired terminal(s).
- [ ] If no profiles configured → 404 response → specific error shown: "No terminal payment settings configured for this POS terminal."
- [ ] If 403 response → specific error shown: "Terminal settings access denied."
- [ ] If server error (5xx) → specific error shown: "Payment terminal settings are temporarily unavailable."

### 10.2 Transaction flow (approved)

- [ ] Select terminal profile → confirm → `POST /payments/card-transactions/initiate` called.
- [ ] Physical terminal: prompts for card (tap / insert / swipe).
- [ ] App polls status every 3 seconds (`GET /payments/card-transactions/{id}/status`).
- [ ] Card approved → app transitions to `done` phase → receipt shown.
- [ ] Sale is completed, not left as OPEN.

### 10.3 Transaction flow (declined)

- [ ] Card declined on terminal → app shows declined message.
- [ ] User can retry (new initiation) or cancel.
- [ ] Cancel → returns to payment method selection. No orphaned OPEN transaction.

### 10.4 User cancellation

- [ ] Cancel button on app during `executing` phase → `POST /payments/card-transactions/{id}/cancel` called.
- [ ] Terminal cancels (or times out) → app returns to payment method selection.
- [ ] No phantom charge — verify on card terminal receipt and backend logs.

### 10.5 Timeout

- [ ] Allow transaction to time out on terminal (no card presented within timeout window).
- [ ] App detects `timeout` terminal state during polling → shows timeout message.
- [ ] User can retry or cancel from timeout state.

### 10.6 Network loss mid-transaction

- [ ] Enable airplane mode after initiating card payment (during `executing` phase).
- [ ] App poll fails — error or connection-lost indicator shown (no crash).
- [ ] Restore network → app resumes polling → transaction outcome displayed.
- [ ] No duplicate charges created.

### 10.7 Fallback to external terminal

- [ ] If primary terminal fails, "Fallback to external terminal" option available (if a fallback profile exists).
- [ ] Selecting fallback → `POST /payments/card-transactions/{id}/fallback` called → user prompted to process on external terminal.
- [ ] External confirmation recorded on receipt.

---

## 11. Restaurant Dining Flow Tests

> **Pre-condition:** `Terminal Restaurant` selected, active cash shift open. WAITER or MANAGER account. Tables and products seeded (§4.2, §4.6).

### 11.1 Floor map

- [ ] Dining Floor screen loads: Skia canvas floor map rendered.
- [ ] All seeded tables visible with correct zone groupings (`Terraza`, `Interior`, etc.).
- [ ] Available tables: default/neutral colour. Occupied tables: highlighted/distinct colour.
- [ ] Tap occupied table → Table Detail screen opens for that table's active order.
- [ ] Tap available table → guest count prompt or new order immediately starts.
- [ ] Pinch/zoom on floor map: zoom in/out within bounds (MIN 0.35×, MAX 2×).
- [ ] Pan floor map: drag to pan; tables remain selectable.
- [ ] Map correctly handles large floor layouts (tables near edge do not fall off canvas).

### 11.2 Table Detail

- [ ] Table Detail shows: table number, zone, current status, guest count.
- [ ] Active order items listed with name, quantity, status pill (pending / preparing / ready / served).
- [ ] Guest count editable via prompt (opens modal with number input).
- [ ] Save guest count → API call made → count updated.
- [ ] Add items button → navigates to Order Creation screen.

### 11.3 Order Creation

- [ ] Product catalog loads: categories and products from backend.
- [ ] Search field filters products by name.
- [ ] Add product → quantity 1 added to order draft.
- [ ] **Extras:** product with extras → extras panel shown → tap extra → extra selected and price delta reflected.
- [ ] **Removable ingredients:** product with removable ingredients → ingredient list shown → tap to remove → "sin X" instruction recorded.
- [ ] **Option groups:** required option group → must select before adding; validation error if not selected.
- [ ] Multiple option group choices (multiple-select group) → multiple selections allowed up to `maxSelections`.
- [ ] **Allergens:** product with allergen metadata → allergen icons/labels shown on product card.
- [ ] Add multiple products with different configurations → all appear in order draft.
- [ ] Confirm order → `POST /restaurant/orders/{id}/items` (or equivalent) called → items saved → returns to Table Detail.
- [ ] Newly added items visible in Table Detail item list.

### 11.4 Item status advancement

- [ ] Item at `pending` → tap advance → status changes to `preparing`.
- [ ] Item at `preparing` → tap advance → status changes to `ready`.
- [ ] Item at `ready` → tap advance → status changes to `served`.
- [ ] Item at `served` → no further advancement available.
- [ ] Status change reflected immediately in Table Detail and Kitchen Display (after poll/refresh).

### 11.5 Payment lock

- [ ] Initiate checkout on Table Detail → payment lock acquired for this terminal (`paymentLockedByTerminalId` set).
- [ ] Another terminal attempting checkout on same table → lock conflict handled gracefully (error shown, not a crash).
- [ ] If this terminal holds lock → lock indicator visible. Releasing/cancelling checkout releases the lock.

---

## 12. Restaurant Checkout / Settlement Tests

> **Pre-condition:** Table with active order exists (from §11). CASHIER or MANAGER account.

### 12.1 Cash checkout

- [ ] Table with open order → "Checkout" action available on Table Detail.
- [ ] Restaurant Checkout screen loads: order summary with line items and total.
- [ ] Select Cash method → enter tendered amount.
- [ ] Confirm → sale created and completed → order settled → table freed.
- [ ] Table returns to available (default colour) on floor map.
- [ ] Receipt screen or confirmation shown.

### 12.2 Card checkout

- [ ] Select Card method on Restaurant Checkout → card payment runtime starts (see §10 for card flow).
- [ ] Approved card payment → order settled → table freed.

### 12.3 Mixed checkout (cash + card)

- [ ] Mixed method available on Restaurant Checkout.
- [ ] Enter cash portion and card portion → both must total the order amount.
- [ ] Confirm → cash processed, card runtime starts for card portion.
- [ ] Both payments on receipt.

### 12.4 Partial item selection checkout

- [ ] Select specific items from order (not full bill) → checkout total reflects only selected items.
- [ ] Remaining items stay on the order (order not closed until all items settled).

### 12.5 Split bill and group payment (P1 — not yet implemented)

- [ ] **Do not test these.** No split-bill or group-payment UI should be visible. If exposed: file as P0.

### 12.6 Dev simulator (non-production only)

- [ ] In `__DEV__` build: dev simulator panel visible on card payment step.
- [ ] Set outcome to `approved` → simulate → payment approved.
- [ ] Set outcome to `declined` → simulate → payment declined with message.
- [ ] Set delay to non-zero → polling continues for that many ms before outcome.
- [ ] Dev simulator **not visible** in production builds.

---

## 13. Kitchen / Bar Board Tests

> **Pre-condition:** `Terminal Restaurant` mode. Kitchen account (`kitchen@test.local`) or MANAGER/ADMIN. Orders with kitchen-routed items exist.

### 13.1 Screen access and load

- [ ] Kitchen Display accessible from Home or More navigation.
- [ ] If WAITER attempts direct navigation to KitchenDisplay route → access denied or route not exposed (requires MANAGER or KITCHEN/BAR permission).
- [ ] On entry, kitchen orders load from backend: `GET /kitchen/orders?station=...`.
- [ ] Order cards rendered: table number or order reference, item list, per-item status.

### 13.2 Station selection

- [ ] Station selector visible (e.g., "Kitchen", "Bar", "Grill").
- [ ] Switch station → `GET /kitchen/orders` fetched for new station → display updates.
- [ ] Selected station persists within session (does not reset on screen refocus).

### 13.3 Item status advancement

- [ ] Tap item at `pending` → advances to `preparing` → `PATCH /kitchen/items/{id}/status` called.
- [ ] Tap item at `preparing` → advances to `ready`.
- [ ] Item at `ready` → mark as `served` (if applicable to flow).
- [ ] Only one item advance in-flight at a time (processing indicator shown, other taps ignored while in-flight).
- [ ] Successful advance → item status updated in UI immediately.

### 13.4 Auto-refresh

- [ ] Kitchen display auto-polls every 12 seconds.
- [ ] New order added from POS or Dining (another device) → visible on Kitchen Display after next poll (≤ 12s).
- [ ] Completed / served items removed or moved to done section after poll.

### 13.5 Error and permission handling

- [ ] Network error during load → error message shown (not crash).
- [ ] 403 response → permission-specific error shown ("kitchen.permissionError").
- [ ] Retry after network error → orders reload correctly.

### 13.6 Empty and large states

- [ ] Empty state shown when no pending orders for station.
- [ ] ≥ 10 simultaneous order cards render without layout overflow or crash.

---

## 14. Kitchen Timing Tests

> **Purpose:** Verify the visual age-indicator system for kitchen orders. Orders must be in `pending` or `preparing` state for varying durations.
>
> **Pre-condition:** Kitchen Display open. Seeded orders with varied creation timestamps:
> - Order A: created < 10 minutes ago (fresh)
> - Order B: created 10–19 minutes ago (overdue)
> - Order C: created ≥ 20 minutes ago (critical)

### 14.1 Timing indicator colours

- [ ] Order A (< 10 min elapsed): border/indicator colour is **green** (`#10b981`).
- [ ] Order B (10–19 min elapsed): border/indicator colour is **amber** (`#f59e0b`).
- [ ] Order C (≥ 20 min elapsed): border/indicator colour is **red** (`#ef4444`).
- [ ] Colour changes are **per-item**, not per-order (different items in same order can have different colours if added at different times).

### 14.2 Elapsed time label

- [ ] Each order/item card shows elapsed time label (e.g., "12m", "5m").
- [ ] Elapsed label format: `{minutes}m` (from i18n key `kitchen.elapsedMinutes`).
- [ ] Label updates on each auto-poll cycle (12s interval).

### 14.3 Priority classification

- [ ] Items with elapsed < 10 min shown as `normal` priority (no special urgency styling beyond green).
- [ ] Items with elapsed 10–19 min shown as `high` priority (amber accent).
- [ ] Items with elapsed ≥ 20 min shown as `rush` priority (red accent, most prominent visual treatment).

### 14.4 Timing under order advancement

- [ ] Advancing item status (pending → preparing) does not reset the elapsed timer.
- [ ] Elapsed timer is based on original order creation time, not time of last status change.

### 14.5 Legend

- [ ] Kitchen Display has a legend button/icon.
- [ ] Tapping legend → legend modal opens showing: green = on time, amber = overdue, red = critical.
- [ ] Closing legend returns to kitchen view without any state reset.

---

## 15. Appointments Tests

> **Pre-condition:** `Terminal Personalizado` selected. MANAGER or ADMIN account. Customers, staff, and appointments seeded (§4.3–§4.5).

### 15.1 Appointments list

- [ ] Appointments screen accessible from Home or More navigation (requires MANAGER or APPOINTMENT permission).
- [ ] List loads from `GET /appointments` — appointment cards visible.
- [ ] Each card shows: customer name, staff, service name, date and time.
- [ ] Status tabs visible: All, Scheduled, Confirmed, Completed, Cancelled, No-show.
- [ ] Filter by status → list updates to show only matching appointments.
- [ ] Search field → filter by customer name or service → list updates.
- [ ] Empty state shown when no results match current filters.
- [ ] Error state shown (not crash) if API call fails.

### 15.2 View modes

- [ ] List view: linear scrollable list of appointment cards.
- [ ] Calendar view (if implemented): date-grouped layout; tap a date → shows appointments for that day.
- [ ] Toggle between list and calendar → no data loss, same filter preserved.

### 15.3 Appointment detail

- [ ] Tap appointment card → Appointment Detail screen opens.
- [ ] Detail shows: full customer info, staff assignment, service, start/end time, status, notes (if any).
- [ ] Cancel appointment action → `POST /appointments/{id}/cancel` called → appointment status updated → back to list.
- [ ] Send reminder → `POST /appointments/{id}/remind` called → success toast shown.

### 15.4 Book new appointment

- [ ] Book button → BookAppointment screen opens.
- [ ] Staff selector: fetch and list available staff.
- [ ] Date/time selector: availability check (`GET /appointments/availability`) → only available slots shown.
- [ ] Customer selector: `GET /customers` fetched; search and select customer.
- [ ] Confirm booking → `POST /appointments` called → new appointment appears in list.
- [ ] Validation: booking without required fields shows field-level errors (not crash).

### 15.5 Edge cases

- [ ] Past appointments visible in "Completed" or date-filtered view.
- [ ] Concurrent appointments for same staff at same slot → handled by backend (app shows booking error, not crash).
- [ ] WAITER account attempting to access Appointments → access denied (route requires MANAGER or APPOINTMENT permission).

---

## 16. Settings Tests

> Test with ADMIN and then MANAGER accounts separately. Verify access differences.

### 16.1 Profile screen (ADMIN / MANAGER)

- [ ] Profile screen accessible from More → Settings → Profile.
- [ ] Name and email displayed correctly.
- [ ] MANAGER role: Change Password form visible and functional (`PATCH /auth/change-password`).
- [ ] Password change success → success message shown, session not interrupted.
- [ ] Password change 403 → permission-specific error shown: "You don't have permission to change passwords" (not generic error).

### 16.2 Profile screen (WAITER / CASHIER role guard)

- [ ] Log in as WAITER (PIN swap or direct login).
- [ ] Navigate to Profile screen.
- [ ] Change Password form **not shown** — WAITER lacks MANAGER role.
- [ ] Profile info (name/email) still readable.

### 16.3 Device info screen

- [ ] Device Info accessible with MANAGER or ADMIN (route-guarded).
- [ ] WAITER attempting access → route blocked (no navigation path reaches Device Info from WAITER role).
- [ ] Device Info shows: terminal name, pairing status, device ID, operating mode.
- [ ] Refresh context → `GET /terminals/{id}` called → terminal data refreshed.
  - If 403 → specific error shown: "You don't have permission to refresh device context."
- [ ] Save context → update call made.
  - If 403 → specific error shown: "You don't have permission to save device context."
- [ ] Clear context → confirmation prompt → on confirm, local context cleared.
  - If 403 → specific error shown: "You don't have permission to clear device context."
- [ ] Unpair → returns to Pairing Wizard.

### 16.4 Inactivity settings

- [ ] Inactivity Settings screen accessible from Settings.
- [ ] Short inactivity and long inactivity timeouts shown with minutes and seconds components.
- [ ] Edit short timeout → validation: must be positive (≥ 10s, in 10s steps).
- [ ] Edit long timeout → validation: must exceed short timeout.
- [ ] Seconds field must be in multiples of 10 (0, 10, 20, ... 50).
- [ ] Quick reentry method selector: PIN_ONLY, PIN_OR_PASSWORD, PASSWORD_ONLY.
- [ ] Save → policy persisted → changes take effect on next idle cycle (no app restart needed).
- [ ] Cancel / back → changes discarded.

### 16.5 Language settings

- [ ] Language screen accessible from Settings → Language.
- [ ] English and Spanish options listed.
- [ ] Switch to Spanish → all visible UI text changes to Spanish immediately.
- [ ] Switch back to English → text reverts.
- [ ] Language preference persists across app restarts.

### 16.6 Logout

- [ ] Logout via More → Logout.
- [ ] Confirmation dialog shown before logout.
- [ ] Confirm → session cleared → returns to Login screen.
- [ ] After logout, quick-access list may still be visible (device-scoped, survives logout per AGENTS.md rules).
- [ ] Cancel logout → remains on current screen.
- [ ] Logout does not clear LocalInstallationContext (terminal pairing persists).

### 16.7 ADMIN vs MANAGER visibility

| Setting | ADMIN sees | MANAGER sees |
|---|---|---|
| Profile | ✅ | ✅ |
| Change Password | ✅ | ✅ |
| Device Info | ✅ | ✅ |
| Inactivity Settings | ✅ | ✅ |
| Language | ✅ | ✅ |
| Logout | ✅ | ✅ |
| Terminal Management (if present) | ✅ | ❌ |
| License Info (if present) | ✅ | ❌ |

---

## 17. Offline / Degraded Behavior Checks

> **Purpose:** Verify the app degrades gracefully when the backend is unreachable or the network drops mid-operation. No crash. No silent data loss.
>
> **Method:** Enable airplane mode or disconnect from Wi-Fi at the indicated points.

### 17.1 Offline at launch

- [ ] Disable network → cold launch app.
- [ ] If session exists (not expired): app loads, offline indicator shown (banner or status icon in Home).
- [ ] If no session: Login screen shown. Login attempt → specific error "Cannot connect to server" (not crash).

### 17.2 Network loss during catalog browse (POS)

- [ ] Browse product catalog → mid-load, disable network.
- [ ] Error state shown on screen (not crash). Error includes retry option.
- [ ] Re-enable network → tap Retry → catalog loads successfully.

### 17.3 Network loss mid-checkout (cash)

- [ ] Add items to cart, proceed to Payment screen.
- [ ] After `prepareSale` returns (sale OPEN), disable network.
- [ ] Attempt to confirm payment → API call fails → error shown, no crash.
- [ ] Sale remains in OPEN state on backend (not a phantom completed sale).
- [ ] Re-enable network → retry → sale completes correctly.

### 17.4 Network loss during card payment polling

- [ ] Start card payment → `executing` phase active.
- [ ] Disable network mid-polling.
- [ ] App shows connection-lost state or polling error — no crash.
- [ ] Re-enable network → polling resumes → transaction outcome displayed.
- [ ] No duplicate charge.

### 17.5 Network loss on Kitchen Display

- [ ] Kitchen Display showing orders → disable network.
- [ ] Next auto-poll (12s) fails → error indicator shown (not crash, not blank screen).
- [ ] Manually retry → re-enable network → orders reload.

### 17.6 Network loss during order item advance (kitchen)

- [ ] Tap to advance item status → disable network before response.
- [ ] API call fails → error message shown, item status reverts to previous state in UI.
- [ ] Re-enable network → retry → item status advances correctly.

### 17.7 Offline mutation queue

- [ ] If any offline mutation queue UI is exposed, verify queued operations replay on reconnect.
- [ ] Queue should not grow unboundedly — verify old/failed mutations are cleared on explicit retry or cancel.

### 17.8 Online indicator accuracy

- [ ] App shows "online" when connected and backend is reachable.
- [ ] App shows "offline" or degraded indicator when either network is down or backend unreachable.
- [ ] Indicator updates within a few seconds of actual connectivity change.

---

## 18. Phone Layout Checklist

> **Device:** Phone, portrait orientation. All modes (RETAIL, RESTAURANT, PERSONALIZED).

- [ ] Bottom navigation bar shows: Inicio, TPV (RETAIL mode), Salon (RESTAURANT mode), Cocina (RESTAURANT mode), Mas.
- [ ] Tabs visible match the selected terminal mode (no RETAIL tabs in RESTAURANT mode and vice versa).
- [ ] Bottom nav items have sufficient touch target (≥ 44pt / 44dp).
- [ ] Home screen: status block (user/device/sync info), quick action cards, operational summary.
- [ ] Safe-area respected: content not hidden behind notch, dynamic island, or home indicator.
- [ ] Topbar present on every content screen. Back navigation functional.
- [ ] Soft keyboard: input fields visible above keyboard when focused (no obscured inputs).
- [ ] No text overflow (truncation or wrapping) at default font size.
- [ ] Loading, Empty, and Error states implemented on all list/data screens — no "undefined" or blank white frames.
- [ ] Landscape rotation: layout does not break (acceptable to be portrait-locked if designed that way, but must not crash).

---

## 19. Tablet Layout Checklist

> **Device:** Tablet, landscape-primary orientation.

- [ ] App launches in tablet shell: side rail / sidebar as primary navigation (not phone bottom tabs).
- [ ] POS screen (RETAIL): catalog panel and cart panel visible simultaneously in split layout.
- [ ] Dining Floor (RESTAURANT): full canvas floor map uses available tablet width.
- [ ] Kitchen Display: wider card layout uses tablet width, more items visible without scrolling.
- [ ] Appointments: list and calendar views take advantage of wider layout.
- [ ] Font sizes and tap targets are tablet-appropriate (not phone-scaled small).
- [ ] Modal dialogs centered and bounded — do not overflow or stretch to full screen.
- [ ] All phone checklist items (§18) also pass on tablet (different layout, same functional behaviour).
- [ ] Landscape → portrait rotation: layout adapts without crash, no cut-off content.
- [ ] Information density: more context visible than on phone without reducing accessibility.

---

## 20. Kitchen Display Device Checklist

> **Device:** Dedicated phone or tablet running Kitchen Display mode. KITCHEN account or MANAGER.

- [ ] App can be configured as a kitchen-only device (Kitchen Display as primary shell).
- [ ] No POS, Dining Floor, or Settings modules exposed to KITCHEN account.
- [ ] Full-screen operational layout: order cards fill the screen, no wasted space.
- [ ] Timing indicators (§14) clearly visible on a tablet-sized display from arm's length.
- [ ] Touch targets on "Advance status" buttons large enough for quick kitchen taps (glove-friendly recommended).
- [ ] Auto-poll (12s) keeps display current without manual refresh.
- [ ] Station selector visible and operable.
- [ ] No auto-lock (short lock) interrupts kitchen display during service — or, if auto-lock fires, PIN reentry is quick and non-disruptive.
- [ ] Screen brightness / always-on: verify the device does not dim to black during extended kitchen service (OS-level, out of app scope — but document if observed).

---

## 21. Known P1 / P2 Items

These items are **accepted as non-blocking** for the current release. Do not file them as new bugs — they are tracked. If you observe behaviour that contradicts these, escalate only if there is regression (e.g., a once-passing flow now fails).

| Priority | Area | Item | Expected Behaviour |
|---|---|---|---|
| P1 | Restaurant | Split bill per seat not implemented | Option not shown in UI. Do not expose fake split-bill UI. |
| P1 | Restaurant | Group payment / partial settlement not implemented | Option not shown in UI. Do not expose fake group-pay UI. |
| P1 | Auth | No mid-session permission sync on token refresh | If server-side permissions change during an active session, changes take effect only on next login/swap. Not a crash. |
| P1 | Auth | Terminal selection not cleared after account swap when new user lacks terminal permission | Terminal persists after swap; server will 403 on checkout if new user truly lacks permission. Error will show. |
| P1 | Auth | No refund / discount button guards | Refund and discount flows do not have frontend role guards. Backend enforces. Do not file as P0 unless backend also allows it. |
| P2 | Home | Business metrics not connected to live backend feed | Metrics section renders but may show zeros or placeholder values. Not a crash. |
| P2 | Auth | No audit log for permission denials | 403 errors are caught and shown to the user but not audit-logged client-side. Server-side logs are authoritative. |
| P2 | Terminal | Presentational copy / i18n polish on terminal selection screen | Text may be in default locale. Functionality is correct. |
| P2 | Codebase | `ModulePlaceholder.tsx` artifact exists but is unreachable at runtime | No user-facing impact. No navigation path reaches it. |
| P2 | Auth | Three consecutive wrong PINs do not lock account in current build | Documented limitation. Monitor if behaviour changes before beta. |

> **P0 escalation trigger:** If any screen shows **fake/mocked data silently** (no lock or placeholder indicator), that is a P0 regression — file immediately and block release.

---

## 22. Bug Report Template

Copy and fill in for every issue found during manual QA.

```
## Bug Report

**Date:** YYYY-MM-DD
**Tester:**
**Device:** (e.g., Samsung Galaxy S23, Android 14)
**Form factor:** (Phone / Tablet / Kitchen Display device)
**App build:** (version from app.json or Expo build ID)
**Backend version:** (core-platform git hash or version tag)
**Terminal mode:** (RETAIL / RESTAURANT / PERSONALIZED)
**Role:** (ADMIN / MANAGER / CASHIER / WAITER / KITCHEN)
**Network condition:** (Online / Airplane mode / Intermittent)

### Priority
[ ] P0 – Crash / data loss / fake data silently shown / auth bypass
[ ] P1 – Core flow broken, workaround exists
[ ] P2 – Cosmetic / copy / minor UX issue

### Section reference
(Refer to checklist section, e.g., §9.3 Cash payment)

### Steps to Reproduce
1.
2.
3.

### Expected Result


### Actual Result


### Screenshot / Screen recording
(attach file or paste link)

### Network log (if applicable)
(API endpoint, HTTP method, status code, response body excerpt)

### Console / crash log (if applicable)
(paste relevant lines from Metro or device crash log)

### Additional notes

```

---

*End of MANUAL_QA.md*
