import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import {
  createAppointment,
  getAppointmentAvailability,
  listAppointmentCustomers,
  listAppointmentStaff,
} from '@/api/appointments.api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ListItemCard } from '@/components/ListItemCard';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { Topbar } from '@/components/Topbar';
import { BodyText, ErrorText, MetaText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import type { AppointmentAvailabilitySlotDto, AppointmentCustomerPickDto, AppointmentStaffPickDto } from '@/types/api';

type Props = {
  onBack: () => void;
  onCreated: () => void;
};

export function BookAppointmentScreen({ onBack, onCreated }: Props) {
  const { t } = useTranslation();
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<AppointmentCustomerPickDto[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [customerLabel, setCustomerLabel] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'consultation' | 'repair' | 'maintenance' | 'delivery' | 'other'>('consultation');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [staff, setStaff] = useState<AppointmentStaffPickDto[]>([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState<AppointmentAvailabilitySlotDto[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = customerId.trim().length > 0 && title.trim().length > 0 && startTime.trim().length > 0;

  async function onSearchCustomers() {
    if (customerSearch.trim().length < 2) {
      setCustomerResults([]);
      return;
    }

    try {
      const result = await listAppointmentCustomers(customerSearch.trim());
      setCustomerResults(result);
    } catch {
      setCustomerResults([]);
    }
  }

  async function onLoadStaff() {
    try {
      const result = await listAppointmentStaff();
      setStaff(result);
    } catch {
      setStaff([]);
    }
  }

  async function onLoadAvailability() {
    if (!startTime.trim()) return;
    const date = new Date(startTime);
    if (Number.isNaN(date.getTime())) {
      setError(t('appointments.validation.invalidDate'));
      return;
    }

    setLoadingSlots(true);
    setError(null);
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
    } catch {
      setSlots([]);
      setError(t('appointments.availabilityError'));
    } finally {
      setLoadingSlots(false);
    }
  }

  async function onSubmit() {
    if (submitting || !canSubmit) return;

    const parsedDate = new Date(startTime);
    if (Number.isNaN(parsedDate.getTime())) {
      setError(t('appointments.validation.invalidDate'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createAppointment({
        customerId: customerId.trim(),
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: parsedDate.toISOString(),
        duration: Math.max(1, Number(duration) || 60),
        assignedTo: assignedTo || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated();
    } catch {
      setError(t('appointments.createError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenPage>
      <Topbar title={t('appointments.bookTitle')} onBack={onBack} />
      <ScreenContent>
        <Card>
          <SectionHeader title={t('appointments.bookTitle')} subtitle={t('appointments.bookSubtitle')} />
          <Input
            value={customerSearch}
            onChangeText={setCustomerSearch}
            placeholder={t('appointments.customerPlaceholder')}
            editable={!submitting}
            onBlur={() => {
              void onSearchCustomers();
            }}
          />
          <View style={styles.spacer} />
          {customerId ? (
            <ListItemCard>
              <MetaText>{t('appointments.selectedCustomer')}</MetaText>
              <BodyText>{customerLabel}</BodyText>
              <BodyText>{customerId}</BodyText>
              <Button
                title={t('appointments.changeCustomer')}
                variant="secondary"
                onPress={() => {
                  setCustomerId('');
                  setCustomerLabel('');
                }}
              />
            </ListItemCard>
          ) : (
            <FlatList
              data={customerResults}
              keyExtractor={(item) => item.id}
              style={styles.pickList}
              renderItem={({ item }) => (
                <ListItemCard>
                  <MetaText>{item.name}</MetaText>
                  <BodyText>{item.id}</BodyText>
                  <Button
                    title={t('appointments.selectCustomer')}
                    onPress={() => {
                      setCustomerId(item.id);
                      setCustomerLabel(item.name);
                      setCustomerResults([]);
                    }}
                  />
                </ListItemCard>
              )}
            />
          )}

          <View style={styles.spacer} />
          <Input value={title} onChangeText={setTitle} placeholder={t('appointments.titlePlaceholder')} editable={!submitting} />

          <View style={styles.row}>
            <Button title={t('appointments.type.consultation')} variant={type === 'consultation' ? 'primary' : 'secondary'} onPress={() => setType('consultation')} style={styles.tabButton} />
            <Button title={t('appointments.type.repair')} variant={type === 'repair' ? 'primary' : 'secondary'} onPress={() => setType('repair')} style={styles.tabButton} />
          </View>
          <View style={styles.row}>
            <Button title={t('appointments.type.maintenance')} variant={type === 'maintenance' ? 'primary' : 'secondary'} onPress={() => setType('maintenance')} style={styles.tabButton} />
            <Button title={t('appointments.type.delivery')} variant={type === 'delivery' ? 'primary' : 'secondary'} onPress={() => setType('delivery')} style={styles.tabButton} />
          </View>
          <View style={styles.row}>
            <Button title={t('appointments.type.other')} variant={type === 'other' ? 'primary' : 'secondary'} onPress={() => setType('other')} style={styles.tabButton} />
          </View>

          <View style={styles.spacer} />
          <Input value={startTime} onChangeText={setStartTime} placeholder={t('appointments.datePlaceholder')} editable={!submitting} />
          <View style={styles.spacer} />
          <Input value={duration} onChangeText={setDuration} placeholder={t('appointments.durationPlaceholder')} editable={!submitting} keyboardType="numeric" />
          <View style={styles.spacer} />
          <Input value={assignedTo} onChangeText={setAssignedTo} placeholder={t('appointments.staffPlaceholder')} editable={!submitting} onFocus={() => void onLoadStaff()} />
          {staff.length > 0 ? (
            <FlatList
              data={staff.slice(0, 8)}
              keyExtractor={(item) => item.id}
              style={styles.pickList}
              renderItem={({ item }) => (
                <ListItemCard>
                  <MetaText>{`${item.firstName} ${item.lastName}`.trim() || item.id}</MetaText>
                  <BodyText>{item.email || item.id}</BodyText>
                  <Button title={t('appointments.selectStaff')} onPress={() => setAssignedTo(item.id)} />
                </ListItemCard>
              )}
            />
          ) : null}

          <View style={styles.spacer} />
          <Input value={description} onChangeText={setDescription} placeholder={t('appointments.descriptionPlaceholder')} editable={!submitting} multiline numberOfLines={2} />
          <View style={styles.spacer} />
          <Input value={notes} onChangeText={setNotes} placeholder={t('appointments.notesPlaceholder')} editable={!submitting} multiline numberOfLines={2} />

          <View style={styles.spacer} />
          <Button title={loadingSlots ? t('common.loading') : t('appointments.loadAvailability')} onPress={() => void onLoadAvailability()} variant="secondary" disabled={loadingSlots || submitting} />
          {slots.length > 0 ? (
            <FlatList
              data={slots.slice(0, 20)}
              keyExtractor={(item) => `${item.start}-${item.end}`}
              style={styles.pickList}
              renderItem={({ item }) => (
                <ListItemCard>
                  <BodyText>{new Date(item.start).toLocaleString()}</BodyText>
                  <Button title={t('appointments.selectSlot')} onPress={() => setStartTime(item.start)} />
                </ListItemCard>
              )}
            />
          ) : null}

          {error ? <ErrorText style={styles.error}>{error}</ErrorText> : null}
          <View style={styles.row}>
            <Button title={submitting ? t('common.loading') : t('appointments.confirmBook')} onPress={() => void onSubmit()} disabled={!canSubmit || submitting} />
          </View>
        </Card>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  spacer: { height: theme.spacing.s2 },
  error: { marginBottom: theme.spacing.s2 },
  row: { flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s3 },
  tabButton: { flex: 1 },
  pickList: { maxHeight: 220 },
});
