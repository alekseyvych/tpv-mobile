export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === 'number' ? payload.exp : 0;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now;
}

export function getTenantIdFromToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  return typeof payload?.tenantId === 'string' ? payload.tenantId : null;
}
