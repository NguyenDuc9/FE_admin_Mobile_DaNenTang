import api from './api';

interface VoucherProductsResponse {
  data: VoucherProduct[];
  pagination?: { totalPages: number };
}

export interface VoucherProduct {
  id: number;
  name: string;
  slug: string;
  thumbnail_url: string | null;
  current_price?: number;
  discount_amount?: number;
  discounted_price?: number;
  is_promotional?: boolean;
}

export async function getVoucherProducts(voucherId: number) {
  const products: VoucherProduct[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await api.get<VoucherProductsResponse>(
      `/api/admin-fe/vouchers/${voucherId}/products?page=${page}&limit=15`,
    );
    products.push(...response.data);
    totalPages = response.pagination?.totalPages || 1;
    page += 1;
  } while (page <= totalPages);
  return products;
}

export async function getVoucherProductCatalog(voucherId: number) {
  const products: VoucherProduct[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await api.get<VoucherProductsResponse>(
      `/api/admin-fe/vouchers/${voucherId}/product-catalog?page=${page}&limit=100`,
    );
    products.push(...response.data);
    totalPages = response.pagination?.totalPages || 1;
    page += 1;
  } while (page <= totalPages);
  return products;
}

export async function setVoucherProducts(
  voucherId: number,
  productIds: number[],
) {
  const response = await api.put<{ data: VoucherProduct[] }>(
    `/api/admin-fe/vouchers/${voucherId}/products`,
    { productIds },
  );
  return response.data;
}
