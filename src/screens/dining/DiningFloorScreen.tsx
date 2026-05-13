import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { Canvas, Fill, Group, Line, Rect, RoundedRect, Text, matchFont } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListItemCard } from '@/components/ListItemCard';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { StatusPill } from '@/components/StatusPill';
import { Topbar } from '@/components/Topbar';
import { BodyText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { useRestaurantOrders } from '@/hooks/useRestaurantOrders';
import { restaurantApi } from '@/api/restaurant.api';
import type { ZoneLayoutConfig } from '@/api/restaurant.api';

// Match Windows tableMapLayout.ts constants exactly
const MAP_TABLE_W = 120;
const MAP_TABLE_H = 120;
const SLAB_W = 520;
const SLAB_H = 360;
const SLAB_MARGIN = 32;
const ZONE_INNER_PAD = 80;
const STRIDE = 144; // snap(TABLE_W + GAP=16, GRID_SIZE=16) = 144
const FLOOR_W = 2200;
const FLOOR_H = 1400;
const GRID_SIZE = 16;
const GRID_MAJOR_EVERY = 4;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2;

// Fallback palette when backend has no color for a zone
const ZONE_COLORS = ['#eef2ff', '#fdf2f8', '#f0fdf4', '#fff7ed', '#eff6ff', '#faf5ff'];

type Props = {
  onOpenTable: () => void;
  onGoHome: () => void;
};

type PositionedTable = {
  id: string;
  number: string;
  zone: string;
  status: string;
  capacity: number;
  currentGuestCount?: number | null;
  x: number;
  y: number;
};

type ZoneRect = {
  zone: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
};

const clamp = (value: number, min: number, max: number): number => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

const clampTableToFloor = (x: number, y: number): { x: number; y: number } => ({
  x: clamp(x, 0, FLOOR_W - MAP_TABLE_W),
  y: clamp(y, 0, FLOOR_H - MAP_TABLE_H),
});

const clampZoneToFloor = (x: number, y: number, width: number, height: number): ZoneRect => {
  const safeWidth = clamp(width, 220, FLOOR_W);
  const safeHeight = clamp(height, 180, FLOOR_H);
  const maxX = Math.max(0, FLOOR_W - safeWidth);
  const maxY = Math.max(0, FLOOR_H - safeHeight);
  return {
    zone: '',
    x: clamp(x, 0, maxX),
    y: clamp(y, 0, maxY),
    width: safeWidth,
    height: safeHeight,
  };
};

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  if (full.length !== 6) return `rgba(148,163,184,${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function DiningFloorScreen({ onOpenTable: _onOpenTable }: Props) {
  const { t } = useTranslation();
  const { tables, loadTables, selectTable } = useRestaurantOrders();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [zoneLayouts, setZoneLayouts] = useState<Record<string, ZoneLayoutConfig>>({});
  const [viewportW, setViewportW] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  // Transform state as Reanimated shared values — gesture worklets run on the
  // UI thread and write directly; Skia reads via useDerivedValue. No bridge,
  // no stale closures, no React re-render per gesture frame.
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const zoom = useSharedValue(1);
  const mapViewportRef = useRef<View>(null);
  const tableLabelFont = useMemo(
    () => matchFont({ fontFamily: 'sans-serif', fontSize: 14, fontWeight: '700' }),
    [],
  );
  const tableMetaFont = useMemo(
    () => matchFont({ fontFamily: 'sans-serif', fontSize: 12, fontWeight: '400' }),
    [],
  );
  const zoneLabelFont = useMemo(
    () => matchFont({ fontFamily: 'sans-serif', fontSize: 12, fontWeight: '600' }),
    [],
  );

  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => {
      const zoneCmp = (a.zone ?? '').localeCompare(b.zone ?? '');
      if (zoneCmp !== 0) return zoneCmp;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
    });
  }, [tables]);

  const groupedByZone = useMemo(() => {
    const map = new Map<string, typeof sortedTables>();
    for (const table of sortedTables) {
      const zone = table.zone?.trim() || 'Main';
      const prev = map.get(zone) ?? [];
      prev.push(table);
      map.set(zone, prev);
    }
    return [...map.entries()].map(([title, data]) => ({ title, data }));
  }, [sortedTables]);

  const mapData = useMemo(() => {
    // Collect unique zones in sorted order
    const uniqueZones: string[] = [];
    for (const t of sortedTables) {
      const z = t.zone?.trim() || 'Main';
      if (!uniqueZones.includes(z)) uniqueZones.push(z);
    }

    // Fallback slab placement (matches Windows workspacePlacement algorithm)
    const fallbackSlabs = new Map<string, { x: number; y: number }>();
    let slabX = 0;
    let slabY = 0;
    for (const zone of uniqueZones) {
      if (slabX > 0 && slabX + SLAB_W > FLOOR_W) {
        slabX = 0;
        slabY += SLAB_H + SLAB_MARGIN;
      }
      fallbackSlabs.set(zone, { x: slabX, y: slabY });
      slabX += SLAB_W + SLAB_MARGIN;
    }

    const maxRelX = SLAB_W - ZONE_INNER_PAD - MAP_TABLE_W;
    const maxCols = Math.max(1, Math.floor((maxRelX - ZONE_INNER_PAD) / STRIDE) + 1);

    // Place tables: use backend position when available, fallback otherwise
    const countByZone = new Map<string, number>();
    const positioned: PositionedTable[] = sortedTables.map((table) => {
      const zone = table.zone?.trim() || 'Main';
      const idx = countByZone.get(zone) ?? 0;
      countByZone.set(zone, idx + 1);

      let x: number;
      let y: number;
      if (table.position?.x != null && table.position.y != null) {
        x = table.position.x;
        y = table.position.y;
      } else {
        const slab = fallbackSlabs.get(zone) ?? { x: 0, y: 0 };
        const col = idx % maxCols;
        const row = Math.floor(idx / maxCols);
        x = slab.x + ZONE_INNER_PAD + col * STRIDE;
        y = slab.y + ZONE_INNER_PAD + row * STRIDE;
      }

      const clamped = clampTableToFloor(x, y);
      return {
        id: table.id,
        number: String(table.number),
        zone,
        status: table.status,
        capacity: table.capacity,
        currentGuestCount: table.currentGuestCount,
        x: clamped.x,
        y: clamped.y,
      };
    });

    // Build zone rects: prefer backend zone layout, fallback to slab bounds
    const zones: ZoneRect[] = uniqueZones.map((zone, zoneIdx) => {
      const backendLayout = zoneLayouts[zone];
      if (backendLayout) {
        const safe = clampZoneToFloor(
          backendLayout.x,
          backendLayout.y,
          backendLayout.width,
          backendLayout.height,
        );
        return {
          zone,
          x: safe.x,
          y: safe.y,
          width: safe.width,
          height: safe.height,
          color: backendLayout.color,
        };
      }
      const slab = fallbackSlabs.get(zone) ?? { x: 0, y: 0 };
      const tablesInZone = countByZone.get(zone) ?? 1;
      const rowsNeeded = Math.ceil(tablesInZone / maxCols);
      const height = Math.max(SLAB_H, ZONE_INNER_PAD + rowsNeeded * STRIDE + ZONE_INNER_PAD - (STRIDE - MAP_TABLE_H));
      const safe = clampZoneToFloor(slab.x, slab.y, SLAB_W, height);
      return {
        zone,
        x: safe.x,
        y: safe.y,
        width: safe.width,
        height: safe.height,
        color: ZONE_COLORS[zoneIdx % ZONE_COLORS.length] ?? '#eef2ff',
      };
    });

    return { tables: positioned, zones, width: FLOOR_W, height: FLOOR_H };
  }, [sortedTables, zoneLayouts]);

  const handleOpenTable = (tableId: string) => {
    selectTable(tableId);
    _onOpenTable();
  };

  const getStatusColors = (status: string) => {
    if (status === 'available') return { bg: '#DCFCE7', border: '#16A34A', text: '#166534' };
    if (status === 'occupied') return { bg: '#FEE2E2', border: '#DC2626', text: '#7F1D1D' };
    if (status === 'reserved') return { bg: '#FEF3C7', border: '#D97706', text: '#78350F' };
    return { bg: '#DBEAFE', border: '#2563EB', text: '#1E3A8A' };
  };

  const getStatusTone = (status: string): 'success' | 'error' | 'warning' | 'info' => {
    if (status === 'available') return 'success';
    if (status === 'occupied') return 'error';
    if (status === 'reserved') return 'warning';
    return 'info';
  };

  // Derived transform — passed directly to Skia <Group transform={canvasTransform}>.
  // Updates run entirely on the UI thread without triggering React re-renders.
  const canvasTransform = useDerivedValue(() => [
    { translateX: panX.value },
    { translateY: panY.value },
    { scale: zoom.value },
  ]);

  // Fit map to viewport
  useEffect(() => {
    if (viewportW <= 0 || viewportH <= 0) return;

    const fitScale = clamp(Math.min(viewportW / mapData.width, viewportH / mapData.height) * 0.94, MIN_ZOOM, MAX_ZOOM);
    panX.value = (viewportW - mapData.width * fitScale) / 2;
    panY.value = (viewportH - mapData.height * fitScale) / 2;
    zoom.value = fitScale;
  }, [mapData.width, mapData.height, viewportW, viewportH, panX, panY, zoom]);

  // Pan gesture — delta-based onChange so translationX/Y origin never matters.
  // maxPointers(1) makes it fail when 2 fingers are down, so pinch can run
  // cleanly with no interference from pan on the same frame.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .onChange((event) => {
          panX.value += event.changeX;
          panY.value += event.changeY;
        }),
    [panX, panY],
  );

  // Pinch gesture — delta-based onChange.
  // scaleChange is the multiplicative factor since the previous event (~1.0 each frame).
  // Anchor: scale the distance from every canvas point to the focal point.
  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onChange((event) => {
          const nextZoom = clamp(zoom.value * event.scaleChange, MIN_ZOOM, MAX_ZOOM);
          const actualChange = nextZoom / zoom.value;
          // Scale content around focal point (equivalent to: translate so focal
          // is at origin, scale, translate back)
          panX.value = event.focalX + (panX.value - event.focalX) * actualChange;
          panY.value = event.focalY + (panY.value - event.focalY) * actualChange;
          zoom.value = nextZoom;
        }),
    [zoom, panX, panY],
  );

  // Simultaneous: both can run at the same time if needed, but maxPointers(1)
  // on pan ensures it only activates for single-finger touches.
  const composedGesture = useMemo(() => Gesture.Simultaneous(panGesture, pinchGesture), [panGesture, pinchGesture]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [, layouts] = await Promise.all([
          loadTables(),
          restaurantApi.getZoneLayouts(),
        ]);
        const layoutMap: Record<string, ZoneLayoutConfig> = {};
        for (const l of layouts) {
          layoutMap[l.zone] = l;
        }
        setZoneLayouts(layoutMap);
      } catch {
        setError(t('dining.loadError') || 'Failed to load tables');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [loadTables, t]);

  return (
    <ScreenPage>
      <Topbar title={t('dining.floorTitle')} />
      <ScreenContent style={viewMode === 'grid' ? styles.screenContentGrid : undefined}>
        {loading ? (
          <Card>
            <LoadingState title={t('dining.loadingTitle')} description={t('dining.loadingDescription')} />
          </Card>
        ) : null}

        {error ? (
          <Card>
            <ErrorState
              title={t('dining.loadErrorTitle')}
              description={error}
              actionLabel={t('common.retry')}
              onAction={() => void loadTables()}
            />
          </Card>
        ) : null}

        {!loading && !error && (
          <Card style={styles.viewTabsCard}>
            <View style={styles.viewTabsRow}>
              <Pressable
                style={[styles.viewTab, viewMode === 'list' && styles.viewTabActive]}
                onPress={() => setViewMode('list')}
              >
                <MetaText style={viewMode === 'list' ? styles.viewTabTextActive : undefined}>
                  {t('dining.viewList', 'List')}
                </MetaText>
              </Pressable>
              <Pressable
                style={[styles.viewTab, viewMode === 'grid' && styles.viewTabActive]}
                onPress={() => setViewMode('grid')}
              >
                <MetaText style={viewMode === 'grid' ? styles.viewTabTextActive : undefined}>
                  {t('dining.viewMap', 'Map')}
                </MetaText>
              </Pressable>
            </View>
          </Card>
        )}

        {!loading && !error && sortedTables.length === 0 ? (
          <EmptyState title={t('dining.emptyTitle')} description={t('dining.noTables')} />
        ) : null}

        {!loading && !error && sortedTables.length > 0 && viewMode === 'list' && (
          <SectionList
            sections={groupedByZone}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section }) => (
              <View style={styles.zoneHeaderWrap}>
                <MetaText style={styles.zoneHeaderText}>{section.title}</MetaText>
              </View>
            )}
            renderItem={({ item }) => (
              <Pressable onPress={() => handleOpenTable(item.id)}>
                <ListItemCard>
                  <View style={styles.listTopRow}>
                    <TitleText style={styles.itemTitle}>{`Table ${item.number}`}</TitleText>
                    <StatusPill label={item.status} tone={getStatusTone(item.status)} />
                  </View>
                  <BodyText style={styles.itemMeta}>{`${t('dining.capacity', 'Capacity')}: ${item.capacity}`}</BodyText>
                  {item.currentGuestCount != null && (
                    <BodyText style={styles.itemMeta}>{`${t('dining.partySize', 'Party size')}: ${item.currentGuestCount}`}</BodyText>
                  )}
                </ListItemCard>
              </Pressable>
            )}
          />
        )}

        {!loading && !error && viewMode === 'grid' && (
          <View style={styles.mapModeFill}>
            <View
              ref={mapViewportRef}
              style={styles.mapViewport}
              onLayout={(event) => {
                const w = event.nativeEvent.layout.width;
                const h = event.nativeEvent.layout.height;
                setViewportW(w);
                setViewportH(h);
              }}
            >
              <GestureDetector gesture={composedGesture}>
                <Canvas style={styles.mapCanvas}>
                  <Fill color={theme.colors.bgPanel} />
                  <Group transform={canvasTransform}> 
                    <Rect x={0} y={0} width={mapData.width} height={mapData.height} color="#ffffff" />

                    {Array.from({ length: Math.floor(mapData.width / (GRID_SIZE * GRID_MAJOR_EVERY)) + 1 }, (_, index) => {
                      const x = index * GRID_SIZE * GRID_MAJOR_EVERY;
                      return (
                        <Line
                          key={`grid-x-${x}`}
                          p1={{ x, y: 0 }}
                          p2={{ x, y: mapData.height }}
                          color="#888888"
                          style="stroke"
                          strokeWidth={2}
                        />
                      );
                    })}

                    {Array.from({ length: Math.floor(mapData.height / (GRID_SIZE * GRID_MAJOR_EVERY)) + 1 }, (_, index) => {
                      const y = index * GRID_SIZE * GRID_MAJOR_EVERY;
                      return (
                        <Line
                          key={`grid-y-${y}`}
                          p1={{ x: 0, y }}
                          p2={{ x: mapData.width, y }}
                          color="#888888"
                          style="stroke"
                          strokeWidth={2}
                        />
                      );
                    })}

                    {mapData.zones.map((zone) => {
                      const zoneColor = zone.color ?? '#eef2ff';
                      return (
                        <Group key={zone.zone}>
                          <RoundedRect
                            x={zone.x}
                            y={zone.y}
                            width={zone.width}
                            height={zone.height}
                            r={theme.radius.md}
                            color={withAlpha(zoneColor, 0.22)}
                          />
                          <RoundedRect
                            x={zone.x}
                            y={zone.y}
                            width={zone.width}
                            height={zone.height}
                            r={theme.radius.md}
                            color={withAlpha(zoneColor, 0.85)}
                            style="stroke"
                            strokeWidth={1}
                          />
                          <Text
                            x={zone.x + 8}
                            y={zone.y + 18}
                            text={zone.zone}
                            font={zoneLabelFont}
                            color={theme.colors.textSecondary}
                          />
                        </Group>
                      );
                    })}

                    {mapData.tables.map((table) => {
                      const colors = getStatusColors(table.status);
                      return (
                        <Group key={table.id}>
                          <RoundedRect
                            x={table.x}
                            y={table.y}
                            width={MAP_TABLE_W}
                            height={MAP_TABLE_H}
                            r={theme.radius.md}
                            color={colors.bg}
                          />
                          <RoundedRect
                            x={table.x}
                            y={table.y}
                            width={MAP_TABLE_W}
                            height={MAP_TABLE_H}
                            r={theme.radius.md}
                            color={colors.border}
                            style="stroke"
                            strokeWidth={2}
                          />
                          <Text
                            x={table.x + 34}
                            y={table.y + 52}
                            text={`T${table.number}`}
                            font={tableLabelFont}
                            color={colors.text}
                          />
                          <Text
                            x={table.x + 20}
                            y={table.y + 74}
                            text={table.status}
                            font={tableMetaFont}
                            color={colors.text}
                          />
                        </Group>
                      );
                    })}
                  </Group>
                </Canvas>
              </GestureDetector>

              <View style={styles.legendInsideMap}>
                <View style={styles.legendRowCompact}>
                  {['available', 'occupied', 'reserved', 'cleaning'].map((status) => {
                    const colors = getStatusColors(status);
                    return (
                      <View key={status} style={styles.legendItemCompact}>
                        <View
                          style={[
                            styles.legendSwatch,
                            { backgroundColor: colors.bg, borderColor: colors.border },
                          ]}
                        />
                        <MetaText style={styles.legendTextCompact}>{status}</MetaText>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        )}
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  screenContentGrid: {
    paddingTop: theme.spacing.s2,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  viewTabsCard: { marginBottom: theme.spacing.s2 },
  viewTabsRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s2 },
  viewTab: {
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s2,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  viewTabActive: { backgroundColor: theme.colors.accentAction, borderColor: theme.colors.accentAction },
  viewTabTextActive: { color: theme.colors.textInverse },

  zoneHeaderWrap: {
    paddingVertical: theme.spacing.s1,
    paddingHorizontal: theme.spacing.s1,
    backgroundColor: theme.colors.bgPage,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  zoneHeaderText: {
    fontWeight: theme.typography.weightSemibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: theme.typography.sizeXs,
  },
  listTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { marginBottom: 0 },
  itemMeta: { marginBottom: 0, marginTop: theme.spacing.s1 },

  mapModeFill: {
    flex: 1,
  },
  mapViewport: {
    flex: 1,
    position: 'relative',
    minHeight: 320,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bgPanel,
    overflow: 'hidden',
  },
  mapCanvas: {
    flex: 1,
  },

  legendInsideMap: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: theme.radius.sm,
  },
  legendRowCompact: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  legendItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
  },
  legendTextCompact: {
    color: '#fff',
    fontSize: 10,
  },
});
