import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { G, Line, Rect, Svg, Text as SvgText } from 'react-native-svg';

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
const PAN_MARGIN_RATIO = 0.14;
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

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

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

export function DiningFloorScreen({ onOpenTable: _onOpenTable }: Props) {
  const { t } = useTranslation();
  const { tables, loadTables, selectTable } = useRestaurantOrders();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [zoneLayouts, setZoneLayouts] = useState<Record<string, ZoneLayoutConfig>>({});
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [viewportW, setViewportW] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const scaleRef = useRef(1);
  const panXRef = useRef(0);
  const panYRef = useRef(0);
  const gesturePanStartRef = useRef({ x: 0, y: 0 });
  const pinchStartRef = useRef({
    scale: 1,
    panX: 0,
    panY: 0,
  });
  const fitKeyRef = useRef<string>('');

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    panXRef.current = panX;
    panYRef.current = panY;
  }, [panX, panY]);

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

    const width = FLOOR_W;
    const height = FLOOR_H;

    return { tables: positioned, zones, width, height };
  }, [sortedTables, zoneLayouts]);

  const gridX = useMemo(() => {
    const cols = Math.ceil(mapData.width / GRID_SIZE);
    return Array.from({ length: cols + 1 }, (_, i) => i * GRID_SIZE);
  }, [mapData.width]);

  const gridY = useMemo(() => {
    const rows = Math.ceil(mapData.height / GRID_SIZE);
    return Array.from({ length: rows + 1 }, (_, i) => i * GRID_SIZE);
  }, [mapData.height]);

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

  const getPanBounds = useMemo(
    () => (nextScale: number) => {
      const contentW = mapData.width * nextScale;
      const contentH = mapData.height * nextScale;

      if (viewportW <= 0 || viewportH <= 0) {
        return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
      }

      const marginX = Math.round(Math.max(viewportW, contentW) * PAN_MARGIN_RATIO);
      const marginY = Math.round(Math.max(viewportH, contentH) * PAN_MARGIN_RATIO);

      // X bounds: allow panning left/right with margin
      const minX = Math.min(0, viewportW - contentW - marginX);
      const maxX = marginX;

      // Y bounds: allow panning up/down with margin (don't lock when content fits)
      const minY = Math.min(0, viewportH - contentH - marginY);
      const maxY = marginY;

      return { minX, maxX, minY, maxY };
    },
    [mapData.height, mapData.width, viewportH, viewportW],
  );

  const applyPanWithBounds = useMemo(
    () => (nextPanX: number, nextPanY: number, nextScale: number) => {
      const bounds = getPanBounds(nextScale);
      const clampedX = clamp(nextPanX, bounds.minX, bounds.maxX);
      const clampedY = clamp(nextPanY, bounds.minY, bounds.maxY);
      panXRef.current = clampedX;
      panYRef.current = clampedY;
      setPanX(clampedX);
      setPanY(clampedY);
    },
    [getPanBounds],
  );

  // Trigger fit whenever viewport layout changes
  useEffect(() => {
    if (viewportW <= 0 || viewportH <= 0) return;
    const fitKey = `${mapData.width}x${mapData.height}:${viewportW}x${viewportH}:${sortedTables.length}`;
    if (fitKeyRef.current === fitKey) return;

    const fitScale = clamp(Math.min(viewportW / mapData.width, viewportH / mapData.height) * 0.94, MIN_ZOOM, MAX_ZOOM);
    const centeredPanX = (viewportW - mapData.width * fitScale) / 2;
    const centeredPanY = (viewportH - mapData.height * fitScale) / 2;

    scaleRef.current = fitScale;
    panXRef.current = centeredPanX;
    panYRef.current = centeredPanY;

    setScale(fitScale);
    setPanX(centeredPanX);
    setPanY(centeredPanY);

    fitKeyRef.current = fitKey;
  }, [mapData.height, mapData.width, sortedTables.length, viewportH, viewportW]);

  /* eslint-disable react-hooks/refs */
  const panGesture = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      Gesture.Pan()
        .runOnJS(true)
        .onStart(() => {
          gesturePanStartRef.current = { x: panXRef.current, y: panYRef.current };
        })
        .onUpdate((event) => {
          const newPanX = gesturePanStartRef.current.x + event.translationX;
          const newPanY = gesturePanStartRef.current.y + event.translationY;
          applyPanWithBounds(newPanX, newPanY, scaleRef.current);
        }),
    [applyPanWithBounds],
  );

  const pinchGesture = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      Gesture.Pinch()
        .runOnJS(true)
        .onStart(() => {
          pinchStartRef.current = {
            scale: scaleRef.current,
            panX: panXRef.current,
            panY: panYRef.current,
          };
        })
        .onUpdate((event) => {
          const newScale = clamp(pinchStartRef.current.scale * event.scale, MIN_ZOOM, MAX_ZOOM);

          // Keep zoom anchored around pinch focal point for natural behavior
          const contentX = (event.focalX - pinchStartRef.current.panX) / pinchStartRef.current.scale;
          const contentY = (event.focalY - pinchStartRef.current.panY) / pinchStartRef.current.scale;
          const nextPanX = event.focalX - contentX * newScale;
          const nextPanY = event.focalY - contentY * newScale;

          scaleRef.current = newScale;
          setScale(newScale);
          applyPanWithBounds(nextPanX, nextPanY, newScale);
        }),
    [applyPanWithBounds],
  );
  /* eslint-enable react-hooks/refs */

  const composedGesture = useMemo(() => Gesture.Simultaneous(panGesture, pinchGesture), [panGesture, pinchGesture]);

  const hexToRgba = (hex: string, alpha: number): string => {
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
                  {t('dining.viewList')}
                </MetaText>
              </Pressable>
              <Pressable
                style={[styles.viewTab, viewMode === 'grid' && styles.viewTabActive]}
                onPress={() => setViewMode('grid')}
              >
                <MetaText style={viewMode === 'grid' ? styles.viewTabTextActive : undefined}>
                  {t('dining.viewMap')}
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
                    <TitleText style={styles.itemTitle}>{`${t('dining.table')} ${item.number}`}</TitleText>
                    <StatusPill label={item.status} tone={getStatusTone(item.status)} />
                  </View>
                  <BodyText style={styles.itemMeta}>{`${t('dining.capacity')}: ${item.capacity}`}</BodyText>
                  {item.currentGuestCount != null && (
                    <BodyText style={styles.itemMeta}>{`${t('dining.partySize')}: ${item.currentGuestCount}`}</BodyText>
                  )}
                </ListItemCard>
              </Pressable>
            )}
          />
        )}

        {!loading && !error && viewMode === 'grid' && (
          <View style={styles.mapModeFill}>
            <View
              style={styles.mapViewport}
              onLayout={(event) => {
                const w = event.nativeEvent.layout.width;
                const h = event.nativeEvent.layout.height;
                setViewportW(w);
                setViewportH(h);
              }}
            >
              {/* DEBUG: Show viewport and transform values - outside gesture to always be visible */}
              <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.85)', padding: 8, borderRadius: 4, zIndex: 20 }}>
                <MetaText style={{ color: '#0f0', fontSize: 10, fontFamily: 'monospace' }}>VP: {Math.round(viewportW)}x{Math.round(viewportH)}</MetaText>
                <MetaText style={{ color: '#0f0', fontSize: 10, fontFamily: 'monospace' }}>Pan: {Math.round(panX)}, {Math.round(panY)}</MetaText>
                <MetaText style={{ color: '#0f0', fontSize: 10, fontFamily: 'monospace' }}>Scale: {scale.toFixed(2)}</MetaText>
                <MetaText style={{ color: '#0f0', fontSize: 10, fontFamily: 'monospace' }}>Map: {mapData.width}x{mapData.height}</MetaText>
              </View>

              <GestureDetector gesture={composedGesture}>
              <View
                style={[
                  styles.mapCanvas,
                  {
                    flex: 1,
                  },
                ]}
              >
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: mapData.width,
                    height: mapData.height,
                    transform: [{ scale }, { translateX: panX }, { translateY: panY }],
                  }}
                >
                <Svg 
                  width={mapData.width} 
                  height={mapData.height}
                >
                  {/* Background fill */}
                  <Rect x="0" y="0" width={mapData.width} height={mapData.height} fill="#ffffff" />
                  
                  {/* Grid major lines only */}
                  {gridX.filter((_, i) => i % GRID_MAJOR_EVERY === 0).map((x) => (
                    <Line
                      key={`grid-x-${x}`}
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={mapData.height}
                      stroke="#888888"
                      strokeWidth={2}
                    />
                  ))}
                  {gridY.filter((_, i) => i % GRID_MAJOR_EVERY === 0).map((y) => (
                    <Line
                      key={`grid-y-${y}`}
                      x1={0}
                      y1={y}
                      x2={mapData.width}
                      y2={y}
                      stroke="#888888"
                      strokeWidth={2}
                    />
                  ))}

                  {/* Zones as colored rectangles */}
                  {mapData.zones.map((zone) => {
                    const zoneColor = zone.color ?? '#eef2ff';
                    const zoneTint = hexToRgba(zoneColor, 0.22);
                    return (
                      <G key={zone.zone}>
                        <Rect
                          x={zone.x}
                          y={zone.y}
                          width={zone.width}
                          height={zone.height}
                          rx={theme.radius.md}
                          ry={theme.radius.md}
                          fill={zoneTint}
                          stroke={hexToRgba(zoneColor, 0.85)}
                          strokeWidth={1}
                        />
                        <SvgText
                          x={zone.x + 8}
                          y={zone.y + 18}
                          fontSize={theme.typography.sizeXs}
                          fontWeight={theme.typography.weightSemibold}
                          fill={theme.colors.textSecondary}
                        >
                          {zone.zone}
                        </SvgText>
                      </G>
                    );
                  })}

                  {mapData.tables.map((table) => {
                    const colors = getStatusColors(table.status);
                    return (
                      <G key={table.id} onPress={() => handleOpenTable(table.id)}>
                        <Rect
                          x={table.x}
                          y={table.y}
                          width={MAP_TABLE_W}
                          height={MAP_TABLE_H}
                          rx={theme.radius.md}
                          ry={theme.radius.md}
                          fill={colors.bg}
                          stroke={colors.border}
                          strokeWidth={2}
                        />
                        <SvgText
                          x={table.x + MAP_TABLE_W / 2}
                          y={table.y + 52}
                          textAnchor="middle"
                          fontSize={theme.typography.sizeSm}
                          fontWeight={theme.typography.weightSemibold}
                          fill={colors.text}
                        >
                          {`T${table.number}`}
                        </SvgText>
                        <SvgText
                          x={table.x + MAP_TABLE_W / 2}
                          y={table.y + 74}
                          textAnchor="middle"
                          fontSize={theme.typography.sizeXs}
                          fill={colors.text}
                        >
                          {table.status}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
                </View>
              </View>
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
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  legendInsideMap: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    zIndex: 3,
  },
  legendRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.s1,
  },
  legendItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  legendSwatch: { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
  legendTextCompact: {
    fontSize: theme.typography.sizeXs,
    color: theme.colors.textMuted,
    lineHeight: 12,
    textAlignVertical: 'center',
  },
});
