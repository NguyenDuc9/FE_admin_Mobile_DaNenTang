'use client';

import { useEffect, useState } from 'react';
import { changeInventory } from '@/api/inventoryAdminApi';
import { getResourceList, getResourcePage } from '@/api/adminResourceApi';
import type { ResourceRow } from '@/interfaces/adminResources';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import AdminSearch, { matchesSearch } from '@/components/AdminSearch';
import { formatDateTime, formatGroupedNumber } from '@/utils/displayFormat';

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Không thể hoàn tất thao tác tồn kho.';
}

export default function InventoryPage() {
  const [transactions, setTransactions] = useState<ResourceRow[]>([]);
  const [variants, setVariants] = useState<ResourceRow[]>([]);
  const [variantId, setVariantId] = useState('');
  const [type, setType] = useState<'IMPORT' | 'ADJUSTMENT'>('IMPORT');
  const [quantity, setQuantity] = useState(1);
  const [direction, setDirection] = useState<'increase' | 'decrease'>(
    'increase',
  );
  const [note, setNote] = useState('');
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
  const [search, setSearch] = useState('');
  const visibleTransactions = transactions.filter((transaction) =>
    matchesSearch(
      [
        transaction.id,
        transaction.variant_name,
        transaction.sku,
        transaction.type,
        transaction.quantity,
        transaction.note,
        transaction.created_at,
      ],
      search,
    ),
  );
  const visiblePagination = search
    ? {
        ...pagination,
        page: 1,
        total: visibleTransactions.length,
        totalPages: 1,
      }
    : pagination;

  async function loadData(targetPage = page) {
    setLoading(true);
    setError('');
    try {
      const [transactionPage, variantRows] = await Promise.all([
        getResourcePage('/api/inventory/transactions', targetPage),
        getResourceList('/api/product-variants'),
      ]);
      if (
        targetPage > 1 &&
        targetPage > transactionPage.pagination.totalPages
      ) {
        setPage(transactionPage.pagination.totalPages);
        return;
      }
      setTransactions(transactionPage.rows);
      setPagination(transactionPage.pagination);
      setVariants(variantRows);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      getResourcePage('/api/inventory/transactions', page),
      getResourceList('/api/product-variants'),
    ])
      .then(([transactionPage, variantRows]) => {
        if (!active) return;
        if (page > 1 && page > transactionPage.pagination.totalPages) {
          setPage(transactionPage.pagination.totalPages);
          return;
        }
        setTransactions(transactionPage.rows);
        setPagination(transactionPage.pagination);
        setVariants(variantRows);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await changeInventory({
        productVariantId: Number(variantId),
        quantity,
        type,
        ...(type === 'ADJUSTMENT'
          ? { delta: direction === 'increase' ? quantity : -quantity }
          : {}),
        note: note.trim(),
      });
      setFormOpen(false);
      setVariantId('');
      setQuantity(1);
      setNote('');
      setNotice(type === 'IMPORT' ? 'Đã nhập kho.' : 'Đã điều chỉnh tồn kho.');
      await loadData();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f7fb] px-5 py-8 text-slate-900 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-slate-500">Quản trị kho</p>
            <h1 className="mt-1 text-2xl font-bold">Lịch sử tồn kho</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setError('');
              setFormOpen(true);
            }}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
          >
            + Nhập / điều chỉnh
          </button>
        </div>

        {notice && <Message message={notice} onClose={() => setNotice('')} />}
        {error && !formOpen && (
          <Message type="error" message={error} onClose={() => setError('')} />
        )}

        <AdminSearch
          value={search}
          onChange={setSearch}
          placeholder="Tìm giao dịch theo SKU, biến thể, loại..."
        />

        <Pagination
          pagination={visiblePagination}
          onPageChange={setPage}
        />
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">
              Đang tải giao dịch...
            </p>
          ) : visibleTransactions.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">
              {search ? 'Không tìm thấy giao dịch phù hợp.' : 'Chưa có giao dịch kho.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Thời gian</th>
                    <th className="px-5 py-3 font-semibold">Biến thể</th>
                    <th className="px-5 py-3 font-semibold">Loại</th>
                    <th className="px-5 py-3 text-right font-semibold">Thay đổi</th>
                    <th className="px-5 py-3 font-semibold">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {formatDateTime(transaction.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        {String(
                          transaction.variant_name || transaction.sku || '—',
                        )}
                        {transaction.sku && (
                          <span className="ml-2 text-xs text-slate-500">
                            {String(transaction.sku)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {String(transaction.type || '—')}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">
                        {formatGroupedNumber(
                          transaction.quantity === null
                            ? null
                            : String(transaction.quantity),
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {String(transaction.note || '—')}
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

      {formOpen && (
        <Modal
          title="Nhập / điều chỉnh tồn kho"
          onClose={() => setFormOpen(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <label className="block text-sm font-semibold">
              Biến thể sản phẩm
              <select
                required
                value={variantId}
                onChange={(event) => setVariantId(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              >
                <option value="">Chọn biến thể</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {String(variant.variant_name || variant.sku || variant.id)}
                    {variant.sku ? ` · ${String(variant.sku)}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Thao tác
              <select
                value={type}
                onChange={(event) => setType(event.target.value as typeof type)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              >
                <option value="IMPORT">Nhập kho</option>
                <option value="ADJUSTMENT">Điều chỉnh</option>
              </select>
            </label>
            {type === 'ADJUSTMENT' && (
              <fieldset className="flex gap-5 text-sm">
                <legend className="mb-2 font-semibold">Hướng điều chỉnh</legend>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={direction === 'increase'}
                    onChange={() => setDirection('increase')}
                  />
                  Tăng
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={direction === 'decrease'}
                    onChange={() => setDirection('decrease')}
                  />
                  Giảm
                </label>
              </fieldset>
            )}
            <label className="block text-sm font-semibold">
              Số lượng
              <input
                required
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Ghi chú
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
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
                {saving ? 'Đang lưu...' : 'Lưu giao dịch'}
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
