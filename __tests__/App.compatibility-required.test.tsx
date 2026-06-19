import { render } from '@testing-library/react-native';

import App from '@/App';

jest.mock('@/hooks/useAppInitialization', () => ({
  useAppInitialization: () => ({ ready: true, deviceInitialized: true }),
}));

jest.mock('@/hooks/useSync', () => ({
  useSync: () => ({ isOnline: true, isSyncing: false, syncNow: jest.fn() }),
}));

jest.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackEvent: jest.fn(), setContext: jest.fn() }),
}));

jest.mock('@/hooks/useDevicePairing', () => ({
  useDevicePairing: () => ({
    pairWithManualCode: jest.fn(),
    pairWithToken: jest.fn(),
    lastResult: null,
    reset: jest.fn(),
  }),
}));

jest.mock('@/hooks/useAutoLock', () => ({
  useAutoLock: jest.fn(),
}));

jest.mock('@/hooks/usePermissionSync', () => ({
  usePermissionSync: jest.fn(),
}));

const mockCheckCompatibility = jest.fn();

jest.mock('@/hooks/useRuntimeCompatibility', () => ({
  useRuntimeCompatibility: () => ({
    status: 'required',
    message: 'Update required before use',
    updateRequired: true,
    updateRecommended: false,
    autoCheckEnabled: true,
    checkIntervalMinutes: 60,
    checkCompatibility: mockCheckCompatibility,
  }),
}));

jest.mock('@/services/MobileLogTransportService', () => ({
  mobileLogTransportService: {
    start: jest.fn(),
    stop: jest.fn(),
    flushNow: jest.fn(async () => undefined),
  },
}));

jest.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: null, roles: [], permissions: [], logout: jest.fn(async () => undefined) }),
}));

jest.mock('@/store/context.store', () => ({
  useContextStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ localContext: null }),
}));

jest.mock('@/store/payment-runtime.store', () => ({
  usePaymentRuntimeStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ cardRuntimePhase: 'idle' }),
}));

jest.mock('@/store/restaurant.store', () => ({
  useRestaurantStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ setSelectedTable: jest.fn(), setSelectedOrder: jest.fn() }),
}));

jest.mock('@/store/terminal.store', () => ({
  useTerminalStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ selectedTerminalId: null, operatingMode: 'retail', capabilities: [] }),
}));

jest.mock('@/store/waiter-home.store', () => ({
  useWaiterHomeStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ setResumeContext: jest.fn() }),
}));

describe('App mobile compatibility gate', () => {
  beforeEach(() => {
    mockCheckCompatibility.mockClear();
  });

  it('renders the required-update screen before normal navigation', () => {
    const view = render(<App />);

    expect(view.getByText(/Update required before use/)).toBeTruthy();
    expect(view.getByText(/Retry|Reintentar/i)).toBeTruthy();
  });
});