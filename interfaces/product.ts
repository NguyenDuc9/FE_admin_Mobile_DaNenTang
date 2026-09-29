export interface Product {
  id: number;
  name: string;
  categoryId: number;
  brandId: number;
  price: number | string;
  stock: number;
  description: string | null;
  specifications: string | null;
  imageUrl: string | null;
  isActive: boolean | number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductRequest {
  name: string;
  categoryId: number;
  brandId: number;
  price: number;
  stock: number;
  description: string;
  specifications: string;
  imageUrl: string;
  isActive: boolean;
}
