import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, SectionList, StyleSheet, Text as RNText, View } from 'react-native';
import { Canvas, Fill, Group, Line, Rect, RoundedRect, Text, matchFont } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useDerivedValue, useSharedValue } from 'react-native-reanimated';

import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
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
import { getActiveCashShift } from '@/api/cashShifts.api';
import { restaurantApi } from '@/api/restaurant.api';
import { getTerminals, type Terminal } from '@/api/terminals.api';
import type { ZoneLayoutConfig } from '@/api/restaurant.api';
import { OpenShiftModal } from '@/features/terminal-selection/components/OpenShiftModal';
import { useTerminalStore } from '@/store/terminal.store';

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
const MAP_OVERDRAW_PX = 520;
const GRID_AREA_SCALE = 3;
const WORLD_PADDING_PX = 120;
const MIN_WORLD_W = 960;
const MIN_WORLD_H = 720;

// Fallback palette when backend has no color for a zone
const ZONE_COLORS = ['#eef2ff', '#fdf2f8', '#f0fdf4', '#fff7ed', '#eff6ff', '#faf5ff'];

type Props = {
  onOpenTable: (tableId: string) => void;
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
  joinGroupId: string | null;
  billAnchorTableId: string | null;
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

const setSharedNumberValue = (shared: { value: number }, nextValue: number): void => {
  'worklet';
  shared.value = nextValue;
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

const getPanBounds = (
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
  currentZoom: number,
  overdrawPx: number,
): { minX: number; maxX: number; minY: number; maxY: number } => {
  'worklet';

  const scaledWidth = contentWidth * currentZoom;
  const scaledHeight = contentHeight * currentZoom;

  let minX: number;
  let maxX: number;
  if (scaledWidth <= viewportWidth) {
    const centeredX = (viewportWidth - scaledWidth) / 2;
    minX = centeredX - overdrawPx;
    maxX = centeredX + overdrawPx;
  } else {
    minX = viewportWidth - scaledWidth - overdrawPx;
    maxX = overdrawPx;
  }

  let minY: number;
  let maxY: number;
  if (scaledHeight <= viewportHeight) {
    const centeredY = (viewportHeight - scaledHeight) / 2;
    minY = centeredY - overdrawPx;
    maxY = centeredY + overdrawPx;
  } else {
    minY = viewportHeight - scaledHeight - overdrawPx;
    maxY = overdrawPx;
  }

  return { minX, maxX, minY, maxY };
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
  const selectedTerminalId = useTerminalStore((s) => s.selectedTerminalId);
  const setSelectedTerminal = useTerminalStore((s) => s.setSelectedTerminal);
  const setActiveCashShiftId = useTerminalStore((s) => s.setActiveCashShiftId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [zoneLayouts, setZoneLayouts] = useState<Record<string, ZoneLayoutConfig>>({});
  const [viewportW, setViewportW] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const [legendVisible, setLegendVisible] = useState(true);
  const [joinMode, setJoinMode] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [joinSelection, setJoinSelection] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingOpenTableId, setPendingOpenTableId] = useState<string | null>(null);
  const [terminalPickerVisible, setTerminalPickerVisible] = useState(false);
  const [terminalPickerLoading, setTerminalPickerLoading] = useState(false);
  const [terminalPickerError, setTerminalPickerError] = useState<string | null>(null);
  const [availableTerminals, setAvailableTerminals] = useState<Terminal[]>([]);
  const [pendingTerminal, setPendingTerminal] = useState<Terminal | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  // Transform state as Reanimated shared values - gesture worklets run on the
  // UI thread and write directly; Skia reads via useDerivedValue. No bridge,
  // no stale closures, no React re-render per gesture frame.
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const zoom = useSharedValue(1);
  const mapViewportRef = useRef<View>(null);
  const tableLabelFont = useMemo(
    () => matchFont({ fontFamily: 'sans-serif', fontSize: 28, fontWeight: '800' }),
    [],
  );
  const tableTagFont = useMemo(
    () => matchFont({ fontFamily: 'sans-serif', fontSize: 9, fontWeight: '700' }),
    [],
  );
  const tableMetaFont = useMemo(
    () => matchFont({ fontFamily: 'sans-serif', fontSize: 11, fontWeight: '600' }),
    [],
  );
  const tableCapacityValueFont = useMemo(
    () => matchFont({ fontFamily: 'sans-serif', fontSize: 14, fontWeight: '700' }),
    [],
  );
  const joinedBadgeFont = useMemo(
    () => matchFont({ fontFamily: 'sans-serif', fontSize: 9, fontWeight: '700' }),
    [],
  );
  const zoneLabelFont = useMemo(
    () => matchFont({ fontFamily: 'sans-serif', fontSize: 32, fontWeight: '700' }),
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
      const tableAny = table as typeof table & { joinGroupId?: string | null; billAnchorTableId?: string | null };
      return {
        id: table.id,
        number: String(table.number),
        zone,
        status: table.status,
        capacity: table.capacity,
        currentGuestCount: table.currentGuestCount,
        x: clamped.x,
        y: clamped.y,
        joinGroupId: tableAny.joinGroupId ?? null,
        billAnchorTableId: tableAny.billAnchorTableId ?? null,
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

    const zoneMinX = zones.length > 0 ? Math.min(...zones.map((z) => z.x)) : 0;
    const zoneMinY = zones.length > 0 ? Math.min(...zones.map((z) => z.y)) : 0;
    const zoneMaxX = zones.length > 0 ? Math.max(...zones.map((z) => z.x + z.width)) : FLOOR_W;
    const zoneMaxY = zones.length > 0 ? Math.max(...zones.map((z) => z.y + z.height)) : FLOOR_H;

    const tableMinX = positioned.length > 0 ? Math.min(...positioned.map((t) => t.x)) : 0;
    const tableMinY = positioned.length > 0 ? Math.min(...positioned.map((t) => t.y)) : 0;
    const tableMaxX = positioned.length > 0 ? Math.max(...positioned.map((t) => t.x + MAP_TABLE_W)) : FLOOR_W;
    const tableMaxY = positioned.length > 0 ? Math.max(...positioned.map((t) => t.y + MAP_TABLE_H)) : FLOOR_H;

    const rawMinX = Math.min(zoneMinX, tableMinX, 0);
    const rawMinY = Math.min(zoneMinY, tableMinY, 0);
    const rawMaxX = Math.max(zoneMaxX, tableMaxX);
    const rawMaxY = Math.max(zoneMaxY, tableMaxY);

    const inBoundsX = Math.max(0, rawMinX - WORLD_PADDING_PX);
    const inBoundsY = Math.max(0, rawMinY - WORLD_PADDING_PX);
    const inBoundsWidth = Math.max(MIN_WORLD_W, rawMaxX - inBoundsX + WORLD_PADDING_PX);
    const inBoundsHeight = Math.max(MIN_WORLD_H, rawMaxY - inBoundsY + WORLD_PADDING_PX);

    const zoneArea = zones.reduce((acc, z) => acc + z.width * z.height, 0);
    const worldArea = Math.max(1, inBoundsWidth * inBoundsHeight);
    const density = Math.sqrt(zoneArea / worldArea);
    const dynamicMajorEvery = Math.round(clamp(GRID_MAJOR_EVERY * (0.9 + density * 0.8), 2, 8));
    const gridStep = GRID_SIZE * dynamicMajorEvery;
    const overdrawPx = Math.max(MAP_OVERDRAW_PX, Math.round(Math.max(inBoundsWidth, inBoundsHeight) * 0.35));

    return {
      tables: positioned,
      zones,
      width: inBoundsWidth,
      height: inBoundsHeight,
      inBoundsX,
      inBoundsY,
      gridStep,
      overdrawPx,
    };
  }, [sortedTables, zoneLayouts]);

  const panOverdrawPx = useMemo(
    () => Math.max(mapData.overdrawPx, Math.round(Math.max(viewportW, viewportH) * 0.9)),
    [mapData.overdrawPx, viewportW, viewportH],
  );

  const gridOverdrawPx = useMemo(
    () => Math.round(panOverdrawPx * GRID_AREA_SCALE),
    [panOverdrawPx],
  );

  const handleOpenTableDirect = useCallback((tableId: string) => {
    selectTable(tableId);
    _onOpenTable(tableId);
  }, [selectTable, _onOpenTable]);

  const abortPendingOpenTable = useCallback(() => {
    setPendingOpenTableId(null);
    setTerminalPickerVisible(false);
    setPendingTerminal(null);
    setShowShiftModal(false);
  }, []);

  const proceedWithTerminalAndShift = useCallback((terminal: Terminal, cashShiftId: string) => {
    setSelectedTerminal(
      terminal.id,
      terminal.operatingMode,
      terminal.capabilities ?? null,
    );
    setActiveCashShiftId(cashShiftId);

    const tableId = pendingOpenTableId;
    abortPendingOpenTable();
    if (tableId) {
      handleOpenTableDirect(tableId);
    }
  }, [abortPendingOpenTable, handleOpenTableDirect, pendingOpenTableId, setActiveCashShiftId, setSelectedTerminal]);

  const ensureTerminalAndShiftThenOpenTable = useCallback(async (tableId: string) => {
    setError(null);
    setPendingOpenTableId(tableId);

    try {
      if (selectedTerminalId) {
        const activeShift = await getActiveCashShift(selectedTerminalId);
        if (activeShift?.id) {
          setActiveCashShiftId(activeShift.id);
          setPendingOpenTableId(null);
          handleOpenTableDirect(tableId);
          return;
        }
        setPendingTerminal(null);
        setShowShiftModal(true);
        return;
      }

      setTerminalPickerVisible(true);
      setTerminalPickerLoading(true);
      setTerminalPickerError(null);
      const terminals = await getTerminals(true);
      const activeOnly = terminals.filter((terminal) => terminal.active);
      setAvailableTerminals(activeOnly);
      if (activeOnly.length === 0) {
        setTerminalPickerError(t('terminal.selection.emptyMsg'));
      }
    } catch {
      setTerminalPickerError(t('terminal.selection.errorMsg'));
      setError(t('terminalSelection.required'));
    } finally {
      setTerminalPickerLoading(false);
    }
  }, [handleOpenTableDirect, selectedTerminalId, setActiveCashShiftId, t]);

  const handleOpenTable = useCallback((tableId: string) => {
    void ensureTerminalAndShiftThenOpenTable(tableId);
  }, [ensureTerminalAndShiftThenOpenTable]);

  const handlePickTerminal = useCallback(async (terminal: Terminal) => {
    setTerminalPickerLoading(true);
    setTerminalPickerError(null);
    try {
      const activeShift = await getActiveCashShift(terminal.id);
      if (activeShift?.id) {
        proceedWithTerminalAndShift(terminal, activeShift.id);
        return;
      }
      setPendingTerminal(terminal);
      setTerminalPickerVisible(false);
      setShowShiftModal(true);
    } catch {
      setTerminalPickerError(t('terminal.selection.errorMsg'));
    } finally {
      setTerminalPickerLoading(false);
    }
  }, [proceedWithTerminalAndShift, t]);

  const getCapacityValue = useCallback((status: string, capacity: number, currentGuestCount?: number | null): string => {
    if (status === 'occupied' || status === 'reserved') {
      return currentGuestCount != null ? `${currentGuestCount}/${capacity}` : `?/${capacity}`;
    }
    return String(capacity);
  }, []);

  const getCapacityKind = useCallback((status: string): string => {
    if (status === 'occupied' || status === 'reserved') {
      return t('dining.guests', 'Guests');
    }
    return t('dining.seats', 'Seats');
  }, [t]);

  const toggleJoinSelection = useCallback((tableId: string) => {
    setJoinSelection((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId],
    );
  }, []);

  const reloadAfterAction = useCallback(async () => {
    const [, layouts] = await Promise.all([loadTables(), restaurantApi.getZoneLayouts()]);
    const layoutMap: Record<string, ZoneLayoutConfig> = {};
    for (const l of layouts) layoutMap[l.zone] = l;
    setZoneLayouts(layoutMap);
  }, [loadTables]);

  const handleConfirmJoin = useCallback(async () => {
    if (joinSelection.length < 2) return;
    setActionLoading(true);
    try {
      await restaurantApi.joinTables(joinSelection);
      await reloadAfterAction();
    } catch { /* user will retry */ } finally {
      setJoinMode(false);
      setJoinSelection([]);
      setActionLoading(false);
    }
  }, [joinSelection, reloadAfterAction]);

  const handleSplitGroup = useCallback(async (joinGroupId: string) => {
    setActionLoading(true);
    try {
      await restaurantApi.splitJoinGroup(joinGroupId);
      await reloadAfterAction();
    } catch { /* user will retry */ } finally {
      setSplitMode(false);
      setActionLoading(false);
    }
  }, [reloadAfterAction]);

  const handleMapTapTable = useCallback((tableId: string) => {
    const tapped = tables.find((t) => t.id === tableId) as
      | (typeof tables[0] & { joinGroupId?: string | null; billAnchorTableId?: string | null })
      | undefined;
    if (!tapped) return;
    if (joinMode) {
      if (tapped.status === 'occupied') return;
      if (tapped.billAnchorTableId) return;
      toggleJoinSelection(tableId);
      return;
    }
    if (splitMode) {
      if (tapped.status === 'occupied') return;
      if (!tapped.joinGroupId) return;
      void handleSplitGroup(tapped.joinGroupId);
      return;
    }
    handleOpenTable(tableId);
  }, [joinMode, splitMode, tables, toggleJoinSelection, handleSplitGroup, handleOpenTable]);

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

  // Derived transform - passed directly to Skia <Group transform={canvasTransform}>.
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
    const centeredX = (viewportW - mapData.width * fitScale) / 2;
    const centeredY = (viewportH - mapData.height * fitScale) / 2;
    const bounds = getPanBounds(viewportW, viewportH, mapData.width, mapData.height, fitScale, panOverdrawPx);
    setSharedNumberValue(panX, clamp(centeredX, bounds.minX, bounds.maxX));
    setSharedNumberValue(panY, clamp(centeredY, bounds.minY, bounds.maxY));
    setSharedNumberValue(zoom, fitScale);
  }, [mapData.width, mapData.height, viewportW, viewportH, panX, panY, zoom, panOverdrawPx]);

  // Pan gesture - delta-based onChange so translationX/Y origin never matters.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .onChange((event) => {
          const bounds = getPanBounds(
            viewportW,
            viewportH,
            mapData.width,
            mapData.height,
            zoom.value,
            panOverdrawPx,
          );
          setSharedNumberValue(panX, clamp(panX.value + event.changeX, bounds.minX, bounds.maxX));
          setSharedNumberValue(panY, clamp(panY.value + event.changeY, bounds.minY, bounds.maxY));
        }),
    [panX, panY, mapData.width, mapData.height, viewportW, viewportH, zoom, panOverdrawPx],
  );

  // Pinch gesture - delta-based onChange.
  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onChange((event) => {
          const nextZoom = clamp(zoom.value * event.scaleChange, MIN_ZOOM, MAX_ZOOM);
          const actualChange = nextZoom / zoom.value;
          const rawPanX = event.focalX + (panX.value - event.focalX) * actualChange;
          const rawPanY = event.focalY + (panY.value - event.focalY) * actualChange;
          const bounds = getPanBounds(
            viewportW,
            viewportH,
            mapData.width,
            mapData.height,
            nextZoom,
            panOverdrawPx,
          );
          setSharedNumberValue(panX, clamp(rawPanX, bounds.minX, bounds.maxX));
          setSharedNumberValue(panY, clamp(rawPanY, bounds.minY, bounds.maxY));
          setSharedNumberValue(zoom, nextZoom);
        }),
    [zoom, panX, panY, mapData.width, mapData.height, viewportW, viewportH, panOverdrawPx],
  );

  // Tap gesture - identify hit table and delegate to handleMapTapTable on JS thread.
  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(10)
        .onEnd((event, success) => {
          if (!success || zoom.value <= 0) return;
          const mapX = (event.x - panX.value) / zoom.value;
          const mapY = (event.y - panY.value) / zoom.value;
          const hit = mapData.tables.find(
            (table) =>
              mapX >= table.x &&
              mapX <= table.x + MAP_TABLE_W &&
              mapY >= table.y &&
              mapY <= table.y + MAP_TABLE_H,
          );
          if (hit) {
            runOnJS(handleMapTapTable)(hit.id);
          }
        }),
    [handleMapTapTable, mapData.tables, panX, panY, zoom],
  );

  // Simultaneous: pan, pinch, tap all registered together.
  const composedGesture = useMemo(
    () => Gesture.Simultaneous(panGesture, pinchGesture, tapGesture),
    [panGesture, pinchGesture, tapGesture],
  );

  const reloadDiningData = useCallback(async () => {
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
  }, [loadTables, t]);

  useEffect(() => {
    void reloadDiningData();
  }, [reloadDiningData]);

  useFocusEffect(
    useCallback(() => {
      void reloadDiningData();
      return undefined;
    }, [reloadDiningData]),
  );

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
              onAction={() => void reloadDiningData()}
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
            renderItem={({ item }) => {
              const tableAny = item as typeof item & { joinGroupId?: string | null; billAnchorTableId?: string | null };
              return (
                <Pressable onPress={() => {
                  if (joinMode) {
                    if (item.status !== 'occupied' && !tableAny.billAnchorTableId) toggleJoinSelection(item.id);
                    return;
                  }
                  if (splitMode) {
                    if (item.status !== 'occupied' && tableAny.joinGroupId) void handleSplitGroup(tableAny.joinGroupId);
                    return;
                  }
                  handleOpenTable(item.id);
                }}>
                  <ListItemCard>
                    <View style={styles.listTopRow}>
                      <TitleText style={styles.itemTitle}>{`Table ${item.number}`}</TitleText>
                      <View style={styles.listTopRowRight}>
                        {tableAny.joinGroupId ? <StatusPill label="joined" tone="info" /> : null}
                        {joinMode && joinSelection.includes(item.id) ? <StatusPill label="selected" tone="success" /> : null}
                        <StatusPill label={item.status} tone={getStatusTone(item.status)} />
                      </View>
                    </View>
                    <BodyText style={styles.itemMeta}>
                      {`${getCapacityKind(item.status)}: ${getCapacityValue(item.status, item.capacity, item.currentGuestCount)}`}
                    </BodyText>
                  </ListItemCard>
                </Pressable>
              );
            }}
          />
        )}

        {!loading && !error && viewMode === 'grid' && (
          <View style={styles.mapModeFill}>
            {/* Join / Split action row */}
            <View style={styles.joinActionsRow}>
              <Pressable
                style={[styles.joinActionBtn, joinMode && styles.joinActionBtnActive]}
                onPress={() => {
                  setSplitMode(false);
                  setJoinSelection([]);
                  setJoinMode((v) => !v);
                }}
                disabled={actionLoading}
              >
                <RNText style={joinMode ? styles.joinActionTextActive : styles.joinActionText}>
                  {joinMode ? t('dining.cancelJoin', 'Cancel') : t('dining.joinTables', 'Join Tables')}
                </RNText>
              </Pressable>
              <Pressable
                style={[styles.joinActionBtn, splitMode && styles.joinActionBtnActive]}
                onPress={() => {
                  setJoinMode(false);
                  setJoinSelection([]);
                  setSplitMode((v) => !v);
                }}
                disabled={actionLoading}
              >
                <RNText style={splitMode ? styles.joinActionTextActive : styles.joinActionText}>
                  {splitMode ? t('dining.cancelSplit', 'Cancel') : t('dining.splitGroup', 'Split Group')}
                </RNText>
              </Pressable>
            </View>

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
                  <Fill color="#CBD5E1" />
                  <Group transform={canvasTransform}>
                    <Rect
                      x={mapData.inBoundsX - gridOverdrawPx}
                      y={mapData.inBoundsY - gridOverdrawPx}
                      width={mapData.width + gridOverdrawPx * 2}
                      height={mapData.height + gridOverdrawPx * 2}
                      color="#D1D5DB"
                    />
                    <Rect
                      x={mapData.inBoundsX}
                      y={mapData.inBoundsY}
                      width={mapData.width}
                      height={mapData.height}
                      color="#ffffff"
                    />
                    <Rect
                      x={mapData.inBoundsX}
                      y={mapData.inBoundsY}
                      width={mapData.width}
                      height={mapData.height}
                      color="#000000"
                      style="stroke"
                      strokeWidth={16}
                    />

                    {Array.from(
                      {
                        length:
                          Math.floor((mapData.width + gridOverdrawPx * 2) / mapData.gridStep) + 1,
                      },
                      (_, index) => {
                      const x = mapData.inBoundsX - gridOverdrawPx + index * mapData.gridStep;
                      return (
                        <Line
                          key={`grid-x-${x}`}
                          p1={{ x, y: mapData.inBoundsY - gridOverdrawPx }}
                          p2={{ x, y: mapData.inBoundsY + mapData.height + gridOverdrawPx }}
                          color="#888888"
                          style="stroke"
                          strokeWidth={2}
                        />
                      );
                    })}

                    {Array.from(
                      {
                        length:
                          Math.floor((mapData.height + gridOverdrawPx * 2) / mapData.gridStep) + 1,
                      },
                      (_, index) => {
                      const y = mapData.inBoundsY - gridOverdrawPx + index * mapData.gridStep;
                      return (
                        <Line
                          key={`grid-y-${y}`}
                          p1={{ x: mapData.inBoundsX - gridOverdrawPx, y }}
                          p2={{ x: mapData.inBoundsX + mapData.width + gridOverdrawPx, y }}
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
                            color={withAlpha(zoneColor, 1)}
                            style="stroke"
                            strokeWidth={4}
                          />
                          <Text
                            x={zone.x + 16}
                            y={zone.y + 42}
                            text={zone.zone}
                            font={zoneLabelFont}
                            color="#000000"
                          />
                        </Group>
                      );
                    })}

                    {mapData.tables.map((table) => {
                      const colors = getStatusColors(table.status);
                      const isJoinSelected = joinMode && joinSelection.includes(table.id);
                      const isJoined = !!table.joinGroupId;
                      const borderColor = isJoinSelected
                        ? '#2563EB'
                        : isJoined
                        ? '#7C3AED'
                        : colors.border;
                      const borderWidth = isJoinSelected ? 4 : isJoined ? 4 : 2;
                      const capValue = getCapacityValue(table.status, table.capacity, table.currentGuestCount);
                      const capKind = getCapacityKind(table.status);
                      const tableNumberX = table.x + MAP_TABLE_W / 2 - table.number.length * 8.5;
                      const capKindX = table.x + MAP_TABLE_W / 2 - capKind.length * 3.2;
                      const capValueX = table.x + MAP_TABLE_W / 2 - capValue.length * 4.2;
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
                            color={borderColor}
                            style="stroke"
                            strokeWidth={borderWidth}
                          />
                          <Text
                            x={table.x + 8}
                            y={table.y + 18}
                            text={t('dining.table', 'Table').toUpperCase()}
                            font={tableTagFont}
                            color={colors.text}
                          />
                          <Text
                            x={tableNumberX}
                            y={table.y + 64}
                            text={table.number}
                            font={tableLabelFont}
                            color={colors.text}
                          />
                          <Text
                            x={capKindX}
                            y={table.y + 92}
                            text={capKind}
                            font={tableMetaFont}
                            color={colors.text}
                          />
                          <Text
                            x={capValueX}
                            y={table.y + 108}
                            text={capValue}
                            font={tableCapacityValueFont}
                            color={colors.text}
                          />
                          {isJoined ? (
                            <>
                              <RoundedRect
                                x={table.x + 62}
                                y={table.y + 6}
                                width={52}
                                height={16}
                                r={6}
                                color="#7C3AED"
                              />
                              <Text
                                x={table.x + 68}
                                y={table.y + 18}
                                text={t('dining.joined', 'JOINED')}
                                font={joinedBadgeFont}
                                color="#ffffff"
                              />
                            </>
                          ) : null}
                        </Group>
                      );
                    })}
                  </Group>
                </Canvas>
              </GestureDetector>

              {legendVisible && (
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
                          <RNText style={styles.legendTextCompact}>{status}</RNText>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
              <Pressable style={styles.legendToggleBtn} onPress={() => setLegendVisible((v) => !v)}>
                <RNText style={styles.legendToggleText}>{legendVisible ? 'Hide legend' : 'Legend'}</RNText>
              </Pressable>
            </View>

            {/* Join mode confirmation bar */}
            {joinMode && (
              <View style={styles.joinBar}>
                <RNText style={styles.joinBarHint}>
                  {joinSelection.length < 2
                    ? t('dining.joinSelectHint', 'Select tables to join (tap each)')
                    : t('dining.joinReadyHint', '{{count}} tables selected', { count: joinSelection.length })}
                </RNText>
                <View style={styles.joinBarActions}>
                  <Pressable
                    style={[styles.joinBarBtn, joinSelection.length < 2 && styles.joinBarBtnDisabled]}
                    onPress={() => void handleConfirmJoin()}
                    disabled={joinSelection.length < 2 || actionLoading}
                  >
                    <RNText style={styles.joinBarBtnText}>{t('dining.confirmJoin', 'Confirm Join')}</RNText>
                  </Pressable>
                  <Pressable
                    style={styles.joinBarBtnSecondary}
                    onPress={() => { setJoinMode(false); setJoinSelection([]); }}
                  >
                    <RNText style={styles.joinBarBtnSecondaryText}>{t('common.cancel', 'Cancel')}</RNText>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Split mode hint bar */}
            {splitMode && (
              <View style={styles.joinBar}>
                <RNText style={styles.joinBarHint}>
                  {t('dining.splitSelectHint', 'Tap a joined table to split its group')}
                </RNText>
                <Pressable
                  style={styles.joinBarBtnSecondary}
                  onPress={() => setSplitMode(false)}
                >
                  <RNText style={styles.joinBarBtnSecondaryText}>{t('common.cancel', 'Cancel')}</RNText>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScreenContent>

      <Modal
        visible={terminalPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={abortPendingOpenTable}
      >
        <Pressable style={styles.termBackdrop} onPress={abortPendingOpenTable}>
          <Pressable style={styles.termSheet} onPress={() => undefined}>
            <TitleText style={styles.termTitle}>{t('terminal.selection.title')}</TitleText>
            <MetaText style={styles.termSubtitle}>{t('terminal.selection.subtitle')}</MetaText>

            {terminalPickerLoading ? (
              <View style={styles.termLoadingRow}>
                <ActivityIndicator color={theme.colors.accentAction} />
                <MetaText>{t('terminal.selection.loading')}</MetaText>
              </View>
            ) : null}

            {!terminalPickerLoading && terminalPickerError ? (
              <MetaText style={styles.termErrorText}>{terminalPickerError}</MetaText>
            ) : null}

            {!terminalPickerLoading && availableTerminals.length > 0 ? (
              <View style={styles.termList}>
                {availableTerminals.map((terminal) => (
                  <Pressable
                    key={terminal.id}
                    style={styles.termItem}
                    onPress={() => { void handlePickTerminal(terminal); }}
                    disabled={terminalPickerLoading}
                  >
                    <View style={styles.termItemRow}>
                      <BodyText style={styles.termItemTitle}>{terminal.name}</BodyText>
                      <MetaText style={styles.termModeText}>
                        {terminal.operatingMode === 'RESTAURANT'
                          ? t('terminal.selection.modeRestaurant')
                          : terminal.operatingMode === 'PERSONALIZED'
                          ? t('terminal.selection.modePersonalized')
                          : t('terminal.selection.modeRetail')}
                      </MetaText>
                    </View>
                    <MetaText>{terminal.terminalId}</MetaText>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.termActions}>
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={abortPendingOpenTable}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <OpenShiftModal
        visible={showShiftModal && (!!pendingTerminal || !!selectedTerminalId)}
        terminalId={pendingTerminal?.id ?? selectedTerminalId ?? ''}
        terminalName={pendingTerminal?.name ?? selectedTerminalId ?? '-'}
        onShiftOpened={(cashShiftId) => {
          if (pendingTerminal) {
            proceedWithTerminalAndShift(pendingTerminal, cashShiftId);
            return;
          }
          if (!selectedTerminalId) return;
          setActiveCashShiftId(cashShiftId);
          const tableId = pendingOpenTableId;
          abortPendingOpenTable();
          if (tableId) {
            handleOpenTableDirect(tableId);
          }
        }}
        onCancel={abortPendingOpenTable}
      />
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
  listTopRowRight: { flexDirection: 'row', gap: 4, alignItems: 'center' },
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
    bottom: 32,
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
    gap: 6,
    minHeight: 16,
  },
  legendSwatch: {
    width: 13,
    height: 13,
    borderRadius: 2,
    borderWidth: 1,
  },
  legendTextCompact: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  legendToggleBtn: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: theme.radius.sm,
  },
  legendToggleText: {
    color: '#fff',
    fontSize: 10,
  },

  joinActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.s2,
    paddingHorizontal: theme.spacing.s2,
    paddingVertical: theme.spacing.s1,
    backgroundColor: theme.colors.bgPanel,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  joinActionBtn: {
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s1,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgPanel,
  },
  joinActionBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  joinActionText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.weightSemibold,
  },
  joinActionTextActive: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: theme.typography.weightSemibold,
  },
  joinBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s2,
    backgroundColor: '#1e293b',
    gap: theme.spacing.s2,
  },
  joinBarHint: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: theme.typography.weightSemibold,
  },
  joinBarActions: {
    flexDirection: 'row',
    gap: theme.spacing.s2,
  },
  joinBarBtn: {
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s1,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentAction,
  },
  joinBarBtnDisabled: {
    opacity: 0.4,
  },
  joinBarBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: theme.typography.weightSemibold,
  },
  joinBarBtnSecondary: {
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s1,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  joinBarBtnSecondaryText: {
    color: '#f8fafc',
    fontSize: 13,
  },
  termBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.s4,
  },
  termSheet: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: theme.colors.bgPanel,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.s3,
    gap: theme.spacing.s2,
  },
  termTitle: {
    marginBottom: 0,
  },
  termSubtitle: {
    marginBottom: 0,
    color: theme.colors.textSecondary,
  },
  termLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s2,
    paddingVertical: theme.spacing.s2,
  },
  termErrorText: {
    color: theme.colors.error,
    marginBottom: 0,
  },
  termList: {
    gap: theme.spacing.s2,
    maxHeight: 280,
  },
  termItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.s2,
    backgroundColor: theme.colors.bgPage,
    gap: theme.spacing.s1,
  },
  termItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.s2,
  },
  termItemTitle: {
    marginBottom: 0,
  },
  termModeText: {
    color: theme.colors.accentAction,
    marginBottom: 0,
  },
  termActions: {
    marginTop: theme.spacing.s2,
  },
});
