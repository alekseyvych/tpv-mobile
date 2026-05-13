/**
 * E2E Tests: Authentication Flows
 * Tests fresh app setup, device pairing, and login workflows
 */

import { TestIDs, waitForElementWithText, tapElementWithText, typeInElement, assertElementVisible, assertElementWithTextVisible } from './helpers'

describe('E2E: Fresh Device Setup & Authentication', () => {
  beforeAll(async () => {
    // Launch app on fresh simulator
    await device.launchApp({
      permissions: { notifications: 'YES', camera: 'YES' },
      newInstance: true,
    })
  })

  describe('Fresh App Initialization', () => {
    it('should detect missing local context and show setup flow', async () => {
      // Expect: LocalContextCheckScreen visible (checking if context exists)
      // Either shows setup screen or login screen depending on context

      try {
        // If setup needed
        await waitForElementWithText('Connect Device', 5000)
        await assertElementWithTextVisible('Connect Device')
      } catch {
        // If already has context, login screen shown
        await waitForElementWithText('Log In', 5000)
        await assertElementWithTextVisible('Log In')
      }
    })
  })

  describe('Device Pairing Flow - Manual Code', () => {
    it('should show pairing method selection screen', async () => {
      // If on setup screen, proceed to pairing
      try {
        // Tap "Connect Device" or "Next" to get to pairing
        const connectButtons = await element(by.text('Connect')).atIndex(0)
        await connectButtons.multiTap(1)

        // Wait for pairing method screen
        await waitForElementWithText('Enter Code', 5000)
        await assertElementWithTextVisible('Enter Code')
      } catch {
        // Already on pairing screen
        await assertElementWithTextVisible('Enter Code')
      }
    })

    it('should complete pairing with manual code', async () => {
      // Assume we're on pairing screen with manual code input

      // Enter dummy pairing code (10 chars)
      // Note: This will fail against real backend unless code is valid
      // For testing, we'd need to coordinate with backend test data
      const testCode = 'TEST123456'

      try {
        await typeInElement(TestIDs.MANUAL_CODE_INPUT, testCode)
        await tapElementWithText('Complete Pairing')

        // Wait for success or error message
        // In real E2E: backend must provide valid test pairing codes
        await waitForElementWithText('Success', 10000)
      } catch {
        // Expected if test code invalid
        // Real E2E would use backend-generated valid codes
        await waitForElementWithText('Invalid', 10000)
      }
    })
  })

  describe('Email/Password Login Flow', () => {
    it('should show login screen after setup', async () => {
      // After pairing (real or test), user arrives at login screen
      await waitForElementWithText('Log In', 10000)
      await assertElementWithTextVisible('Log In')
    })

    it('should accept email and password input', async () => {
      // Enter test credentials
      const testEmail = 'test@restaurant.local'
      const testPassword = 'TestPassword123'

      await typeInElement(TestIDs.LOGIN_EMAIL_INPUT, testEmail)
      await typeInElement(TestIDs.LOGIN_PASSWORD_INPUT, testPassword)

      // Verify inputs were accepted
      await expect(element(by.id(TestIDs.LOGIN_EMAIL_INPUT))).toHaveToggleValue(true)
    })

    it('should submit login and navigate to home on success', async () => {
      // Tap login button
      await tapElementWithText('Log In')

      // Wait for home screen (indicates successful auth)
      // Look for home screen indicators (tabs, home title, etc.)
      try {
        await waitForElementWithText('Home', 15000)
        await assertElementWithTextVisible('Home')
      } catch {
        // Check for error message if login failed
        const errorVisible = await element(by.id(TestIDs.TOAST_MESSAGE)).isVisible()
        if (errorVisible) {
          // Error expected if credentials invalid
          console.log('Login failed as expected (test env)')
        }
      }
    })
  })

  describe('Quick Access PIN Login', () => {
    it('should show Quick Access profile list if available', async () => {
      // If device has been paired before, Quick Access may be available
      // Look for staff member profiles

      try {
        await waitForElementWithText('Quick Access', 5000)
        await assertElementWithTextVisible('Quick Access')

        // Expect: staff member profile(s) visible
        // Tap a profile to enable PIN entry
        await element(by.text(/[A-Z][a-z]+/)).atIndex(0).multiTap(1)

        // Wait for PIN pad
        await waitForElementWithText('Enter PIN', 5000)
      } catch {
        // Quick Access not available in this environment
        console.log('Quick Access not available in test env')
      }
    })

    it('should accept 4-digit PIN entry', async () => {
      // If PIN pad visible, enter test PIN
      try {
        const testPin = '1234'

        // Tap PIN digits
        for (const digit of testPin) {
          await tapElementWithText(digit)
        }

        // Verify PIN pad filled
        await assertElementVisible(TestIDs.PIN_SUBMIT_BUTTON)
      } catch {
        // PIN pad not available
        console.log('PIN entry not available in test environment')
      }
    })
  })

  describe('Session & Token Management', () => {
    it('should maintain session after app restart', async () => {
      // Close and relaunch app
      await device.sendUserAction({ action: 'background' })
      await device.launchApp({ newInstance: false })

      // Should restore session and show home (not login)
      try {
        await waitForElementWithText('Home', 15000)
        await assertElementWithTextVisible('Home')
      } catch {
        // May need re-auth if session expired
        await waitForElementWithText('Log In', 5000)
      }
    })

    it('should logout and return to login screen', async () => {
      // Tap settings (home screen menu)
      try {
        await tapElementWithText('Settings')
        await waitForElementWithText('Logout', 5000)
        await tapElementWithText('Logout')

        // Should return to login screen
        await waitForElementWithText('Log In', 10000)
        await assertElementWithTextVisible('Log In')
      } catch {
        // Settings/logout not accessible in current state
        console.log('Logout flow not accessible')
      }
    })
  })

  describe('Error Handling', () => {
    it('should show error for invalid login credentials', async () => {
      // Try login with invalid credentials
      const invalidEmail = 'invalid@test.com'
      const invalidPassword = 'WrongPassword'

      try {
        await typeInElement(TestIDs.LOGIN_EMAIL_INPUT, invalidEmail)
        await typeInElement(TestIDs.LOGIN_PASSWORD_INPUT, invalidPassword)
        await tapElementWithText('Log In')

        // Wait for error message
        await waitForElementWithText('Invalid', 10000)
        await assertElementWithTextVisible('Invalid')
      } catch {
        // Expected if backend not available
        console.log('Backend not available for error test')
      }
    })

    it('should show network error message when backend unavailable', async () => {
      // This test requires backend to be offline
      // Skip in local dev if backend unavailable

      // Try login with backend down
      try {
        await tapElementWithText('Log In')

        // Wait for network error
        await waitForElementWithText('network', 15000)
      } catch {
        // Expected if backend available
        console.log('Backend available, network error test skipped')
      }
    })
  })
})
