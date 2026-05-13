import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenContent, ScreenPage } from '@/components/ScreenLayout';
import { Topbar } from '@/components/Topbar';
import { BodyText, ErrorText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';
import { listCategories, listProducts, type CategoryDto, type ProductDto } from '@/api/catalog.api';
import { useSaleFlow } from '@/hooks/useSaleFlow';
import { useDeviceProfile } from '@/platform/useDeviceProfile';

type Props = {
  onOpenCart: () => void;
  onBack: () => void;
};

function resolvePrice(product: ProductDto): number {
  if (typeof product.priceGross === 'number') {
    return product.priceGross;
  }
  if (typeof product.price === 'number') {
    return product.price;
  }
  return 0;
}

export function CheckoutScreen({ onOpenCart, onBack }: Props) {
  const { t } = useTranslation();
  const { total, addLine, lines } = useSaleFlow();
  const { isPhone } = useDeviceProfile();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const lineCount = lines?.length ?? 0;

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadedCategories, loadedProducts] = await Promise.all([
        listCategories(),
        listProducts({ active: true, limit: 1000 }),
      ]);
      setCategories(loadedCategories);
      setProducts(loadedProducts);
    } catch {
      setError(t('pos.catalogLoadError', 'Catalog could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCatalog();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadCatalog]);

  const visibleProducts = useMemo(() => {
    const lowered = search.trim().toLowerCase();
    return products.filter((product) => {
      if (activeCategoryId !== 'all' && product.categoryId !== activeCategoryId) {
        return false;
      }
      if (!lowered) {
        return true;
      }
      return (
        product.name.toLowerCase().includes(lowered) ||
        (product.sku ?? '').toLowerCase().includes(lowered) ||
        (product.barcode ?? '').toLowerCase().includes(lowered)
      );
    });
  }, [activeCategoryId, products, search]);

  const quantitiesByProductId = useMemo(() => {
    return lines.reduce<Record<string, number>>((acc, line) => {
      acc[line.productId] = line.quantity;
      return acc;
    }, {});
  }, [lines]);

  return (
    <ScreenPage>
      <Topbar title={t('pos.checkoutTitle')} />
      <ScreenContent style={styles.screenContent}>
        <Card style={styles.card}>
          <TitleText>{t('pos.checkoutTitle')}</TitleText>
          <BodyText style={styles.description}>{`${t('pos.totalLabel')}: ${total.toFixed(2)}`}</BodyText>

          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={t('pos.searchPlaceholder', 'Search products...')}
            autoCapitalize="none"
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categories}
            contentContainerStyle={styles.categoriesContent}
          >
            {[{ id: 'all', name: t('pos.allCategories', 'All') }, ...categories].map((item) => {
              const selected = activeCategoryId === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setActiveCategoryId(item.id)}
                  style={[styles.categoryChip, selected && styles.categoryChipActive]}
                >
                  <MetaText style={[styles.categoryText, selected ? styles.categoryTextActive : undefined]}>
                    {item.name}
                  </MetaText>
                </Pressable>
              );
            })}
          </ScrollView>

          {loading ? <BodyText>{t('common.loading')}</BodyText> : null}
          {error ? <ErrorText>{error}</ErrorText> : null}

          {!loading && !error ? (
            <FlatList
              data={visibleProducts}
              keyExtractor={(item) => item.id}
              numColumns={isPhone ? 2 : 4}
              columnWrapperStyle={styles.rowWrap}
              style={styles.productsList}
              contentContainerStyle={[
                styles.productListContent,
                { paddingBottom: theme.spacing.s2 + insets.bottom },
              ]}
              ListEmptyComponent={<BodyText>{t('pos.noProducts', 'No products found')}</BodyText>}
              renderItem={({ item }) => {
                const quantity = quantitiesByProductId[item.id] ?? 0;

                return (
                  <Pressable
                    style={styles.productCard}
                    onPress={() => {
                      addLine({
                        productId: item.id,
                        name: item.name,
                        price: resolvePrice(item),
                      });
                    }}
                  >
                    {quantity > 0 ? (
                      <View style={styles.quantityBadge}>
                        <MetaText style={styles.quantityBadgeText}>{String(quantity)}</MetaText>
                      </View>
                    ) : null}
                    <BodyText numberOfLines={2} style={styles.productName}>{item.name}</BodyText>
                    <MetaText style={styles.productPrice}>{`${resolvePrice(item).toFixed(2)} EUR`}</MetaText>
                  </Pressable>
                );
              }}
            />
          ) : null}

          <View style={styles.row}>
            <Button title={t('common.back')} onPress={onBack} disabled={submitting} variant="secondary" />
            <Button
              title={`${t('pos.openCart')} (${lineCount})`}
              onPress={() => {
                setSubmitting(true);
                onOpenCart();
              }}
              disabled={submitting || lineCount === 0}
            />
          </View>
        </Card>
      </ScreenContent>
    </ScreenPage>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
  description: { marginBottom: theme.spacing.s3 },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s2,
    marginBottom: theme.spacing.s2,
    backgroundColor: theme.colors.bgPanel,
    color: theme.colors.textPrimary,
  },
  categories: {
    marginBottom: theme.spacing.s2,
    flexGrow: 0,
    flexShrink: 0,
  },
  categoriesContent: {
    paddingRight: theme.spacing.s2,
    gap: theme.spacing.s2,
    alignItems: 'center',
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s2,
    alignSelf: 'center',
  },
  categoryText: {
    marginBottom: 0,
    textAlign: 'center',
  },
  categoryChipActive: {
    borderColor: theme.colors.accentAction,
    backgroundColor: theme.colors.accentAction,
  },
  categoryTextActive: {
    color: theme.colors.textOnAccent,
  },
  productsList: {
    flex: 1,
    marginTop: 0,
    minHeight: 0,
  },
  productListContent: {
    gap: theme.spacing.s2,
    marginBottom: theme.spacing.s2,
  },
  rowWrap: {
    gap: theme.spacing.s2,
  },
  productCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.s2,
    paddingRight: theme.spacing.s4,
    marginBottom: theme.spacing.s2,
    backgroundColor: theme.colors.bgPanel,
    position: 'relative',
  },
  quantityBadge: {
    position: 'absolute',
    top: theme.spacing.s1,
    right: theme.spacing.s1,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: theme.spacing.s1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentAction,
  },
  quantityBadgeText: {
    color: theme.colors.textOnAccent,
    marginBottom: 0,
    fontSize: theme.typography.sizeXs,
    lineHeight: theme.typography.sizeXs,
  },
  productName: {
    fontWeight: theme.typography.weightSemibold,
    marginBottom: theme.spacing.s1,
  },
  productPrice: {
    marginBottom: 0,
  },
  row: { flexDirection: 'row', gap: theme.spacing.s2, marginTop: theme.spacing.s2 },
});
