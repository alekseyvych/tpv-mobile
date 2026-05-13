# E2E Testing with Detox

This directory contains end-to-end (E2E) tests for tpv-mobile using the Detox framework.

## Overview

Detox is a gray-box E2E testing framework specifically designed for React Native apps. It allows testing the app as a user would, while having access to native device APIs.

**Key Features:**
- Tests actual app workflows against real or mocked backend
- Fast test execution (runs on device/simulator)
- Synchronization: Detox automatically waits for app to be idle before proceeding
- Matchers: Rich API for finding and interacting with UI elements

## Test Files

| File | Focus | Workflows Tested |
|------|-------|------------------|
| `auth.e2e.ts` | Authentication & Setup | Fresh pairing, email/password login, Quick Access PIN, token management |
| `diningFloor.e2e.ts` | Dining Floor Operations | Table list, order creation, order management |
| `kitchen.e2e.ts` | Kitchen Display System | Device pairing, order board, status management, auto-refresh |
| `checkout.e2e.ts` | POS Checkout | Product search, cart management, payment, receipt |
| `tokenRefresh.e2e.ts` | Session Management | Automatic token refresh, session persistence, timeout |
| `errorScenarios.e2e.ts` | Error Handling | Validation, network errors, business logic errors |
| `firstInit.e2e.ts` | First Device Initialization | QR-first entry on fresh install, manual code fallback, no second appearance after pairing |
| `cardPayment.e2e.ts` | Card Payment Runtime | Terminal loading, selection, transaction stepper, approved/declined/cancelled outcomes |

## Maestro (Windows-compatible alternative)

Detox requires macOS for iOS testing. On Windows, use [Maestro](https://maestro.mobile.dev) with an Android emulator instead.

### Maestro Setup (Windows)

```powershell
# Install Maestro
iex "& { $(irm 'https://get.maestro.mobile.dev') }"

# Start Android emulator via Android Studio
# Install app: npx expo run:android

# Run a flow
maestro test e2e/maestro/first-init.yaml
maestro test e2e/maestro/card-payment.yaml
maestro test e2e/maestro/kitchen-status.yaml
```

### Maestro Flows

| File | Tests |
|------|-------|
| `maestro/first-init.yaml` | First-init QR entry, manual code fallback, no second appearance |
| `maestro/card-payment.yaml` | Card payment runtime: terminal selection, stepper, approved outcome |
| `maestro/kitchen-status.yaml` | Kitchen 4-step status progression (PENDING → PREPARING → READY → SERVED) |

## Installation

### Prerequisites

- macOS (for iOS testing) or Linux (for Android testing)
- Xcode 13+ (for iOS)
- Node.js 24+
- npm 10+

### Setup

1. **Install Detox CLI globally:**
   ```bash
   npm install -g detox-cli
   ```

2. **Install Detox locally (already in package.json):**
   ```bash
   npm install
   ```

3. **Build Detox framework cache:**
   ```bash
   npm run e2e:build
   ```

## Running Tests

### Build & Test App

```bash
# Build app binary for E2E testing
npm run e2e:build

# Run all E2E tests
npm run e2e:test

# Run specific test suite
npm run e2e:test:auth
npm run e2e:test:dining
npm run e2e:test:kitchen
npm run e2e:test:checkout
npm run e2e:test:token-refresh
npm run e2e:test:errors
```

### Run in CI

GitHub Actions runs all E2E tests automatically on PR/push:

```bash
# Local CI simulation
npm run lint && npm run typecheck && npm run test && npm run e2e:test
```

## Test Helpers

See `helpers.ts` for reusable test utilities:

```typescript
// Wait for element with text
await waitForElementWithText('Log In', 5000)

// Type in input field
await typeInElement(TestIDs.LOGIN_EMAIL_INPUT, 'test@example.com')

// Tap button
await tapElementWithText('Submit')

// Assert visibility
await assertElementVisible(TestIDs.HOME_SCREEN)
```

## Test IDs

Components should have `testID` props for E2E testing:

```typescript
<TextInput
  testID={TestIDs.LOGIN_EMAIL_INPUT}
  placeholder="Email"
/>

<Pressable testID={TestIDs.LOGIN_SUBMIT_BUTTON}>
  <Text>Log In</Text>
</Pressable>
```

Define `testID` constants in `helpers.ts` `TestIDs` object.

## Writing E2E Tests

### Test Structure

```typescript
describe('E2E: Feature Name', () => {
  beforeAll(async () => {
    // Setup: launch app, login, navigate to feature
    await device.launchApp()
  })

  describe('Workflow: Specific Flow', () => {
    it('should perform action and verify result', async () => {
      // Arrange
      await waitForElementWithText('Screen Title', 5000)

      // Act
      await tapElementWithText('Button')
      await typeInElement(TestIDs.INPUT, 'value')

      // Assert
      await assertElementWithTextVisible('Success')
    })
  })
})
```

### Best Practices

1. **Wait for elements explicitly:**
   ```typescript
   await waitForElementWithText('Expected Text', 10000)
   ```

2. **Use testID over text when possible:**
   ```typescript
   // Preferred
   await element(by.id(TestIDs.BUTTON)).multiTap(1)

   // Less reliable (text may change)
   await element(by.text('Button')).multiTap(1)
   ```

3. **Handle timing:**
   ```typescript
   // Detox auto-waits, but you can be explicit
   await waitFor(element(by.id(TestIDs.LOADER)))
     .not.toBeVisible()
     .withTimeout(5000)
   ```

4. **Test error scenarios:**
   ```typescript
   it('should handle network error', async () => {
     // Backend down scenario
     try {
       await waitForElementWithText('error', 15000)
       await assertElementVisible('Retry')
     } catch {
       // Backend available in this environment
       console.log('Error test skipped (backend available)')
     }
   })
   ```

5. **Use try/catch for optional features:**
   ```typescript
   // Don't fail test if feature not available
   try {
     await assertElementVisible(TestIDs.OPTIONAL_FEATURE)
   } catch {
     console.log('Optional feature not available')
   }
   ```

## Backend Coordination

### Test Fixtures

For tests requiring specific data:

1. **Create test tenant/user:**
   ```
   Email: test@restaurant.local
   Password: TestPassword123
   Role: CASHIER + WAITER
   ```

2. **Seed test data:**
   - Tables: Table 1, Table 2, ...
   - Products: Burger, Water, Appetizers, ...
   - Payment methods: Cash, Card

3. **Document in `DEV_SEEDING_GUIDE.md`:**
   ```markdown
   ## E2E Test Fixtures
   
   Run before E2E testing:
   ```bash
   npm run seed:e2e-fixtures
   ```
   ```

### Backend URL Configuration

For local development:

```bash
# Use your machine's LAN IP
export EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000

# Or use Expo tunnel (from another machine)
npm start -- --tunnel
```

## Debugging

### View Test Output

```bash
# Run with verbose logging
detox test e2e/auth.e2e.ts --configuration ios.sim.debug --cleanup --verbose
```

### Record Screen During Tests

```bash
# Detox automatically records on failure
npm run e2e:test

# Check artifacts/
ls artifacts/
```

### Manual Testing

Launch app in debug mode and interact manually:

```bash
npm start
# Then in another terminal:
npm run ios
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Timeout waiting for element | Increase timeout, verify element visible, check testID |
| Flaky tests | Add explicit `waitFor()` calls, avoid timing assumptions |
| App won't launch | Clear simulator: `xcrun simctl erase all`, rebuild app |
| Detox can't sync | Check if app has pending network requests, increase timeout |

## CI/CD Integration

### GitHub Actions

Tests run on every PR/push to `tpv-mobile/`:

1. **validate job:** Lint, typecheck, unit tests (all PRs)
2. **e2e-ios job:** Detox E2E tests (all PRs, macOS runner)

**Logs & Artifacts:**
- Detox logs: uploaded on failure to `artifacts/`
- GitHub Actions: view in Actions tab

### Skipping E2E Tests

Add `[skip-e2e]` to commit message:

```bash
git commit -m "docs: update README [skip-e2e]"
```

## Known Limitations

1. **QR Scanning:** Not testable in simulator (no camera). Use manual code path in E2E.
2. **Real Device:** E2E requires Xcode + iOS device. CI only tests simulator.
3. **Network:** Hard to simulate network conditions. Use try/catch to skip if backend unavailable.
4. **Biometric:** Not testable. Implemented feature but skipped in E2E.
5. **Background Tasks:** Limited testing of background refresh. Covered in separate tests.

## Advanced: Custom Matchers

For complex assertions, create custom matchers:

```typescript
// e2e/matchers.ts
export function byTestID(testID: string) {
  return by.id(testID)
}

export function byTextContaining(text: string) {
  return by.text(new RegExp(text, 'i'))
}

// Usage in tests
await element(byTestID(TestIDs.CART_TOTAL)).atIndex(0).tap()
```

## Performance Profiling

To measure app performance during E2E:

```bash
# Detox can measure frame drops, memory, etc.
# (Requires custom instrumentation in app)
```

## Further Reading

- [Detox Official Docs](https://wix.github.io/Detox/)
- [Detox API Reference](https://wix.github.io/Detox/docs/api/detox-object)
- [Best Practices](https://wix.github.io/Detox/docs/guide/best-practices)
- [Troubleshooting](https://wix.github.io/Detox/docs/troubleshooting)
