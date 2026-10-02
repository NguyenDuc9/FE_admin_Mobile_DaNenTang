'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createResource,
  getResourceList,
  getResourcePage,
  updateResource,
} from '@/api/adminResourceApi';
import { getWarrantyOrderItems } from '@/api/warrantyAdminApi';
import type { WarrantyOrderItem } from '@/api/warrantyAdminApi';
import type { ResourceRow } from '@/interfaces/adminResources';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';

interface WarrantyForm {
  orderItemId: number | '';
  productVariantId: number | '';
  serialNumber: string;
  startDate: string;
  endDate: string;
  status: string;
  notes: string;
}

const emptyForm: WarrantyForm = {
  orderItemId: '',
  productVariantId: '',
  serialNumber: '',
  startDate: '',
  endDate: '',
  status: 'ACTIVE',
  notes: '',
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Không thể thực hiện thao tác bảo hành.';
}

export default function WarrantiesPage() {
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [orderItems, setOrderItems] = useState<WarrantyOrderItem[]>([]);
  const [variants, setVariants] = useState<ResourceRow[]>([]);
  const [form, setForm] = useState<WarrantyForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
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

  async function loadRows(targetPage = page) {
    setLoading(true);
    setError('');
    try {
      const result = await getResourcePage('/api/warranties', targetPage);
      if (targetPage > 1 && targetPage > result.pagination.totalPages) {
        setPage(result.pagination.totalPages);
        return;
      }
      setRows(result.rows);
      setPagination(result.pagination);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getResourcePage('/api/warranties', page)
      .then((result) => {
        if (!active) return;
        if (page > 1 && page > result.pagination.totalPages) {
          setPage(result.pagination.totalPages);
          return;
        }
        setRows(result.rows);
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

  useEffect(() => {
    Promise.all([getWarrantyOrderItems(), getResourceList('/api/product-variants')])
      .then(([itemOptions, variantRows]) => {
        setOrderItems(itemOptions);
        setVariants(variantRows);
      })
      .catch((loadError: unknown) => setError(errorMessage(loadError)));
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
    setFormOpen(true);
  }

  function openEdit(row: ResourceRow) {
    setForm({
      orderItemId: Number(row.order_item_id),
      productVariantId: row.product_variant_id
        ? Number(row.product_variant_id)
        : '',
      serialNumber: String(row.serial_number || ''),
      startDate: String(row.start_date || '').slice(0, 10),
      endDate: String(row.end_date || '').slice(0, 10),
      status: String(row.status || 'ACTIVE'),
      notes: String(row.note || ''),
    });
    setEditingId(row.id);
    setError('');
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.orderItemId) {
      setError('Vui lòng chọn chi tiết đơn hàng.');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError('Ngày kết thúc không được trước ngày bắt đầu.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      orderItemId: Number(form.orderItemId),
      productVariantId: form.productVariantId
        ? Number(form.productVariantId)
        : null,
      serialNumber: form.serialNumber.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status,
      notes: form.notes.trim(),
    };
    try {
      if (editingId === null) {
        await createResource('/api/warranties', payload);
        setNotice('Đã tạo thông tin bảo hành.');
      } else {
        await updateResource('/api/warranties', editingId, payload, 'PATCH');
        setNotice('Đã cập nhật thông tin bảo hành.');
      }
      setFormOpen(false);
      await loadRows();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  const orderItemLabel = (id: unknown) =>
    orderItems.find((item) => item.id === Number(id))?.label ||
    `Chi tiết #${String(id)}`;
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f7fb] px-5 py-8 text-slate-900 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-slate-500">Chăm sóc sau bán</p>
            <h1 className="mt-1 text-2xl font-bold">Bảo hành</h1>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            + Tạo bảo hành
          </button>
        </div>
        {notice && <Message message={notice} onClose={() => setNotice('')} />}
        {error && !formOpen && (
          <Message type="error" message={error} onClose={() => setError('')} />
        )}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">
              Đang tải dữ liệu...
            </p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">
              Chưa có bảo hành.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Serial</th>
                    <th className="px-5 py-3 font-semibold">Sản phẩm</th>
                    <th className="px-5 py-3 font-semibold">Thời hạn</th>
                    <th className="px-5 py-3 font-semibold">Trạng thái</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-5 py-4 font-semibold">
                        {String(row.serial_number || '—')}
                      </td>
                      <td className="max-w-sm truncate px-5 py-4 text-slate-600">
                        {orderItemLabel(row.order_item_id)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {String(row.start_date || '—')} –{' '}
                        {String(row.end_date || '—')}
                      </td>
                      <td className="px-5 py-4">{String(row.status || '—')}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="font-semibold text-cyan-800 hover:text-cyan-950"
                        >
                          Sửa
                        </button>
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

      {formOpen && (
        <Modal
          title={editingId === null ? 'Tạo bảo hành' : 'Cập nhật bảo hành'}
          onClose={() => setFormOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="max-h-[78vh] space-y-4 overflow-y-auto p-6"
          >
            <label className="block text-sm font-semibold">
              Chi tiết đơn hàng
              <select
                required
                value={form.orderItemId}
                disabled={editingId !== null}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    orderItemId: Number(event.target.value) || '',
                  }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              >
                <option value="">Chọn sản phẩm trong đơn</option>
                {orderItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Biến thể
              <select
                value={form.productVariantId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    productVariantId: Number(event.target.value) || '',
                  }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              >
                <option value="">Không chọn biến thể</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {String(variant.variant_name || variant.sku || variant.id)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Serial number
              <input
                required
                maxLength={100}
                value={form.serialNumber}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    serialNumber: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Ngày bắt đầu
                <input
                  required
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                />
              </label>
              <label className="block text-sm font-semibold">
                Ngày kết thúc
                <input
                  required
                  type="date"
                  value={form.endDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                />
              </label>
            </div>
            <label className="block text-sm font-semibold">
              Trạng thái
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              >
                <option value="ACTIVE">Đang hiệu lực</option>
                <option value="EXPIRED">Hết hạn</option>
                <option value="CLAIMED">Đã yêu cầu bảo hành</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Ghi chú
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              />
            </label>
            {error && <p className="text-sm text-rose-700">{error}</p>}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}

function Message({
  message,
  type = 'success',
  onClose,
}: {
  message: string;
  type?: 'success' | 'error';
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
