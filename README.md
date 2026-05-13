# tpv-mobile

Native mobile client for TPV using Expo + React Native + TypeScript.

## Phase 1 scope
- Expo + TypeScript foundation
- lint / typecheck / test / doctor setup
- i18n foundation with expo-localization + i18next
- Theme token foundation aligned with tpv-front
- Navigation foundation and placeholder screens
- API client skeleton
- Secure/local storage wrappers

## Environment
Create `.env` from `.env.example` and set:
- `EXPO_PUBLIC_API_BASE_URL` to LAN/tunnel backend URL reachable by the device

## Scripts
- `npm run start`
- `npm run lint`
- `npm run lint:fix`
- `npm run typecheck`
- `npm run test`
- `npm run doctor`

## Validation gates (Phase 1)
1. `npm install`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run doctor`
