import api from './api';

export interface OrderDetailItem {
  id: number;
  product_id?: number | null;
  product_name: string;
  thumbnail_url?: string | null;
  product_image_url?: string | null;
  variant_name?: string | null;
  sku?: string | null;
  unit_price: number | string;
  quantity: number;
  subtotal: number | string;
}

export interface OrderDetail {
  id: number;
  order_code: string;
  status: string;
  order_type?: string;
  fulfillment_method?: string | null;
  delivery_receiver_name?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  pickup_store_name?: string | null;
  pickup_store_address?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  payment_amount?: number | string | null;
  subtotal?: number | string;
  shipping_fee?: number | string;
  discount_amount?: number | string;
  total_amount?: number | string;
  voucher_code?: string | null;
  note?: string | null;
  cancelled_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  items: OrderDetailItem[];
}

export async function getOrderDetails(id: number): Promise<OrderDetail> {
  const result = await api.get<{ data: OrderDetail }>(`/api/orders/${id}`);
  return result.data;
}

export async function updateOrderStatus(
  id: number,
  status: string,
  reason: string,
): Promise<void> {
  await api.patch(`/api/orders/${id}/status`, { status, reason });
}
