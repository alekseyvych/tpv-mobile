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
  tenantId: string;
  installationId: string;
  deviceName?: string;
  deviceType?: string;
  configuredAt?: string;
  setupRequired?: boolean;
};

export type PairingStatus = 'idle' | 'loading' | 'success' | 'error';
