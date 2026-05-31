import { apiClient } from './client'
import { generateUUID } from '@/utils/uuid'

export type ActiveCashShift = {
  id: string
  status: string
  openingBalance: number
  openedAt: string
}

export type OpenedCashShift = {
  id: string
  status: string
  openingBalance: number
  openedAt: string
}

export async function getActiveCashShift(registerId: string): Promise<ActiveCashShift | null> {
  try {
    const response = await apiClient.get<ActiveCashShift | null>('/cash-shifts/active', {
      params: { registerId },
    })
    return response.data
  } catch (err: unknown) {
    const e = err as { response?: { status?: number } }
    if (e?.response?.status === 404) return null
    throw err
  }
}

export async function openCashShift(
  registerId: string,
  openingBalance: number,
  idempotencyKey?: string,
): Promise<OpenedCashShift> {
  const requestIdempotencyKey = idempotencyKey ?? generateUUID()
  const response = await apiClient.post<OpenedCashShift>(
    '/cash-shifts',
    {
      registerId,
      openingBalance,
    },
    {
      headers: {
        'Idempotency-Key': requestIdempotencyKey,
      },
    },
  )
  return response.data
}
