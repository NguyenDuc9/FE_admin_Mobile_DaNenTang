import api from './api';

export interface DashboardProduct {
  product_id: number;
  product_name: string;
  thumbnail_url: string | null;
  sold_quantity: number;
  revenue: number;
}

export interface DashboardStats {
  todayRevenue: number;
  monthRevenue: number;
  lifetimeRevenue: number;
  completedOrders: number;
  bestSellingProducts: DashboardProduct[];
}

export async function getDashboardStats(month: string) {
  const response = await api.get<{ data: DashboardStats }>(
    `/api/admin-fe/dashboard?month=${encodeURIComponent(month)}`,
  );
  return response.data;
}
