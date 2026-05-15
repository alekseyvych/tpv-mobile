import { apiClient } from './client';

type PaginatedResponse<T> = {
  data: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type CategoryDto = {
  id: string;
  name: string;
  sortOrder?: number;
};

export type ProductDto = {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  categoryId?: string | null;
  priceGross?: number;
  price?: number;
  imageUrl?: string | null;
  dietaryLabels?: string[];
  allergens?: Array<{
    allergen: {
      code: string;
      name: string;
    };
  }>;
  removableIngredients?: string[];
  extras?: Array<{
    id: string;
    name: string;
    priceDelta: number;
  }>;
  optionGroups?: Array<{
    id: string;
    name: string;
    required?: boolean;
    multiple?: boolean;
    minSelections?: number;
    maxSelections?: number;
    choices: Array<{
      id: string;
      label: string;
      priceDelta?: number;
    }>;
  }>;
  active?: boolean;
};

export type CatalogFilters = {
  categoryId?: string;
  search?: string;
  active?: boolean;
  page?: number;
  limit?: number;
};

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as PaginatedResponse<T>).data)) {
    return (payload as PaginatedResponse<T>).data;
  }

  return [];
}

export async function listProducts(filters: CatalogFilters = {}): Promise<ProductDto[]> {
  const params = {
    active: String(filters.active ?? true),
    page: String(filters.page ?? 1),
    limit: String(filters.limit ?? 1000),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  };

  const { data } = await apiClient.get('/products', { params });
  return normalizeList<ProductDto>(data);
}

export async function listCategories(): Promise<CategoryDto[]> {
  const { data } = await apiClient.get('/categories', {
    params: { page: '1', limit: '200' },
  });

  return normalizeList<CategoryDto>(data);
}
