import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { createSale, completeSale } from '@/api/sales.api';
import { useSaleFlow } from '@/hooks/useSaleFlow';
import { useSaleStore } from '@/store/sale.store';
import { useTerminalStore } from '@/store/terminal.store';

const mockTrackEvent = jest.fn();
const mockGenerateUUID = jest.fn();

jest.mock('@/api/sales.api', () => ({
  createSale: jest.fn(),
  completeSale: jest.fn(),
}));

jest.mock('@/services/AnalyticsService', () => ({
  analyticsService: {
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  },
}));

jest.mock('@/utils/uuid', () => ({
  generateUUID: (...args: unknown[]) => mockGenerateUUID(...args),
}));

function SaleFlowProbe({ onReady }: { onReady?: (value: ReturnType<typeof useSaleFlow>) => void }) {
  const flow = useSaleFlow();
  onReady?.(flow);
  return <Text testID="sale-flow-probe">{String(flow.total)}</Text>;
}

describe('useSaleFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSaleStore.setState({ lines: [], lastSaleId: null });
    useTerminalStore.getState().clearSelected();
    mockGenerateUUID.mockReturnValue('completion-key-1');
    (createSale as jest.Mock).mockResolvedValue({ id: 'sale-1', status: 'OPEN', total: 8 });
    (completeSale as jest.Mock).mockResolvedValue({ id: 'sale-1', total: 8 });
  });

  it('prepareSale throws when there is no active cash shift', async () => {
    let flow: ReturnType<typeof useSaleFlow> | null = null;
    render(<SaleFlowProbe onReady={(value) => {
      flow = value;
    }} />);

    await act(async () => {
      await expect(flow?.prepareSale()).rejects.toThrow('No active cash shift');
    });
    expect(createSale).not.toHaveBeenCalled();
  });

  it('prepareSale creates sale with line inputs and reuses open pending sale', async () => {
    let flow: ReturnType<typeof useSaleFlow> | null = null;

    useTerminalStore.getState().setSelectedTerminal('term-1', 'RETAIL', null);
    useTerminalStore.getState().setActiveCashShiftId('shift-1');
    useSaleStore.setState({
      lines: [
        { productId: 'p1', name: 'Coffee', price: 2.5, quantity: 2 },
        { productId: 'p2', name: 'Cake', price: 3, quantity: 1 },
      ],
      lastSaleId: null,
    });

    render(<SaleFlowProbe onReady={(value) => {
      flow = value;
    }} />);

    let first: unknown;
    let second: unknown;

    await act(async () => {
      first = await flow?.prepareSale();
    });

    await waitFor(() => {
      expect(createSale).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      second = await flow?.prepareSale();
    });

    expect(first).toEqual(second);
    expect(createSale).toHaveBeenCalledTimes(1);
    expect(createSale).toHaveBeenCalledWith(
      [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 1 },
      ],
      'shift-1',
      'completion-key-1',
    );
  });

  it('submitSale completes pending sale, tracks analytics, updates lastSaleId, and clears cart', async () => {
    let flow: ReturnType<typeof useSaleFlow> | null = null;

    useTerminalStore.getState().setSelectedTerminal('term-1', 'RETAIL', null);
    useTerminalStore.getState().setActiveCashShiftId('shift-1');
    useSaleStore.setState({
      lines: [{ productId: 'p1', name: 'Coffee', price: 4, quantity: 2 }],
      lastSaleId: null,
    });

    render(<SaleFlowProbe onReady={(value) => {
      flow = value;
    }} />);

    await act(async () => {
      await flow?.submitSale('CASH', 10);
    });

    expect(completeSale).toHaveBeenCalledWith(
      'sale-1',
      [{ method: 'CASH', amount: 8, amountTendered: 10 }],
      'completion-key-1',
    );
    expect(mockTrackEvent).toHaveBeenCalledWith('sale.completed', {
      saleId: 'sale-1',
      methods: 'CASH',
      amount: 8,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith('payment.completed', {
      saleId: 'sale-1',
      methods: 'CASH',
    });
    expect(useSaleStore.getState().lastSaleId).toBe('sale-1');
    expect(useSaleStore.getState().lines).toEqual([]);
  });

  it('submitMixedSale sends only positive payment legs', async () => {
    let flow: ReturnType<typeof useSaleFlow> | null = null;

    useTerminalStore.getState().setSelectedTerminal('term-1', 'RETAIL', null);
    useTerminalStore.getState().setActiveCashShiftId('shift-1');
    useSaleStore.setState({
      lines: [{ productId: 'p1', name: 'Coffee', price: 12, quantity: 1 }],
      lastSaleId: null,
    });

    render(<SaleFlowProbe onReady={(value) => {
      flow = value;
    }} />);

    await act(async () => {
      await flow?.submitMixedSale(5, 7, 5);
    });

    expect(completeSale).toHaveBeenCalledWith(
      'sale-1',
      [
        { method: 'CASH', amount: 5, amountTendered: 5 },
        { method: 'CARD', amount: 7 },
      ],
      'completion-key-1',
    );

    await act(async () => {
      await flow?.submitMixedSale(0, 12, 0);
    });

    expect(completeSale).toHaveBeenLastCalledWith(
      'sale-1',
      [{ method: 'CARD', amount: 12 }],
      'completion-key-1',
    );
  });

  it('reuses completion key on retry and rotates key for a new sale intent', async () => {
    let flow: ReturnType<typeof useSaleFlow> | null = null;

    useTerminalStore.getState().setSelectedTerminal('term-1', 'RETAIL', null);
    useTerminalStore.getState().setActiveCashShiftId('shift-1');
    useSaleStore.setState({
      lines: [{ productId: 'p1', name: 'Coffee', price: 4, quantity: 2 }],
      lastSaleId: null,
    });

    mockGenerateUUID
      .mockReturnValueOnce('create-key-1')
      .mockReturnValueOnce('completion-key-retry')
      .mockReturnValueOnce('create-key-2')
      .mockReturnValueOnce('completion-key-new');

    (createSale as jest.Mock)
      .mockResolvedValueOnce({ id: 'sale-1', status: 'OPEN', total: 8 })
      .mockResolvedValueOnce({ id: 'sale-2', status: 'OPEN', total: 6 });

    (completeSale as jest.Mock)
      .mockRejectedValueOnce(new Error('temporary network error'))
      .mockResolvedValueOnce({ id: 'sale-1', total: 8 })
      .mockResolvedValueOnce({ id: 'sale-2', total: 6 });

    render(<SaleFlowProbe onReady={(value) => {
      flow = value;
    }} />);

    await act(async () => {
      await expect(flow?.submitSale('CASH', 10)).rejects.toThrow('temporary network error');
    });

    await act(async () => {
      await flow?.submitSale('CASH', 10);
    });

    act(() => {
      useSaleStore.setState({
        lines: [{ productId: 'p2', name: 'Tea', price: 3, quantity: 2 }],
      });
    });

    await act(async () => {
      await flow?.submitSale('CARD');
    });

    expect((completeSale as jest.Mock).mock.calls[0][2]).toBe('completion-key-retry');
    expect((completeSale as jest.Mock).mock.calls[1][2]).toBe('completion-key-retry');
    expect((completeSale as jest.Mock).mock.calls[2][2]).toBe('completion-key-new');
  });

  it('resetPendingSale clears previously prepared pending sale', async () => {
    let flow: ReturnType<typeof useSaleFlow> | null = null;

    useTerminalStore.getState().setSelectedTerminal('term-1', 'RETAIL', null);
    useTerminalStore.getState().setActiveCashShiftId('shift-1');
    useSaleStore.setState({
      lines: [{ productId: 'p1', name: 'Coffee', price: 4, quantity: 1 }],
      lastSaleId: null,
    });

    render(<SaleFlowProbe onReady={(value) => {
      flow = value;
    }} />);

    await act(async () => {
      await flow?.prepareSale();
    });

    await waitFor(() => {
      expect(flow?.pendingSale?.id).toBe('sale-1');
    });

    act(() => {
      flow?.resetPendingSale();
    });

    await waitFor(() => {
      expect(flow?.pendingSale).toBeNull();
    });
  });
});
