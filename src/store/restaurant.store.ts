/**
 * Restaurant Store - Phase 5
 *
 * Manages dining floor state for table selection, order management,
 * and kitchen workflow. All data is real backend-driven.
 */

import { create } from 'zustand'

import type { RestaurantOrder, RestaurantTable } from '../types/restaurant'

interface RestaurantState {
  // Tables
  tables: RestaurantTable[]
  setTables: (tables: RestaurantTable[]) => void
  updateTable: (id: string, updates: Partial<RestaurantTable>) => void
  getTableById: (id: string) => RestaurantTable | undefined

  // Orders (flat list for kitchen view)
  orders: RestaurantOrder[]
  setOrders: (orders: RestaurantOrder[]) => void
  updateOrder: (id: string, updates: Partial<RestaurantOrder>) => void
  getOrderById: (id: string) => RestaurantOrder | undefined

  // Selection state
  selectedTableId: string | null
  selectedOrderId: string | null
  setSelectedTable: (tableId: string | null) => void
  setSelectedOrder: (orderId: string | null) => void

  // Filters for floor view
  tableFilters: {
    zone?: string
    status?: 'all' | 'available' | 'occupied' | 'reserved' | 'cleaning'
    search?: string
  }
  setTableFilters: (
    filters:
      | Partial<RestaurantState['tableFilters']>
      | ((prev: RestaurantState['tableFilters']) => Partial<RestaurantState['tableFilters']>)
  ) => void
  clearTableFilters: () => void

  // Loading/error
  isLoading: boolean
  error: string | null
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Legacy: backwards compatibility for older code
  ordersByTableId: Record<string, RestaurantOrder[]>
  setOrdersForTable: (tableId: string, orders: RestaurantOrder[]) => void
  selectTable: (tableId: string | null) => void
}

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  // Tables
  tables: [],
  setTables: (tables) => set({ tables }),
  updateTable: (id, updates) =>
    set((state) => ({
      tables: state.tables.map((t) => (t.id === id ? { ...t, ...updates } : t))
    })),
  getTableById: (id) => get().tables.find((t) => t.id === id),

  // Orders
  orders: [],
  setOrders: (orders) => set({ orders }),
  updateOrder: (id, updates) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? { ...o, ...updates } : o))
    })),
  getOrderById: (id) => get().orders.find((o) => o.id === id),

  // Selection
  selectedTableId: null,
  selectedOrderId: null,
  setSelectedTable: (tableId) => set({ selectedTableId: tableId }),
  setSelectedOrder: (orderId) => set({ selectedOrderId: orderId }),

  // Filters
  tableFilters: {},
  setTableFilters: (filters) =>
    set((state) => {
      const next = typeof filters === 'function' ? filters(state.tableFilters) : filters
      return { tableFilters: { ...state.tableFilters, ...next } }
    }),
  clearTableFilters: () => set({ tableFilters: {} }),

  // Loading/error
  isLoading: false,
  error: null,
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Legacy compatibility
  ordersByTableId: {},
  setOrdersForTable: (tableId, orders) =>
    set((state) => ({
      ordersByTableId: {
        ...state.ordersByTableId,
        [tableId]: orders
      }
    })),
  selectTable: (tableId) => set({ selectedTableId: tableId })
}))
