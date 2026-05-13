/**
 * E2E Tests: First Device Initialization (QR Pairing Entry Point)
 *
 * Tests the first-time-only QR pairing flow that appears when:
 *   - deviceInitialized is NOT set in AsyncStorage
 *   - App has never been paired before
 *
 * After successful pairing, the FirstInitScreen never appears again.
 *
 * Run with: npm run e2e:test -- --testPathPattern firstInit
 */

import { assertElementVisible, assertElementWithTextVisible, waitForElementWithText } from './helpers';

describe('E2E: First Device Initialization', () => {
  beforeAll(async () => {
    // Fresh install: clear all storage to simulate first-ever launch
    await device.launchApp({
      permissions: { camera: 'YES' },
      newInstance: true,
      delete: true, // clears AsyncStorage / SecureStore
    });
  });

  it('should show first-init QR screen on fresh app launch', async () => {
    // When deviceInitialized is not set, app goes directly to FirstInitScreen
    await waitForElementWithText('Welcome to TPV Mobile', 8000);
    await assertElementWithTextVisible('Welcome to TPV Mobile');
    await assertElementWithTextVisible('Device setup');
  });

  it('should show camera view for QR scanning', async () => {
    // The camera should be visible (QR scanner)
    await assertElementVisible(by.id('qr-camera-view'));
  });

  it('should offer manual pairing code as fallback', async () => {
    await assertElementWithTextVisible('Use manual pairing code instead');
  });

  it('should navigate to manual pairing when button tapped', async () => {
    await element(by.text('Use manual pairing code instead')).tap();
    await waitForElementWithText('Enter manual pairing code', 4000);
    await assertElementWithTextVisible('Enter manual pairing code');
    // Navigate back to first init
    await element(by.text('Back')).tap();
    await waitForElementWithText('Welcome to TPV Mobile', 4000);
  });

  it('should show loading screen after QR scan completes', async () => {
    // This test requires a valid QR code from the backend dev environment
    // Skip in CI unless PAIRING_TOKEN env var is set
    if (!process.env.PAIRING_TOKEN) {
      console.log('Skipping QR pairing test: PAIRING_TOKEN not set');
      return;
    }

    // Simulate QR scan by injecting token via deep link or mock
    // tpvpair:<token>
    await device.openURL({ url: `tpvpair://${process.env.PAIRING_TOKEN}` });
    await waitForElementWithText('Pairing device', 5000);
    await assertElementWithTextVisible('Pairing device');
  });

  describe('After successful pairing', () => {
    it('should show pairing success screen', async () => {
      if (!process.env.PAIRING_TOKEN) return;
      await waitForElementWithText('Device paired', 15000);
      await assertElementWithTextVisible('Device paired');
    });

    it('should navigate to home and never show first-init again on next launch', async () => {
      if (!process.env.PAIRING_TOKEN) return;
      await element(by.text('Continue')).tap();
      await waitForElementWithText('Home', 5000);

      // Relaunch app - should NOT show first-init screen
      await device.launchApp({ newInstance: true });
      await waitForElementWithText('Sign in', 8000);

      // Confirm first-init is NOT shown
      await expect(element(by.text('Welcome to TPV Mobile'))).not.toBeVisible();
    });
  });
});
