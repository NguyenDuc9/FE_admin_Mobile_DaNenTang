import api from './api';

export async function updateOrderStatus(
  id: number,
  status: string,
  reason: string,
): Promise<void> {
  await api.patch(`/api/orders/${id}/status`, { status, reason });
}
