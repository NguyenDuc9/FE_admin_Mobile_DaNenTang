import type { User, UserRequest, UserUpdateRequest } from '@/interfaces/user';
import type { PaginationInfo } from './adminResourceApi';

import api from './api';

export async function getUsersPage(page: number) {
  const result = await api.get<
    User[] | { data: User[]; pagination?: PaginationInfo }
  >(`/api/users?page=${page}&limit=15`);
  const users = Array.isArray(result) ? result : result.data;
  const pagination = Array.isArray(result)
    ? { page, limit: 15, total: users.length, totalPages: 1 }
    : result.pagination || {
        page,
        limit: 15,
        total: users.length,
        totalPages: 1,
      };
  return { users, pagination };
}

export async function getUsers(): Promise<User[]> {
  const result = await api.get<User[] | { data: User[] }>('/api/users');

  return Array.isArray(result) ? result : result.data;
}

export async function createUser(data: UserRequest): Promise<User> {
  return api.post<User>('/api/users', data);
}

export async function updateUser(
  id: number,
  data: UserUpdateRequest,
): Promise<User> {
  return api.put<User>(`/api/users/${id}`, data);
}

export async function deleteUser(id: number): Promise<void> {
  return api.delete<void>(`/api/users/${id}`);
}
