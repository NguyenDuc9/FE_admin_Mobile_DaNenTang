import type { ResourceRow } from '@/interfaces/adminResources';
import api from './api';

interface ResourceResponse<T> {
  data: T;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ResourcePage {
  rows: ResourceRow[];
  pagination: PaginationInfo;
}

export async function getResourcePage(
  endpoint: string,
  page: number,
): Promise<ResourcePage> {
  const result = await api.get<
    ResourceResponse<ResourceRow[]> | ResourceRow[]
  >(`${endpoint}?page=${page}&limit=15`);
  const rows = Array.isArray(result) ? result : result.data;
  const pagination = !Array.isArray(result) && result.pagination
    ? result.pagination
    : { page, limit: 15, total: rows.length, totalPages: 1 };
  return { rows, pagination };
}

export async function getResourceList(
  endpoint: string,
): Promise<ResourceRow[]> {
  const firstPage = await getResourcePage(endpoint, 1);
  const rows = [...firstPage.rows];
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const nextPage = await getResourcePage(endpoint, page);
    rows.push(...nextPage.rows);
  }
  return rows;
}

export async function getResourceById(
  endpoint: string,
  id: number,
): Promise<ResourceRow> {
  const result = await api.get<ResourceResponse<ResourceRow> | ResourceRow>(
    `${endpoint}/${id}`,
  );
  if (
    'data' in result &&
    result.data !== null &&
    typeof result.data === 'object' &&
    !Array.isArray(result.data)
  ) {
    return result.data as ResourceRow;
  }
  return result as ResourceRow;
}

export async function createResource(
  endpoint: string,
  data: Record<string, unknown>,
): Promise<void> {
  await api.post(endpoint, data);
}

export async function updateResource(
  endpoint: string,
  id: number,
  data: Record<string, unknown>,
  method: 'PUT' | 'PATCH' = 'PUT',
): Promise<void> {
  if (method === 'PATCH') await api.patch(`${endpoint}/${id}`, data);
  else await api.put(`${endpoint}/${id}`, data);
}

export async function deleteResource(
  endpoint: string,
  id: number,
): Promise<void> {
  await api.delete(`${endpoint}/${id}`);
}

export async function patchResourceStatus(
  endpoint: string,
  id: number,
  status: 'ACTIVE' | 'INACTIVE',
): Promise<void> {
  await api.patch(`${endpoint}/${id}/status`, { status });
}
