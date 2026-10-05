import api from './api';

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  variant_name: string;
  price: number | null;
  compare_at_price: number | null;
  stock_quantity: number;
  cpu: string | null;
  ram: string | null;
  storage: string | null;
  gpu: string | null;
  screen_size: string | null;
  screen_resolution: string | null;
  refresh_rate: number | null;
  operating_system: string | null;
  color: string | null;
  weight_kg: number | null;
  warranty_months: number | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export type ProductVariantRequest = Omit<
  ProductVariant,
  'id' | 'product_id'
> & { product_id: number };

export async function getProductVariants(productId: number) {
  const result = await api.get<
    ProductVariant[] | { data: ProductVariant[] }
  >(`/api/product-variants/product/${productId}`);
  return Array.isArray(result) ? result : result.data;
}

export async function createProductVariant(data: ProductVariantRequest) {
  return api.post<ProductVariant>('/api/product-variants', data);
}

export async function updateProductVariant(
  id: number,
  data: ProductVariantRequest,
) {
  return api.put<ProductVariant>(`/api/product-variants/${id}`, data);
}

export async function deleteProductVariant(id: number) {
  return api.delete(`/api/product-variants/${id}`);
}
