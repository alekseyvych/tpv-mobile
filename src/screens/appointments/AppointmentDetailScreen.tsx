import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import {
  cancelAppointment,
  getAppointmentAvailability,
  getAppointmentById,
  sendAppointmentReminder,
  updateAppointment,
} from '@/api/appointments.api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Input } from '@/components/Input';
import { ListItemCard } from '@/components/ListItemCard';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { Topbar } from '@/components/Topbar';
import { BodyText, ErrorText, MetaText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import type { AppointmentAvailabilitySlotDto, AppointmentDto } from '@/types/api';

type Props = {
  appointmentId: string;
  onBack: () => void;
  onUpdated: () => void;
};

function extractErrorMessage(error: unknown, fallback: string, permissionFallback: string): string {
  const maybe = error as { status?: number; message?: string } | undefined;
  if (maybe?.status === 401 || maybe?.status === 403) {
    return permissionFallback;
  }
  if (typeof maybe?.message === 'string' && maybe.message.length > 0) {
    return maybe.message;
  }
  return fallback;
}

export function AppointmentDetailScreen({ appointmentId, onBack, onUpdated }: Props) {
  const { t } = useTranslation();
  const [item, setItem] = useState<AppointmentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<AppointmentDto['type']>('consultation');
  const [status, setStatus] = useState<AppointmentDto['status']>('scheduled');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [assignedTo, setAssignedTo] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const [slots, setSlots] = useState<AppointmentAvailabilitySlotDto[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const row = await getAppointmentById(appointmentId);
      setItem(row);
      setTitle(row.title);
      setType(row.type);
      setStatus(row.status);
      setStartTime(row.startTime);
      setDuration(String(row.duration || 60));
      setAssignedTo(row.assignedTo || '');
      setDescription(row.description || '');
      setNotes(row.notes || '');
    } catch (error) {
      setLoadError(
        extractErrorMessage(
          error,
          t('appointments.loadErrorDescription'),
          t('appointments.permissionError'),
        ),
      );
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  async function onSave() {
    if (!item || saving) return;

    const parsedStart = new Date(startTime);
    if (Number.isNaN(parsedStart.getTime())) {
      setRequestError(t('appointments.validation.invalidDate'));
      return;
    }

    setSaving(true);
    setRequestError(null);
    try {
      await updateAppointment(item.id, {
        title: title.trim(),
        type,
        status,
        startTime: parsedStart.toISOString(),
        duration: Math.max(1, Number(duration) || 60),
        assignedTo: assignedTo.trim() ? assignedTo.trim() : null,
        description: description.trim(),
        notes: notes.trim(),
      });
      onUpdated();
    } catch (error) {
      setRequestError(
        extractErrorMessage(error, t('appointments.updateError'), t('appointments.permissionError')),
      );
    } finally {
      setSaving(false);
    }
  }

  async function onCancel() {
    if (!item || saving) return;
    setSaving(true);
    setRequestError(null);
    try {
      await cancelAppointment(item.id, cancelReason.trim() || undefined);
      onUpdated();
    } catch (error) {
      setRequestError(
        extractErrorMessage(error, t('appointments.cancelError'), t('appointments.permissionError')),
      );
    } finally {
      setSaving(false);
    }
  }

  async function onRemind() {
    if (!item || saving) return;
    setSaving(true);
    setRequestError(null);
    try {
      await sendAppointmentReminder(item.id);
      await load();
    } catch (error) {
      setRequestError(
        extractErrorMessage(error, t('appointments.remindError'), t('appointments.permissionError')),
      );
    } finally {
      setSaving(false);
    }
  }

  async function onLoadAvailability() {
    if (!startTime.trim()) return;
    const date = new Date(startTime);
    if (Number.isNaN(date.getTime())) {
      setRequestError(t('appointments.validation.invalidDate'));
      return;
    }

    setLoadingSlots(true);
    setRequestError(null);
    try {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      const result = await getAppointmentAvailability({
        startDate: dayStart.toISOString(),
        endDate: dayEnd.toISOString(),
        userId: assignedTo || undefined,
        slotDuration: Number(duration) || 60,
      });
      setSlots(result);
    } catch (error) {
      setSlots([]);
      setRequestError(
        extractErrorMessage(error, t('appointments.availabilityError'), t('appointments.permissionError')),
      );
    } finally {
      setLoadingSlots(false);
    }
  }

  return (
    <ScreenPage>
      <Topbar
        title={t('appointments.detailTitle')}
        onBack={onBack}
        rightActionLabel={saving ? t('common.loading') : t('appointments.saveAction')}
        onRightAction={() => {
          void onSave();
        }}
        rightActionDisabled={saving || !item}
      />
      <ScreenContent>
        <Card>
          <SectionHeader title={t('appointments.detailTitle')} subtitle={item?.customerName || appointmentId} />
        </Card>

        {loading ? (
          <Card>
            <LoadingState title={t('appointments.loadingTitle')} description={t('appointments.loadingDescription')} />
          </Card>
        ) : null}

        {!loading && loadError ? (
          <Card>
            <ErrorState
              title={t('appointments.loadErrorTitle')}
              description={loadError}
              actionLabel={t('common.retry')}
              onAction={() => void load()}
            />
          </Card>
        ) : null}

        {!loading && !loadError && item ? (
          <Card>
            <MetaText>{t('appointments.selectedCustomer')}</MetaText>
            <BodyText>{item.customerName}</BodyText>
            <BodyText>{item.customerPhone || item.customerEmail || item.customerId}</BodyText>

            <View style={styles.spacer} />
            <Input value={title} onChangeText={setTitle} placeholder={t('appointments.titlePlaceholder')} />
            <View style={styles.spacer} />
            <Input value={startTime} onChangeText={setStartTime} placeholder={t('appointments.datePlaceholder')} />
            <View style={styles.spacer} />
            <Input value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder={t('appointments.durationPlaceholder')} />
            <View style={styles.spacer} />
            <Input value={assignedTo} onChangeText={setAssignedTo} placeholder={t('appointments.staffPlaceholder')} />
            <View style={styles.spacer} />
            <Input value={description} onChangeText={setDescription} placeholder={t('appointments.descriptionPlaceholder')} multiline numberOfLines={2} />
            <View style={styles.spacer} />
            <Input value={notes} onChangeText={setNotes} placeholder={t('appointments.notesPlaceholder')} multiline numberOfLines={2} />

            <View style={styles.spacer} />
            <MetaText>{t('appointments.fieldType')}</MetaText>
            <View style={styles.rowWrap}>
              {(['consultation', 'repair', 'maintenance', 'delivery', 'other'] as const).map((value) => (
                <Button
                  key={value}
                  title={t(`appointments.type.${value}`)}
                  variant={type === value ? 'primary' : 'secondary'}
                  onPress={() => setType(value)}
                  style={styles.tagButton}
                />
              ))}
            </View>

            <View style={styles.spacer} />
            <MetaText>{t('appointments.fieldStatus')}</MetaText>
            <View style={styles.rowWrap}>
              {(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] as const).map((value) => (
                <Button
                  key={value}
                  title={t(`appointments.status.${value}`)}
                  variant={status === value ? 'primary' : 'secondary'}
                  onPress={() => setStatus(value)}
                  style={styles.tagButton}
                />
              ))}
            </View>

            <View style={styles.spacer} />
            <Button
              title={loadingSlots ? t('common.loading') : t('appointments.loadAvailability')}
              onPress={() => void onLoadAvailability()}
              variant="secondary"
              disabled={loadingSlots}
            />

            {slots.length > 0 ? (
              <FlatList
                data={slots.slice(0, 20)}
                keyExtractor={(row) => `${row.start}-${row.end}`}
                style={styles.slotsList}
                renderItem={({ item: slot }) => (
                  <ListItemCard>
                    <BodyText>{new Date(slot.start).toLocaleString()}</BodyText>
                    <Button title={t('appointments.selectSlot')} onPress={() => setStartTime(slot.start)} />
                  </ListItemCard>
                )}
              />
            ) : (
              <EmptyState
                title={t('appointments.availabilityTitle')}
                description={t('appointments.availabilityDescription')}
                actionLabel={t('appointments.loadAvailability')}
                onAction={() => void onLoadAvailability()}
              />
            )}

            <View style={styles.spacer} />
            <Input value={cancelReason} onChangeText={setCancelReason} placeholder={t('appointments.cancelReasonPlaceholder')} />

            {requestError ? <ErrorText style={styles.error}>{requestError}</ErrorText> : null}

            <View style={styles.rowWrap}>
              <Button title={t('appointments.remindAction')} onPress={() => void onRemind()} variant="secondary" disabled={saving} />
              <Button title={t('appointments.cancelAction')} onPress={() => void onCancel()} variant="danger" disabled={saving || status === 'cancelled'} />
            </View>
          </Card>
        ) : null}
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s2 },
  rowWrap: { flexDirection: 'row', gap: theme.spacing.s2, flexWrap: 'wrap', marginTop: theme.spacing.s2 },
  spacer: { height: theme.spacing.s2 },
  error: { marginTop: theme.spacing.s2, marginBottom: theme.spacing.s2 },
  tagButton: { marginBottom: theme.spacing.s2 },
  slotsList: { maxHeight: 220, marginTop: theme.spacing.s2 },
});
