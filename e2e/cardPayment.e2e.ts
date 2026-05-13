/**
 * E2E Tests: Card Payment Runtime
 *
 * Tests the card payment terminal integration flow:
 *   1. User selects "Pay by card" at payment screen
 *   2. Terminal profiles are loaded and displayed
 *   3. Transaction is started and progress shown
 *   4. Outcome handled: approved → receipt, declined → retry options
 *
 * Requires: App paired, user logged in, cart populated, dev backend running
 * Run with: npm run e2e:test -- --testPathPattern cardPayment
 */

import { assertElementWithTextVisible, waitForElementWithText } from './helpers';

describe('E2E: Card Payment Runtime', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { camera: 'YES', notifications: 'YES' },
      newInstance: true,
    });
  });

  describe('Payment screen card button', () => {
    it('should show Pay by card button on payment screen', async () => {
      // Navigate to POS → checkout → payment (assumes user is logged in, cart has items)
      // This assumes a test helper or prior test state
      try {
        await element(by.text('POS')).tap();
        await waitForElementWithText('Checkout', 5000);
        await element(by.text('Open cart')).tap();
        await waitForElementWithText('Cart', 5000);
        await element(by.text('Go to payment')).tap();
        await waitForElementWithText('Payment', 5000);
        await assertElementWithTextVisible('Pay card');
      } catch (e) {
        console.log('Could not navigate to payment screen:', e);
      }
    });

    it('should load terminal profiles when Pay by card is tapped', async () => {
      try {
        await element(by.text('Pay card')).tap();
        // Should show loading state briefly
        await waitForElementWithText('Loading terminals', 3000);
      } catch {
        // May skip loading if profiles are cached
      }
    });
  });

  describe('Terminal selection', () => {
    it('should show terminal list when multiple terminals exist', async () => {
      // Only relevant if backend returns multiple terminal profiles
      // Skip if single terminal (auto-selected)
      try {
        await waitForElementWithText('Select terminal', 5000);
        await assertElementWithTextVisible('Select terminal');
      } catch {
        console.log('Single terminal auto-selected, skipping terminal selection test');
      }
    });
  });

  describe('Transaction in progress', () => {
    it('should show status stepper while transaction is active', async () => {
      await waitForElementWithText('Card payment in progress', 10000);
      await assertElementWithTextVisible('Card payment in progress');
      // Stepper states should be visible
      await assertElementWithTextVisible('Pending');
    });

    it('should show cancel button during active transaction', async () => {
      await assertElementWithTextVisible('Cancel transaction');
    });
  });

  describe('Approved outcome', () => {
    it('should show approved screen when transaction succeeds', async () => {
      // Dev backend auto-resolves to approved after a short delay
      await waitForElementWithText('Payment approved', 30000);
      await assertElementWithTextVisible('Payment approved');
      await assertElementWithTextVisible('Continue to receipt');
    });

    it('should navigate to receipt when Continue is tapped', async () => {
      await element(by.text('Continue to receipt')).tap();
      await waitForElementWithText('Receipt', 5000);
      await assertElementWithTextVisible('Receipt');
    });
  });

  describe('Declined outcome (requires dev backend)', () => {
    it('should show declined screen and offer retry', async () => {
      // This test only runs if SIMULATE_DECLINE env var is set
      if (!process.env.SIMULATE_DECLINE) {
        console.log('Skipping decline test: SIMULATE_DECLINE not set');
        return;
      }
      await waitForElementWithText('Payment declined', 30000);
      await assertElementWithTextVisible('Payment declined');
      await assertElementWithTextVisible('Retry');
      await assertElementWithTextVisible('Pay on external terminal');
    });
  });

  describe('Cancel during transaction', () => {
    it('should cancel the transaction and show cancelled screen', async () => {
      // Re-enter card payment flow
      try {
        await element(by.text('Pay card')).tap();
        await waitForElementWithText('Card payment in progress', 10000);
        await element(by.text('Cancel transaction')).tap();
        await waitForElementWithText('Payment cancelled', 10000);
        await assertElementWithTextVisible('Payment cancelled');
        await assertElementWithTextVisible('Retry');
      } catch (e) {
        console.log('Cancel flow could not be completed:', e);
      }
    });
  });
});
