/**
 * Card payment runtime API — mirrors tpv-front's card-payment-runtime.api.ts
 * Uses the same backend endpoints and idempotency pattern.
 */

import { apiClient } from './client';
import { generateUUID } from '@/utils/uuid';

export type CardPaymentRuntimeState =
  | 'pending'
  | 'connecting'
  | 'waiting'
  | 'processing'
  | 'approved'
  | 'declined'
  | 'cancelled'
  | 'timeout'
  | 'unknown';

export interface CardPaymentTransaction {
  id: string;
  saleId: string;
  posTerminalId: string | null;
  terminalProfileId: string;
  amount: number;
  currency: string;
  state: CardPaymentRuntimeState;
  providerType: string;
  integrationMode: string;
  providerOutcome?: string | null;
  providerCode?: string | null;
  providerTransactionId: string | null;
  paymentId: string | null;
  fallbackFromTransactionId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StartCardPaymentInput {
  saleId: string;
  posTerminalId: string;
  terminalProfileId: string;
  amount: number;
  currency?: string;
  cashierId?: string;
  orderReference?: string;
  metadata?: Record<string, unknown>;
}

export interface FallbackToExternalInput {
  externalTerminalProfileId: string;
}

export interface FallbackResponse {
  previousTransaction: CardPaymentTransaction;
  newTransaction: CardPaymentTransaction;
}

export type TpvProviderOutcome =
  | 'approved'
  | 'declined'
  | 'cancelled_by_customer'
  | 'terminal_timeout'
  | 'unknown_result';

export interface DevSimulatorSnapshot {
  transactionId: string;
  requestSnapshot: Record<string, unknown>;
  createdAt: string;
  resolution?: {
    providerOutcome: TpvProviderOutcome;
    delayMs: number;
    resolvedAt: number;
  };
}

export interface TerminalPaymentSettings {
  terminalId: string;
  defaultPaymentTerminalProfileId: string | null;
  allowOverride: boolean;
  allowedPaymentTerminalProfileIds: string[];
  allowedPaymentTerminalProfiles: TerminalProfile[];
}

/** Terminal profile available for this device (returned from backend) */
export interface TerminalProfile {
  id: string;
  name: string;
  providerType: string;
  integrationMode: string;
  isActive: boolean;
}

function idempotentHeaders(key: string): Record<string, string> {
  return { 'Idempotency-Key': key };
}

export async function fetchTerminalPaymentSettings(
  posTerminalId: string,
): Promise<TerminalPaymentSettings> {
  const { data } = await apiClient.get<TerminalPaymentSettings>(
    `/payment-terminals/terminals/${posTerminalId}/settings`,
  );
  return data;
}

export async function startCardPayment(
  input: StartCardPaymentInput,
  idempotencyKey?: string,
): Promise<CardPaymentTransaction> {
  const key = idempotencyKey ?? generateUUID();
  const { data } = await apiClient.post<CardPaymentTransaction>(
    '/payments/card-transactions/start',
    input,
    { headers: idempotentHeaders(key) },
  );
  return data;
}

export async function fetchCardPaymentStatus(transactionId: string): Promise<CardPaymentTransaction> {
  const { data } = await apiClient.get<CardPaymentTransaction>(
    `/payments/card-transactions/${transactionId}/status`,
  );
  return data;
}

export async function cancelCardPayment(
  transactionId: string,
  idempotencyKey?: string,
): Promise<CardPaymentTransaction> {
  const key = idempotencyKey ?? generateUUID();
  const { data } = await apiClient.post<CardPaymentTransaction>(
    `/payments/card-transactions/${transactionId}/cancel`,
    {},
    { headers: idempotentHeaders(key) },
  );
  return data;
}

export async function fallbackCardPaymentToExternal(
  transactionId: string,
  input: FallbackToExternalInput,
  idempotencyKey?: string,
): Promise<FallbackResponse> {
  const key = idempotencyKey ?? generateUUID();
  const { data } = await apiClient.post<FallbackResponse>(
    `/payments/card-transactions/${transactionId}/fallback-external`,
    input,
    { headers: idempotentHeaders(key) },
  );
  return data;
}

export async function fetchCardPaymentDevSnapshot(
  transactionId: string,
): Promise<DevSimulatorSnapshot | null> {
  const { data } = await apiClient.get<DevSimulatorSnapshot | null>(
    `/payments/card-transactions/${transactionId}/dev/snapshot`,
  );
  return data;
}

export async function resolveCardPaymentDevOutcome(
  transactionId: string,
  providerOutcome: TpvProviderOutcome,
  delayMs: number,
): Promise<DevSimulatorSnapshot> {
  const { data } = await apiClient.post<DevSimulatorSnapshot>(
    `/payments/card-transactions/${transactionId}/dev/resolve`,
    { providerOutcome, delayMs },
  );
  return data;
}
