import { apiClient } from './client';
import type { SaleDto, SaleLineInputDto, PaymentDto, ReceiptDto, RefundDto } from '@/types/api';

/**
 * Create a new sale (starts empty cart)
 * POST /sales
 *
 * Backend requires:
 *   - lineItems (array, min 1) — field name is `lineItems`, NOT `lines`
 *   - cashShiftId (UUID, required) — must be an open cash shift for this terminal
 *
 * Note: Backend does NOT accept notes or idempotencyKey in POST /sales.
 * If notes are needed, they would be added via a different endpoint.
 */
export async function createSale(
  lines: SaleLineInputDto[],
  cashShiftId: string,
): Promise<SaleDto> {
  const input = {
    lineItems: lines,
    cashShiftId,
  };
  const { data } = await apiClient.post<SaleDto>('/sales', input);
  return data;
}

/**
 * Complete a sale: finalize with payments
 * POST /sales/{saleId}/complete
 *
 * Backend CompleteSaleDto only accepts:
 *   - payments (required): array of { amount, method ('cash'|'card'|'transfer'), amountTendered? }
 *   - consumeStockLineItemIds (optional): array of line item UUIDs to consume stock for
 *
 * NO RETRY semantics: DO NOT retry if response times out. Check sale status instead.
 */
export async function completeSale(
  saleId: string,
  payments: PaymentDto[],
  _idempotencyKey?: string, // Deprecated: backend doesn't accept this anymore
  options?: { consumeStockLineItemIds?: string[] }
): Promise<SaleDto> {
  const consumeStockLineItemIds = options?.consumeStockLineItemIds?.filter(Boolean) ?? [];
  // Normalize payment methods to lowercase ('CASH' → 'cash')
  const normalizedPayments = payments.map((p) => ({
    amount: p.amount,
    method: p.method.toLowerCase(),
    ...(p.amountTendered !== undefined ? { amountTendered: p.amountTendered } : {}),
  }));
  const input = {
    payments: normalizedPayments,
    ...(consumeStockLineItemIds.length > 0 ? { consumeStockLineItemIds } : {}),
  };
  const { data } = await apiClient.post<SaleDto>(`/sales/${saleId}/complete`, input);
  return data;
}

/**
 * Create a payment for a sale
 * POST /sales/{saleId}/payments
 * (Alternative to completeSale if payments created separately)
 */
export async function createSalePayment(saleId: string, payment: PaymentDto): Promise<PaymentDto> {
  const { data } = await apiClient.post<PaymentDto>(`/sales/${saleId}/payments`, payment);
  return data;
}

/**
 * Get receipt for a completed sale
 * GET /sales/{saleId}/receipt
 */
export async function getSaleReceipt(saleId: string): Promise<ReceiptDto> {
  const { data } = await apiClient.get<ReceiptDto>(`/sales/${saleId}/receipt`);
  return data;
}

/**
 * Refund a sale (full or partial)
 * POST /sales/{saleId}/refund
 */
export async function refundSale(saleId: string, amount?: number, reason?: string): Promise<RefundDto> {
  const input = { amount, reason };
  const { data } = await apiClient.post<RefundDto>(`/sales/${saleId}/refund`, input);
  return data;
}

/**
 * Get a specific sale
 * GET /sales/{saleId}
 */
export async function getSale(saleId: string): Promise<SaleDto> {
  const { data } = await apiClient.get<SaleDto>(`/sales/${saleId}`);
  return data;
}
