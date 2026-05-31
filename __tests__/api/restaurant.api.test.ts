import { apiClient } from '@/api/client';
import { getTables, restaurantApi } from '@/api/restaurant.api';

describe('restaurant api', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTables', () => {
    it('loads tables list', async () => {
      const tables = [
        {
          id: 't1',
          number: '1',
          status: 'available',
          capacity: 4,
          sortOrder: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];
      const spy = jest.spyOn(apiClient, 'get').mockResolvedValue({ data: tables } as never);

      const result = await getTables();

      expect(spy).toHaveBeenCalledWith('/restaurant/tables', expect.any(Object));
      expect(result).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 't1',
          number: '1',
          status: 'available',
          capacity: 4,
          sortOrder: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }),
      ]));
    });
  });

  describe('createOrder', () => {
    it('creates order with items', async () => {
      const order = {
        id: 'order-1',
        tableId: 'table-1',
        status: 'pending',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 2,
            status: 'pending',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: order } as never);

      const result = await restaurantApi.createOrder({
        tableId: 'table-1',
        items: [{ productId: 'prod-1', quantity: 2 }]
      });

      expect(spy).toHaveBeenCalledWith(
        '/restaurant/orders',
        expect.objectContaining({
          tableId: 'table-1',
          items: [{ productId: 'prod-1', quantity: 2 }]
        }),
        expect.any(Object)
      );
      expect(result).toEqual(expect.objectContaining({
        id: 'order-1',
        tableId: 'table-1',
        status: 'pending',
      }));
      expect(result.items).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'item-1',
          productId: 'prod-1',
          quantity: 2,
          status: 'pending',
        }),
      ]));
    });

    it('forwards Idempotency-Key when provided', async () => {
      const order = {
        id: 'order-1',
        tableId: 'table-1',
        status: 'pending',
        items: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
      const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: order } as never)

      await restaurantApi.createOrder(
        {
          tableId: 'table-1',
          items: [{ productId: 'prod-1', quantity: 2 }]
        },
        'mobile-create-idem-1'
      )

      expect(spy).toHaveBeenCalledWith(
        '/restaurant/orders',
        expect.objectContaining({
          tableId: 'table-1',
          items: [{ productId: 'prod-1', quantity: 2 }]
        }),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Idempotency-Key': 'mobile-create-idem-1' })
        })
      )
    })
  });

  describe('addOrderItem', () => {
    it('adds item to order with options', async () => {
      const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({} as never);

      await restaurantApi.addOrderItem('order-1', {
        productId: 'prod-1',
        quantity: 1,
        options: [{ name: 'extra', value: 'cheese' }]
      });

      expect(spy).toHaveBeenCalledWith(
        '/restaurant/orders/order-1/items',
        expect.objectContaining({
          productId: 'prod-1',
          quantity: 1,
          options: [{ name: 'extra', value: 'cheese' }]
        }),
        expect.any(Object)
      );
    });

    it('forwards Idempotency-Key when provided', async () => {
      const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({} as never)

      await restaurantApi.addOrderItem(
        'order-1',
        {
          productId: 'prod-1',
          quantity: 1,
          options: [{ name: 'extra', value: 'cheese' }]
        },
        'mobile-add-idem-1'
      )

      expect(spy).toHaveBeenCalledWith(
        '/restaurant/orders/order-1/items',
        expect.objectContaining({
          productId: 'prod-1',
          quantity: 1,
          options: [{ name: 'extra', value: 'cheese' }]
        }),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Idempotency-Key': 'mobile-add-idem-1' })
        })
      )
    })
  });

  describe('umbrella and settle idempotency', () => {
    it('forwards Idempotency-Key for createUmbrellaSale', async () => {
      const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({
        data: {
          sale: { id: 'sale-1' },
          order: {
            id: 'order-1',
            status: 'pending',
            items: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        }
      } as never)

      const body = {
        cashShiftId: 'shift-1',
        lineItems: [{ productId: 'prod-1', quantity: 1 }]
      }
      await restaurantApi.createUmbrellaSale('order-1', body, 'mobile-umbrella-idem-1')

      expect(spy).toHaveBeenCalledWith(
        '/restaurant/orders/order-1/umbrella-sale',
        body,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Idempotency-Key': 'mobile-umbrella-idem-1' })
        })
      )
    })

    it('forwards Idempotency-Key for settlePaidGroupItems', async () => {
      const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({
        data: {
          orderClosed: false,
          remainingItemCount: 1
        }
      } as never)

      const body = {
        saleId: 'sale-1',
        orderItemIds: ['item-1'],
        saleLineSnapshots: [{ productId: 'prod-1', quantity: 1, total: 10 }]
      }
      await restaurantApi.settlePaidGroupItems('order-1', body, 'mobile-settle-idem-1')

      expect(spy).toHaveBeenCalledWith(
        '/restaurant/orders/order-1/group-payment/settle',
        body,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Idempotency-Key': 'mobile-settle-idem-1' })
        })
      )
    })
  })

  describe('updateOrderItemStatus', () => {
    it('updates item status', async () => {
      const item = {
        id: 'item-1',
        productId: 'prod-1',
        quantity: 1,
        status: 'preparing',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      const spy = jest.spyOn(apiClient, 'patch').mockResolvedValue({ data: item } as never);

      const result = await restaurantApi.updateOrderItemStatus('order-1', 'item-1', 'preparing');

      expect(spy).toHaveBeenCalledWith(
        '/restaurant/orders/order-1/items/item-1/status',
        expect.objectContaining({
          status: 'PREPARING'
        })
      );
      expect(result.status).toEqual('preparing');
    });
  });

  describe('acquireOrderPaymentLock', () => {
    it('acquires payment lock', async () => {
      const order = {
        id: 'order-1',
        status: 'pending',
        paymentLockedByTerminalId: 'terminal-1',
        items: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: order } as never);

      const result = await restaurantApi.acquireOrderPaymentLock('order-1', 'terminal-1');

      expect(spy).toHaveBeenCalledWith(
        '/restaurant/orders/order-1/payment-lock',
        expect.objectContaining({
          terminalId: 'terminal-1'
        })
      );
      expect(result.paymentLockedByTerminalId).toEqual('terminal-1');
    });
  });

  describe('releaseOrderPaymentLock', () => {
    it('releases payment lock', async () => {
      const order = {
        id: 'order-1',
        status: 'pending',
        paymentLockedByTerminalId: null,
        items: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };
      const spy = jest.spyOn(apiClient, 'post').mockResolvedValue({ data: order } as never);

      const result = await restaurantApi.releaseOrderPaymentLock('order-1', 'terminal-1');

      expect(spy).toHaveBeenCalledWith(
        '/restaurant/orders/order-1/payment-lock/release',
        expect.objectContaining({
          terminalId: 'terminal-1'
        })
      );
      expect(result.paymentLockedByTerminalId ?? null).toEqual(null);
    });
  });
});
