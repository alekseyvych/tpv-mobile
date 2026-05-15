/**
 * useCatalog Hook
 *
 * Returns available products from the backend catalog.
 * Used for order creation in restaurant mode.
 */

import { useEffect, useState } from 'react';

import { listCategories, listProducts } from '@/api/catalog.api';

export interface CatalogProduct {
  id: string;
  name: string;
  categoryId?: string;
  unitPrice: number;
  sku?: string;
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
  dietaryLabels?: string[];
  allergens?: Array<{ allergen: { code: string; name: string } }>;
}

interface CatalogCategory {
  id: string;
  name: string;
}

/**
 * Get products from backend catalog
 * Uses the existing catalog/products endpoint that backend provides
 */
export function useCatalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchCatalog = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [rawProducts, rawCategories] = await Promise.all([
          listProducts({ active: true, page: 1, limit: 1000 }),
          listCategories()
        ]);

        if (!active) return;

        setProducts(
          rawProducts.map((p) => ({
            id: p.id,
            name: p.name,
            categoryId: p.categoryId ?? undefined,
            unitPrice:
              typeof p.priceGross === 'number'
                ? p.priceGross
                : typeof p.price === 'number'
                  ? p.price
                  : 0,
            sku: p.sku,
            extras: p.extras,
            removableIngredients: p.removableIngredients,
            optionGroups: p.optionGroups,
            dietaryLabels: p.dietaryLabels,
            allergens: p.allergens
          }))
        );

        setCategories(rawCategories.map((c) => ({ id: c.id, name: c.name })));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load catalog');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void fetchCatalog();

    return () => {
      active = false;
    };
  }, []);

  return {
    products,
    categories,
    isLoading,
    error
  };
}
