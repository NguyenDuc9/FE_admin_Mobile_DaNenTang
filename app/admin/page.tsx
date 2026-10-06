'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getDashboardStats } from '@/api/dashboardApi';
import type { DashboardStats } from '@/api/dashboardApi';
import { resolveImageUrl } from '@/api/api';
import { getProducts } from '@/api/productApi';
import { getResourceList } from '@/api/adminResourceApi';
import { formatGroupedNumber, formatVnd } from '@/utils/displayFormat';
import Pagination from '@/components/Pagination';

const pageSize = 15;
const emptyStats: DashboardStats = {
  todayRevenue: 0,
  monthRevenue: 0,
  lifetimeRevenue: 0,
  completedOrders: 0,
  bestSellingProducts: [],
};

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [bestSellingPage, setBestSellingPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');
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

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const data = await getDashboardStats();
        if (!active) return;
        setStats(data);

        if (data.bestSellingProducts.some((product) => !product.thumbnail_url)) {
          const [productsResult, imagesResult] = await Promise.allSettled([
            getProducts(),
            getResourceList('/api/product-images'),
          ]);
          if (!active) return;

          const products =
            productsResult.status === 'fulfilled' ? productsResult.value : [];
          const images =
            imagesResult.status === 'fulfilled' ? imagesResult.value : [];
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

          const canLoadAnyFallback =
            productsResult.status === 'fulfilled' ||
            imagesResult.status === 'fulfilled';
          if (!canLoadAnyFallback) {
            setImageError('Không tải được ảnh sản phẩm.');
          } else if (
            productsResult.status === 'rejected' ||
            imagesResult.status === 'rejected'
          ) {
            setImageError('Một số ảnh sản phẩm có thể chưa tải được.');
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
  }, []);

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

        {error && (
          <p role="alert" className="mt-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Doanh thu hôm nay', stats.todayRevenue],
            ['Doanh thu tháng này', stats.monthRevenue],
            ['Tổng doanh thu', stats.lifetimeRevenue],
          ].map(([label, value]) => (
            <article
              key={String(label)}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-3 text-right text-2xl font-black text-slate-950 tabular-nums">
                {loading ? 'Đang tải...' : formatVnd(Number(value))}
              </p>
            </article>
          ))}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Đơn đã giao / hoàn tất
            </p>
            <p className="mt-3 text-right text-2xl font-black text-slate-950 tabular-nums">
              {loading ? 'Đang tải...' : formatGroupedNumber(stats.completedOrders)}
            </p>
          </article>
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-bold">Sản phẩm bán chạy</h3>
            <p className="mt-1 text-sm text-slate-500">
              Xếp hạng theo số lượng trong các đơn đã giao hoặc hoàn tất.
            </p>
          </div>
          {imageError && (
            <p className="px-5 pt-3 text-xs text-amber-700">{imageError}</p>
          )}
          {loading ? (
            <p className="px-5 py-12 text-center text-sm text-slate-500">
              Đang tải thống kê...
            </p>
          ) : stats.bestSellingProducts.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-500">
              Chưa có sản phẩm bán hoàn tất.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
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
                          <span className="font-semibold">
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
