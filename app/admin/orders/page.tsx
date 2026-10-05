'use client';

import { useEffect, useState } from 'react';
import { getResourcePage } from '@/api/adminResourceApi';
import {
  getOrderDetails,
  updateOrderStatus,
  type OrderDetail,
} from '@/api/orderAdminApi';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import type { ResourceRow } from '@/interfaces/adminResources';
import AdminSearch, { matchesSearch } from '@/components/AdminSearch';
import { formatDateTime, formatVnd } from '@/utils/displayFormat';

const orderStatuses = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPING',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'DELIVERY_FAILED',
] as const;

type OrderStatus = (typeof orderStatuses)[number];

const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'DELIVERY_FAILED'],
  PACKED: ['SHIPPING'],
  SHIPPING: ['DELIVERED', 'DELIVERY_FAILED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  DELIVERY_FAILED: ['SHIPPING', 'CANCELLED'],
};

function getNextStatuses(status: unknown): OrderStatus[] {
  if (
    typeof status !== 'string' ||
    !orderStatuses.includes(status as OrderStatus)
  ) {
    return [];
  }
  return nextStatuses[status as OrderStatus];
}

const statusLabels: Record<OrderStatus, string> = {
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

const orderStatusColors: Record<OrderStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  CONFIRMED: 'border-blue-200 bg-blue-50 text-blue-800',
  PROCESSING: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  PACKED: 'border-purple-200 bg-purple-50 text-purple-800',
  SHIPPING: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  DELIVERED: 'border-teal-200 bg-teal-50 text-teal-800',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CANCELLED: 'border-rose-200 bg-rose-50 text-rose-800',
  DELIVERY_FAILED: 'border-orange-200 bg-orange-50 text-orange-800',
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thanh toán lỗi',
  REFUNDED: 'Đã hoàn tiền',
};

const paymentMethodLabels: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  MOMO: 'Ví MoMo',
  VNPAY: 'VNPAY',
};

const paymentStatusColors: Record<string, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  PAID: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  FAILED: 'border-rose-200 bg-rose-50 text-rose-800',
  REFUNDED: 'border-slate-200 bg-slate-50 text-slate-700',
};

function getOrderStatusClass(status: unknown) {
  return orderStatusColors[String(status) as OrderStatus] ||
    'border-slate-200 bg-slate-50 text-slate-700';
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Không thể tải dữ liệu đơn hàng.';
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<ResourceRow[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ResourceRow | null>(null);
  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const visibleOrders = orders.filter((order) =>
    matchesSearch(
      [
        order.id,
        order.order_code,
        order.delivery_receiver_name,
        order.delivery_phone,
        order.status,
        order.payment_status,
      ],
      search,
    ),
  );
  const visiblePagination = search
    ? { ...pagination, page: 1, total: visibleOrders.length, totalPages: 1 }
    : pagination;

  async function loadOrders(targetPage = page) {
    setLoading(true);
    setError('');
    try {
      const result = await getResourcePage('/api/orders', targetPage);
      if (targetPage > 1 && targetPage > result.pagination.totalPages) {
        setPage(result.pagination.totalPages);
        return;
      }
      setOrders(result.rows);
      setPagination(result.pagination);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getResourcePage('/api/orders', page)
      .then((result) => {
        if (!active) return;
        if (page > 1 && page > result.pagination.totalPages) {
          setPage(result.pagination.totalPages);
          return;
        }
        setOrders(result.rows);
        setPagination(result.pagination);
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page]);

  function openStatusEditor(order: ResourceRow) {
    setSelectedOrder(order);
    setStatus(getNextStatuses(order.status)[0] || '');
    setReason('');
    setError('');
  }

  async function openOrderDetails(order: ResourceRow) {
    setDetailOpen(true);
    setDetailOrder(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      setDetailOrder(await getOrderDetails(order.id));
    } catch (detailLoadError) {
      setDetailError(errorMessage(detailLoadError));
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveStatus() {
    if (!selectedOrder || !status) return;
    setSaving(true);
    setError('');
    try {
      await updateOrderStatus(selectedOrder.id, status, reason.trim());
      const wasConfirmed = status === 'CONFIRMED';
      setSelectedOrder(null);
      setNotice(
        `${wasConfirmed ? 'Đã xác nhận' : 'Đã cập nhật'} đơn ${String(selectedOrder.order_code || `#${selectedOrder.id}`)}.`,
      );
      await loadOrders();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f7fb] px-5 py-8 text-slate-900 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Quản trị bán hàng</p>
            <h1 className="mt-1 text-2xl font-bold">Đơn hàng</h1>
            <p className="mt-1 text-sm text-slate-500">
              Theo dõi đơn và chuyển trạng thái theo quy trình xử lý.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadOrders()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold"
          >
            Tải lại
          </button>
        </div>

        {notice && (
          <Message
            type="success"
            message={notice}
            onClose={() => setNotice('')}
          />
        )}
        {error && !selectedOrder && (
          <Message type="error" message={error} onClose={() => setError('')} />
        )}

        <AdminSearch
          value={search}
          onChange={setSearch}
          placeholder="Tìm đơn theo mã, người nhận, trạng thái..."
        />

        <Pagination
          pagination={visiblePagination}
          onPageChange={setPage}
        />
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">
              Đang tải đơn hàng...
            </p>
          ) : visibleOrders.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">
              {search ? 'Không tìm thấy đơn hàng phù hợp.' : 'Chưa có đơn hàng.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Mã đơn</th>
                    <th className="px-5 py-3 font-semibold">Người nhận</th>
                    <th className="px-5 py-3 text-right font-semibold">Tổng tiền</th>
                    <th className="px-5 py-3 font-semibold">Thanh toán</th>
                    <th className="px-5 py-3 font-semibold">Trạng thái</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold">
                        {String(order.order_code || `#${order.id}`)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {String(
                          order.delivery_receiver_name || order.user_id || '—',
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-slate-700 tabular-nums">
                        {formatVnd(Number(order.total_amount || 0))}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStatusColors[String(order.payment_status)] || 'border-slate-200 bg-slate-50 text-slate-700'}`}
                          >
                            {paymentStatusLabels[String(order.payment_status)] ||
                              'Trạng thái thanh toán khác'}
                          </span>
                          {order.payment_method ? (
                            <span className="text-xs text-slate-500">
                              {paymentMethodLabels[String(order.payment_method)] ||
                                'Phương thức thanh toán khác'}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getOrderStatusClass(order.status)}`}
                        >
                          {statusLabels[String(order.status) as OrderStatus] ||
                            'Trạng thái đơn khác'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => void openOrderDetails(order)}
                          className="mr-4 font-semibold text-indigo-700 hover:text-indigo-900"
                        >
                          Xem chi tiết
                        </button>
                        {getNextStatuses(order.status).length > 0 && (
                          <button
                            type="button"
                            onClick={() => openStatusEditor(order)}
                            className="font-semibold text-cyan-800 hover:text-cyan-950"
                          >
                            {order.status === 'PENDING'
                              ? 'Xác nhận đơn'
                              : 'Cập nhật trạng thái'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <Pagination
          pagination={visiblePagination}
          onPageChange={setPage}
        />
      </div>

      {detailOpen && (
        <Modal
          title={
            detailOrder
              ? `Chi tiết đơn ${detailOrder.order_code}`
              : 'Chi tiết đơn hàng'
          }
          onClose={() => {
            setDetailOpen(false);
            setDetailError('');
            setDetailOrder(null);
          }}
        >
          <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
            {detailLoading ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Đang tải chi tiết đơn hàng...
              </p>
            ) : detailError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {detailError}
              </div>
            ) : detailOrder ? (
              <OrderDetailsContent order={detailOrder} />
            ) : null}
          </div>
        </Modal>
      )}

      {selectedOrder && (
        <Modal
          title={
            selectedOrder.status === 'PENDING'
              ? 'Xác nhận đơn hàng'
              : 'Cập nhật trạng thái đơn'
          }
          onClose={() => setSelectedOrder(null)}
        >
          <div className="space-y-4 p-6">
            <p className="text-sm text-slate-600">
              {String(selectedOrder.order_code || `Đơn #${selectedOrder.id}`)}
            </p>
            <label className="block text-sm font-semibold">
              Trạng thái tiếp theo
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              >
                {getNextStatuses(selectedOrder.status).map((nextStatus) => (
                    <option key={nextStatus} value={nextStatus}>
                      {statusLabels[nextStatus] || nextStatus}
                    </option>
                  ))}
              </select>
              {status ? (
                <span
                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getOrderStatusClass(status)}`}
                >
                  {statusLabels[status as OrderStatus] || status}
                </span>
              ) : null}
            </label>
            <label className="block text-sm font-semibold">
              Ghi chú
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              />
            </label>
            {error && <p className="text-sm text-rose-700">{error}</p>}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving || !status}
                onClick={() => void saveStatus()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving
                  ? 'Đang lưu...'
                  : status === 'CONFIRMED'
                    ? 'Xác nhận đơn'
                    : 'Lưu trạng thái'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}

function OrderDetailsContent({ order }: { order: OrderDetail }) {
  const fulfillmentLabel =
    order.fulfillment_method === 'PICKUP'
      ? 'Nhận tại cửa hàng'
      : 'Giao tận nơi';

  return (
    <>
      <section className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">Mã đơn</p>
            <p className="font-semibold text-slate-900">{order.order_code}</p>
          </div>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getOrderStatusClass(order.status)}`}
          >
            {statusLabels[order.status as OrderStatus] || 'Trạng thái đơn khác'}
          </span>
        </div>
        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <p>
            Loại đơn:{' '}
            {order.order_type === 'CUSTOM_BUILD'
              ? 'PC tự chọn'
              : 'Sản phẩm có sẵn'}
          </p>
          <p>Đặt lúc: {formatDateTime(order.created_at)}</p>
          <p>
            Thanh toán:{' '}
            {paymentStatusLabels[String(order.payment_status)] ||
              'Chưa cập nhật'}
          </p>
          <p>
            Phương thức:{' '}
            {paymentMethodLabels[String(order.payment_method)] ||
              'Chưa cập nhật'}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900">Thông tin nhận hàng</h3>
        <div className="mt-2 space-y-1 text-sm text-slate-600">
          <p>Hình thức: {fulfillmentLabel}</p>
          <p>Người nhận: {order.delivery_receiver_name || '—'}</p>
          <p>Số điện thoại: {order.delivery_phone || '—'}</p>
          <p>
            Địa chỉ:{' '}
            {order.fulfillment_method === 'PICKUP'
              ? order.pickup_store_address ||
                order.pickup_store_name ||
                order.delivery_address ||
                '—'
              : order.delivery_address || '—'}
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-semibold text-slate-900">Sản phẩm</h3>
        {order.items?.length ? (
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <p className="font-medium text-slate-900">
                  {item.product_name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {[item.variant_name, item.sku].filter(Boolean).join(' · ') ||
                    'Sản phẩm'}
                </p>
                <div className="mt-2 flex justify-between gap-3 text-sm">
                  <span className="text-slate-600">
                    {formatVnd(Number(item.unit_price))} × {item.quantity}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-800">
                    {formatVnd(Number(item.subtotal))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
            Đơn hàng chưa có thông tin sản phẩm.
          </p>
        )}
      </section>

      <section className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
        <DetailAmount label="Tạm tính" value={order.subtotal} />
        <DetailAmount label="Phí vận chuyển" value={order.shipping_fee} />
        <DetailAmount label="Giảm giá" value={order.discount_amount} prefix="-" />
        {order.voucher_code ? (
          <p className="text-slate-600">Mã giảm giá: {order.voucher_code}</p>
        ) : null}
        <DetailAmount label="Tổng cộng" value={order.total_amount} bold />
      </section>

      {order.note ? (
        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900">Ghi chú</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
            {order.note}
          </p>
        </section>
      ) : null}
      {order.cancelled_reason ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <h3 className="font-semibold text-rose-800">Lý do hủy đơn</h3>
          <p className="mt-1 text-sm text-rose-700">
            {order.cancelled_reason}
          </p>
        </section>
      ) : null}
    </>
  );
}

function DetailAmount({
  label,
  value,
  prefix = '',
  bold = false,
}: {
  label: string;
  value?: number | string | null;
  prefix?: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${bold ? 'border-t border-slate-200 pt-2 font-bold text-slate-900' : 'text-slate-600'}`}
    >
      <span>{label}</span>
      <span className="text-right tabular-nums">
        {prefix}
        {formatVnd(Number(value || 0))}
      </span>
    </div>
  );
}

function Message({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      className={`mb-4 flex justify-between rounded-lg border px-4 py-3 text-sm ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}
    >
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Đóng thông báo">
        ×
      </button>
    </div>
  );
}
