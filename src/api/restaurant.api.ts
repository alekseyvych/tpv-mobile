/**
 * Restaurant API Client for Mobile
 *
 * Mobile adapter for:
 * - Floor reading (list/get tables)
 * - Order management (create, list, get, add/update/remove items, close)
 * - Kitchen workflow (item status progression)
 * - Payment lock (acquire/release for checkout handoff)
 * - Umbrella sales (multi-item bills)
 *
 * All data is real backend-driven (no mock/fake tables/orders).
 */

import { apiClient } from './client'
import { generateUUID } from '@/utils/uuid'

import type {
  RestaurantTable,
  RestaurantOrder,
  OrderItemOption
} from '../types/restaurant'

function normalizeTableStatus(raw: unknown): RestaurantTable['status'] {
  const value = String(raw ?? '').toLowerCase()
  if (value === 'maintenance') return 'cleaning'
  if (value === 'available' || value === 'occupied' || value === 'reserved' || value === 'cleaning') {
    return value
  }
  return 'available'
}

function normalizeOrderStatus(raw: unknown): RestaurantOrder['status'] {
  const value = String(raw ?? '').toLowerCase()
  if (
    value === 'pending' ||
    value === 'preparing' ||
    value === 'ready' ||
    value === 'served' ||
    value === 'paid' ||
    value === 'cancelled'
  ) {
    return value
  }
  return 'pending'
}

function normalizeOrderItemStatus(raw: unknown): 'pending' | 'preparing' | 'ready' | 'served' {
  const value = String(raw ?? '').toLowerCase()
  if (value === 'pending' || value === 'preparing' || value === 'ready' || value === 'served') {
    return value
  }
  return 'pending'
}

function unwrapArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  const withData = payload as { data?: unknown }
  if (Array.isArray(withData?.data)) return withData.data as T[]
  return []
}

function normalizeTable(raw: Record<string, unknown>, index: number): RestaurantTable {
  const rawNumber = raw.number
  const rawCapacity = raw.capacity
  const rawSortOrder = raw.sortOrder
  const rawZone = raw.zone ?? raw.section
  const rawPosition = raw.position as { x?: unknown; y?: unknown } | undefined
  const x = typeof rawPosition?.x === 'number' ? rawPosition.x : (index % 6) * 140 + 40
  const y = typeof rawPosition?.y === 'number' ? rawPosition.y : Math.floor(index / 6) * 110 + 40

  return {
    id: String(raw.id ?? ''),
    number: String(rawNumber ?? index + 1),
    capacity: typeof rawCapacity === 'number' ? rawCapacity : Number(rawCapacity ?? 4) || 4,
    currentGuestCount:
      typeof raw.currentGuestCount === 'number' ? raw.currentGuestCount : null,
    sortOrder: typeof rawSortOrder === 'number' ? rawSortOrder : Number(rawSortOrder ?? 0) || 0,
    zone: typeof rawZone === 'string' && rawZone.trim().length > 0 ? rawZone : 'Main',
    position: { x, y },
    status: normalizeTableStatus(raw.status),
    currentOrderId:
      typeof raw.currentOrderId === 'string' && raw.currentOrderId.trim().length > 0
        ? raw.currentOrderId
        : null,
    joinGroupId:
      typeof raw.joinGroupId === 'string' && raw.joinGroupId.trim().length > 0
        ? raw.joinGroupId
        : null,
    billAnchorTableId:
      typeof raw.billAnchorTableId === 'string' && raw.billAnchorTableId.trim().length > 0
        ? raw.billAnchorTableId
        : null,
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  }
}

function normalizeOrder(raw: Record<string, unknown>): RestaurantOrder {
  const itemsRaw = Array.isArray(raw.items) ? raw.items : []
  return {
    id: String(raw.id ?? ''),
    tableId: typeof raw.tableId === 'string' ? raw.tableId : undefined,
    tableNumber: raw.tableNumber != null ? String(raw.tableNumber) : undefined,
    partySize: typeof raw.partySize === 'number' ? raw.partySize : undefined,
    items: itemsRaw.map((item) => {
      const row = item as Record<string, unknown>
      return {
        id: String(row.id ?? ''),
        orderId: String(row.orderId ?? raw.id ?? ''),
        productId: String(row.productId ?? row.product_id ?? ''),
        productName: String(row.productName ?? row.product_name ?? ''),
        quantity: typeof row.quantity === 'number' ? row.quantity : Number(row.quantity ?? 0) || 0,
        status: normalizeOrderItemStatus(row.status),
        notes: typeof row.notes === 'string' ? row.notes : undefined,
        options: Array.isArray(row.options) ? (row.options as OrderItemOption[]) : undefined,
        preparedAt: typeof row.preparedAt === 'string' ? row.preparedAt : undefined,
        createdAt: String(row.createdAt ?? ''),
        updatedAt: String(row.updatedAt ?? ''),
      }
    }),
    status: normalizeOrderStatus(raw.status),
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    total: typeof raw.total === 'number' ? raw.total : undefined,
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
    paymentLockedByTerminalId:
      typeof raw.paymentLockedByTerminalId === 'string' ? raw.paymentLockedByTerminalId : undefined,
    paymentLockedAt: typeof raw.paymentLockedAt === 'string' ? raw.paymentLockedAt : undefined,
    openPosSaleId: typeof raw.openPosSaleId === 'string' ? raw.openPosSaleId : undefined,
  }
}

/**
 * Restaurant API client for mobile
 */
export const restaurantApi = {
  /**
   * List all tables with optional filters
   *
   * GET /restaurant/tables
   * Query params: status, zone, search
   */
  getTables: async (filters?: {
    status?: 'available' | 'occupied' | 'reserved' | 'cleaning'
    zone?: string
    search?: string
  }): Promise<{ data: RestaurantTable[] }> => {
    const params: Record<string, string | undefined> = {
      search: filters?.search,
      zone: filters?.zone
    }
    if (filters?.status === 'cleaning') {
      params.status = 'maintenance'
    } else if (filters?.status) {
      params.status = filters.status
    }
    const response = await apiClient.get<unknown>('/restaurant/tables', { params })
    const rows = unwrapArrayPayload<Record<string, unknown>>(response.data)
    const data = rows.map((row, index) => normalizeTable(row, index))
    return { data }
  },

  /**
   * Get single table by ID
   *
   * GET /restaurant/tables/:id
   */
  getTableById: async (id: string): Promise<RestaurantTable> => {
    const response = await apiClient.get<Record<string, unknown>>(`/restaurant/tables/${id}`)
    return normalizeTable(response.data, 0)
  },

  /**
   * List orders with optional filters
   *
   * GET /restaurant/orders
   */
  getOrders: async (filters?: {
    status?: string
    tableId?: string
    startDate?: string
    endDate?: string
  }): Promise<{ data: RestaurantOrder[] }> => {
    const params = {
      ...filters
    }
    const response = await apiClient.get<unknown>('/restaurant/orders', { params })
    const rows = unwrapArrayPayload<Record<string, unknown>>(response.data)
    const data = rows.map((row) => normalizeOrder(row))
    return { data }
  },

  /**
   * Get single order by ID
   *
   * GET /restaurant/orders/:id
   */
  getOrderById: async (id: string): Promise<RestaurantOrder> => {
    const response = await apiClient.get<Record<string, unknown>>(`/restaurant/orders/${id}`)
    return normalizeOrder(response.data)
  },

  /**
   * Create new order
   *
   * POST /restaurant/orders
   */
  createOrder: async (data: {
    tableId?: string
    partySize?: number
    items: Array<{
      productId: string
      quantity: number
      notes?: string
      options?: OrderItemOption[]
    }>
    notes?: string
  }, idempotencyKey?: string): Promise<RestaurantOrder> => {
    const requestIdempotencyKey = idempotencyKey ?? generateUUID()
    const response = await apiClient.post<Record<string, unknown>>('/restaurant/orders', data, {
      headers: {
        'Idempotency-Key': requestIdempotencyKey
      }
    })
    return normalizeOrder(response.data)
  },

  /**
   * Add item to existing order
   *
   * POST /restaurant/orders/:id/items
   */
  addOrderItem: async (
    orderId: string,
    body: {
      productId: string
      quantity: number
      notes?: string
      options?: OrderItemOption[]
    },
    idempotencyKey?: string
  ): Promise<void> => {
    const requestIdempotencyKey = idempotencyKey ?? generateUUID()
    await apiClient.post(`/restaurant/orders/${orderId}/items`, body, {
      headers: {
        'Idempotency-Key': requestIdempotencyKey
      }
    })
  },

  /**
   * Update order item status (kitchen workflow)
   *
   * PATCH /restaurant/orders/:orderId/items/:itemId/status
   */
  updateOrderItemStatus: async (
    orderId: string,
    itemId: string,
    status: 'pending' | 'preparing' | 'ready' | 'served'
  ): Promise<RestaurantOrder> => {
    const response = await apiClient.patch<Record<string, unknown>>(
      `/restaurant/orders/${orderId}/items/${itemId}/status`,
      { status: status.toUpperCase() }
    )
    return normalizeOrder(response.data)
  },

  /**
   * Update order item quantity or notes
   *
   * PATCH /restaurant/orders/:orderId/items/:itemId
   */
  updateOrderItem: async (
    orderId: string,
    itemId: string,
    body: { quantity?: number; notes?: string }
  ): Promise<RestaurantOrder> => {
    const response = await apiClient.patch<Record<string, unknown>>(
      `/restaurant/orders/${orderId}/items/${itemId}`,
      body
    )
    return normalizeOrder(response.data)
  },

  /**
   * Update order fields such as party size, notes, or status.
   *
   * PATCH /restaurant/orders/:id
   */
  updateOrder: async (
    orderId: string,
    body: { partySize?: number; notes?: string; status?: string }
  ): Promise<RestaurantOrder> => {
    const response = await apiClient.patch<Record<string, unknown>>(
      `/restaurant/orders/${orderId}`,
      body
    )
    return normalizeOrder(response.data)
  },

  /**
   * Remove item from order
   *
   * DELETE /restaurant/orders/:orderId/items/:itemId
   */
  removeOrderItem: async (orderId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/restaurant/orders/${orderId}/items/${itemId}`)
  },

  /**
   * Close order and free table
   *
   * POST /restaurant/orders/:id/close
   */
  closeOrder: async (id: string): Promise<void> => {
    await apiClient.post(`/restaurant/orders/${id}/close`)
  },

  /**
   * Acquire payment lock (blocks other terminals from editing)
   *
   * POST /restaurant/orders/:id/payment-lock
   */
  acquireOrderPaymentLock: async (orderId: string, terminalId: string): Promise<RestaurantOrder> => {
    const response = await apiClient.post<Record<string, unknown>>(
      `/restaurant/orders/${orderId}/payment-lock`,
      { terminalId }
    )
    return normalizeOrder(response.data)
  },

  /**
   * Release payment lock
   *
   * POST /restaurant/orders/:id/payment-lock/release
   */
  releaseOrderPaymentLock: async (
    orderId: string,
    terminalId: string
  ): Promise<RestaurantOrder> => {
    const response = await apiClient.post<Record<string, unknown>>(
      `/restaurant/orders/${orderId}/payment-lock/release`,
      { terminalId }
    )
    return normalizeOrder(response.data)
  },

  /**
   * Create and attach umbrella POS sale
   *
   * POST /restaurant/orders/:id/umbrella-sale
   */
  createUmbrellaSale: async (
    orderId: string,
    body: {
      cashShiftId: string
      lineItems: Array<{
        productId: string
        quantity: number
        notes?: string
        restaurantOrderItemId?: string
      }>
      terminalId?: string
      fiscalSeriesId?: string
    },
    idempotencyKey?: string
  ): Promise<{ sale: { id: string }; order: RestaurantOrder }> => {
    const requestIdempotencyKey = idempotencyKey ?? generateUUID()
    const response = await apiClient.post<{ sale: { id: string }; order: RestaurantOrder }>(
      `/restaurant/orders/${orderId}/umbrella-sale`,
      body,
      {
        headers: {
          'Idempotency-Key': requestIdempotencyKey
        }
      }
    )
    return response.data
  },

  /**
   * Get resume mapping for umbrella sale
   *
   * GET /restaurant/orders/:id/open-pos-sale-resume
   */
  getOpenPosSaleResume: async (
    orderId: string
  ): Promise<{ saleId: string; orderItemIdToSaleLineId: Record<string, string> } | null> => {
    const response = await apiClient.get<{
      saleId: string
      orderItemIdToSaleLineId: Record<string, string>
    } | null>(`/restaurant/orders/${orderId}/open-pos-sale-resume`)
    return response.data
  },

  /**
   * Settle paid items from group payment
   *
   * POST /restaurant/orders/:id/group-payment/settle
   */
  settlePaidGroupItems: async (
    orderId: string,
    body: {
      saleId: string
      orderItemIds: string[]
      saleLineSnapshots: Array<{ productId: string; quantity: number; total: number }>
    },
    idempotencyKey?: string
  ): Promise<{ orderClosed: boolean; remainingItemCount: number }> => {
    const requestIdempotencyKey = idempotencyKey ?? generateUUID()
    const response = await apiClient.post<{
      orderClosed: boolean
      remainingItemCount: number
    }>(`/restaurant/orders/${orderId}/group-payment/settle`, body, {
      headers: {
        'Idempotency-Key': requestIdempotencyKey
      }
    })
    return response.data
  },

  /** GET /restaurant/zone-layouts â€” fetch all zone layout configs for the tenant. */
  getZoneLayouts: async (): Promise<ZoneLayoutConfig[]> => {
    try {
      const response = await apiClient.get<ZoneLayoutConfig[]>('/restaurant/zone-layouts')
      if (!Array.isArray(response.data)) return []
      return response.data
    } catch {
      return []
    }
  },

  /** Join multiple tables into a group. POST /restaurant/tables/join */
  joinTables: async (tableIds: string[]): Promise<void> => {
    await apiClient.post('/restaurant/tables/join', { tableIds })
  },

  /** Split a joined table group. POST /restaurant/tables/join/split */
  splitJoinGroup: async (joinGroupId: string): Promise<void> => {
    await apiClient.post('/restaurant/tables/join/split', { joinGroupId })
  },
}

export type ZoneLayoutConfig = {
  id?: string
  zone: string
  x: number
  y: number
  width: number
  height: number
  color: string
  padding: number
}

/**
 * Backwards-compatible named exports for existing code
 */
export const getTables = async (): Promise<RestaurantTable[]> => {
  const result = await restaurantApi.getTables()
  return result.data
}

export const getOrdersByTable = async (tableId: string): Promise<RestaurantOrder[]> => {
  const result = await restaurantApi.getOrders({ tableId })
  return result.data
}

export const createOrder = async (
  tableId: string,
  idempotencyKey?: string
): Promise<RestaurantOrder> => {
  return restaurantApi.createOrder({ tableId, items: [] }, idempotencyKey)
}
