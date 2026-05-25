import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { DeviceInfoScreen } from '@/screens/settings/DeviceInfoScreen';

const mockSettings = {
  appVersion: '1.2.3',
  canManageDeviceContext: true,
  deviceInfo: {
    installationId: 'inst-1',
    tenantId: 'tenant-1',
    deviceName: 'Front Tablet',
    deviceType: 'TABLET',
    configuredAt: '2026-05-12T10:00:00Z',
  },
  refreshDeviceContext: jest.fn(async () => undefined),
  updateDeviceContext: jest.fn(async () => undefined),
  clearRemoteDeviceContext: jest.fn(async () => undefined),
};

jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => mockSettings,
}));

jest.mock('@/components/PermissionsStatus', () => ({
  PermissionsStatus: () => null,
}));

describe('DeviceInfoScreen', () => {
  beforeEach(() => {
    mockSettings.canManageDeviceContext = true;
    mockSettings.refreshDeviceContext.mockClear();
    mockSettings.updateDeviceContext.mockClear();
    mockSettings.clearRemoteDeviceContext.mockClear();
  });

  it('saves local context changes through the real settings hook contract', async () => {
    const view = render(
      <I18nextProvider i18n={i18n}>
        <DeviceInfoScreen onBack={() => undefined} />
      </I18nextProvider>,
    );

    fireEvent.changeText(view.getByPlaceholderText(/Installation ID|ID de instalación/), 'inst-2');
    fireEvent.changeText(view.getByPlaceholderText(/Device name|Nombre del dispositivo/), 'Kitchen Tablet');
    fireEvent.changeText(view.getByPlaceholderText(/Device type|Tipo de dispositivo/), 'KIOSK');
    fireEvent.press(view.getByText(/Save context|Guardar contexto/));

    await waitFor(() => {
      expect(mockSettings.updateDeviceContext).toHaveBeenCalledWith({
        installationId: 'inst-2',
        deviceName: 'Kitchen Tablet',
        deviceType: 'KIOSK',
      });
    });
  });

  it('hides privileged device actions when the role is not allowed', () => {
    mockSettings.canManageDeviceContext = false;
    const view = render(
      <I18nextProvider i18n={i18n}>
        <DeviceInfoScreen onBack={() => undefined} />
      </I18nextProvider>,
    );

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

  it('shows permission error when save returns 403', async () => {
    mockSettings.updateDeviceContext.mockRejectedValueOnce({ status: 403, message: 'Forbidden' });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <DeviceInfoScreen onBack={() => undefined} />
      </I18nextProvider>,
    );

    fireEvent.changeText(view.getByPlaceholderText(/Installation ID|ID de instalación/), 'inst-2');
    fireEvent.press(view.getByText(/Save context|Guardar contexto/));

    await waitFor(() => {
      expect(view.getByText(/You do not have permission to manage device context|No tienes permiso para gestionar el contexto del dispositivo/)).toBeTruthy();
    });
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

  it('shows permission error when clear returns 403', async () => {
    mockSettings.clearRemoteDeviceContext.mockRejectedValueOnce({ status: 403, message: 'Forbidden' });

    const view = render(
      <I18nextProvider i18n={i18n}>
        <DeviceInfoScreen onBack={() => undefined} />
      </I18nextProvider>,
    );

    fireEvent.press(view.getByText(/Clear remote context|Limpiar contexto remoto/));

    await waitFor(() => {
      expect(view.getByText(/You do not have permission to manage device context|No tienes permiso para gestionar el contexto del dispositivo/)).toBeTruthy();
    });
  });
});
