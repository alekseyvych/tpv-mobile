/**
 * useCardPaymentRuntime — state machine hook for card payment execution.
 *
 * Mirrors tpv-front's useCardPaymentRuntimeFlow pattern adapted for React Native:
 * - Starts a card transaction via backend API
 * - Polls status every 3s while transaction is active
 * - Exposes cancel, retry, and fallback-to-external actions
 * - Cleans up polling on unmount
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  cancelCardPayment,
  fallbackCardPaymentToExternal,
  fetchCardPaymentStatus,
  fetchTerminalPaymentSettings,
  startCardPayment,
} from '@/api/card-payment-runtime.api';
import type { CardPaymentRuntimeState, CardPaymentTransaction, TerminalProfile } from '@/api/card-payment-runtime.api';

const POLL_INTERVAL_MS = 3000;

function terminalSettingsLoadMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) {
    return 'Terminal settings access denied.';
  }
  if (status === 404) {
    return 'No terminal payment settings configured for this POS terminal.';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'Payment terminal settings are temporarily unavailable.';
  }
  return 'Failed to load terminal profiles.';
}

/** Terminal states where polling should stop. */
const TERMINAL_STATES: CardPaymentRuntimeState[] = [
  'approved',
  'declined',
  'cancelled',
  'timeout',
  'unknown',
];

type RuntimePhase =
  | 'idle'
  | 'loading_profiles'
  | 'selecting_terminal'
  | 'executing'
  | 'done';

type RuntimeError = {
  type: 'profile_load' | 'start' | 'poll' | 'cancel' | 'fallback';
  message: string;
};

type UseCardPaymentRuntimeState = {
  phase: RuntimePhase;
  transaction: CardPaymentTransaction | null;
  terminalProfiles: TerminalProfile[];
  selectedProfile: TerminalProfile | null;
  error: RuntimeError | null;
};

type UseCardPaymentRuntimeActions = {
  begin: (saleId: string, amount: number, posTerminalId: string) => void;
  selectProfile: (profile: TerminalProfile) => void;
  cancel: () => Promise<void>;
  retry: () => void;
  fallbackToExternal: (externalProfileId: string) => Promise<void>;
  reset: () => void;
};

export type UseCardPaymentRuntimeResult = UseCardPaymentRuntimeState & UseCardPaymentRuntimeActions;

const INITIAL_STATE: UseCardPaymentRuntimeState = {
  phase: 'idle',
  transaction: null,
  terminalProfiles: [],
  selectedProfile: null,
  error: null,
};

export function useCardPaymentRuntime(): UseCardPaymentRuntimeResult {
  const [state, setState] = useState<UseCardPaymentRuntimeState>(INITIAL_STATE);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSaleRef = useRef<{ saleId: string; amount: number; posTerminalId: string } | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(transactionId: string) {
    stopPolling();
    pollRef.current = setInterval(() => {
      void fetchCardPaymentStatus(transactionId).then((tx) => {
        setState((prev) => ({ ...prev, transaction: tx }));
        if (TERMINAL_STATES.includes(tx.state)) {
          stopPolling();
          setState((prev) => ({ ...prev, phase: 'done' }));
        }
      }).catch(() => {
        // Poll errors are non-fatal — keep trying until terminal state
      });
    }, POLL_INTERVAL_MS);
  }

  const begin = useCallback((saleId: string, amount: number, posTerminalId: string) => {
    pendingSaleRef.current = { saleId, amount, posTerminalId };
    setState((prev) => ({ ...prev, phase: 'loading_profiles', error: null }));

    void fetchTerminalPaymentSettings(posTerminalId).then((settings) => {
      const profiles = settings.allowedPaymentTerminalProfiles.filter((profile) => profile.isActive !== false);
      const defaultProfileId = settings.defaultPaymentTerminalProfileId;

      if (profiles.length === 0) {
        setState((prev) => ({
          ...prev,
          phase: 'idle',
          error: { type: 'profile_load', message: 'No terminal profiles configured for this device.' },
        }));
        return;
      }

      if (profiles.length > 1 && !defaultProfileId && !settings.allowOverride) {
        setState((prev) => ({
          ...prev,
          phase: 'idle',
          error: { type: 'profile_load', message: 'No default terminal profile configured for this POS terminal.' },
        }));
        return;
      }

      const defaultProfile = defaultProfileId
        ? profiles.find((profile) => profile.id === defaultProfileId)
        : null;

      if (profiles.length === 1 || defaultProfile) {
        const profile = defaultProfile ?? profiles[0];
        setState((prev) => ({
          ...prev,
          phase: 'executing',
          terminalProfiles: profiles,
          selectedProfile: profile,
          error: null,
        }));
        void executeTransaction(saleId, amount, profile);
      } else {
        setState((prev) => ({
          ...prev,
          phase: 'selecting_terminal',
          terminalProfiles: profiles,
          error: null,
        }));
      }
    }).catch((error: unknown) => {
      setState((prev) => ({
        ...prev,
        phase: 'idle',
        error: { type: 'profile_load', message: terminalSettingsLoadMessage(error) },
      }));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectProfile = useCallback((profile: TerminalProfile) => {
    if (!pendingSaleRef.current) return;
    const { saleId, amount } = pendingSaleRef.current;
    setState((prev) => ({ ...prev, phase: 'executing', selectedProfile: profile, error: null }));
    void executeTransaction(saleId, amount, profile);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function executeTransaction(saleId: string, amount: number, profile: TerminalProfile) {
    if (!pendingSaleRef.current) {
      setState((prev) => ({
        ...prev,
        phase: 'idle',
        error: { type: 'start', message: 'Internal error: missing sale context.' },
      }));
      return;
    }
    try {
      const tx = await startCardPayment({
        saleId,
        amount,
        terminalProfileId: profile.id,
        posTerminalId: pendingSaleRef.current.posTerminalId,
      });
      setState((prev) => ({ ...prev, transaction: tx }));
      if (!TERMINAL_STATES.includes(tx.state)) {
        startPolling(tx.id);
      } else {
        setState((prev) => ({ ...prev, phase: 'done' }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        phase: 'done',
        error: { type: 'start', message: 'Failed to start card transaction.' },
      }));
    }
  }

  const cancel = useCallback(async () => {
    const tx = state.transaction;
    if (!tx) return;
    stopPolling();
    try {
      const cancelled = await cancelCardPayment(tx.id);
      setState((prev) => ({ ...prev, transaction: cancelled, phase: 'done' }));
    } catch {
      setState((prev) => ({
        ...prev,
        phase: 'done',
        error: { type: 'cancel', message: 'Cancel request failed. Check terminal status.' },
      }));
    }
  }, [state.transaction]);

  const retry = useCallback(() => {
    stopPolling();
    if (!pendingSaleRef.current) {
      setState(INITIAL_STATE);
      return;
    }
    const { saleId, amount, posTerminalId } = pendingSaleRef.current;
    setState((prev) => ({
      ...INITIAL_STATE,
      terminalProfiles: prev.terminalProfiles,
      selectedProfile: prev.selectedProfile,
      phase: 'executing',
    }));
    if (state.selectedProfile) {
      void executeTransaction(saleId, amount, state.selectedProfile);
    } else {
      begin(saleId, amount, posTerminalId);
    }
  }, [state.selectedProfile, begin]); // eslint-disable-line react-hooks/exhaustive-deps

  const fallbackToExternal = useCallback(async (externalProfileId: string) => {
    const tx = state.transaction;
    if (!tx) return;
    stopPolling();
    try {
      const result = await fallbackCardPaymentToExternal(tx.id, { externalTerminalProfileId: externalProfileId });
      // New transaction started on external terminal — start polling it
      setState((prev) => ({
        ...prev,
        transaction: result.newTransaction,
        phase: 'executing',
        error: null,
      }));
      if (!TERMINAL_STATES.includes(result.newTransaction.state)) {
        startPolling(result.newTransaction.id);
      } else {
        setState((prev) => ({ ...prev, phase: 'done' }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        error: { type: 'fallback', message: 'Fallback to external terminal failed.' },
      }));
    }
  }, [state.transaction]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    stopPolling();
    pendingSaleRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    begin,
    selectProfile,
    cancel,
    retry,
    fallbackToExternal,
    reset,
  };
}
