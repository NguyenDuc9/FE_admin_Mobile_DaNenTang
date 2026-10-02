import api from './api';
import type { ResourceRow } from '@/interfaces/adminResources';

interface OrderItem {
  id: number;
  product_name: string;
  variant_name: string;
  sku: string;
}

interface OrderDetail {
  id: number;
  order_code: string;
  items: OrderItem[];
}

interface DataResponse<T> {
  data: T;
}

export interface WarrantyOrderItem {
  id: number;
  label: string;
}

export async function getWarrantyOrderItems(): Promise<WarrantyOrderItem[]> {
  const orders = await api.get<DataResponse<ResourceRow[]>>('/api/orders');
  const details = await Promise.all(
    orders.data.map(async (order) => {
      const result = await api.get<DataResponse<OrderDetail>>(
        `/api/orders/${order.id}`,
      );
      return result.data;
    }),
  );

  return details.flatMap((order) =>
    (order.items || []).map((item) => ({
      id: item.id,
      label: `${order.order_code} · ${item.product_name} ${item.variant_name} (${item.sku})`,
    })),
  );
}
