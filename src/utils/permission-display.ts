export interface SplitPermissionKey {
  key: string;
  resource: string;
  action: string;
}

export interface GroupedPermissionResource {
  resourceKey: string;
  resourceLabel: string;
  permissions: SplitPermissionKey[];
}

const RESOURCE_LABELS: Record<string, string> = {
  sales: 'settings.myPermissions.categories.sales',
  payments: 'settings.myPermissions.categories.payments',
  cash_shifts: 'settings.myPermissions.categories.cashShifts',
  products: 'settings.myPermissions.categories.products',
  categories: 'settings.myPermissions.categories.categories',
  customers: 'settings.myPermissions.categories.customers',
  reports: 'settings.myPermissions.categories.reports',
  fiscal_documents: 'settings.myPermissions.categories.fiscalDocuments',
  users: 'settings.myPermissions.categories.users',
  licenses: 'settings.myPermissions.categories.licenses',
  terminals: 'settings.myPermissions.categories.terminals',
  payment_terminals: 'settings.myPermissions.categories.paymentTerminals',
  printers: 'settings.myPermissions.categories.printers',
  restaurant: 'settings.myPermissions.categories.restaurant',
  attendance: 'settings.myPermissions.categories.attendance',
  expenses: 'settings.myPermissions.categories.expenses',
  roles: 'settings.myPermissions.categories.roles',
  settings: 'settings.myPermissions.categories.settings'
};

const ACTION_LABELS: Record<string, string> = {
  read: 'settings.myPermissions.actions.read',
  create: 'settings.myPermissions.actions.create',
  update: 'settings.myPermissions.actions.update',
  delete: 'settings.myPermissions.actions.delete',
  open: 'settings.myPermissions.actions.open',
  close: 'settings.myPermissions.actions.close',
  process: 'settings.myPermissions.actions.process',
  export: 'settings.myPermissions.actions.export',
  replay: 'settings.myPermissions.actions.replay',
  clock: 'settings.myPermissions.actions.clock',
  record_movement: 'settings.myPermissions.actions.recordMovement',
  view_own: 'settings.myPermissions.actions.viewOwn',
  view_all: 'settings.myPermissions.actions.viewAll',
  write: 'settings.myPermissions.actions.write'
};

function dedupePermissionKeys(permissionKeys: string[]): string[] {
  const map = new Map<string, string>();

  permissionKeys.forEach((permissionKey) => {
    const normalized = normalizePermissionKey(permissionKey);
    if (!normalized) return;
    const mapKey = normalized.toLowerCase();
    if (!map.has(mapKey)) {
      map.set(mapKey, normalized);
    }
  });

  return Array.from(map.values());
}

function splitPermissionDelimiter(permissionKey: string): number {
  const colonIndex = permissionKey.indexOf(':');
  if (colonIndex >= 0) return colonIndex;
  return permissionKey.indexOf('.');
}

export function normalizePermissionKey(permissionKey: string): string {
  return String(permissionKey ?? '').trim();
}

export function splitPermissionKey(permissionKey: string): SplitPermissionKey {
  const normalized = normalizePermissionKey(permissionKey);
  const delimiterIndex = splitPermissionDelimiter(normalized);

  if (delimiterIndex <= 0 || delimiterIndex >= normalized.length - 1) {
    return {
      key: normalized,
      resource: normalized.toLowerCase(),
      action: ''
    };
  }

  return {
    key: normalized,
    resource: normalized.slice(0, delimiterIndex).trim().toLowerCase(),
    action: normalized.slice(delimiterIndex + 1).trim().toLowerCase()
  };
}

export function buildPermissionDisplayLabel(
  permissionKey: string,
  t: (key: string, options?: Record<string, unknown>) => string
): {
  resourceLabel: string;
  actionLabel: string;
  permissionLabel: string;
} {
  const split = splitPermissionKey(permissionKey);
  const resourceTranslationKey = RESOURCE_LABELS[split.resource];
  const resourceLabel = resourceTranslationKey ? t(resourceTranslationKey) : split.resource;

  if (!split.action) {
    return {
      resourceLabel,
      actionLabel: split.key,
      permissionLabel: split.key
    };
  }

  const actionTranslationKey = ACTION_LABELS[split.action];
  const actionLabel = actionTranslationKey ? t(actionTranslationKey) : split.key;

  if (!actionTranslationKey) {
    return {
      resourceLabel,
      actionLabel,
      permissionLabel: split.key
    };
  }

  return {
    resourceLabel,
    actionLabel,
    permissionLabel: t('settings.myPermissions.permissionSummary', {
      action: actionLabel,
      resource: resourceLabel
    })
  };
}

export function groupPermissionsByResource(
  permissionKeys: string[],
  t: (key: string, options?: Record<string, unknown>) => string
): GroupedPermissionResource[] {
  const grouped = new Map<string, GroupedPermissionResource>();

  dedupePermissionKeys(permissionKeys)
    .sort((left, right) => left.localeCompare(right))
    .forEach((permissionKey) => {
      const split = splitPermissionKey(permissionKey);
      const resourceKey = split.resource || 'other';
      const labels = buildPermissionDisplayLabel(permissionKey, t);

      if (!grouped.has(resourceKey)) {
        grouped.set(resourceKey, {
          resourceKey,
          resourceLabel: labels.resourceLabel,
          permissions: []
        });
      }

      grouped.get(resourceKey)?.permissions.push(split);
    });

  return Array.from(grouped.values()).sort((left, right) =>
    left.resourceLabel.localeCompare(right.resourceLabel)
  );
}

export function countDangerousPermissions(permissionKeys: string[]): number {
  return dedupePermissionKeys(permissionKeys).filter((permissionKey) => {
    const normalized = permissionKey.toLowerCase();
    if (normalized.endsWith(':delete') || normalized.endsWith('.delete')) return true;
    if (normalized.endsWith(':admin') || normalized.endsWith('.admin')) return true;
    return (
      normalized.startsWith('users:') ||
      normalized.startsWith('users.') ||
      normalized.startsWith('roles:') ||
      normalized.startsWith('roles.') ||
      normalized.startsWith('licenses:') ||
      normalized.startsWith('licenses.') ||
      normalized.startsWith('settings:') ||
      normalized.startsWith('settings.')
    );
  }).length;
}
