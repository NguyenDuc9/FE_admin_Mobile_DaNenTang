'use client';

import { useEffect, useState } from 'react';
import { getResourcePage } from '@/api/adminResourceApi';
import { updateOrderStatus } from '@/api/orderAdminApi';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import type { ResourceRow } from '@/interfaces/adminResources';

const nextStatuses: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'DELIVERY_FAILED'],
  PACKED: ['SHIPPING'],
  SHIPPING: ['DELIVERED', 'DELIVERY_FAILED'],
  DELIVERED: ['COMPLETED'],
  DELIVERY_FAILED: ['SHIPPING', 'CANCELLED'],
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Không thể tải dữ liệu đơn hàng.';
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<ResourceRow[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ResourceRow | null>(null);
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
    setStatus(nextStatuses[String(order.status)]?.[0] || '');
    setReason('');
    setError('');
  }

  async function saveStatus() {
    if (!selectedOrder || !status) return;
    setSaving(true);
    setError('');
    try {
      await updateOrderStatus(selectedOrder.id, status, reason.trim());
      setSelectedOrder(null);
      setNotice(
        `Đã cập nhật đơn ${String(selectedOrder.order_code || `#${selectedOrder.id}`)}.`,
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

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">
              Đang tải đơn hàng...
            </p>
          ) : orders.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">
              Chưa có đơn hàng.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Mã đơn</th>
                    <th className="px-5 py-3 font-semibold">Người nhận</th>
                    <th className="px-5 py-3 font-semibold">Tổng tiền</th>
                    <th className="px-5 py-3 font-semibold">Thanh toán</th>
                    <th className="px-5 py-3 font-semibold">Trạng thái</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold">
                        {String(order.order_code || `#${order.id}`)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {String(
                          order.delivery_receiver_name || order.user_id || '—',
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {Number(order.total_amount || 0).toLocaleString(
                          'vi-VN',
                        )}{' '}
                        ₫
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {String(order.payment_status || '—')}
                      </td>
                      <td className="px-5 py-4">
                        {String(order.status || '—')}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {(nextStatuses[String(order.status)] || []).length >
                          0 && (
                          <button
                            type="button"
                            onClick={() => openStatusEditor(order)}
                            className="font-semibold text-cyan-800 hover:text-cyan-950"
                          >
                            Cập nhật trạng thái
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
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {selectedOrder && (
        <Modal
          title="Cập nhật trạng thái đơn"
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
                {(nextStatuses[String(selectedOrder.status)] || []).map(
                  (nextStatus) => (
                    <option key={nextStatus} value={nextStatus}>
                      {nextStatus}
                    </option>
                  ),
                )}
              </select>
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
                {saving ? 'Đang lưu...' : 'Lưu trạng thái'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
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
