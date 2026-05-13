import { apiClient } from './client';

/**
 * Audit Logs API
 * Phase 2: Real integration with GET /audit-logs
 * Requires AUDIT_READ permission
 */

export interface AuditLogEntry {
  id: string;
  tenantId: string | null;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, any> | null;
  timestamp: Date;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogsResponse {
  data: AuditLogEntry[];
  meta: PaginationMeta;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  actionIn?: string;
  entity?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get audit logs with pagination and filtering
 * GET /audit-logs
 * Requires AUDIT_READ permission
 *
 * Returns: Paginated list of audit log entries
 * Throws: 403 if user lacks AUDIT_READ permission
 */
export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogsResponse> {
  try {
    const { data } = await apiClient.get<AuditLogsResponse>('/audit-logs', {
      params: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        ...filters,
      },
    });
    return data;
  } catch (error: unknown) {
    const err = error as any;
    if (err?.response?.status === 403) {
      // User lacks AUDIT_READ permission
      throw new Error('audit_permission_denied');
    }
    throw error;
  }
}

/**
 * Get recent activity (audit logs for user's own actions and relevant system events)
 * Convenience filter for activity feed: recent sales, orders, customer actions
 */
export async function getRecentActivity(limit = 10): Promise<AuditLogsResponse> {
  return getAuditLogs({
    limit,
    sortOrder: 'desc',
    actionIn: 'sale.created,sale.completed,order.created,order.updated,payment.completed',
  });
}
