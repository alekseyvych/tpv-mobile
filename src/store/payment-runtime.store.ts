import { create } from 'zustand';

export type CardRuntimePhase =
  | 'idle'
  | 'loading_profiles'
  | 'selecting_terminal'
  | 'executing'
  | 'done';

type PaymentRuntimeState = {
  cardRuntimePhase: CardRuntimePhase;
  setCardRuntimePhase: (phase: CardRuntimePhase) => void;
  resetCardRuntimePhase: () => void;
};

export const usePaymentRuntimeStore = create<PaymentRuntimeState>((set) => ({
  cardRuntimePhase: 'idle',
  setCardRuntimePhase: (cardRuntimePhase) => set({ cardRuntimePhase }),
  resetCardRuntimePhase: () => set({ cardRuntimePhase: 'idle' }),
}));
