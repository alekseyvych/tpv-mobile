import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { DeviceInfoScreen } from '@/screens/settings/DeviceInfoScreen';

const mockSettings = {
  appVersion: '1.2.3',
  deviceInfo: {
    installationId: 'inst-1',
    tenantId: 'tenant-1',
    deviceName: 'Front Tablet',
    deviceType: 'TABLET',
    configuredAt: '2026-05-12T10:00:00Z',
  },
  refreshDeviceContext: jest.fn(async () => undefined),
};

jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => mockSettings,
}));

jest.mock('@/components/PermissionsStatus', () => ({
  PermissionsStatus: () => null,
}));

describe('DeviceInfoScreen', () => {
  beforeEach(() => {
    mockSettings.refreshDeviceContext.mockClear();
  });

  it('refreshes local context through the settings hook contract', async () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <DeviceInfoScreen onBack={() => undefined} />
      </I18nextProvider>,
    );

    fireEvent.press(view.getByText(/Refresh context|Refrescar contexto/));

    await waitFor(() => {
      expect(mockSettings.refreshDeviceContext).toHaveBeenCalledTimes(1);
    });
  });

  it('renders device context in read-only mode and hides edit/clear actions', () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <DeviceInfoScreen onBack={() => undefined} />
      </I18nextProvider>,
    );

    expect(view.getByPlaceholderText(/Installation ID|ID de instalación/).props.editable).toBe(false);
    expect(view.getByPlaceholderText(/Device name|Nombre del dispositivo/).props.editable).toBe(false);
    expect(view.getByPlaceholderText(/Device type|Tipo de dispositivo/).props.editable).toBe(false);
    expect(view.queryByText(/Save context|Guardar contexto/)).toBeNull();
    expect(view.queryByText(/Clear remote context|Limpiar contexto remoto/)).toBeNull();
    expect(view.getByText(/Manager or admin access is required|Se requiere acceso de manager o admin/)).toBeTruthy();
  });

  it('sanitizes refresh errors from backend payloads', async () => {
    mockSettings.refreshDeviceContext.mockRejectedValueOnce(new Error('internal-stack-trace'));

    const view = render(
      <I18nextProvider i18n={i18n}>
        <DeviceInfoScreen onBack={() => undefined} embedded />
      </I18nextProvider>,
    );

    fireEvent.press(view.getByText(/Refresh context|Refrescar contexto/));

    await waitFor(() => {
      expect(view.getByText(/Could not refresh device context|No se pudo refrescar el contexto del dispositivo/)).toBeTruthy();
    });
    expect(view.queryByText(/internal-stack-trace/)).toBeNull();
  });

  it('shows permission error when refresh returns 403', async () => {
    mockSettings.refreshDeviceContext.mockRejectedValueOnce({ status: 403, message: 'Forbidden' });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <DeviceInfoScreen onBack={() => undefined} />
      </I18nextProvider>,
    );

    fireEvent.press(view.getByText(/Refresh context|Refrescar contexto/));

    await waitFor(() => {
      expect(view.getByText(/You do not have permission to manage device context|No tienes permiso para gestionar el contexto del dispositivo/)).toBeTruthy();
    });
  });

  it('shows generic refresh error when refresh fails for non-permission reasons', async () => {
    mockSettings.refreshDeviceContext.mockRejectedValueOnce(new Error('timeout'));

    const view = render(
      <I18nextProvider i18n={i18n}>
        <DeviceInfoScreen onBack={() => undefined} />
      </I18nextProvider>,
    );

    fireEvent.press(view.getByText(/Refresh context|Refrescar contexto/));

    await waitFor(() => {
      expect(view.getByText(/Could not refresh device context|No se pudo refrescar el contexto del dispositivo/)).toBeTruthy();
    });
  });
});
