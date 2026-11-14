'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getDashboardStats } from '@/api/dashboardApi';
import type { DashboardStats } from '@/api/dashboardApi';
import { resolveImageUrl } from '@/api/api';
import { getProducts } from '@/api/productApi';
import { getResourceList } from '@/api/adminResourceApi';
import type { Product } from '@/interfaces/product';
import type { ResourceRow } from '@/interfaces/adminResources';
import { formatGroupedNumber, formatVnd } from '@/utils/displayFormat';
import Pagination from '@/components/Pagination';

const pageSize = 15;
const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const emptyStats: DashboardStats = {
  todayRevenue: 0,
  monthRevenue: 0,
  lifetimeRevenue: 0,
  completedOrders: 0,
  bestSellingProducts: [],
};

interface RevenueDay {
  day: number;
  revenue: number;
}

interface RatedProduct {
  productId: number;
  productName: string;
  thumbnailUrl: string | null;
  averageRating: number;
  reviewCount: number;
}

function getMonthlyRevenueDays(orders: ResourceRow[], month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => ({
    day: index + 1,
    revenue: 0,
  }));

  for (const order of orders) {
    const status = String(order.status || '').toUpperCase();
    const createdAt = String(order.created_at || '');
    if (
      !['DELIVERED', 'COMPLETED'].includes(status) ||
      createdAt.slice(0, 7) !== month
    ) {
      continue;
    }
    const day = Number(createdAt.slice(8, 10));
    const revenue = Number(order.total_amount);
    if (day >= 1 && day <= daysInMonth && Number.isFinite(revenue)) {
      days[day - 1].revenue += revenue;
    }
  }

  return days;
}

function getTopRatedProducts(
  reviews: ResourceRow[],
  products: Product[],
  month: string,
) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const ratings = new Map<number, { total: number; count: number }>();

  for (const review of reviews) {
    const productId = Number(review.product_id);
    const rating = Number(review.rating);
    if (
      !Number.isFinite(productId) ||
      !Number.isFinite(rating) ||
      rating < 1 ||
      rating > 5 ||
      String(review.created_at || '').slice(0, 7) !== month ||
      (review.status && review.status !== 'APPROVED')
    ) {
      continue;
    }
    const current = ratings.get(productId) || { total: 0, count: 0 };
    current.total += rating;
    current.count += 1;
    ratings.set(productId, current);
  }

  return Array.from(ratings, ([productId, { total, count }]) => {
    const product = productById.get(productId);
    return {
      productId,
      productName: product?.name || `Sản phẩm #${productId}`,
      thumbnailUrl: product?.thumbnail_url || null,
      averageRating: total / count,
      reviewCount: count,
    };
  })
    .sort(
      (left, right) =>
        right.averageRating - left.averageRating ||
        right.reviewCount - left.reviewCount,
    )
    .slice(0, 5);
}

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [revenueDays, setRevenueDays] = useState<RevenueDay[]>([]);
  const [topRatedProducts, setTopRatedProducts] = useState<RatedProduct[]>([]);
  const [bestSellingPage, setBestSellingPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataWarning, setDataWarning] = useState('');
  const bestSellingPagination = {
    page: bestSellingPage,
    limit: pageSize,
    total: stats.bestSellingProducts.length,
    totalPages: Math.max(
      1,
      Math.ceil(stats.bestSellingProducts.length / pageSize),
    ),
  };
  const visibleBestSellingProducts = stats.bestSellingProducts.slice(
    (bestSellingPage - 1) * pageSize,
    bestSellingPage * pageSize,
  );
  const maxDailyRevenue = Math.max(
    1,
    ...revenueDays.map((item) => item.revenue),
  );

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      setLoading(true);
      setError('');
      setDataWarning('');
      try {
        const [statsResult, ordersResult, reviewsResult, productsResult] =
          await Promise.allSettled([
            getDashboardStats(selectedMonth),
            getResourceList('/api/orders'),
            getResourceList('/api/admin-fe/reviews'),
            getProducts(),
          ]);
        if (!active) return;
        if (statsResult.status === 'rejected') throw statsResult.reason;

        const data = statsResult.value;
        const orders =
          ordersResult.status === 'fulfilled' ? ordersResult.value : [];
        const reviews =
          reviewsResult.status === 'fulfilled' ? reviewsResult.value : [];
        const products =
          productsResult.status === 'fulfilled' ? productsResult.value : [];
        setStats(data);
        setRevenueDays(getMonthlyRevenueDays(orders, selectedMonth));
        setTopRatedProducts(
          getTopRatedProducts(reviews, products, selectedMonth),
        );

        const warnings: string[] = [];
        if (ordersResult.status === 'rejected') {
          warnings.push('Không tải được dữ liệu đơn hàng để vẽ biểu đồ doanh thu.');
        }
        if (reviewsResult.status === 'rejected') {
          warnings.push('Không tải được dữ liệu đánh giá sản phẩm.');
        }
        if (productsResult.status === 'rejected') {
          warnings.push('Không tải được thông tin sản phẩm.');
        }

        if (data.bestSellingProducts.some((product) => !product.thumbnail_url)) {
          const imagesResult = await Promise.allSettled([
            getResourceList('/api/product-images'),
          ]);
          if (!active) return;
          const images =
            imagesResult[0].status === 'fulfilled'
              ? imagesResult[0].value
              : [];
          const imageByProduct = new Map<number, string>();
          const primaryImageByProduct = new Map<number, string>();

          for (const image of images) {
            const productId = Number(image.product_id);
            if (
              !Number.isFinite(productId) ||
              typeof image.image_url !== 'string' ||
              !image.image_url
            ) {
              continue;
            }
            const isPrimary =
              image.is_primary === true ||
              image.is_primary === 1 ||
              image.is_primary === '1';
            if (isPrimary) {
              primaryImageByProduct.set(productId, image.image_url);
            } else if (!imageByProduct.has(productId)) {
              imageByProduct.set(productId, image.image_url);
            }
          }

          if (imagesResult[0].status === 'rejected') {
            warnings.push('Một số ảnh sản phẩm có thể chưa tải được.');
          }

          setStats((current) => ({
            ...current,
            bestSellingProducts: current.bestSellingProducts.map((product) => {
              if (product.thumbnail_url) return product;
              const productInfo =
                products.find((candidate) => candidate.id === product.product_id) ||
                products.find(
                  (candidate) =>
                    candidate.name.trim().toLocaleLowerCase() ===
                    product.product_name.trim().toLocaleLowerCase(),
                );
              const imageUrl =
                primaryImageByProduct.get(productInfo?.id || product.product_id) ||
                imageByProduct.get(productInfo?.id || product.product_id) ||
                productInfo?.thumbnail_url;
              return imageUrl ? { ...product, thumbnail_url: imageUrl } : product;
            }),
          }));
        }
        setDataWarning(warnings.join(' '));
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Không tải được thống kê tổng quan.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDashboard();
    return () => {
      active = false;
    };
  }, [selectedMonth]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f7fb] text-slate-900">
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-cyan-700">Bảng điều khiển</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            Quản trị cửa hàng
          </h2>
          <p className="mt-3 text-slate-600">
            Theo dõi doanh thu, sản phẩm bán chạy và quản lý dữ liệu cửa hàng.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h3 className="font-bold text-slate-900">Báo cáo theo tháng</h3>
            <p className="mt-1 text-sm text-slate-500">
              Chọn tháng để xem doanh thu và sản phẩm bán chạy trong tháng đó.
            </p>
          </div>
          <label className="text-sm font-semibold text-slate-700">
            Tháng báo cáo
            <input
              type="month"
              value={selectedMonth}
              max={currentMonth()}
              onChange={(event) => {
                setBestSellingPage(1);
                setSelectedMonth(event.target.value);
              }}
              className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </p>
        )}

        {dataWarning && (
          <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            {dataWarning}
          </p>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Doanh thu hôm nay',
              value: formatVnd(stats.todayRevenue),
              icon: '$',
              tone: 'bg-emerald-50 text-emerald-700',
            },
            {
              label: 'Doanh thu tháng',
              value: formatVnd(stats.monthRevenue),
              icon: '↗',
              tone: 'bg-sky-50 text-sky-700',
            },
            {
              label: 'Tổng doanh thu',
              value: formatVnd(stats.lifetimeRevenue),
              icon: '◉',
              tone: 'bg-violet-50 text-violet-700',
            },
            {
              label: 'Đơn đã giao / hoàn tất',
              value: formatGroupedNumber(stats.completedOrders),
              icon: '✓',
              tone: 'bg-amber-50 text-amber-700',
            },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-3 text-xl font-black tabular-nums text-slate-950">
                    {loading ? 'Đang tải...' : item.value}
                  </p>
                </div>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black ${item.tone}`}
                >
                  {item.icon}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {item.label === 'Doanh thu tháng'
                  ? `Báo cáo ${selectedMonth}`
                  : 'Theo dữ liệu cửa hàng'}
              </p>
            </article>
          ))}
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Doanh thu theo ngày</h3>
              <p className="mt-1 text-sm text-slate-500">
                Đơn đã giao hoặc hoàn tất trong tháng {selectedMonth}.
              </p>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {selectedMonth}
            </span>
          </div>
          {loading ? (
            <p className="py-16 text-center text-sm text-slate-500">
              Đang tải biểu đồ...
            </p>
          ) : revenueDays.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">
              Chưa có dữ liệu đơn hàng cho tháng này.
            </p>
          ) : (
            <div
              role="img"
              aria-label={`Biểu đồ doanh thu theo ngày trong tháng ${selectedMonth}`}
              className="mt-7 overflow-x-auto"
            >
              <div className="flex h-56 min-w-[650px] items-end gap-1 border-b border-l border-slate-100 px-2">
                {revenueDays.map((item) => (
                  <div
                    key={item.day}
                    title={`${item.day}/${selectedMonth.slice(5)}: ${formatVnd(item.revenue)}`}
                    className="group flex h-full min-w-0 flex-1 flex-col justify-end"
                  >
                    <div className="flex h-[calc(100%-1.5rem)] items-end">
                      <div
                        className="mx-auto w-full max-w-4 rounded-t-sm bg-sky-500 transition-colors group-hover:bg-sky-700"
                        style={{
                          height: `${Math.max(
                            item.revenue > 0 ? 3 : 0,
                            (item.revenue / maxDailyRevenue) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="pt-1 text-center text-[10px] text-slate-400">
                      {item.day % 5 === 1 || item.day === 1
                        ? String(item.day).padStart(2, '0')
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Doanh thu (VND)</span>
                <span>Số ngày trong tháng</span>
              </div>
            </div>
          )}
        </section>

        <section className="mt-6 grid items-start gap-5 xl:grid-cols-2">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold">Sản phẩm bán chạy</h3>
              <p className="mt-1 text-xs text-slate-500">
                Xếp theo số lượng bán trong tháng {selectedMonth}.
              </p>
            </div>
            {loading ? (
              <p className="px-5 py-12 text-center text-sm text-slate-500">
                Đang tải sản phẩm...
              </p>
            ) : stats.bestSellingProducts.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-slate-500">
                Chưa có sản phẩm bán hoàn tất trong tháng này.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Sản phẩm</th>
                      <th className="px-5 py-3 text-right font-semibold">Đã bán</th>
                      <th className="px-5 py-3 text-right font-semibold">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleBestSellingProducts.map((product) => (
                      <tr key={`${product.product_id}-${product.product_name}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {product.thumbnail_url ? (
                              <Image
                                src={resolveImageUrl(product.thumbnail_url)}
                                alt=""
                                width={40}
                                height={40}
                                unoptimized
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <span className="h-10 w-10 rounded-lg bg-slate-100" />
                            )}
                            <span className="max-w-52 truncate font-semibold">
                              {product.product_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {formatGroupedNumber(product.sold_quantity)}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums">
                          {formatVnd(product.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && stats.bestSellingProducts.length > 0 && (
              <Pagination
                pagination={bestSellingPagination}
                onPageChange={setBestSellingPage}
              />
            )}
          </article>

          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold">Sản phẩm được đánh giá cao</h3>
              <p className="mt-1 text-xs text-slate-500">
                Đánh giá đã duyệt trong tháng {selectedMonth}.
              </p>
            </div>
            {loading ? (
              <p className="px-5 py-12 text-center text-sm text-slate-500">
                Đang tải đánh giá...
              </p>
            ) : topRatedProducts.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-slate-500">
                Chưa có đánh giá sản phẩm trong tháng này.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Sản phẩm</th>
                      <th className="px-5 py-3 text-right font-semibold">Đánh giá</th>
                      <th className="px-5 py-3 text-right font-semibold">Lượt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topRatedProducts.map((product) => (
                      <tr key={product.productId}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {product.thumbnailUrl ? (
                              <Image
                                src={resolveImageUrl(product.thumbnailUrl)}
                                alt=""
                                width={40}
                                height={40}
                                unoptimized
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <span className="h-10 w-10 rounded-lg bg-slate-100" />
                            )}
                            <span className="max-w-52 truncate font-semibold">
                              {product.productName}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="font-bold text-amber-500">
                            ★ {product.averageRating.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {formatGroupedNumber(product.reviewCount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: '/admin/categories',
              title: 'Quản lý danh mục',
              description: 'Thêm, chỉnh sửa và cập nhật trạng thái danh mục.',
              icon: '#',
            },
            {
              href: '/admin/products',
              title: 'Quản lý sản phẩm',
              description: 'Quản lý sản phẩm, hình ảnh và tồn kho.',
              icon: '▣',
            },
            {
              href: '/admin/vouchers',
              title: 'Khuyến mãi',
              description: 'Quản lý voucher và sản phẩm áp dụng.',
              icon: '%',
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-500 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-2xl text-cyan-700">
                {item.icon}
              </div>
              <h3 className="mt-5 text-lg font-bold group-hover:text-cyan-700">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {item.description}
              </p>
              <span className="mt-5 inline-block text-sm font-bold text-cyan-700">
                Mở quản lý →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
