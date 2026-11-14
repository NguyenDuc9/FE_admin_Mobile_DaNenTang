'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  getOrderDetails,
  updateOrderStatus,
  type OrderDetail,
} from '@/api/orderAdminApi';
import { formatDateTime, formatVnd } from '@/utils/displayFormat';

const statusLabels: Record<string, string> = {
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

const nextStatuses: Record<string, string[]> = {
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

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Không thể tải thông tin đơn hàng.';
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const request = Number.isSafeInteger(orderId) && orderId > 0
      ? getOrderDetails(orderId)
      : Promise.reject(new Error('Mã đơn hàng không hợp lệ.'));
    request
      .then((result) => {
        if (!active) return;
        setOrder(result);
        setStatus(nextStatuses[result.status]?.[0] || '');
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
  }, [orderId]);

  async function saveStatus() {
    if (!order || !status || !nextStatuses[order.status]?.includes(status)) {
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const targetStatus = status;
    try {
      await updateOrderStatus(order.id, targetStatus, reason.trim());
      setNotice(
        `${targetStatus === 'CONFIRMED' ? 'Đã xác nhận' : 'Đã cập nhật'} đơn ${order.order_code}.`,
      );
      setReason('');
      try {
        const refreshedOrder = await getOrderDetails(order.id);
        setOrder(refreshedOrder);
        setStatus(nextStatuses[refreshedOrder.status]?.[0] || '');
      } catch (refreshError) {
        const locallyUpdatedOrder = { ...order, status: targetStatus };
        setOrder(locallyUpdatedOrder);
        setStatus(nextStatuses[targetStatus]?.[0] || '');
        setError(
          `Đã cập nhật trạng thái, nhưng không tải lại được chi tiết: ${errorMessage(refreshError)}`,
        );
      }
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  const availableStatuses = order ? nextStatuses[order.status] || [] : [];

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f7fb] px-5 py-8 text-slate-900 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin/orders"
          className="text-sm font-semibold text-cyan-800 hover:text-cyan-950"
        >
          ← Quay lại danh sách đơn
        </Link>

        {loading ? (
          <p className="py-16 text-center text-sm text-slate-500">
            Đang tải chi tiết đơn hàng...
          </p>
        ) : error && !order ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            {error}
          </p>
        ) : order ? (
          <>
            <header className="mb-6 mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-cyan-800">
                  Quản trị bán hàng
                </p>
                <h1 className="mt-1 text-2xl font-bold">
                  Đơn hàng {order.order_code}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Tạo lúc {formatDateTime(order.created_at)}
                </p>
              </div>
              <span className="inline-flex whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold">
                {statusLabels[order.status] || order.status}
              </span>
            </header>

            {notice && (
              <p
                role="status"
                className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
              >
                {notice}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
              >
                {error}
              </p>
            )}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-5">
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="font-semibold">Sản phẩm trong đơn</h2>
                  <div className="mt-4 divide-y divide-slate-100">
                    {order.items?.length ? (
                      order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {[item.variant_name, item.sku]
                                .filter(Boolean)
                                .join(' · ') || 'Sản phẩm'}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {formatVnd(Number(item.unit_price))} ×{' '}
                              {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold tabular-nums">
                            {formatVnd(Number(item.subtotal))}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="py-2 text-sm text-slate-500">
                        Đơn hàng chưa có thông tin sản phẩm.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="font-semibold">Thông tin nhận hàng</h2>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <DetailField
                      label="Người nhận"
                      value={order.delivery_receiver_name}
                    />
                    <DetailField label="Điện thoại" value={order.delivery_phone} />
                    <DetailField
                      label="Hình thức"
                      value={
                        order.fulfillment_method === 'PICKUP'
                          ? 'Nhận tại cửa hàng'
                          : 'Giao tận nơi'
                      }
                    />
                    <DetailField
                      label="Địa chỉ"
                      value={
                        order.fulfillment_method === 'PICKUP'
                          ? order.pickup_store_address ||
                            order.pickup_store_name ||
                            order.delivery_address
                          : order.delivery_address
                      }
                    />
                  </dl>
                  {order.note && (
                    <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-3 text-sm text-slate-600">
                      Ghi chú: {order.note}
                    </p>
                  )}
                  {order.cancelled_reason && (
                    <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                      Lý do hủy: {order.cancelled_reason}
                    </p>
                  )}
                </section>

                <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 text-sm">
                  <h2 className="mb-3 font-semibold">Thanh toán</h2>
                  <Amount label="Tạm tính" value={order.subtotal} />
                  <Amount label="Phí vận chuyển" value={order.shipping_fee} />
                  <Amount
                    label="Giảm giá"
                    value={order.discount_amount}
                    prefix="-"
                  />
                  {order.voucher_code && (
                    <p className="text-slate-600">
                      Mã giảm giá: {order.voucher_code}
                    </p>
                  )}
                  <Amount label="Tổng cộng" value={order.total_amount} bold />
                  <div className="border-t border-slate-100 pt-3 text-slate-600">
                    <p>
                      Trạng thái:{' '}
                      {paymentStatusLabels[String(order.payment_status)] ||
                        'Chưa cập nhật'}
                    </p>
                    <p className="mt-1">
                      Phương thức:{' '}
                      {paymentMethodLabels[String(order.payment_method)] ||
                        'Chưa cập nhật'}
                    </p>
                  </div>
                </section>
              </div>

              <aside className="h-fit rounded-xl border border-cyan-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
                <h2 className="font-semibold">Cập nhật trạng thái</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Sau mỗi lần cập nhật, trang sẽ tải trạng thái mới và đưa ra
                  các bước tiếp theo hợp lệ.
                </p>
                {availableStatuses.length ? (
                  <>
                    <label className="mt-4 block text-sm font-semibold">
                      Trạng thái tiếp theo
                      <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        disabled={saving}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal disabled:opacity-60"
                      >
                        {availableStatuses.map((nextStatus) => (
                          <option key={nextStatus} value={nextStatus}>
                            {statusLabels[nextStatus] || nextStatus}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-3 block text-sm font-semibold">
                      Ghi chú
                      <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        disabled={saving}
                        rows={3}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal disabled:opacity-60"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void saveStatus()}
                      disabled={saving || !status}
                      className="mt-4 w-full rounded-lg bg-cyan-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving
                        ? 'Đang cập nhật...'
                        : status === 'CONFIRMED'
                          ? 'Xác nhận đơn'
                          : 'Cập nhật trạng thái'}
                    </button>
                  </>
                ) : (
                  <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    Đơn hàng đã ở trạng thái cuối, không còn trạng thái tiếp
                    theo.
                  </p>
                )}
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value || '—'}</dd>
    </div>
  );
}

function Amount({
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
      className={`flex justify-between gap-4 ${
        bold
          ? 'border-t border-slate-200 pt-2 font-bold text-slate-900'
          : 'text-slate-600'
      }`}
    >
      <span>{label}</span>
      <span className="text-right tabular-nums">
        {prefix}
        {formatVnd(Number(value || 0))}
      </span>
    </div>
  );
}
