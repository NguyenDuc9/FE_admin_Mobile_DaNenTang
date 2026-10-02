import api from './api';

interface ProductImagesResponse {
  data?: ProductImage[];
  pagination?: { totalPages: number };
  success?: boolean;
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  sort_order: number;
  is_primary: boolean | number;
}

export async function getProductImages(productId: number) {
  const images: ProductImage[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await api.get<ProductImagesResponse | ProductImage[]>(
      `/api/product-images/product/${productId}?page=${page}&limit=15`,
    );
    images.push(...(Array.isArray(response) ? response : response.data || []));
    totalPages = Array.isArray(response)
      ? 1
      : response.pagination?.totalPages || 1;
    page += 1;
  } while (page <= totalPages);
  return images;
}

export async function createProductImage(data: {
  product_id: number;
  image_url: string;
  sort_order: number | null;
  is_primary: boolean;
}) {
  return api.post(`/api/product-images`, data);
}

export async function updateProductImage(
  id: number,
  data: Partial<Pick<ProductImage, 'image_url' | 'is_primary'>> & {
    product_id: number;
    sort_order?: number | null;
  },
) {
  return api.put(`/api/product-images/${id}`, data);
}

export async function deleteProductImage(id: number) {
  return api.delete(`/api/product-images/${id}`);
}
