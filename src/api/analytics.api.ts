import { apiClient } from './client';

/**
 * Dashboard Analytics API
 * Phase 2: Real integration with GET /analytics/dashboard
 * Requires REPORTS_VIEW permission
 */

export interface KPIMetrics {
  totalRevenue: number;
  transactionCount: number;
  avgTransactionValue: number;
  totalItemsSold: number;
  comparison?: {
    totalRevenue: number;
    transactionCount: number;
    avgTransactionValue: number;
    totalItemsSold: number;
  };
  totalProductCost?: number;
  totalExpenses?: number;
  netProfit?: number;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  comparisonValue?: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  revenue: number;
  unitsSold: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  revenue: number;
  percentage: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface TerminalPerformance {
  terminalId: string;
  terminalName: string;
  revenue: number;
  transactionCount: number;
}

export interface TopUser {
  userId: string;
  userName: string;
  transactionCount: number;
  revenue: number;
  avgTransactionValue: number;
}

export interface DashboardResponse {
  kpis: KPIMetrics;
  revenueTrend: TimeSeriesDataPoint[];
  topProducts: TopProduct[];
  topCategories: CategoryBreakdown[];
  paymentMethods: PaymentMethodBreakdown[];
  terminalPerformance: TerminalPerformance[];
  topUsers: TopUser[];
  fiscalHealth: {
    successRate: number;
    pendingCount: number;
    failedCount: number;
  };
}

/**
 * Get dashboard overview with KPIs and trends
 * GET /analytics/dashboard?period=day|week|month|year
 * Requires REPORTS_VIEW permission
 *
 * Returns: Comprehensive dashboard data for selected period
 * Throws: 403 if user lacks REPORTS_VIEW permission
 */
export async function getDashboard(period: 'day' | 'week' | 'month' | 'year' = 'day'): Promise<DashboardResponse> {
  try {
    const { data } = await apiClient.get<DashboardResponse>('/analytics/dashboard', {
      params: { period },
    });
    return data;
  } catch (error: unknown) {
    const err = error as any;
    if (err?.response?.status === 403) {
      // User lacks REPORTS_VIEW permission
      throw new Error('dashboard_permission_denied');
    }
    throw error;
  }
}
