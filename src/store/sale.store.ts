import { create } from 'zustand';

type CartLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

type SaleState = {
  lines: CartLine[];
  lastSaleId: string | null;
  addLine: (line: Omit<CartLine, 'quantity'>) => void;
  removeLine: (productId: string) => void;
  clearCart: () => void;
  setLastSaleId: (saleId: string | null) => void;
  total: () => number;
};

export const useSaleStore = create<SaleState>((set, get) => ({
  lines: [],
  lastSaleId: null,
  addLine(line) {
    set((state) => {
      const existing = state.lines.find((it) => it.productId === line.productId);
      if (existing) {
        return {
          lines: state.lines.map((it) =>
            it.productId === line.productId ? { ...it, quantity: it.quantity + 1 } : it
          ),
        };
      }
      return {
        lines: [...state.lines, { ...line, quantity: 1 }],
      };
    });
  },
  removeLine(productId) {
    set((state) => ({
      lines: state.lines.filter((line) => line.productId !== productId),
    }));
  },
  clearCart() {
    set({ lines: [] });
  },
  setLastSaleId(saleId) {
    set({ lastSaleId: saleId });
  },
  total() {
    return get().lines.reduce((acc, line) => acc + line.price * line.quantity, 0);
  },
}));
