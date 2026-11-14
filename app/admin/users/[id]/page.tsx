'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getResourceList } from '@/api/adminResourceApi';
import { resolveImageUrl } from '@/api/api';
import { getUserById } from '@/api/userApi';
import type { User } from '@/interfaces/user';
import type { ResourceRow } from '@/interfaces/adminResources';
import { formatDateTime, formatVnd } from '@/utils/displayFormat';

const orderStatusLabels: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang chuẩn bị',
  PACKED: 'Đã đóng gói',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  DELIVERY_FAILED: 'Giao thất bại',
};

const warrantyStatusLabels: Record<string, string> = {
  ACTIVE: 'Đang hiệu lực',
  EXPIRED: 'Hết hạn',
  CLAIMED: 'Đã yêu cầu bảo hành',
};

const tabs = [
  { id: 'orders', label: 'Đơn hàng' },
  { id: 'warranties', label: 'Bảo hành' },
  { id: 'reviews', label: 'Đánh giá' },
] as const;

type TabId = (typeof tabs)[number]['id'];

interface CustomerWarranty extends ResourceRow {
  user_id: number;
  order_code: string;
  product_name: string;
  variant_name: string;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Không thể tải thông tin khách hàng.';
}

function OrderStatusBadge({ status }: { status: unknown }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-800',
    CONFIRMED: 'bg-blue-50 text-blue-800',
    PROCESSING: 'bg-indigo-50 text-indigo-800',
    PACKED: 'bg-purple-50 text-purple-800',
    SHIPPING: 'bg-cyan-50 text-cyan-800',
    DELIVERED: 'bg-teal-50 text-teal-800',
    COMPLETED: 'bg-emerald-50 text-emerald-800',
    CANCELLED: 'bg-rose-50 text-rose-800',
    DELIVERY_FAILED: 'bg-orange-50 text-orange-800',
  };
  const value = String(status || '');
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[value] || 'bg-slate-100 text-slate-700'}`}
    >
      {orderStatusLabels[value] || value || 'Chưa cập nhật'}
    </span>
  );
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<ResourceRow[]>([]);
  const [warranties, setWarranties] = useState<CustomerWarranty[]>([]);
  const [reviews, setReviews] = useState<ResourceRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('orders');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadCustomer() {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setError('');
      try {
        if (!Number.isSafeInteger(userId) || userId <= 0) {
          throw new Error('Mã người dùng không hợp lệ.');
        }
        const [customer, allOrders, allWarranties, allReviews] = await Promise.all([
          getUserById(userId),
          getResourceList('/api/orders'),
          getResourceList('/api/warranties'),
          getResourceList('/api/admin-fe/reviews'),
        ]);

        const customerOrders = allOrders.filter(
          (order) => Number(order.user_id) === userId,
        );
        const customerWarranties = allWarranties.filter(
          (warranty) => Number(warranty.user_id) === userId,
        ) as CustomerWarranty[];
        const customerReviews = allReviews.filter(
          (review) => Number(review.user_id) === userId,
        );

        if (!active) return;
        setUser(customer);
        setOrders(customerOrders);
        setReviews(customerReviews);
        setWarranties(customerWarranties);
      } catch (loadError) {
        if (active) setError(errorMessage(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCustomer();
    return () => {
      active = false;
    };
  }, [userId]);

  const filteredOrders = useMemo(
    () =>
      statusFilter
        ? orders.filter((order) => order.status === statusFilter)
        : orders,
    [orders, statusFilter],
  );
  const orderStatuses = useMemo(
    () => [...new Set(orders.map((order) => String(order.status || '')))].filter(Boolean),
    [orders],
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f7fb] px-5 py-8 text-slate-900 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/users"
          className="text-sm font-semibold text-cyan-800 hover:text-cyan-950"
        >
          ← Danh sách người dùng
        </Link>

        <div className="mb-6 mt-4">
          <p className="text-sm text-slate-500">Quản trị hệ thống</p>
          <h1 className="mt-1 text-2xl font-bold">Hồ sơ khách hàng</h1>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center text-sm text-slate-500">
            Đang tải hồ sơ khách hàng...
          </div>
        ) : user ? (
          <>
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {user.avatar_url ? (
                  <img
                      src={resolveImageUrl(user.avatar_url)}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-50 text-xl font-bold text-cyan-800">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold">{user.full_name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {user.phone || 'Chưa có số điện thoại'} · Mã khách hàng #{user.id}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <Summary label="Đơn hàng" value={orders.length} />
                  <Summary label="Bảo hành" value={warranties.length} />
                  <Summary label="Đánh giá" value={reviews.length} />
                </div>
              </div>
            </section>

            <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-4 py-3 text-sm font-semibold ${
                    activeTab === tab.id
                      ? 'border-cyan-700 text-cyan-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {tab.id === 'orders'
                      ? orders.length
                      : tab.id === 'warranties'
                        ? warranties.length
                        : reviews.length}
                  </span>
                </button>
              ))}
            </div>

            {activeTab === 'orders' && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
                  <h3 className="font-bold">Đơn hàng của khách hàng</h3>
                  <label className="text-sm text-slate-600">
                    <span className="sr-only">Lọc đơn hàng theo trạng thái</span>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
                    >
                      <option value="">Tất cả trạng thái</option>
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {orderStatusLabels[status] || status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {filteredOrders.length === 0 ? (
                  <EmptyState
                    message={
                      orders.length
                        ? 'Không có đơn hàng ở trạng thái này.'
                        : 'Khách hàng chưa có đơn hàng.'
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Mã đơn</th>
                          <th className="px-5 py-3 font-semibold">Ngày đặt</th>
                          <th className="px-5 py-3 text-right font-semibold">Tổng tiền</th>
                          <th className="px-5 py-3 font-semibold">Trạng thái</th>
                          <th className="px-5 py-3 text-right font-semibold">Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50">
                            <td className="px-5 py-4 font-semibold">
                              {String(order.order_code || `#${order.id}`)}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {formatDateTime(order.created_at)}
                            </td>
                            <td className="px-5 py-4 text-right font-medium tabular-nums">
                              {formatVnd(Number(order.total_amount || 0))}
                            </td>
                            <td className="px-5 py-4">
                              <OrderStatusBadge status={order.status} />
                            </td>
                            <td className="px-5 py-4 text-right">
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="font-semibold text-cyan-800 hover:text-cyan-950"
                              >
                                Xem đơn hàng
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'warranties' && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-4">
                  <h3 className="font-bold">Thông tin bảo hành</h3>
                </div>
                {warranties.length === 0 ? (
                  <EmptyState message="Khách hàng chưa có thông tin bảo hành." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Sản phẩm</th>
                          <th className="px-5 py-3 font-semibold">Serial</th>
                          <th className="px-5 py-3 font-semibold">Thời hạn</th>
                          <th className="px-5 py-3 font-semibold">Trạng thái</th>
                          <th className="px-5 py-3 font-semibold">Đơn hàng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {warranties.map((warranty) => (
                          <tr key={warranty.id}>
                            <td className="px-5 py-4 font-medium">
                              {String(warranty.product_name || 'Sản phẩm')}
                              {warranty.variant_name
                                ? ` · ${warranty.variant_name}`
                                : ''}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {String(warranty.serial_number || '—')}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {formatDateTime(warranty.start_date)} –{' '}
                              {formatDateTime(warranty.end_date)}
                            </td>
                            <td className="px-5 py-4">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {warrantyStatusLabels[String(warranty.status)] ||
                                  String(warranty.status || 'Chưa cập nhật')}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {warranty.order_code}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'reviews' && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-4">
                  <h3 className="font-bold">Đánh giá của khách hàng</h3>
                </div>
                {reviews.length === 0 ? (
                  <EmptyState message="Khách hàng chưa có đánh giá." />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {reviews.map((review) => (
                      <article key={review.id} className="p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-semibold text-slate-900">
                            {String(review.product_name || `Sản phẩm #${review.product_id}`)}
                          </h4>
                          <span className="font-semibold text-amber-600">
                            {'★'.repeat(
                              Math.max(
                                0,
                                Math.min(5, Number(review.rating) || 0),
                              ),
                            )}
                            <span className="ml-1 text-xs text-slate-500">
                              {String(review.rating || 0)}/5
                            </span>
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                          {String(review.comment || 'Không có nội dung.')}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{formatDateTime(review.created_at)}</span>
                          <span>
                            {review.status === 'APPROVED'
                              ? 'Đang hiển thị'
                              : review.status === 'HIDDEN'
                                ? 'Đã ẩn'
                                : String(review.status || 'Chưa cập nhật')}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="px-5 py-14 text-center text-sm text-slate-500">{message}</p>;
}
