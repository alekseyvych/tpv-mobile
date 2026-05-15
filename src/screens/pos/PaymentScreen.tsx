import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CardPaymentRuntimePanel } from '@/components/CardPaymentRuntimePanel';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, ErrorText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useCardPaymentRuntime } from '@/hooks/useCardPaymentRuntime';
import { useSaleFlow } from '@/hooks/useSaleFlow';
import { usePaymentRuntimeStore } from '@/store/payment-runtime.store';
import { useTerminalStore } from '@/store/terminal.store';

type PaymentMethod = 'CASH' | 'CARD' | 'MIXED';

type Props = {
  onPaid: (saleId: string) => void;
  onBack: () => void;
};

function toNumber(value: string): number {
  const normalized = value.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PaymentScreen({ onPaid, onBack }: Props) {
  const { t, i18n } = useTranslation();
  const selectedTerminalId = useTerminalStore((state) => state.selectedTerminalId);
  const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';

  const {
    total,
    submitSale,
    submitMixedSale,
    prepareSale,
    pendingSale,
    completePendingSale,
    resetPendingSale,
  } = useSaleFlow();
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [cashAmountInput, setCashAmountInput] = useState('');
  const cardRuntime = useCardPaymentRuntime();
  const setCardRuntimePhase = usePaymentRuntimeStore((s) => s.setCardRuntimePhase);
  const resetCardRuntimePhase = usePaymentRuntimeStore((s) => s.resetCardRuntimePhase);

  // Run prepareSale once on mount using a ref so changing pendingSale never re-triggers it
  const didPrepare = useState(false);
  useEffect(() => {
    if (didPrepare[0]) return;
    didPrepare[1](true);
    prepareSale()
      .then(() => { setPreparing(false); })
      .catch(() => {
        setPreparing(false);
        setPrepareError(t('pos.prepareSaleError'));
      });
  // prepareSale ref changes when pendingSale changes — intentionally ignore that
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCardRuntimePhase(cardRuntime.phase);
    return () => {
      resetCardRuntimePhase();
    };
  }, [cardRuntime.phase, resetCardRuntimePhase, setCardRuntimePhase]);

  function retryPrepareSale() {
    setPreparing(true);
    setPrepareError(null);
    prepareSale()
      .then(() => { setPreparing(false); })
      .catch(() => {
        setPreparing(false);
        setPrepareError(t('pos.prepareSaleError'));
      });
  }

  const serverTotal = pendingSale?.total ?? total;
  const taxAmount = pendingSale?.tax ?? 0;
  const subtotalAmount = useMemo(() => Math.max(serverTotal - taxAmount, 0), [serverTotal, taxAmount]);

  const cashInput = toNumber(cashAmountInput);
  const cashChange = Math.max(cashInput - serverTotal, 0);
  const mixedCardRemainder = Math.max(serverTotal - (Math.round(cashInput * 100) / 100), 0);
  const formatAmount = (value: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);

  function selectMethod(m: PaymentMethod) {
    setMethod(m);
    setPayError(null);
    if (cardRuntime.phase !== 'idle') cardRuntime.reset();
  }

  async function payCash() {
    setBusy(true);
    setPayError(null);
    try {
      const saleId = await submitSale('CASH', cashInput > 0 ? cashInput : serverTotal);
      onPaid(saleId);
    } catch {
      setPayError(t('pos.paymentError'));
    } finally {
      setBusy(false);
    }
  }

  function beginCardFlow() {
    if (!pendingSale) {
      setPayError(t('pos.prepareSaleBeforePaymentError'));
      return;
    }
    if (!selectedTerminalId) {
      setPayError(t('terminalSelection.required'));
      return;
    }
    setPayError(null);
    cardRuntime.begin(pendingSale.id, pendingSale.total, selectedTerminalId);
  }

  async function payMixed() {
    const roundedCash = Math.round(cashInput * 100) / 100;
    const roundedCard = Math.round((serverTotal - roundedCash) * 100) / 100;

    if (roundedCash <= 0 || roundedCard <= 0) {
      setPayError(t('pos.mixedAmountError'));
      return;
    }

    setBusy(true);
    setPayError(null);
    try {
      const saleId = await submitMixedSale(roundedCash, roundedCard, roundedCash);
      onPaid(saleId);
    } catch {
      setPayError(t('pos.paymentError'));
    } finally {
      setBusy(false);
    }
  }

  const cardInProgress = cardRuntime.phase !== 'idle';

  return (
    <ScreenPage>
      <Topbar title={t('pos.paymentTitle')} onBack={onBack} />
      <ScreenContent>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Prepare-sale status — non-blocking, shown above method selector */}
          {prepareError ? (
            <Card style={styles.prepareErrorCard}>
              <ErrorText>{prepareError}</ErrorText>
              <Button title={t('common.retry')} onPress={retryPrepareSale} fullWidth />
            </Card>
          ) : null}

          {/* Order summary */}
          <Card style={styles.summaryCard}>
            <MetaText style={styles.summaryLine}>{`${t('pos.subtotalLabel')}: ${formatAmount(subtotalAmount)}`}</MetaText>
            <MetaText style={styles.summaryLine}>{`${t('pos.taxLabel')}: ${formatAmount(taxAmount)}`}</MetaText>
            <TitleText style={styles.totalLine}>{`${t('pos.totalLabel')}: ${formatAmount(serverTotal)}`}</TitleText>
          </Card>

          {/* Method selector */}
          <View style={styles.methodRow}>
            {(['CASH', 'CARD', 'MIXED'] as PaymentMethod[]).map((m) => (
              <Pressable
                key={m}
                style={[styles.methodBtn, method === m && styles.methodBtnActive]}
                onPress={() => selectMethod(m)}
                disabled={busy || cardInProgress}
              >
                <MetaText style={[styles.methodLabel, method === m && styles.methodLabelActive]}>
                  {m === 'CASH' ? t('pos.payCash') : m === 'CARD' ? t('pos.payCard') : t('pos.payMixed')}
                </MetaText>
              </Pressable>
            ))}
          </View>

          {payError ? <ErrorText style={styles.error}>{payError}</ErrorText> : null}

          {/* ── CASH section ── */}
          {method === 'CASH' && (
            <Card style={styles.methodCard}>
              <MetaText>{t('pos.enterCashAmount')}</MetaText>
              <TextInput
                style={styles.input}
                value={cashAmountInput}
                onChangeText={setCashAmountInput}
                keyboardType="decimal-pad"
                placeholder={serverTotal.toFixed(2)}
                selectTextOnFocus
              />
              {cashInput > 0 && cashChange > 0 ? (
                <BodyText style={styles.changeRow}>{`${t('pos.changeLabel')}: ${formatAmount(cashChange)}`}</BodyText>
              ) : null}
              <Button
                title={preparing ? t('pos.preparingSale') : t('pos.confirmPayment')}
                onPress={() => void payCash()}
                disabled={busy || preparing || !!prepareError}
                fullWidth
              />
            </Card>
          )}

          {/* ── CARD section ── */}
          {method === 'CARD' && (
            <Card style={styles.methodCard}>
              {cardRuntime.phase === 'idle' ? (
                <Button
                  title={preparing ? t('pos.preparingSale') : t('pos.startCardPayment')}
                  onPress={beginCardFlow}
                  disabled={busy || preparing || !!prepareError}
                  fullWidth
                />
              ) : null}
              <CardPaymentRuntimePanel
                runtime={cardRuntime}
                onApproved={() => {
                  void (async () => {
                    setBusy(true);
                    setPayError(null);
                    try {
                      const saleId = await completePendingSale([{ method: 'CARD', amount: serverTotal }]);
                      onPaid(saleId);
                      cardRuntime.reset();
                    } catch {
                      setPayError(t('pos.paymentError'));
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
                onCancel={() => {
                  cardRuntime.reset();
                  resetPendingSale();
                  Alert.alert(
                    t('pos.cardCancelledTitle'),
                    t('pos.cardCancelledMessage'),
                  );
                  void prepareSale().catch(() => {
                    setPayError(t('pos.prepareSaleBeforePaymentError'));
                  });
                }}
              />
            </Card>
          )}

          {/* ── MIXED section ── */}
          {method === 'MIXED' && (
            <Card style={styles.methodCard}>
              <MetaText>{t('pos.mixedCashPrompt')}</MetaText>
              <TextInput
                style={styles.input}
                value={cashAmountInput}
                onChangeText={setCashAmountInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                selectTextOnFocus
              />
              <BodyText style={styles.remainderRow}>
                {`${t('pos.cardRemainderLabel')}: ${formatAmount(mixedCardRemainder)}`}
              </BodyText>
              <Button
                title={preparing ? t('pos.preparingSale') : t('pos.confirmPayment')}
                onPress={() => void payMixed()}
                disabled={busy || preparing || !!prepareError}
                fullWidth
              />
            </Card>
          )}

        </ScrollView>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: theme.spacing.s3,
    paddingBottom: theme.spacing.s4,
  },
  summaryCard: {
    gap: theme.spacing.s1,
  },
  summaryLine: {
    marginBottom: 0,
  },
  totalLine: {
    marginBottom: 0,
    marginTop: theme.spacing.s2,
  },
  methodRow: {
    flexDirection: 'row',
    gap: theme.spacing.s2,
  },
  methodBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.s3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgPanel,
  },
  methodBtnActive: {
    borderColor: theme.colors.accentAction,
    backgroundColor: theme.colors.accentAction,
  },
  methodLabel: {
    marginBottom: 0,
    textAlign: 'center',
  },
  methodLabelActive: {
    color: theme.colors.textOnAccent,
  },
  error: {
    marginBottom: 0,
  },
  methodCard: {
    gap: theme.spacing.s2,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s2,
    backgroundColor: theme.colors.bgPage,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizeLg,
  },
  changeRow: {
    marginBottom: 0,
    color: theme.colors.success,
  },
  remainderRow: {
    marginBottom: 0,
  },
  backRow: {
    marginTop: theme.spacing.s1,
  },
  prepareErrorCard: {
    gap: theme.spacing.s2,
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
});
