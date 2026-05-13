# tpv-mobile Agent Guide

## Read order before editing
1. `README.md`
2. `MOBILE.md`
3. Relevant files in `src/`

## Service ownership
- tpv-mobile owns mobile UI, navigation, and client integration behavior.
- core-platform remains API/business source of truth.

## Rules
- Do not introduce backend contract changes from mobile without explicit coordination.
- Keep Phase 1 lightweight: only foundations and placeholders.
- Use secure storage rules:
  - tokens: expo-secure-store
  - context/preferences: AsyncStorage
- Logout must not clear LocalInstallationContext.

## Validation before done
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run doctor`
