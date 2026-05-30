export type AuthUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  tenantId: string;
  roles: string[];
  permissions?: string[];
  active?: boolean;
};

export type LocalInstallationContext = {
  id?: string;
  deviceId?: string;
  tenantId: string;
  locationId?: string;
  terminalId?: string;
  installationId: string;
  deviceName?: string;
  deviceType?: string;
  configuredAt?: string;
  setupRequired?: boolean;
};

export type PairingStatus = 'idle' | 'loading' | 'success' | 'error';
