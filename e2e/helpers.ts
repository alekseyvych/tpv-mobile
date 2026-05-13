/**
 * E2E Test Helpers
 * Utilities for E2E testing with Detox
 */

export async function clearAppState() {
  // Clear AsyncStorage
  await device.sendUserAction({ action: 'clearAppState' })
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getBackendUrl(): Promise<string> {
  const url = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000'
  return url
}

export async function waitForElementWithText(text: string, timeout: number = 5000) {
  await waitFor(element(by.text(text)))
    .toBeVisible()
    .withTimeout(timeout)
}

export async function tapElementWithText(text: string) {
  await element(by.text(text)).multiTap(1)
}

export async function typeInElement(testID: string, text: string) {
  await element(by.id(testID)).typeText(text)
}

export async function clearElementText(testID: string) {
  await element(by.id(testID)).clearText()
}

export async function scrollToElement(text: string) {
  await waitFor(element(by.text(text)))
    .toBeVisible()
    .withTimeout(5000)
}

export async function assertElementVisible(testID: string) {
  await expect(element(by.id(testID))).toBeVisible()
}

export async function assertElementWithTextVisible(text: string) {
  await expect(element(by.text(text))).toBeVisible()
}

export async function assertElementNotVisible(testID: string) {
  await expect(element(by.id(testID))).not.toBeVisible()
}

export const TestIDs = {
  // Auth screens
  LOGIN_EMAIL_INPUT: 'login-email-input',
  LOGIN_PASSWORD_INPUT: 'login-password-input',
  LOGIN_SUBMIT_BUTTON: 'login-submit-button',
  PIN_PAD_1: 'pin-pad-1',
  PIN_PAD_2: 'pin-pad-2',
  PIN_PAD_3: 'pin-pad-3',
  PIN_PAD_4: 'pin-pad-4',
  PIN_CLEAR_BUTTON: 'pin-clear-button',
  PIN_SUBMIT_BUTTON: 'pin-submit-button',

  // Pairing screens
  PAIRING_METHOD_QR_BUTTON: 'pairing-method-qr-button',
  PAIRING_METHOD_MANUAL_BUTTON: 'pairing-method-manual-button',
  MANUAL_CODE_INPUT: 'manual-code-input',
  MANUAL_CODE_SUBMIT: 'manual-code-submit',

  // Dining floor
  DINING_FLOOR_TAB: 'dining-floor-tab',
  TABLE_GRID: 'table-grid',
  TABLE_ITEM: 'table-item',
  NEW_ORDER_BUTTON: 'new-order-button',
  PRODUCT_SEARCH_INPUT: 'product-search-input',
  ADD_TO_CART_BUTTON: 'add-to-cart-button',
  SUBMIT_ORDER_BUTTON: 'submit-order-button',

  // Kitchen display
  KITCHEN_DISPLAY_SCREEN: 'kitchen-display-screen',
  PENDING_ITEMS_LIST: 'pending-items-list',
  MARK_READY_BUTTON: 'mark-ready-button',

  // Checkout
  POS_TAB: 'pos-tab',
  CHECKOUT_SCREEN: 'checkout-screen',
  PRODUCT_SEARCH: 'product-search',
  CART_TOTAL: 'cart-total',
  PAYMENT_METHOD_SELECT: 'payment-method-select',
  SUBMIT_PAYMENT_BUTTON: 'submit-payment-button',
  RECEIPT_SCREEN: 'receipt-screen',

  // Home
  HOME_SCREEN: 'home-screen',
  HOME_SETTINGS_BUTTON: 'home-settings-button',
  LOGOUT_BUTTON: 'logout-button',

  // Common
  TOAST_MESSAGE: 'toast-message',
  ERROR_MODAL: 'error-modal',
  BACK_BUTTON: 'back-button',
  RETRY_BUTTON: 'retry-button',
}
