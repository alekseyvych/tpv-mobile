import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import { TerminalSelectionScreen } from '@/features/terminal-selection/screens/TerminalSelectionScreen';
import { useTerminalStore } from '@/store/terminal.store';
import { getTerminals } from '@/api/terminals.api';
import { getActiveCashShift } from '@/api/cashShifts.api';
import i18n from '@/i18n/config';

const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('@/api/terminals.api', () => ({
  getTerminals: jest.fn(),
}));

jest.mock('@/api/cashShifts.api', () => ({
  getActiveCashShift: jest.fn(),
  openCashShift: jest.fn(),
}));

describe('TerminalSelectionScreen', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    (getTerminals as jest.Mock).mockReset();
    (getActiveCashShift as jest.Mock).mockReset();
    act(() => {
      useTerminalStore.getState().clearSelected();
    });
  });

  it('loads and selects RETAIL terminal to Checkout', async () => {
    (getTerminals as jest.Mock).mockResolvedValue([
      {
        id: 't-1',
        tenantId: 'tenant-1',
        name: 'Main POS',
        terminalId: 'POS-01',
        operatingMode: 'RETAIL',
        status: 'AVAILABLE',
        active: true,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    (getActiveCashShift as jest.Mock).mockResolvedValue({ id: 'shift-1' });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <TerminalSelectionScreen />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(view.getByText('Main POS')).toBeTruthy();
    });

    fireEvent.press(view.getByText('Main POS'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('Checkout');
    });

    expect(useTerminalStore.getState().selectedTerminalId).toBe('t-1');
    expect(useTerminalStore.getState().operatingMode).toBe('RETAIL');
    expect(useTerminalStore.getState().terminalName).toBe('Main POS');
  });

  it('routes RESTAURANT mode to DiningFloor', async () => {
    (getTerminals as jest.Mock).mockResolvedValue([
      {
        id: 't-2',
        tenantId: 'tenant-1',
        name: 'Dining POS',
        terminalId: 'POS-02',
        operatingMode: 'RESTAURANT',
        status: 'AVAILABLE',
        active: true,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    (getActiveCashShift as jest.Mock).mockResolvedValue({ id: 'shift-2' });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <TerminalSelectionScreen />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(view.getByText('Dining POS')).toBeTruthy();
    });

    fireEvent.press(view.getByText('Dining POS'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('DiningFloor');
    });
  });

  it('shows empty state when no terminals are available', async () => {
    (getTerminals as jest.Mock).mockResolvedValue([]);

    const view = render(
      <I18nextProvider i18n={i18n}>
        <TerminalSelectionScreen />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(view.getByText('No terminals available')).toBeTruthy();
    });
  });

  it('shows permission denied message on 403', async () => {
    (getTerminals as jest.Mock).mockRejectedValue(new Error('terminals_permission_denied'));

    const view = render(
      <I18nextProvider i18n={i18n}>
        <TerminalSelectionScreen />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(view.getByText('Permission denied')).toBeTruthy();
      expect(view.getByText('You do not have permission to view terminals.')).toBeTruthy();
    });
  });

  it('does not navigate when terminal is inactive', async () => {
    (getTerminals as jest.Mock).mockResolvedValue([
      {
        id: 't-3',
        tenantId: 'tenant-1',
        name: 'Offline POS',
        terminalId: 'POS-03',
        operatingMode: 'RETAIL',
        status: 'OFFLINE',
        active: false,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const view = render(
      <I18nextProvider i18n={i18n}>
        <TerminalSelectionScreen />
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(view.getByText('Offline POS')).toBeTruthy();
    });

    fireEvent.press(view.getByText('Offline POS'));

    expect(mockReplace).not.toHaveBeenCalled();
    expect(useTerminalStore.getState().selectedTerminalId).toBeNull();
  });
});
