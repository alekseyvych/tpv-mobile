# MOBILE Architecture And UI Standard

This document is the authoritative source for tpv-mobile UI/UX and layout decisions.
All new and refactored screens must conform before feature work continues.

## A. Product identity
- tpv-mobile is the mobile/tablet client of the same TPV product as tpv-front.
- Business semantics, API behavior, and user intent must match tpv-front unless mobile constraints require adaptation.
- Backend contracts from core-platform and behavior from tpv-front are source of truth.
- Visual adaptation is allowed, visual drift is not.

## B. Visual source of truth
- Canonical design tokens live in [tpv-front/src/styles/tokens.css](../tpv-front/src/styles/tokens.css).
- tpv-mobile maps those tokens via:
  - [src/components/theme/colors.ts](src/components/theme/colors.ts)
  - [src/components/theme/spacing.ts](src/components/theme/spacing.ts)
  - [src/components/theme/typography.ts](src/components/theme/typography.ts)
  - [src/components/theme/theme.ts](src/components/theme/theme.ts)
- Rules:
  - Use tokenized color semantics: primary, success, warning, error, info.
  - Preserve typographic hierarchy: title, body, meta, feedback.
  - Preserve 4px spacing rhythm.
  - Preserve radius and elevation scale.
  - Do not introduce ad-hoc design language per screen.

## C. Shared primitive rules
- Mandatory screen primitives:
  - layout: [src/components/ScreenLayout.tsx](src/components/ScreenLayout.tsx)
  - text: [src/components/Typography.tsx](src/components/Typography.tsx)
  - actions: [src/components/Button.tsx](src/components/Button.tsx)
  - input: [src/components/Input.tsx](src/components/Input.tsx)
  - containers: [src/components/Card.tsx](src/components/Card.tsx), [src/components/ListItemCard.tsx](src/components/ListItemCard.tsx)
  - top bar: [src/components/Topbar.tsx](src/components/Topbar.tsx)
- Extend primitives first when repeated need appears.
- Screen-level styles are allowed only for layout composition and one-off spacing after primitive coverage is exhausted.
- Forbidden:
  - hardcoded colors/spacing/font sizes/radius when token exists
  - direct visual duplication that bypasses primitives
  - placeholder-looking controls as permanent UI

## D. Navigation model
- Desktop source model (tpv-front): sidebar-first navigation.
- Tablet model (tpv-mobile): sidebar or side rail as primary navigation model, same module meaning as desktop.
- Phone model (tpv-mobile): bottom tabs as sidebar equivalent + More overflow.
- Kitchen display: operational full-screen shell, locked to kitchen workflow.
- Module visibility:
  - role and license-based visibility must mirror tpv-front semantics.
  - inaccessible modules remain hidden or locked with clear reason.

## E. Screen structure standards
Every production screen must include:
- Safe-area shell via ScreenPage.
- Header via Topbar.
- Structured content container via ScreenContent.
- Primary actions above fold where possible.
- Secondary actions clearly separated.
- Designed localized states:
  - loading state
  - empty state
  - error state

## F. Home screen standard
Phone Home:
- Safe header.
- Business/user/device/sync status block.
- Quick action card row/grid.
- Operational summary cards.
- Recent activity list or explicit localized empty-state card.
- Bottom tabs: Inicio, TPV, Salon, Cocina, Mas.

Tablet Home:
- Side rail/sidebar layout.
- Compact desktop-like dashboard content.
- Quick action cards.
- Metrics cards.
- Recent activity feed/list.
- Denser information layout than phone without reducing touch safety.

## G. Responsive and adaptive rules
- Breakpoints follow [src/platform/breakpoints.ts](src/platform/breakpoints.ts):
  - phone: < 768
  - tablet: >= 768
- Phone landscape keeps bottom tab model.
- Tablet landscape keeps side rail model.
- Split-pane should be used on tablet when user context + content are shown together.
- Avoid duplicate screen files only for orientation; prefer one component with adaptive branches.
- Create dedicated tablet component only when structure diverges materially.

## H. Feature screen parity rules
For every feature screen compared to tpv-front:
- same intent
- same key actions
- same business meaning of labels and statuses
- same loading/empty/error semantics
- tablet close to desktop layout and density
- phone optimized for touch and vertical flow

## I. Localization rules
- No hardcoded user-facing copy.
- Key structure remains domain-first (`auth.*`, `home.*`, `sync.*`, `layout.*`, etc.).
- English and Spanish keys are required for every new key.
- Backend/code reason codes must map to localized user messages.

## J. Testing rules
- Required UI coverage for updated screens:
  - phone layout behavior
  - tablet layout behavior
  - safe-area behavior
  - i18n rendering assertions for critical labels
  - navigation behavior (tabs, side rail, key routes)
  - role/license visibility checks where gating exists
- Required validation commands:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run doctor`

## K. Acceptance criteria
A screen is production-quality only if all are true:
- follows primitives and token system
- has complete loading/empty/error states
- is safe-area correct on phone and tablet
- uses localized copy only
- respects navigation model for device class
- preserves tpv-front feature semantics
- passes lint, typecheck, tests, and doctor

## Reference implementation anchors
- tpv-front navigation/layout patterns:
  - [tpv-front/src/components/Layout/MainLayout.tsx](../tpv-front/src/components/Layout/MainLayout.tsx)
  - [tpv-front/src/components/Layout/Sidebar.tsx](../tpv-front/src/components/Layout/Sidebar.tsx)
  - [tpv-front/src/features/home/components/HomeLandingScreen.tsx](../tpv-front/src/features/home/components/HomeLandingScreen.tsx)
- tpv-mobile module model:
  - [src/navigation/modules.ts](src/navigation/modules.ts)
