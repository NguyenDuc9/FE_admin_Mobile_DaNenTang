const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function resolveImageUrl(url: string) {
  if (!url || /^[a-z][a-z\d+.-]*:/i.test(url)) return url;
  return `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function uploadImage(file: File): Promise<string> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const body = new FormData();
  body.append('image', file);

  const response = await fetch(`${apiUrl}/api/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || 'Không thể tải ảnh lên.');
  }
  if (typeof result?.data?.url !== 'string') {
    throw new Error('BE không trả về URL ảnh hợp lệ.');
  }
  return result.data.url;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);

    throw new Error(
      errorBody?.message || 'Không thể thực hiện yêu cầu. Vui lòng thử lại.',
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) =>
    request<T>(path, {
      method: 'GET',
    }),

  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: <T = void>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),
};

export default api;
