import { useCallback, useState } from 'react';

import {
  getKitchenOrders,
  updateKitchenItemStatus,
  type KitchenItemStatus,
  type KitchenPrepStation,
} from '@/api/kitchen.api';

function nextKitchenStatus(
  status: KitchenItemStatus
): KitchenItemStatus | null {
  if (status === 'pending') return 'preparing';
  if (status === 'preparing') return 'ready';
  if (status === 'ready') return 'served';
  return null;
}

export type KitchenDisplayItem = {
  id: string;
  orderId: string;
  tableNumber: string;
  productName: string;
  quantity: number;
  status: KitchenItemStatus;
  notes?: string;
  createdAt: string;
  startedAt?: string | null;
  preparedAt?: string | null;
  servedAt?: string | null;
  acknowledgedAt?: string | null;
  elapsedMinutes: number;
};

function normalizeKitchenItemStatus(status?: string): KitchenItemStatus {
  const normalized = (status ?? 'pending').toLowerCase();
  if (normalized === 'pending') return 'pending';
  if (normalized === 'preparing') return 'preparing';
  if (normalized === 'ready') return 'ready';
  if (normalized === 'served') return 'served';
  return 'pending';
}

function normalizeTableLabel(orderTableNumber?: string, fallback?: string): string {
  return orderTableNumber ?? fallback ?? '-';
}

export function useKitchenOrders() {
  const [items, setItems] = useState<KitchenDisplayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [station, setStation] = useState<KitchenPrepStation>('kitchen');

  const loadKitchenOrders = useCallback(async (requestedStation?: KitchenPrepStation) => {
    const stationToLoad = requestedStation ?? station;
    setLoading(true);
    try {
      const response = await getKitchenOrders(stationToLoad);
      const now = Date.now();
      const next = response.data
        .flatMap((order) =>
          order.items.map((item) => ({
            id: item.id,
            orderId: order.id,
            tableNumber: normalizeTableLabel(order.tableNumber, order.tableId),
            productName: item.productName,
            quantity: item.quantity,
            status: normalizeKitchenItemStatus(item.status),
            notes: item.notes,
            createdAt: item.createdAt,
            startedAt: item.startedAt ?? null,
            preparedAt: item.preparedAt ?? null,
            servedAt: item.servedAt ?? null,
            acknowledgedAt: item.acknowledgedAt ?? null,
            elapsedMinutes: Math.max(
              0,
              Math.floor((now - new Date(item.createdAt).getTime()) / 60000)
            ),
          }))
        )
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      setItems(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [station]);

  const changeStation = useCallback(async (nextStation: KitchenPrepStation) => {
    setStation(nextStation);
    await loadKitchenOrders(nextStation);
  }, [loadKitchenOrders]);

  const advanceItemStatus = useCallback(async (item: KitchenDisplayItem) => {
    const currentStatus = item.status;
    const nextStatus = nextKitchenStatus(currentStatus);
    if (!nextStatus) return;

    await updateKitchenItemStatus(item.orderId, item.id, nextStatus);
    await loadKitchenOrders();
  }, [loadKitchenOrders]);

  return {
    items,
    station,
    loading,
    loadKitchenOrders,
    changeStation,
    advanceItemStatus,
  };
}
