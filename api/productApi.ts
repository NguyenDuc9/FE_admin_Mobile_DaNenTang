import type { Product, ProductRequest } from '@/interfaces/product';
import type { PaginationInfo } from './adminResourceApi';
import api from './api';

export async function getProductsPage(page: number) {
  const result = await api.get<
    | Product[]
    | { data: Product[]; pagination?: PaginationInfo }
  >(`/api/products?page=${page}&limit=15`);
  const products = Array.isArray(result) ? result : result.data;
  const pagination = Array.isArray(result)
    ? { page, limit: 15, total: products.length, totalPages: 1 }
    : result.pagination || {
        page,
        limit: 15,
        total: products.length,
        totalPages: 1,
      };
  return { products, pagination };
}

export async function getProducts(): Promise<Product[]> {
  const result = await api.get<Product[] | { data: Product[] }>(
    '/api/products',
  );

  return Array.isArray(result) ? result : result.data;
}

export async function createProduct(data: ProductRequest): Promise<Product> {
  return api.post<Product>('/api/products', data);
}

export async function updateProduct(
  id: number,
  data: ProductRequest,
): Promise<Product> {
  return api.put<Product>(`/api/products/${id}`, data);
}

export async function deleteProduct(id: number): Promise<void> {
  return api.delete<void>(`/api/products/${id}`);
}
