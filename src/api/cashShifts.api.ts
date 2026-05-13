import { apiClient } from './client'

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
): Promise<OpenedCashShift> {
  const response = await apiClient.post<OpenedCashShift>('/cash-shifts', {
    registerId,
    openingBalance,
  })
  return response.data
}
