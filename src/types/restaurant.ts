/**
 * Restaurant Domain Types
 *
 * Matches core-platform backend API (lowercase statuses).
 * Includes backwards-compatible DTOs for existing code.
 */

/**
 * Order item option (modifier, extra, removable ingredient, etc.)
 */
export interface OrderItemOption {
  name: string
  value?: string
}

/**
 * Backend API response - Order item with status (kitchen workflow)
 */
export interface RestaurantOrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  quantity: number
  status: 'pending' | 'preparing' | 'ready' | 'served'
  notes?: string
  options?: OrderItemOption[]
  startedAt?: string | null
  preparedAt?: string
  servedAt?: string | null
  acknowledgedAt?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Backend API response - Restaurant order (ticket)
 */
export interface RestaurantOrder {
  id: string
  tableId?: string
  tableNumber?: string
  partySize?: number
  items: RestaurantOrderItem[]
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled'
  notes?: string
  total?: number
  createdAt: string
  updatedAt: string
  paymentLockedByTerminalId?: string
  paymentLockedAt?: string
  openPosSaleId?: string
}

/**
 * Backend API response - Restaurant table
 */
export interface RestaurantTable {
  id: string
  number: string
  capacity: number
  currentGuestCount?: number | null
  sortOrder: number
  zone?: string
  position?: { x: number; y: number }
  status: 'available' | 'occupied' | 'reserved' | 'cleaning'
  currentOrderId?: string | null
  joinGroupId?: string | null
  billAnchorTableId?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Normalized for UI - matches old RestaurantTableDto for backwards compatibility
 */
export function normalizeTable(backendTable: RestaurantTable): RestaurantTableDto {
  return {
    id: backendTable.id,
    name: `Table ${backendTable.number}`,
    status: backendTable.status.toUpperCase() as 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLOSED',
    sectionId: backendTable.zone,
    capacity: backendTable.capacity,
    guestCount: backendTable.currentGuestCount ?? undefined,
    updatedAt: backendTable.updatedAt
  }
}

/**
 * Backwards-compatible DTO for existing screens
 */
export type RestaurantTableDto = {
  id: string
  name: string // e.g., "Table 5", "Bar Seat 3"
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLOSED' | string
  sectionId?: string // Section/zone ID if restaurant has sections
  capacity?: number // Max guests this table accommodates
  guestCount?: number // Current guests at table
  updatedAt?: string // ISO timestamp of last status change
}

/**
 * Backwards-compatible DTO for existing screens
 */
export type RestaurantOrderDto = {
  id: string
  tableId: string
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | string
  items: any[] // OrderItemDto[]
  total?: number // Total price for order (before tax)
  tax?: number // Tax amount
  guestCount?: number // Number of guests
  createdAt?: string // ISO timestamp when order created
  updatedAt?: string // ISO timestamp of last update
}

/**
 * Table state for UI display
 */
export interface TableUIState extends RestaurantTable {
  isSelected?: boolean
  isLoading?: boolean
}

/**
 * Restaurant floor state
 */
export interface RestaurantFloorState {
  tables: RestaurantTable[]
  orders: RestaurantOrder[]
  selectedTableId: string | null
  selectedOrderId: string | null
  isLoading: boolean
  error: string | null
}
