/**
 * Order Creation Screen - React Native
 *
 * Allows selecting products from real catalog and adding them to an order
 * with modifiers, extras, and removable ingredients.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Input } from '@/components/Input';
import { ListItemCard } from '@/components/ListItemCard';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { SectionHeader } from '@/components/SectionHeader';
import { StatusPill } from '@/components/StatusPill';
import { Topbar } from '@/components/Topbar';
import { BodyText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

import { restaurantApi } from '@/api/restaurant.api';
import { useCatalog } from '@/hooks/useCatalog';
import { useRestaurantStore } from '@/store/restaurant.store';
import { useDeviceProfile } from '@/platform/useDeviceProfile';

interface ProductWithExtras {
  id: string;
  name: string;
  categoryId?: string;
  unitPrice: number;
  extras?: Array<{ id: string; name: string; priceDelta: number }>;
  removableIngredients?: string[];
  optionGroups?: Array<{
    id: string;
    name: string;
    required?: boolean;
    multiple?: boolean;
    minSelections?: number;
    maxSelections?: number;
    choices: Array<{ id: string; label: string; priceDelta?: number }>;
  }>;
  allergens?: Array<{ allergen: { code: string; name: string } }>;
}

type RestaurantOptionGroup = NonNullable<ProductWithExtras['optionGroups']>[number];

type UnitConfig = {
  removedIngredients: string[];
  selectedExtras: string[];
  optionSelections: Record<string, string[]>;
  notes: string;
};

/**
 * Extract extras from product extras array if available
 */
function getProductExtras(product: any): Array<{ id: string; name: string; priceDelta: number }> {
  if (!Array.isArray(product.extras)) return [];
  return product.extras.filter(
    (e: any) =>
      typeof e.id === 'string' && typeof e.name === 'string' && typeof e.priceDelta === 'number'
  );
}

/**
 * Extract removable ingredients from product if available
 */
function getRemovableIngredients(product: any): string[] {
  if (!Array.isArray(product.removableIngredients)) return [];
  return product.removableIngredients.filter((i: any) => typeof i === 'string' && i.length > 0);
}

function getRestaurantOptionGroups(product: any): RestaurantOptionGroup[] {
  if (!Array.isArray(product.optionGroups)) return [];
  return product.optionGroups.filter(
    (g: any) =>
      typeof g?.id === 'string' &&
      typeof g?.name === 'string' &&
      Array.isArray(g?.choices) &&
      g.choices.length > 0
  );
}

function createDefaultUnitConfig(): UnitConfig {
  return {
    removedIngredients: [],
    selectedExtras: [],
    optionSelections: {},
    notes: '',
  };
}

export function OrderCreationScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const locale = i18n.language === 'es' ? 'es-ES' : 'en-US';
  const formatAmount = useCallback(
    (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value),
    [locale],
  );
  const selectedTableId = useRestaurantStore((s) => s.selectedTableId);
  const getTableById = useRestaurantStore((s) => s.getTableById);
  const updateTable = useRestaurantStore((s) => s.updateTable);
  const setSelectedOrder = useRestaurantStore((s) => s.setSelectedOrder);
  const selectedGuestCountDraft = useRestaurantStore((s) => s.selectedGuestCountDraft);
  const setSelectedGuestCountDraft = useRestaurantStore((s) => s.setSelectedGuestCountDraft);
  const { products, categories, isLoading: catalogLoading } = useCatalog();
  const { isPhone } = useDeviceProfile();
  const { width: viewportWidth } = useWindowDimensions();

  // Get order ID from the selected table's current order
  const table = selectedTableId ? getTableById(selectedTableId) : null;
  const orderId = table?.currentOrderId ?? null;
  const activeOrderIdRef = useRef<string | null>(orderId);
  const creatingOrderPromiseRef = useRef<Promise<string> | null>(null);
  const queuedQuickAddsRef = useRef<Record<string, number>>({});
  const processingQuickAddsRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedTableId) {
      navigation.goBack();
    }
  }, [selectedTableId, navigation]);

  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithExtras | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [optionSelections, setOptionSelections] = useState<Record<string, string[]>>({});
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [perUnitMode, setPerUnitMode] = useState(false);
  const [activeUnitIndex, setActiveUnitIndex] = useState(0);
  const [unitConfigs, setUnitConfigs] = useState<UnitConfig[]>([]);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedDietaryLabel, setSelectedDietaryLabel] = useState<string>('all');
  const [excludedAllergen, setExcludedAllergen] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingQuickAdds, setPendingQuickAdds] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    activeOrderIdRef.current = orderId;
  }, [orderId]);

  const dietaryFilterOptions = useMemo(
    () => [
      'vegan',
      'vegetarian',
      'gluten_free',
      'dairy_free',
      'nut_free',
      'halal',
      'kosher',
      'organic',
      'sugar_free',
      'low_sodium',
    ],
    [],
  );

  const availableAllergens = useMemo(() => {
    const unique = new Set<string>();
    products.forEach((product) => {
      product.allergens?.forEach((item) => {
        const name = item?.allergen?.name?.trim();
        if (name) unique.add(name);
      });
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const productColumns = useMemo(() => {
    if (!isPhone) return 2;
    return viewportWidth >= 360 ? 2 : 1;
  }, [isPhone, viewportWidth]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p: any) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (selectedCategoryId !== 'all' && p.categoryId !== selectedCategoryId) return false;
      if (selectedDietaryLabel !== 'all') {
        const labels = Array.isArray(p.dietaryLabels) ? p.dietaryLabels : [];
        if (!labels.includes(selectedDietaryLabel)) return false;
      }
      if (excludedAllergen !== 'all') {
        const names =
          p.allergens
            ?.map((a: { allergen?: { name?: string } }) => a?.allergen?.name)
            .filter((v: unknown): v is string => typeof v === 'string') ?? [];
        if (names.includes(excludedAllergen)) return false;
      }
      return true;
    });
  }, [products, search, selectedCategoryId, selectedDietaryLabel, excludedAllergen]);

  const selectedProductExtras = useMemo(() => {
    return selectedProduct ? getProductExtras(selectedProduct) : [];
  }, [selectedProduct]);

  const selectedProductRemovables = useMemo(() => {
    return selectedProduct ? getRemovableIngredients(selectedProduct) : [];
  }, [selectedProduct]);

  const selectedGroups = useMemo(() => {
    return selectedProduct ? getRestaurantOptionGroups(selectedProduct) : [];
  }, [selectedProduct]);

  const handleQtyChange = useCallback(
    (nextQty: number) => {
      const qty = Math.max(1, Math.min(99, Math.round(nextQty) || 1));
      setQuantity(String(qty));
      if (!perUnitMode) return;

      if (qty <= 1) {
        if (unitConfigs.length > 0) {
          const first = unitConfigs[0];
          setRemovedIngredients(first.removedIngredients);
          setSelectedExtras(first.selectedExtras);
          setOptionSelections(first.optionSelections);
          setNotes(first.notes);
        }
        setPerUnitMode(false);
        setUnitConfigs([]);
        setActiveUnitIndex(0);
        return;
      }

      setUnitConfigs((prev) => {
        if (qty > prev.length) {
          return [...prev, ...Array.from({ length: qty - prev.length }, createDefaultUnitConfig)];
        }
        return prev.slice(0, qty);
      });
      if (activeUnitIndex >= qty) {
        setActiveUnitIndex(qty - 1);
      }
    },
    [perUnitMode, unitConfigs, activeUnitIndex]
  );

  const togglePerUnitMode = useCallback(() => {
    const qty = Math.max(1, Math.min(99, parseInt(quantity, 10) || 1));
    if (qty <= 1) return;

    if (!perUnitMode) {
      const firstUnit: UnitConfig = {
        removedIngredients: [...removedIngredients],
        selectedExtras: [...selectedExtras],
        optionSelections: Object.fromEntries(
          Object.entries(optionSelections).map(([k, v]) => [k, [...v]])
        ),
        notes,
      };
      setUnitConfigs([firstUnit, ...Array.from({ length: qty - 1 }, createDefaultUnitConfig)]);
      setActiveUnitIndex(0);
      setPerUnitMode(true);
      return;
    }

    if (unitConfigs.length > 0) {
      const first = unitConfigs[0];
      setRemovedIngredients(first.removedIngredients);
      setSelectedExtras(first.selectedExtras);
      setOptionSelections(first.optionSelections);
      setNotes(first.notes);
    }
    setPerUnitMode(false);
    setActiveUnitIndex(0);
    setUnitConfigs([]);
  }, [quantity, perUnitMode, removedIngredients, selectedExtras, optionSelections, notes, unitConfigs]);

  const updateActiveUnitConfig = useCallback(
    (updater: (prev: UnitConfig) => UnitConfig) => {
      setUnitConfigs((prev) => prev.map((config, index) => (index === activeUnitIndex ? updater(config) : config)));
    },
    [activeUnitIndex]
  );

  const getActiveRemovedIngredients = useCallback(
    () => (perUnitMode ? (unitConfigs[activeUnitIndex]?.removedIngredients ?? []) : removedIngredients),
    [perUnitMode, unitConfigs, activeUnitIndex, removedIngredients]
  );

  const getActiveSelectedExtras = useCallback(
    () => (perUnitMode ? (unitConfigs[activeUnitIndex]?.selectedExtras ?? []) : selectedExtras),
    [perUnitMode, unitConfigs, activeUnitIndex, selectedExtras]
  );

  const getActiveOptionSelections = useCallback(
    () => (perUnitMode ? (unitConfigs[activeUnitIndex]?.optionSelections ?? {}) : optionSelections),
    [perUnitMode, unitConfigs, activeUnitIndex, optionSelections]
  );

  const getActiveNotes = useCallback(
    () => (perUnitMode ? (unitConfigs[activeUnitIndex]?.notes ?? '') : notes),
    [perUnitMode, unitConfigs, activeUnitIndex, notes]
  );

  const resetComposer = useCallback(() => {
    setSelectedProduct(null);
    setQuantity('1');
    setNotes('');
    setSelectedExtras([]);
    setRemovedIngredients([]);
    setOptionSelections({});
    setPerUnitMode(false);
    setActiveUnitIndex(0);
    setUnitConfigs([]);
    setValidationAttempted(false);
  }, []);

  const addProductToOrder = useCallback(
    async (
      product: ProductWithExtras,
      qty: number,
      addNotes: string,
      extraIds: string[],
      removed: string[],
      groupSelections: Record<string, string[]>
    ) => {
      // Build options in the same serialized shape used by tpv-front restaurant workspace.
      const options: Array<{ name: string; value?: string }> = [];
      const productExtras = getProductExtras(product);
      const groups = getRestaurantOptionGroups(product);

      if (removed.length > 0) {
        options.push({
          name: '- Remove',
          value: removed.join(', ')
        });
      }

      extraIds.forEach((extraId) => {
        const extra = productExtras.find((e) => e.id === extraId);
        if (extra) {
          options.push({
            name: '+ Extra',
            value: `${extra.name}${extra.priceDelta > 0 ? ` (+${formatAmount(extra.priceDelta)})` : ''}`
          });
        }
      });

      groups.forEach((group) => {
        const selectedIds = groupSelections[group.id] ?? [];
        selectedIds.forEach((choiceId) => {
          const choice = group.choices.find((item) => item.id === choiceId);
          if (choice) {
            options.push({ name: group.name, value: choice.label });
          }
        });
      });

      const itemPayload = {
        productId: product.id,
        quantity: qty,
        notes: addNotes || undefined,
        options: options.length > 0 ? options : undefined
      };

      const activeOrderId = activeOrderIdRef.current ?? orderId;

      if (activeOrderId) {
        await restaurantApi.addOrderItem(activeOrderId, itemPayload);
        setSelectedOrder(activeOrderId);
        activeOrderIdRef.current = activeOrderId;
      } else {
        if (!selectedTableId) {
          throw new Error(t('dining.selectTableRequired', 'Table selection is required'));
        }
        // Backend requires at least one item in CreateOrder, so create the order with this first item.
        const createdOrder = await restaurantApi.createOrder({
          tableId: selectedTableId,
          partySize: selectedGuestCountDraft ?? undefined,
          items: [itemPayload]
        });
        setSelectedOrder(createdOrder.id);
        activeOrderIdRef.current = createdOrder.id;
        updateTable(selectedTableId, { currentOrderId: createdOrder.id });
        if (createdOrder.partySize) {
          setSelectedGuestCountDraft(createdOrder.partySize);
        }
      }
    },
    [
      formatAmount,
      selectedTableId,
      orderId,
      selectedGuestCountDraft,
      setSelectedOrder,
      updateTable,
      setSelectedGuestCountDraft,
      t,
    ]
  );

  /**
   * Add item to order
   */
  const handleAddItem = useCallback(async () => {
    if (!selectedProduct || !selectedTableId) return;

    const qty = Math.max(1, Math.min(99, parseInt(quantity) || 1));

    try {
      setIsSubmitting(true);
      setError(null);

      const reqGroups = selectedGroups.filter((group) => group.required);
      if (reqGroups.length > 0) {
        const hasMissingRequired = (selections: Record<string, string[]>) =>
          reqGroups.some((group) => {
            const min = Math.max(1, group.minSelections ?? 1);
            return (selections[group.id]?.length ?? 0) < min;
          });

        if (perUnitMode) {
          const firstInvalidUnit = unitConfigs.findIndex((config) => hasMissingRequired(config.optionSelections));
          if (firstInvalidUnit >= 0) {
            setValidationAttempted(true);
            setActiveUnitIndex(firstInvalidUnit);
            return;
          }
        } else if (hasMissingRequired(optionSelections)) {
          setValidationAttempted(true);
          return;
        }
      }

      if (perUnitMode && unitConfigs.length > 0) {
        for (const config of unitConfigs) {
          await addProductToOrder(
            selectedProduct,
            1,
            config.notes,
            config.selectedExtras,
            config.removedIngredients,
            config.optionSelections,
          );
        }
      } else {
        await addProductToOrder(
          selectedProduct,
          qty,
          notes,
          selectedExtras,
          removedIngredients,
          optionSelections,
        );
      }

      setSelectedCounts((prev) => ({
        ...prev,
        [selectedProduct.id]: (prev[selectedProduct.id] ?? 0) + qty,
      }));

      resetComposer();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dining.addItemFallbackError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedProduct,
    selectedTableId,
    quantity,
    notes,
    selectedExtras,
    removedIngredients,
    optionSelections,
    selectedGroups,
    perUnitMode,
    unitConfigs,
    addProductToOrder,
    resetComposer,
    t,
  ]);

  const processQuickAddQueue = useCallback(
    async (product: ProductWithExtras) => {
      const productId = product.id;
      if (processingQuickAddsRef.current[productId]) return;

      processingQuickAddsRef.current[productId] = true;
      try {
        while ((queuedQuickAddsRef.current[productId] ?? 0) > 0) {
          const queuedQty = queuedQuickAddsRef.current[productId] ?? 0;
          queuedQuickAddsRef.current[productId] = 0;

          try {
            const itemPayload = {
              productId,
              quantity: queuedQty,
              notes: undefined,
              options: undefined,
            };

            const currentOrderId = activeOrderIdRef.current ?? orderId;
            if (currentOrderId) {
              await restaurantApi.addOrderItem(currentOrderId, itemPayload);
              setSelectedOrder(currentOrderId);
            } else {
              if (!selectedTableId) {
                throw new Error(t('dining.selectTableRequired', 'Table selection is required'));
              }
              if (!creatingOrderPromiseRef.current) {
                creatingOrderPromiseRef.current = restaurantApi
                  .createOrder({
                    tableId: selectedTableId,
                    partySize: selectedGuestCountDraft ?? undefined,
                    items: [itemPayload],
                  })
                  .then((createdOrder) => {
                    setSelectedOrder(createdOrder.id);
                    activeOrderIdRef.current = createdOrder.id;
                    updateTable(selectedTableId, { currentOrderId: createdOrder.id });
                    if (createdOrder.partySize) {
                      setSelectedGuestCountDraft(createdOrder.partySize);
                    }
                    return createdOrder.id;
                  })
                  .finally(() => {
                    creatingOrderPromiseRef.current = null;
                  });
              }
              await creatingOrderPromiseRef.current;
            }
          } catch {
            setSelectedCounts((prev) => ({
              ...prev,
              [productId]: Math.max((prev[productId] ?? 0) - queuedQty, 0),
            }));
            setError(t('dining.addItemFallbackError'));
          } finally {
            setPendingQuickAdds((prev) => {
              const remaining = Math.max((prev[productId] ?? 0) - queuedQty, 0);
              if (remaining === 0) {
                const rest = { ...prev };
                delete rest[productId];
                return rest;
              }
              return { ...prev, [productId]: remaining };
            });
          }
        }

        if (selectedTableId && activeOrderIdRef.current) {
          try {
            const latestTable = await restaurantApi.getTableById(selectedTableId);
            updateTable(selectedTableId, { currentOrderId: latestTable.currentOrderId ?? null });
            setSelectedOrder(latestTable.currentOrderId ?? activeOrderIdRef.current);
          } catch {
            // Keep optimistic local badge; table/order sync will be refreshed on next data load.
          }
        }
      } finally {
        processingQuickAddsRef.current[productId] = false;
      }
    },
    [orderId, selectedTableId, selectedGuestCountDraft, setSelectedOrder, updateTable, setSelectedGuestCountDraft, t],
  );

  const handleQuickAdd = useCallback(
    (product: ProductWithExtras) => {
      if (!selectedTableId) return;

      setError(null);
      setSelectedCounts((prev) => ({
        ...prev,
        [product.id]: (prev[product.id] ?? 0) + 1,
      }));
      setPendingQuickAdds((prev) => ({
        ...prev,
        [product.id]: (prev[product.id] ?? 0) + 1,
      }));

      queuedQuickAddsRef.current[product.id] = (queuedQuickAddsRef.current[product.id] ?? 0) + 1;
      void processQuickAddQueue(product);
    },
    [selectedTableId, processQuickAddQueue],
  );

  return (
    <ScreenPage>
      <Topbar title={t('dining.createOrderTitle')} onBack={() => navigation.goBack()} />
      <ScreenContent>
        {catalogLoading ? (
          <Card>
            <LoadingState title={t('dining.loadingCatalog')} description={t('dining.loadingDescription')} />
          </Card>
        ) : null}

        {error ? (
          <Card>
            <ErrorState
              title={t('dining.addItemError')}
              description={error}
              actionLabel={t('common.dismiss')}
              onAction={() => setError(null)}
            />
          </Card>
        ) : null}

        <Card style={styles.searchCard}>
          <Input
            placeholder={t('dining.searchProducts')}
            value={search}
            onChangeText={setSearch}
            editable={!catalogLoading}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRowContent}
            style={styles.filterRow}
          >
            <Pressable
              style={[
                styles.filterChip,
                selectedCategoryId === 'all' && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategoryId('all')}
            >
              <MetaText
                style={
                  selectedCategoryId === 'all' ? styles.filterChipTextActive : styles.filterChipText
                }
              >
                {t('dining.allCategories', 'All categories')}
              </MetaText>
            </Pressable>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                style={[
                  styles.filterChip,
                  selectedCategoryId === category.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategoryId(category.id)}
              >
                <MetaText
                  style={
                    selectedCategoryId === category.id
                      ? styles.filterChipTextActive
                      : styles.filterChipText
                  }
                >
                  {category.name}
                </MetaText>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRowContent}
            style={styles.filterRow}
          >
            <Pressable
              style={[
                styles.filterChip,
                selectedDietaryLabel === 'all' && excludedAllergen === 'all' && styles.filterChipActive,
              ]}
              onPress={() => {
                setSelectedDietaryLabel('all');
                setExcludedAllergen('all');
              }}
            >
              <MetaText
                style={
                  selectedDietaryLabel === 'all' && excludedAllergen === 'all'
                    ? styles.filterChipTextActive
                    : styles.filterChipText
                }
              >
                {t('dining.allFilters', 'All filters')}
              </MetaText>
            </Pressable>

            {dietaryFilterOptions.map((option) => (
              <Pressable
                key={`diet-${option}`}
                style={[
                  styles.filterChip,
                  selectedDietaryLabel === option && styles.filterChipActive,
                ]}
                onPress={() => {
                  setExcludedAllergen('all');
                  setSelectedDietaryLabel((prev) => (prev === option ? 'all' : option));
                }}
              >
                <MetaText
                  style={
                    selectedDietaryLabel === option ? styles.filterChipTextActive : styles.filterChipText
                  }
                >
                  {t(`catalog.dietaryOptions.${option}`, option.replace('_', ' '))}
                </MetaText>
              </Pressable>
            ))}

            {availableAllergens.map((allergen) => (
              <Pressable
                key={`allergen-${allergen}`}
                style={[
                  styles.filterChip,
                  selectedDietaryLabel === 'all' && excludedAllergen === allergen &&
                    styles.filterChipActive,
                ]}
                onPress={() => {
                  setSelectedDietaryLabel('all');
                  setExcludedAllergen((prev) => (prev === allergen ? 'all' : allergen));
                }}
              >
                <MetaText
                  style={
                    selectedDietaryLabel === 'all' && excludedAllergen === allergen
                      ? styles.filterChipTextActive
                      : styles.filterChipText
                  }
                >
                  {t('dining.withoutAllergen', 'No {{value}}', { value: allergen })}
                </MetaText>
              </Pressable>
            ))}
          </ScrollView>
        </Card>

        {/* Product Selection */}
        {!selectedProduct ? (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            numColumns={productColumns}
            key={`cols-${productColumns}`}
            columnWrapperStyle={productColumns > 1 ? styles.gridRow : undefined}
            renderItem={({ item }) => {
              const count = selectedCounts[item.id] ?? 0;
              const pendingCount = pendingQuickAdds[item.id] ?? 0;
              const allergenNames =
                item.allergens?.map((a) => a?.allergen?.name).filter((v): v is string => !!v) ?? [];
              return (
              <Pressable
                onPress={() => setSelectedProduct(item as ProductWithExtras)}
                style={productColumns > 1 ? styles.gridItem : undefined}
                disabled={catalogLoading}
              >
                <ListItemCard style={styles.productCard}>
                  {count > 0 && (
                    <View style={styles.selectedCountBadge} testID={`selected-count-${item.id}`}>
                      <MetaText style={styles.selectedCountBadgeText}>{String(count)}</MetaText>
                    </View>
                  )}
                  <TitleText style={styles.productName}>{item.name}</TitleText>
                  <MetaText style={styles.productPrice}>{formatAmount(item.unitPrice)}</MetaText>
                  {allergenNames.length > 0 && (
                    <MetaText style={styles.productAllergens}>
                      {`${t('dining.allergens', 'Allergens')}: ${allergenNames.join(', ')}`}
                    </MetaText>
                  )}
                  <Pressable
                    testID={`quick-add-${item.id}`}
                    style={[styles.quickAddButton, pendingCount > 0 && styles.quickAddButtonPending]}
                    onPress={(event) => {
                      event?.stopPropagation?.();
                      void handleQuickAdd(item as ProductWithExtras);
                    }}
                    disabled={catalogLoading}
                  >
                    <TitleText style={styles.quickAddButtonText}>+</TitleText>
                  </Pressable>
                </ListItemCard>
              </Pressable>
              );
            }}
            ListEmptyComponent={
              !catalogLoading ? (
                <EmptyState
                  title={t('dining.noProducts')}
                  description={t('dining.searchNoResults')}
                />
              ) : null
            }
          />
        ) : (
          /* Product Details & Customization */
          <ScrollView
            style={styles.selectedProductScroll}
            contentContainerStyle={styles.selectedProductScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Card style={styles.selectedProductCard}>
              <SectionHeader
                title={selectedProduct.name}
                subtitle={formatAmount(selectedProduct.unitPrice)}
              />

              {/* Quantity Input */}
              <View style={styles.formGroup}>
                <View style={styles.sectionRow}>
                  <BodyText style={styles.label}>{t('dining.quantity')}</BodyText>
                  <View style={styles.qtyControlRow}>
                    <Pressable
                      style={styles.qtyStepButton}
                      onPress={() => handleQtyChange((parseInt(quantity, 10) || 1) - 1)}
                    >
                      <TitleText style={styles.qtyStepButtonText}>-</TitleText>
                    </Pressable>
                    <Input
                      placeholder="1"
                      value={quantity}
                      onChangeText={(text) => handleQtyChange(parseInt(text.replace(/[^0-9]/g, ''), 10) || 1)}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Pressable
                      style={styles.qtyStepButton}
                      onPress={() => handleQtyChange((parseInt(quantity, 10) || 1) + 1)}
                    >
                      <TitleText style={styles.qtyStepButtonText}>+</TitleText>
                    </Pressable>
                  </View>
                </View>

                {(parseInt(quantity, 10) || 1) > 1 && (
                  <Pressable
                    style={[styles.modeChip, perUnitMode && styles.modeChipActive]}
                    onPress={togglePerUnitMode}
                  >
                    <MetaText style={perUnitMode ? styles.modeChipTextActive : styles.modeChipText}>
                      {t('dining.perUnitMode', 'Configure each unit separately')}
                    </MetaText>
                  </Pressable>
                )}
              </View>

              {perUnitMode && unitConfigs.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRowContent}
                  style={styles.formGroup}
                >
                  {unitConfigs.map((config, index) => {
                    const hasRequiredError =
                      validationAttempted &&
                      selectedGroups.some((group) => {
                        if (!group.required) return false;
                        const min = Math.max(1, group.minSelections ?? 1);
                        return (config.optionSelections[group.id]?.length ?? 0) < min;
                      });
                    return (
                      <Pressable
                        key={`unit-${index}`}
                        style={[
                          styles.filterChip,
                          activeUnitIndex === index && styles.filterChipActive,
                          hasRequiredError && styles.filterChipError,
                        ]}
                        onPress={() => setActiveUnitIndex(index)}
                      >
                        <MetaText
                          style={
                            activeUnitIndex === index ? styles.filterChipTextActive : styles.filterChipText
                          }
                        >
                          #{index + 1}
                        </MetaText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* Notes Input */}
              <View style={styles.formGroup}>
                <BodyText style={styles.label}>{t('dining.notes')}</BodyText>
                <Input
                  placeholder={t('dining.notesPlaceholder')}
                  value={getActiveNotes()}
                  onChangeText={(text) => {
                    if (perUnitMode) {
                      updateActiveUnitConfig((config) => ({ ...config, notes: text }));
                    } else {
                      setNotes(text);
                    }
                  }}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Removed Ingredients */}
              {selectedProductRemovables.length > 0 && (
                <View style={styles.formGroup}>
                  <BodyText style={styles.label}>{t('dining.removableIngredients')}</BodyText>
                  {selectedProductRemovables.map((ingredient) => (
                    <Pressable
                      key={ingredient}
                      onPress={() => {
                        const isSelected = getActiveRemovedIngredients().includes(ingredient);
                        if (perUnitMode) {
                          updateActiveUnitConfig((config) => ({
                            ...config,
                            removedIngredients: isSelected
                              ? config.removedIngredients.filter((item) => item !== ingredient)
                              : [...config.removedIngredients, ingredient],
                          }));
                        } else {
                          setRemovedIngredients((prev) =>
                            isSelected ? prev.filter((item) => item !== ingredient) : [...prev, ingredient]
                          );
                        }
                      }}
                      style={styles.checkboxItem}
                    >
                      <StatusPill
                        label={getActiveRemovedIngredients().includes(ingredient) ? '✓' : '○'}
                        tone={getActiveRemovedIngredients().includes(ingredient) ? 'success' : 'neutral'}
                      />
                      <MetaText style={styles.checkboxLabel}>{ingredient}</MetaText>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Extras */}
              {selectedProductExtras.length > 0 && (
                <View style={styles.formGroup}>
                  <BodyText style={styles.label}>{t('dining.extras')}</BodyText>
                  {selectedProductExtras.map((extra) => (
                    <Pressable
                      key={extra.id}
                      onPress={() => {
                        const isSelected = getActiveSelectedExtras().includes(extra.id);
                        if (perUnitMode) {
                          updateActiveUnitConfig((config) => ({
                            ...config,
                            selectedExtras: isSelected
                              ? config.selectedExtras.filter((item) => item !== extra.id)
                              : [...config.selectedExtras, extra.id],
                          }));
                        } else {
                          setSelectedExtras((prev) =>
                            isSelected ? prev.filter((id) => id !== extra.id) : [...prev, extra.id]
                          );
                        }
                      }}
                      style={styles.checkboxItem}
                    >
                      <StatusPill
                        label={getActiveSelectedExtras().includes(extra.id) ? '✓' : '○'}
                        tone={getActiveSelectedExtras().includes(extra.id) ? 'success' : 'neutral'}
                      />
                      <MetaText style={styles.checkboxLabel}>
                        {`${extra.name} (${extra.priceDelta > 0 ? '+' : ''}${formatAmount(extra.priceDelta)})`}
                      </MetaText>
                    </Pressable>
                  ))}
                </View>
              )}

              {selectedGroups.map((group) => {
                const activeSelections = getActiveOptionSelections();
                const current = activeSelections[group.id] ?? [];
                const minSelections = group.required ? Math.max(1, group.minSelections ?? 1) : (group.minSelections ?? 0);
                const groupInvalid = validationAttempted && current.length < minSelections;
                return (
                  <View key={group.id} style={[styles.formGroup, groupInvalid && styles.requiredGroupError]}>
                    <View style={styles.sectionRow}>
                      <BodyText style={styles.label}>{group.name}</BodyText>
                      <View style={styles.ruleTagsRow}>
                        {group.required && (
                          <StatusPill label={t('restaurant.validation.required', 'Required')} tone="warning" />
                        )}
                        {group.multiple && (
                          <StatusPill label={t('dining.multipleAllowed', 'Multiple')} tone="neutral" />
                        )}
                      </View>
                    </View>
                    {groupInvalid && (
                      <MetaText style={styles.requiredHintText}>
                        {t('dining.mandatorySelection', 'This is mandatory. Select at least one option.')}
                      </MetaText>
                    )}
                    <View style={styles.optionChipsWrap}>
                      {group.choices.map((choice) => {
                        const selected = current.includes(choice.id);
                        return (
                          <Pressable
                            key={choice.id}
                            style={[styles.filterChip, selected && styles.filterChipActive]}
                            onPress={() => {
                              if (perUnitMode) {
                                updateActiveUnitConfig((config) => {
                                  const now = config.optionSelections[group.id] ?? [];
                                  let next: string[];
                                  if (group.multiple) {
                                    if (selected) {
                                      next = now.filter((id) => id !== choice.id);
                                    } else {
                                      const max = group.maxSelections;
                                      if (typeof max === 'number' && max > 0 && now.length >= max) {
                                        next = now;
                                      } else {
                                        next = [...now, choice.id];
                                      }
                                    }
                                  } else {
                                    next = selected ? [] : [choice.id];
                                  }
                                  return {
                                    ...config,
                                    optionSelections: { ...config.optionSelections, [group.id]: next },
                                  };
                                });
                              } else {
                                setOptionSelections((prev) => {
                                  const now = prev[group.id] ?? [];
                                  let next: string[];
                                  if (group.multiple) {
                                    if (selected) {
                                      next = now.filter((id) => id !== choice.id);
                                    } else {
                                      const max = group.maxSelections;
                                      if (typeof max === 'number' && max > 0 && now.length >= max) {
                                        next = now;
                                      } else {
                                        next = [...now, choice.id];
                                      }
                                    }
                                  } else {
                                    next = selected ? [] : [choice.id];
                                  }
                                  return { ...prev, [group.id]: next };
                                });
                              }
                            }}
                          >
                            <MetaText style={selected ? styles.filterChipTextActive : styles.filterChipText}>
                              {choice.label}
                              {choice.priceDelta ? ` (+${formatAmount(choice.priceDelta)})` : ''}
                            </MetaText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <Button
                  title={t('common.cancel')}
                  onPress={resetComposer}
                  variant="secondary"
                  disabled={isSubmitting}
                />
                <Button
                  title={isSubmitting ? t('dining.adding') : t('dining.addToOrder')}
                  onPress={handleAddItem}
                  disabled={isSubmitting || !selectedProduct}
                />
              </View>
            </Card>
          </ScrollView>
        )}

      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  searchCard: { marginBottom: theme.spacing.s3 },
  filterRow: {
    marginTop: theme.spacing.s2,
  },
  filterRowContent: {
    gap: theme.spacing.s1,
    paddingRight: theme.spacing.s2,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.s2,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgPage,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accentAction,
    borderColor: theme.colors.accentAction,
  },
  filterChipError: {
    borderColor: theme.colors.warning,
  },
  filterChipText: {
    marginBottom: 0,
  },
  filterChipTextActive: {
    marginBottom: 0,
    color: theme.colors.textInverse,
  },
  selectedProductCard: { marginBottom: theme.spacing.s3 },
  selectedProductScroll: { flex: 1 },
  selectedProductScrollContent: { paddingBottom: theme.spacing.s2 },
  productCard: { position: 'relative' },
  productName: { marginBottom: theme.spacing.s1 },
  productPrice: { marginBottom: 0 },
  productAllergens: { marginTop: theme.spacing.s1 },
  quickAddButton: {
    position: 'absolute',
    right: theme.spacing.s2,
    bottom: theme.spacing.s2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentAction,
  },
  quickAddButtonPending: {
    opacity: 0.9,
  },
  quickAddButtonText: {
    color: theme.colors.textInverse,
    marginBottom: 0,
    lineHeight: 22,
  },
  selectedCountBadge: {
    position: 'absolute',
    top: theme.spacing.s2,
    right: theme.spacing.s2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
  },
  selectedCountBadgeText: {
    color: '#ffffff',
    fontWeight: theme.typography.weightBold,
    marginBottom: 0,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.s2,
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s1,
    flex: 1,
  },
  qtyStepButton: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgPage,
  },
  qtyStepButtonText: {
    marginBottom: 0,
    lineHeight: 18,
  },
  modeChip: {
    marginTop: theme.spacing.s2,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.s2,
    paddingVertical: 6,
    backgroundColor: theme.colors.bgPage,
  },
  modeChipActive: {
    borderColor: theme.colors.accentAction,
    backgroundColor: theme.colors.accentAction,
  },
  modeChipText: {
    marginBottom: 0,
  },
  modeChipTextActive: {
    marginBottom: 0,
    color: theme.colors.textInverse,
  },
  formGroup: { marginBottom: theme.spacing.s3 },
  label: { marginBottom: theme.spacing.s2 },
  ruleTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s1,
  },
  requiredGroupError: {
    borderWidth: 1,
    borderColor: '#B91C1C',
    borderRadius: theme.radius.md,
    padding: theme.spacing.s2,
    backgroundColor: '#FEF2F2',
  },
  requiredHintText: {
    color: '#B91C1C',
    marginBottom: theme.spacing.s2,
  },
  optionChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s1,
  },
  checkboxItem: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.s2 },
  checkboxLabel: { marginLeft: theme.spacing.s2 },
  buttonRow: { flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s3 },
  backCard: { marginTop: theme.spacing.s3 },
  gridRow: { gap: theme.spacing.s2, flex: 1 },
  gridItem: { flex: 0.5, minWidth: 0 }
});
