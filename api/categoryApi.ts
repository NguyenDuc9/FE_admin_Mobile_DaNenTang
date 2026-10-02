import type { Category, CategoryRequest } from '@/interfaces/category';

import api from './api';

export async function getCategories(): Promise<Category[]> {
  const result = await api.get<Category[] | { data: Category[] }>(
    '/api/categories',
  );

  return Array.isArray(result) ? result : result.data;
}

export async function createCategory(data: CategoryRequest): Promise<Category> {
  return api.post<Category>('/api/categories', data);
}

export async function updateCategory(
  id: number,
  data: CategoryRequest,
): Promise<Category> {
  return api.put<Category>(`/api/categories/${id}`, data);
}

export async function deleteCategory(id: number): Promise<void> {
  return api.delete<void>(`/api/categories/${id}`);
}
