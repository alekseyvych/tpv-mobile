/**
 * Terminals API
 *
 * Phase 3: Real backend integration for terminal selection
 * Fetches POS terminals from GET /terminals endpoint
 */

import { apiClient } from './client';

/**
 * Terminal Status enum
 * From @prisma/client TerminalStatus
 */
export enum TerminalStatus {
  AVAILABLE = 'AVAILABLE',
  OFFLINE = 'OFFLINE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
}

/**
 * Terminal Operating Mode
 * Determines feature availability and workflows
 */
export type OperatingMode = 'RETAIL' | 'RESTAURANT' | 'PERSONALIZED';

/**
 * Terminal Response DTO
 * Returned by GET /terminals endpoint
 */
export interface Terminal {
  id: string;
  tenantId: string;
  name: string;
  terminalId: string;
  image?: string | null;
  location?: string | null;
  operatingMode: OperatingMode;
  status: TerminalStatus;
  serialNumber?: string | null;
  active: boolean;
  createdBy: string;
  lastUsedBy?: string | null;
  lastUsedAt?: Date | string | null;
  lastSeenAt?: Date | string | null;
  capabilities?: Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Fetch all terminals for the current tenant
 *
 * GET /terminals?active=true
 *
 * Requires TERMINALS_READ permission
 *
 * @param active - Filter by active status (true, false, or undefined for all)
 * @returns Array of Terminal objects
 * @throws Error with message 'terminals_permission_denied' if 403 (lacks TERMINALS_READ)
 * @throws Error with network/server details on other failures
 */
export async function getTerminals(active: boolean | undefined = true): Promise<Terminal[]> {
  try {
    const params = active !== undefined ? { active: String(active) } : {};
    const { data } = await apiClient.get<Terminal[]>('/terminals', { params });
    return data;
  } catch (err: unknown) {
    const error = err as any;
    if (error?.response?.status === 403) {
      throw new Error('terminals_permission_denied');
    }
    throw error;
  }
}

/**
 * Fetch a single terminal by ID
 *
 * GET /terminals/:id
 *
 * Requires TERMINALS_READ permission
 *
 * @param terminalId - Terminal ID (UUID)
 * @returns Terminal object
 * @throws Error with message 'terminals_permission_denied' if 403
 */
export async function getTerminal(terminalId: string): Promise<Terminal> {
  try {
    const { data } = await apiClient.get<Terminal>(`/terminals/${terminalId}`);
    return data;
  } catch (err: unknown) {
    const error = err as any;
    if (error?.response?.status === 403) {
      throw new Error('terminals_permission_denied');
    }
    throw error;
  }
}
