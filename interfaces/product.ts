export interface Product {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  brand_id: number;
  brand_name: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export interface ProductRequest {
  name: string;
  categoryId: number;
  brandId: number;
  slug: string;
  description: string;
  thumbnailUrl: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}
