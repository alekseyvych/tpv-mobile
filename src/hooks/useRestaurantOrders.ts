import { useCallback } from 'react';

import { createOrder, getOrdersByTable, getTables } from '@/api/restaurant.api';
import { analyticsService } from '@/services/AnalyticsService';
import { useRestaurantStore } from '@/store/restaurant.store';

export function useRestaurantOrders() {
  const tables = useRestaurantStore((s) => s.tables);
  const selectedTableId = useRestaurantStore((s) => s.selectedTableId);
  const ordersByTableId = useRestaurantStore((s) => s.ordersByTableId);
  const setTables = useRestaurantStore((s) => s.setTables);
  const setOrdersForTable = useRestaurantStore((s) => s.setOrdersForTable);
  const selectTable = useRestaurantStore((s) => s.selectTable);

  const loadTables = useCallback(async () => {
    const nextTables = await getTables();
    setTables(nextTables);
    return nextTables;
  }, [setTables]);

  const loadOrdersForSelectedTable = useCallback(async () => {
    if (!selectedTableId) return [];
    const orders = await getOrdersByTable(selectedTableId);
    setOrdersForTable(selectedTableId, orders);
    return orders;
  }, [selectedTableId, setOrdersForTable]);

  const createOrderForSelectedTable = useCallback(async () => {
    if (!selectedTableId) return null;
    const created = await createOrder(selectedTableId);
    const current = ordersByTableId[selectedTableId] ?? [];
    setOrdersForTable(selectedTableId, [created, ...current]);
    await analyticsService.trackEvent('order.created', {
      orderId: created.id,
      tableId: selectedTableId,
    });
    return created;
  }, [ordersByTableId, selectedTableId, setOrdersForTable]);

  return {
    tables,
    selectedTableId,
    selectedOrders: selectedTableId ? ordersByTableId[selectedTableId] ?? [] : [],
    selectTable,
    loadTables,
    loadOrdersForSelectedTable,
    createOrderForSelectedTable,
  };
}
