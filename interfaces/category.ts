export type CategoryStatus = 'ACTIVE' | 'INACTIVE';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  status: CategoryStatus;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryRequest {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  status: CategoryStatus;
}
