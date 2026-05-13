/**
 * CardPaymentRuntimePanel
 *
 * Mobile equivalent of tpv-front's CardPaymentRuntimePanel.
 * Renders the card payment state machine inline within PaymentScreen.
 *
 * Phases:
 *   idle             → "Pay by card" entry button (renders nothing — parent shows the button)
 *   loading_profiles → spinner
 *   selecting_terminal → list of available terminal profiles
 *   executing        → transaction status stepper + cancel button
 *   done             → outcome screen (approved / declined / cancelled / timeout)
 */

import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Spinner } from '@/components/Spinner';
import { BodyText, ErrorText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import type { CardPaymentRuntimeState } from '@/api/card-payment-runtime.api';
import type { UseCardPaymentRuntimeResult } from '@/hooks/useCardPaymentRuntime';

type Props = {
  runtime: UseCardPaymentRuntimeResult;
  onApproved: () => void;
  onCancel: () => void;
};

const ACTIVE_STATES: CardPaymentRuntimeState[] = ['pending', 'connecting', 'waiting', 'processing'];

function stateStep(state: CardPaymentRuntimeState): number {
  const steps: CardPaymentRuntimeState[] = ['pending', 'connecting', 'waiting', 'processing'];
  const idx = steps.indexOf(state);
  return idx === -1 ? 0 : idx;
}

function StateSteps({ state }: { state: CardPaymentRuntimeState }) {
  const { t } = useTranslation();
  const steps = [
    t('pos.card.statePending'),
    t('pos.card.stateConnecting'),
    t('pos.card.stateWaiting'),
    t('pos.card.stateProcessing'),
  ];
  const current = stateStep(state);

  return (
    <View style={styles.stepRow}>
      {steps.map((label, idx) => (
        <View key={label} style={styles.stepItem}>
          <View style={[styles.stepDot, idx <= current ? styles.stepDotActive : styles.stepDotPending]} />
          <MetaText style={idx === current ? styles.stepLabelActive : undefined}>{label}</MetaText>
        </View>
      ))}
    </View>
  );
}

export function CardPaymentRuntimePanel({ runtime, onApproved, onCancel }: Props) {
  const { t } = useTranslation();
  const { phase, transaction, terminalProfiles, error } = runtime;

  if (phase === 'idle') {
    return null;
  }

  if (phase === 'loading_profiles') {
    return (
      <Card style={styles.panel}>
        <Spinner />
        <BodyText style={styles.centeredText}>{t('pos.card.loadingTerminals')}</BodyText>
      </Card>
    );
  }

  if (phase === 'selecting_terminal') {
    return (
      <Card style={styles.panel}>
        <TitleText>{t('pos.card.selectTerminal')}</TitleText>
        <BodyText>{t('pos.card.selectTerminalDescription')}</BodyText>
        {terminalProfiles.map((profile) => (
          <TouchableOpacity
            key={profile.id}
            style={styles.terminalOption}
            onPress={() => runtime.selectProfile(profile)}
            accessibilityRole="button"
          >
            <BodyText style={styles.terminalName}>{profile.name}</BodyText>
            <MetaText>{profile.providerType}</MetaText>
          </TouchableOpacity>
        ))}
        <View style={styles.btnRow}>
          <Button title={t('common.back')} onPress={onCancel} variant="secondary" fullWidth />
        </View>
      </Card>
    );
  }

  if (phase === 'executing' && transaction) {
    const isActive = ACTIVE_STATES.includes(transaction.state);

    return (
      <Card style={styles.panel}>
        <TitleText>{t('pos.card.transactionInProgress')}</TitleText>
        <BodyText style={styles.amount}>
          {transaction.currency} {(transaction.amount / 100).toFixed(2)}
        </BodyText>
        <StateSteps state={transaction.state} />
        {error ? <ErrorText>{error.message}</ErrorText> : null}
        {isActive ? (
          <View style={styles.btnRow}>
            <Button
              title={t('pos.card.cancelTransaction')}
              onPress={() => void runtime.cancel()}
              variant="danger"
              fullWidth
            />
          </View>
        ) : null}
      </Card>
    );
  }

  // phase === 'done'
  if (phase === 'done') {
    const txState = transaction?.state ?? 'unknown';
    const isApproved = txState === 'approved';
    const isDeclined = txState === 'declined';
    const isCancelled = txState === 'cancelled' || txState === 'timeout';

    return (
      <Card style={styles.panel}>
        {isApproved ? (
          <>
            <TitleText style={styles.successText}>{t('pos.card.approved')}</TitleText>
            <BodyText>{t('pos.card.approvedDescription')}</BodyText>
            <View style={styles.btnRow}>
              <Button title={t('pos.card.continueToReceipt')} onPress={onApproved} fullWidth />
            </View>
          </>
        ) : isDeclined ? (
          <>
            <TitleText><ErrorText>{t('pos.card.declined')}</ErrorText></TitleText>
            <BodyText>{t('pos.card.declinedDescription')}</BodyText>
            {transaction?.providerOutcome ? (
              <MetaText>{t('pos.card.providerOutcome')}: {transaction.providerOutcome}</MetaText>
            ) : null}
            {error ? <ErrorText>{error.message}</ErrorText> : null}
            <View style={styles.btnRow}>
              <Button title={t('common.retry')} onPress={runtime.retry} fullWidth />
            </View>
            <View style={styles.btnRow}>
              <Button title={t('pos.card.fallbackToExternal')} onPress={() => runtime.reset()} variant="secondary" fullWidth />
            </View>
            <View style={styles.btnRow}>
              <Button title={t('common.back')} onPress={onCancel} variant="secondary" fullWidth />
            </View>
          </>
        ) : isCancelled ? (
          <>
            <TitleText>{t('pos.card.cancelled')}</TitleText>
            <BodyText>{t('pos.card.cancelledDescription')}</BodyText>
            <View style={styles.btnRow}>
              <Button title={t('common.retry')} onPress={runtime.retry} fullWidth />
            </View>
            <View style={styles.btnRow}>
              <Button title={t('common.back')} onPress={onCancel} variant="secondary" fullWidth />
            </View>
          </>
        ) : (
          <>
            <TitleText><ErrorText>{t('pos.card.unknownOutcome')}</ErrorText></TitleText>
            <BodyText>{t('pos.card.unknownOutcomeDescription')}</BodyText>
            {error ? <ErrorText>{error.message}</ErrorText> : null}
            <View style={styles.btnRow}>
              <Button title={t('common.retry')} onPress={runtime.retry} fullWidth />
            </View>
            <View style={styles.btnRow}>
              <Button title={t('common.back')} onPress={onCancel} variant="secondary" fullWidth />
            </View>
          </>
        )}
      </Card>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  panel: { marginTop: theme.spacing.s3 },
  centeredText: { textAlign: 'center', marginTop: theme.spacing.s3 },
  amount: { fontSize: theme.typography.sizeXl, fontWeight: theme.typography.weightBold, textAlign: 'center', marginVertical: theme.spacing.s3 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: theme.spacing.s3 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: { width: 12, height: 12, borderRadius: 6, marginBottom: theme.spacing.s1 },
  stepDotActive: { backgroundColor: theme.colors.accentAction },
  stepDotPending: { backgroundColor: theme.colors.border },
  stepLabelActive: { color: theme.colors.accentAction, fontWeight: theme.typography.weightBold },
  terminalOption: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.s3,
    marginTop: theme.spacing.s2,
  },
  terminalName: { fontWeight: theme.typography.weightSemibold },
  btnRow: { marginTop: theme.spacing.s2 },
  successText: { color: theme.colors.success },
});
