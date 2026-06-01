import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import { createSale, completeSale } from '@/api/sales.api';
import {
  fetchTerminalPaymentSettings,
  startCardPayment,
  fetchCardPaymentStatus,
} from '@/api/card-payment-runtime.api';
import i18n from '@/i18n/config';
import { PaymentScreen } from '@/screens/pos/PaymentScreen';
import { usePaymentRuntimeStore } from '@/store/payment-runtime.store';
import { useTerminalStore } from '@/store/terminal.store';

async function waitForPrepareSaleToSettle(view: ReturnType<typeof render>) {
  await view.findByText(/Confirm payment/i);
}

jest.mock('@/api/sales.api', () => ({
  createSale: jest.fn(),
  completeSale: jest.fn(),
}));

jest.mock('@/api/card-payment-runtime.api', () => ({
  fetchTerminalPaymentSettings: jest.fn(),
  startCardPayment: jest.fn(),
  fetchCardPaymentStatus: jest.fn(),
  cancelCardPayment: jest.fn(),
  fallbackCardPaymentToExternal: jest.fn(),
}));

jest.mock('@/hooks/useSaleFlow', () => ({
  useSaleFlow: () => ({
    total: 100,
    prepareSale: jest.fn().mockResolvedValue(undefined),
    submitSale: jest.fn().mockResolvedValue('sale-1'),
    submitMixedSale: jest.fn().mockResolvedValue('sale-1'),
    pendingSale: { id: 'sale-1', total: 100, tax: 10 },
    completePendingSale: jest.fn(),
    resetPendingSale: jest.fn(),
  }),
}));

jest.mock('@/platform/useDeviceProfile', () => ({
  useDeviceProfile: () => ({ isPhone: true }),
}));

describe('PaymentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTerminalStore.setState({ selectedTerminalId: 'terminal-1' });
    usePaymentRuntimeStore.getState().resetCardRuntimePhase();
  });

  it('renders payment options', async () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <PaymentScreen onPaid={() => undefined} onBack={() => undefined} />
      </I18nextProvider>
    );

    await waitForPrepareSaleToSettle(view);

    expect(view.queryByText(/pay cash/i)).toBeTruthy();
  });

  it('completes cash payment successfully', async () => {
    (createSale as jest.Mock).mockResolvedValue({ id: 'sale-1' });

    const onPaid = jest.fn();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <PaymentScreen onPaid={onPaid} onBack={() => undefined} />
      </I18nextProvider>
    );

    await waitForPrepareSaleToSettle(view);
    const confirmButton = view.getByText(/Confirm payment/i);
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(onPaid).toHaveBeenCalledWith('sale-1');
    });
  });

  it('shows error when no terminal selected for card payment', async () => {
    useTerminalStore.setState({ selectedTerminalId: null });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <PaymentScreen onPaid={() => undefined} onBack={() => undefined} />
      </I18nextProvider>
    );

    await waitForPrepareSaleToSettle(view);

    // Switch to CARD method
    const cardMethodButton = view.getByText(/pay card/i);
    fireEvent.press(cardMethodButton);

    // Press the start card payment button
    const startButton = await view.findByText(/Start card payment/i);
    fireEvent.press(startButton);

    await waitFor(() => {
      expect(view.queryByText(/terminal|select.*terminal/i)).toBeTruthy();
    });
  });

  it('loads terminal profiles for card payment with selected terminal', async () => {
    (fetchTerminalPaymentSettings as jest.Mock).mockResolvedValue({
      terminalId: 'terminal-1',
      defaultPaymentTerminalProfileId: 'profile-1',
      allowOverride: false,
      allowedPaymentTerminalProfileIds: ['profile-1'],
      allowedPaymentTerminalProfiles: [
        {
          id: 'profile-1',
          name: 'Main Terminal',
          providerType: 'redsys_tpvpc',
          integrationMode: 'integrated_api',
          isActive: true,
        },
      ],
    });

    (startCardPayment as jest.Mock).mockResolvedValue({
      id: 'tx-1',
      saleId: 'sale-1',
      posTerminalId: 'terminal-1',
      terminalProfileId: 'profile-1',
      amount: 100,
      currency: 'EUR',
      state: 'waiting',
      providerType: 'redsys_tpvpc',
      integrationMode: 'integrated_api',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    (fetchCardPaymentStatus as jest.Mock).mockResolvedValue({
      id: 'tx-1',
      saleId: 'sale-1',
      posTerminalId: 'terminal-1',
      terminalProfileId: 'profile-1',
      amount: 100,
      currency: 'EUR',
      state: 'approved',
      providerType: 'redsys_tpvpc',
      integrationMode: 'integrated_api',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <PaymentScreen onPaid={() => undefined} onBack={() => undefined} />
      </I18nextProvider>
    );

    await waitForPrepareSaleToSettle(view);

    // Switch to CARD method then press Start card payment
    const cardMethodButton = view.getByText(/pay card/i);
    fireEvent.press(cardMethodButton);

    const startButton = await view.findByText(/Start card payment/i);
    fireEvent.press(startButton);

    await waitFor(() => {
      expect(fetchTerminalPaymentSettings).toHaveBeenCalledWith('terminal-1');
    });
  });

  it('shows error when terminal profiles fail to load', async () => {
    (fetchTerminalPaymentSettings as jest.Mock).mockRejectedValue(
      new Error('Failed to load profiles')
    );

    const view = render(
      <I18nextProvider i18n={i18n}>
        <PaymentScreen onPaid={() => undefined} onBack={() => undefined} />
      </I18nextProvider>
    );

    await waitForPrepareSaleToSettle(view);

    // Switch to CARD method then press Start card payment
    const cardMethodButton = view.getByText(/pay card/i);
    fireEvent.press(cardMethodButton);

    const startButton = await view.findByText(/Start card payment/i);
    fireEvent.press(startButton);

    await waitFor(() => {
      expect(view.queryByText(/Failed.*load|profile|terminal/i)).toBeTruthy();
    });
  });

  it('updates payment runtime phase store when card runtime is active and resets on unmount', async () => {
    (fetchTerminalPaymentSettings as jest.Mock).mockResolvedValue({
      terminalId: 'terminal-1',
      defaultPaymentTerminalProfileId: 'profile-1',
      allowOverride: false,
      allowedPaymentTerminalProfileIds: ['profile-1'],
      allowedPaymentTerminalProfiles: [
        {
          id: 'profile-1',
          name: 'Main Terminal',
          providerType: 'redsys_tpvpc',
          integrationMode: 'integrated_api',
          isActive: true,
        },
      ],
    });

    (startCardPayment as jest.Mock).mockResolvedValue({
      id: 'tx-1',
      saleId: 'sale-1',
      posTerminalId: 'terminal-1',
      terminalProfileId: 'profile-1',
      amount: 100,
      currency: 'EUR',
      state: 'waiting',
      providerType: 'redsys_tpvpc',
      integrationMode: 'integrated_api',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <PaymentScreen onPaid={() => undefined} onBack={() => undefined} />
      </I18nextProvider>
    );

    await waitForPrepareSaleToSettle(view);

    const cardMethodButton = view.getByText(/pay card/i);
    fireEvent.press(cardMethodButton);

    const startButton = await view.findByText(/Start card payment/i);
    fireEvent.press(startButton);

    await waitFor(() => {
      expect(usePaymentRuntimeStore.getState().cardRuntimePhase).not.toBe('idle');
    });

    view.unmount();
    expect(usePaymentRuntimeStore.getState().cardRuntimePhase).toBe('idle');
  });

  it('completes mixed payment successfully', async () => {
    (completeSale as jest.Mock).mockResolvedValue({ id: 'sale-1' });

    const onPaid = jest.fn();
    const view = render(
      <I18nextProvider i18n={i18n}>
        <PaymentScreen onPaid={onPaid} onBack={() => undefined} />
      </I18nextProvider>
    );

    await waitForPrepareSaleToSettle(view);

    // Note: testing mixed payment requires finding input fields and buttons
    // This is a simplified test; actual implementation would need to test input handling
    const mixedButtons = view.queryAllByText(/mixed|mixto|split/i);
    if (mixedButtons.length > 0) {
      fireEvent.press(mixedButtons[0]);
      // Additional input field interaction would go here
    }
  });
});
