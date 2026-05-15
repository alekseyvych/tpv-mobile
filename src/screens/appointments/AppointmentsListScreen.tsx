import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { getAppointments } from '@/api/appointments.api';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListItemCard } from '@/components/ListItemCard';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { Topbar } from '@/components/Topbar';
import { BodyText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useDeviceProfile } from '@/platform/useDeviceProfile';
import { Input } from '@/components/Input';
import type { AppointmentDto, AppointmentFiltersDto } from '@/types/api';

type Props = {
  onBack: () => void;
  onBook: () => void;
  onOpenAppointment: (appointmentId: string) => void;
};

const STATUS_TABS: Array<{ key: AppointmentFiltersDto['status'] | 'all'; labelKey: string }> = [
  { key: 'all', labelKey: 'appointments.filters.all' },
  { key: 'scheduled', labelKey: 'appointments.filters.scheduled' },
  { key: 'confirmed', labelKey: 'appointments.filters.confirmed' },
  { key: 'completed', labelKey: 'appointments.filters.completed' },
  { key: 'cancelled', labelKey: 'appointments.filters.cancelled' },
  { key: 'no_show', labelKey: 'appointments.filters.noShow' },
];

export function AppointmentsListScreen({ onBack, onBook, onOpenAppointment }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<AppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentFiltersDto['status'] | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { isPhone } = useDeviceProfile();

  const filters = useMemo<AppointmentFiltersDto>(() => {
    const out: AppointmentFiltersDto = {};
    if (statusFilter !== 'all') out.status = statusFilter;
    if (search.trim()) out.search = search.trim();
    return out;
  }, [search, statusFilter]);

  async function loadAppointments(activeFilters: AppointmentFiltersDto = filters) {
    setLoading(true);
    setLoadError(false);
    try {
      const result = await getAppointments(activeFilters);
      setItems(result.data);
      if (!selectedDate && result.data.length > 0) {
        setSelectedDate(new Date(result.data[0].startTime).toISOString().slice(0, 10));
      }
    } catch {
      setItems([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadInitialAppointments() {
      try {
        const result = await getAppointments(filters);
        if (!mounted) return;
        setItems(result.data);
        if (result.data.length > 0) {
          setSelectedDate(new Date(result.data[0].startTime).toISOString().slice(0, 10));
        }
      } catch {
        if (!mounted) return;
        setItems([]);
        setLoadError(true);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadInitialAppointments();

    return () => {
      mounted = false;
    };
  }, [filters]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, AppointmentDto[]>();
    items.forEach((item) => {
      const day = new Date(item.startTime).toISOString().slice(0, 10);
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)?.push(item);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const dateItems = useMemo(() => {
    if (!selectedDate) return items;
    return items.filter((item) => new Date(item.startTime).toISOString().slice(0, 10) === selectedDate);
  }, [items, selectedDate]);

  function renderAppointmentRow(item: AppointmentDto) {
    return (
      <Pressable key={item.id} onPress={() => onOpenAppointment(item.id)}>
        <ListItemCard>
          <MetaText style={styles.itemTitle}>{item.title}</MetaText>
          <BodyText style={styles.itemMeta}>{item.customerName}</BodyText>
          <BodyText style={styles.itemMeta}>
            {new Date(item.startTime).toLocaleString()} · {t(`appointments.status.${item.status}`)}
          </BodyText>
        </ListItemCard>
      </Pressable>
    );
  }

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return items.filter((a) => new Date(a.startTime).toISOString().slice(0, 10) === today).length;
  }, [items]);

  return (
    <ScreenPage>
      <Topbar title={t('appointments.title')} onBack={onBack} />
      <ScreenContent>
        {isPhone ? (
          <>
            <Card>
              <SectionHeader title={t('appointments.title')} subtitle={t('appointments.todayCount', { count: todayCount })} />
              <View style={styles.row}>
                <Button title={t('appointments.bookAction')} onPress={onBook} />
              </View>
              <View style={styles.spacer} />
              <Input
                value={search}
                onChangeText={setSearch}
                placeholder={t('appointments.searchPlaceholder')}
              />
              <View style={styles.tabsRow}>
                <Button
                  title={t('appointments.viewToggle.list')}
                  variant={viewMode === 'list' ? 'primary' : 'secondary'}
                  onPress={() => setViewMode('list')}
                  style={styles.tabButton}
                />
                <Button
                  title={t('appointments.viewToggle.calendar')}
                  variant={viewMode === 'calendar' ? 'primary' : 'secondary'}
                  onPress={() => setViewMode('calendar')}
                  style={styles.tabButton}
                />
              </View>
              <FlatList
                horizontal
                data={STATUS_TABS}
                keyExtractor={(item) => String(item.key)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.statusList}
                renderItem={({ item }) => (
                  <Button
                    title={t(item.labelKey)}
                    variant={statusFilter === item.key ? 'primary' : 'secondary'}
                    onPress={() => setStatusFilter(item.key)}
                    style={styles.statusButton}
                  />
                )}
              />
            </Card>
            {loading ? (
              <Card>
                <LoadingState title={t('appointments.loadingTitle')} description={t('appointments.loadingDescription')} />
              </Card>
            ) : null}
            {loadError ? (
              <Card>
                <ErrorState
                  title={t('appointments.loadErrorTitle')}
                  description={t('appointments.loadErrorDescription')}
                  actionLabel={t('common.retry')}
                  onAction={() => void loadAppointments()}
                />
              </Card>
            ) : null}
            <FlatList
              style={styles.list}
              data={viewMode === 'calendar' ? dateItems : items}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderAppointmentRow(item)}
              ListHeaderComponent={viewMode === 'calendar' ? (
                <FlatList
                  horizontal
                  data={groupedByDate}
                  keyExtractor={([day]) => day}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.statusList}
                  renderItem={({ item: [day, grouped] }) => (
                    <Button
                      title={`${day} (${grouped.length})`}
                      variant={selectedDate === day ? 'primary' : 'secondary'}
                      onPress={() => setSelectedDate(day)}
                      style={styles.statusButton}
                    />
                  )}
                />
              ) : null}
              ListEmptyComponent={!loading && !loadError ? (
                <EmptyState
                  title={t('appointments.emptyTitle')}
                  description={t('appointments.empty')}
                  actionLabel={t('appointments.bookAction')}
                  onAction={onBook}
                />
              ) : null}
            />
          </>
        ) : (
          <View style={styles.tabletSplitPane}>
            <View style={styles.tabletCalendarPanel}>
              <Card>
                <TitleText>{t('appointments.viewToggle.calendar')}</TitleText>
                <BodyText style={styles.description}>{t('appointments.calendarDescription')}</BodyText>
                <FlatList
                  style={styles.list}
                  data={groupedByDate}
                  keyExtractor={([day]) => day}
                  renderItem={({ item: [day, grouped] }) => (
                    <Button
                      title={`${day} (${grouped.length})`}
                      variant={selectedDate === day ? 'primary' : 'secondary'}
                      onPress={() => setSelectedDate(day)}
                      style={styles.calendarButton}
                    />
                  )}
                  ListEmptyComponent={!loading && !loadError ? (
                    <EmptyState
                      title={t('appointments.emptyTitle')}
                      description={t('appointments.empty')}
                      actionLabel={t('appointments.bookAction')}
                      onAction={onBook}
                    />
                  ) : null}
                />
              </Card>
            </View>
            <View style={styles.tabletListPanel}>
              <Card>
                <SectionHeader title={t('appointments.title')} />
                <View style={styles.row}>
                  <Button title={t('appointments.bookAction')} onPress={onBook} />
                </View>
                <View style={styles.spacer} />
                <Input
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t('appointments.searchPlaceholder')}
                />
                <FlatList
                  horizontal
                  data={STATUS_TABS}
                  keyExtractor={(item) => String(item.key)}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.statusList}
                  renderItem={({ item }) => (
                    <Button
                      title={t(item.labelKey)}
                      variant={statusFilter === item.key ? 'primary' : 'secondary'}
                      onPress={() => setStatusFilter(item.key)}
                      style={styles.statusButton}
                    />
                  )}
                />
              </Card>
              {loading ? (
                <Card>
                  <LoadingState title={t('appointments.loadingTitle')} description={t('appointments.loadingDescription')} />
                </Card>
              ) : null}
              {loadError ? (
                <Card>
                  <ErrorState
                    title={t('appointments.loadErrorTitle')}
                    description={t('appointments.loadErrorDescription')}
                    actionLabel={t('common.retry')}
                    onAction={() => void loadAppointments()}
                  />
                </Card>
              ) : null}
              <FlatList
                style={styles.list}
                data={dateItems}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderAppointmentRow(item)}
                ListEmptyComponent={!loading && !loadError ? (
                  <EmptyState
                    title={t('appointments.emptyTitle')}
                    description={t('appointments.empty')}
                    actionLabel={t('appointments.bookAction')}
                    onAction={onBook}
                  />
                ) : null}
              />
            </View>
          </View>
        )}
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.s2 },
  tabsRow: { flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s2 },
  tabButton: { flex: 1 },
  statusList: { paddingTop: theme.spacing.s2, gap: theme.spacing.s2 },
  statusButton: { marginRight: theme.spacing.s2 },
  list: { marginTop: theme.spacing.s3 },
  itemTitle: { marginBottom: 0 },
  itemMeta: { marginBottom: 0, marginTop: theme.spacing.s1, color: theme.colors.textSecondary },
  tabletSplitPane: { flexDirection: 'row', gap: theme.spacing.s3, flex: 1 },
  tabletCalendarPanel: { flex: 0.35 },
  tabletListPanel: { flex: 0.65 },
  spacer: { height: theme.spacing.s2 },
  description: { marginBottom: theme.spacing.s2 },
  calendarButton: { marginBottom: theme.spacing.s2 },
});
