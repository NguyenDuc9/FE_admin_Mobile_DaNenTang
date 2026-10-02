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
}

export async function getVoucherProducts(voucherId: number) {
  const products: VoucherProduct[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await api.get<VoucherProductsResponse>(
      `/api/vouchers/${voucherId}/products?page=${page}&limit=15`,
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
    `/api/vouchers/${voucherId}/products`,
    { productIds },
  );
  return response.data;
}
