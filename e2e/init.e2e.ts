/**
 * E2E Test Initialization
 * Runs before all E2E tests
 */

beforeAll(async () => {
  // Launch app for the first time
  await device.launchApp({
    permissions: { notifications: 'YES', camera: 'YES' },
    newInstance: true,
  })
})

afterAll(async () => {
  // Optional: cleanup
  await device.sendUserAction({ action: 'userDefaults', params: { key: 'done', value: true } })
})

beforeEach(async () => {
  // Reset app state before each test
  await device.reloadReactNative()
})
