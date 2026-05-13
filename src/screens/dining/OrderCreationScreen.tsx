/**
 * Order Creation Screen - React Native
 *
 * Allows selecting products from real catalog and adding them to an order
 * with modifiers, extras, and removable ingredients.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
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
}

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

export function OrderCreationScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const selectedTableId = useRestaurantStore((s) => s.selectedTableId);
  const getTableById = useRestaurantStore((s) => s.getTableById);
  const updateTable = useRestaurantStore((s) => s.updateTable);
  const setSelectedOrder = useRestaurantStore((s) => s.setSelectedOrder);
  const { products, isLoading: catalogLoading } = useCatalog();
  const { isPhone } = useDeviceProfile();

  // Get order ID from the selected table's current order
  const table = selectedTableId ? getTableById(selectedTableId) : null;
  const orderId = table?.currentOrderId ?? null;

  useEffect(() => {
    if (!selectedTableId) {
      navigation.goBack();
    }
  }, [selectedTableId, navigation]);

  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithExtras | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [removedIngredients, setRemovedIngredients] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p: any) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search]);

  const selectedProductExtras = useMemo(() => {
    return selectedProduct ? getProductExtras(selectedProduct) : [];
  }, [selectedProduct]);

  const selectedProductRemovables = useMemo(() => {
    return selectedProduct ? getRemovableIngredients(selectedProduct) : [];
  }, [selectedProduct]);

  /**
   * Add item to order
   */
  const handleAddItem = useCallback(async () => {
    if (!selectedProduct || !selectedTableId) return;

    const qty = Math.max(1, Math.min(99, parseInt(quantity) || 1));

    try {
      setIsSubmitting(true);
      setError(null);

      // Build options in the same serialized shape used by tpv-front restaurant workspace.
      const options: Array<{ name: string; value?: string }> = [];

      if (removedIngredients.length > 0) {
        options.push({
          name: '- Remove',
          value: removedIngredients.join(', ')
        });
      }

      selectedExtras.forEach((extraId) => {
        const extra = selectedProductExtras.find((e) => e.id === extraId);
        if (extra) {
          options.push({
            name: '+ Extra',
            value: `${extra.name}${extra.priceDelta > 0 ? ` (+${extra.priceDelta.toFixed(2)}€)` : ''}`
          });
        }
      });

      // Create the item payload
      const itemPayload = {
        productId: selectedProduct.id,
        quantity: qty,
        notes: notes || undefined,
        options: options.length > 0 ? options : undefined
      };

      // Resolve latest table to avoid stale currentOrderId while moving between screens.
      const latestTable = await restaurantApi.getTableById(selectedTableId);
      const activeOrderId = latestTable.currentOrderId ?? orderId;

      if (activeOrderId) {
        await restaurantApi.addOrderItem(activeOrderId, itemPayload);
        setSelectedOrder(activeOrderId);
      } else {
        // Backend requires at least one item in CreateOrder, so create the order with this first item.
        const createdOrder = await restaurantApi.createOrder({
          tableId: selectedTableId,
          items: [itemPayload]
        });
        setSelectedOrder(createdOrder.id);
        updateTable(selectedTableId, { currentOrderId: createdOrder.id });
      }

      // Reset form
      setSelectedProduct(null);
      setQuantity('1');
      setNotes('');
      setSelectedExtras([]);
      setRemovedIngredients([]);

      // Go back to table detail
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
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
    selectedProductExtras,
    orderId,
    navigation,
    setSelectedOrder,
    updateTable
  ]);

  return (
    <ScreenPage>
      <Topbar title={t('dining.createOrderTitle')} />
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
        </Card>

        {/* Product Selection */}
        {!selectedProduct ? (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            numColumns={isPhone ? 1 : 2}
            key={isPhone ? 'single' : 'multi'}
            columnWrapperStyle={!isPhone ? styles.gridRow : undefined}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedProduct(item as ProductWithExtras)}
                style={!isPhone ? styles.gridItem : undefined}
                disabled={catalogLoading || isSubmitting}
              >
                <ListItemCard>
                  <TitleText style={styles.productName}>{item.name}</TitleText>
                  <MetaText style={styles.productPrice}>{item.unitPrice} €</MetaText>
                </ListItemCard>
              </Pressable>
            )}
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
          <View>
            <Card style={styles.selectedProductCard}>
              <SectionHeader
                title={selectedProduct.name}
                subtitle={`${selectedProduct.unitPrice} €`}
              />

              {/* Quantity Input */}
              <View style={styles.formGroup}>
                <BodyText style={styles.label}>{t('dining.quantity')}</BodyText>
                <Input
                  placeholder="1"
                  value={quantity}
                  onChangeText={(text) => setQuantity(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>

              {/* Notes Input */}
              <View style={styles.formGroup}>
                <BodyText style={styles.label}>{t('dining.notes')}</BodyText>
                <Input
                  placeholder={t('dining.notesPlaceholder')}
                  value={notes}
                  onChangeText={setNotes}
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
                        setRemovedIngredients((prev) =>
                          prev.includes(ingredient)
                            ? prev.filter((i) => i !== ingredient)
                            : [...prev, ingredient]
                        );
                      }}
                      style={styles.checkboxItem}
                    >
                      <StatusPill
                        label={removedIngredients.includes(ingredient) ? '✓' : '○'}
                        tone={removedIngredients.includes(ingredient) ? 'success' : 'neutral'}
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
                        setSelectedExtras((prev) =>
                          prev.includes(extra.id)
                            ? prev.filter((id) => id !== extra.id)
                            : [...prev, extra.id]
                        );
                      }}
                      style={styles.checkboxItem}
                    >
                      <StatusPill
                        label={selectedExtras.includes(extra.id) ? '✓' : '○'}
                        tone={selectedExtras.includes(extra.id) ? 'success' : 'neutral'}
                      />
                      <MetaText style={styles.checkboxLabel}>
                        {extra.name} ({extra.priceDelta > 0 ? '+' : ''}{extra.priceDelta} €)
                      </MetaText>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <Button
                  title={t('common.cancel')}
                  onPress={() => {
                    setSelectedProduct(null);
                    setQuantity('1');
                    setNotes('');
                    setSelectedExtras([]);
                    setRemovedIngredients([]);
                  }}
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
          </View>
        )}

        {/* Back Button */}
        {!selectedProduct && (
          <Card style={styles.backCard}>
            <Button
              title={t('common.back')}
              onPress={() => navigation.goBack()}
              variant="secondary"
              disabled={catalogLoading || isSubmitting}
            />
          </Card>
        )}
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  searchCard: { marginBottom: theme.spacing.s3 },
  selectedProductCard: { marginBottom: theme.spacing.s3 },
  productName: { marginBottom: theme.spacing.s1 },
  productPrice: { marginBottom: 0 },
  formGroup: { marginBottom: theme.spacing.s3 },
  label: { marginBottom: theme.spacing.s2 },
  checkboxItem: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.s2 },
  checkboxLabel: { marginLeft: theme.spacing.s2 },
  buttonRow: { flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s3 },
  backCard: { marginTop: theme.spacing.s3 },
  gridRow: { gap: theme.spacing.s2, flex: 1 },
  gridItem: { flex: 0.5, minWidth: 0 }
});
