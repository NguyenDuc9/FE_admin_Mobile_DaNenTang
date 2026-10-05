'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createProductVariant,
  deleteProductVariant,
  getProductVariants,
  updateProductVariant,
} from '@/api/productVariantApi';
import type {
  ProductVariant,
  ProductVariantRequest,
} from '@/api/productVariantApi';
import type { Product } from '@/interfaces/product';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import { formatGroupedNumber, formatVnd } from '@/utils/displayFormat';

const pageSize = 15;

const textFields = [
  ['cpu', 'CPU'],
  ['ram', 'RAM'],
  ['storage', 'Lưu trữ'],
  ['gpu', 'GPU'],
  ['screen_size', 'Kích thước màn hình'],
  ['screen_resolution', 'Độ phân giải'],
  ['operating_system', 'Hệ điều hành'],
  ['color', 'Màu sắc'],
] as const;

const numberFields = [
  ['price', 'Giá bán'],
  ['compare_at_price', 'Giá niêm yết'],
  ['stock_quantity', 'Tồn kho'],
  ['refresh_rate', 'Tần số quét'],
  ['weight_kg', 'Khối lượng (kg)'],
  ['warranty_months', 'Bảo hành (tháng)'],
] as const;

type VariantForm = Record<string, string>;

function createEmptyForm(): VariantForm {
  return {
    sku: '',
    variant_name: '',
    price: '',
    compare_at_price: '',
    stock_quantity: '0',
    cpu: '',
    ram: '',
    storage: '',
    gpu: '',
    screen_size: '',
    screen_resolution: '',
    refresh_rate: '',
    operating_system: '',
    color: '',
    weight_kg: '',
    warranty_months: '',
    status: 'ACTIVE',
  };
}

function toForm(variant: ProductVariant): VariantForm {
  return Object.fromEntries(
    Object.entries(variant).map(([key, value]) => [
      key,
      value === null || value === undefined ? '' : String(value),
    ]),
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

export default function ProductVariantsManager({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [form, setForm] = useState<VariantForm>(createEmptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingVariant, setDeletingVariant] =
    useState<ProductVariant | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const totalPages = Math.max(1, Math.ceil(variants.length / pageSize));
  const visibleVariants = variants.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const pagination = {
    page,
    limit: pageSize,
    total: variants.length,
    totalPages,
  };

  async function loadVariants() {
    setError('');
    try {
      const result = await getProductVariants(product.id);
      setVariants(result);
      setPage((currentPage) =>
        Math.min(currentPage, Math.max(1, Math.ceil(result.length / pageSize))),
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getProductVariants(product.id)
      .then((result) => {
        if (active) setVariants(result);
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [product.id]);

  function openCreate() {
    setForm(createEmptyForm());
    setEditingId(null);
    setFormOpen(true);
    setError('');
  }

  function openEdit(variant: ProductVariant) {
    setForm(toForm(variant));
    setEditingId(variant.id);
    setFormOpen(true);
    setError('');
  }

  function updateField(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.sku.trim() || !form.variant_name.trim()) {
      setError('SKU và tên cấu hình là bắt buộc.');
      return;
    }
    setSaving(true);
    setError('');
    const numberValue = (field: string) =>
      form[field] === '' ? null : Number(form[field]);
    const payload = {
      product_id: product.id,
      sku: form.sku.trim(),
      variant_name: form.variant_name.trim(),
      price: numberValue('price'),
      compare_at_price: numberValue('compare_at_price'),
      stock_quantity: Number(form.stock_quantity || 0),
      cpu: form.cpu.trim() || null,
      ram: form.ram.trim() || null,
      storage: form.storage.trim() || null,
      gpu: form.gpu.trim() || null,
      screen_size: form.screen_size.trim() || null,
      screen_resolution: form.screen_resolution.trim() || null,
      refresh_rate: numberValue('refresh_rate'),
      operating_system: form.operating_system.trim() || null,
      color: form.color.trim() || null,
      weight_kg: numberValue('weight_kg'),
      warranty_months: numberValue('warranty_months'),
      status: form.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    } satisfies ProductVariantRequest;

    try {
      if (editingId === null) {
        await createProductVariant(payload);
        setNotice('Đã thêm biến thể sản phẩm.');
      } else {
        await updateProductVariant(editingId, payload);
        setNotice('Đã cập nhật biến thể sản phẩm.');
      }
      setFormOpen(false);
      await loadVariants();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingVariant) return;
    setSaving(true);
    setError('');
    try {
      await deleteProductVariant(deletingVariant.id);
      setDeletingVariant(null);
      setNotice('Đã xóa biến thể sản phẩm.');
      await loadVariants();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal
        title={`Biến thể: ${product.name}`}
        onClose={formOpen ? () => setFormOpen(false) : onClose}
      >
        <div className="max-h-[78vh] space-y-4 overflow-y-auto p-5">
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              {notice}
            </p>
          )}
          {formOpen ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  SKU *
                  <input
                    required
                    maxLength={100}
                    value={form.sku}
                    onChange={(event) => updateField('sku', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Tên cấu hình *
                  <input
                    required
                    maxLength={150}
                    value={form.variant_name}
                    onChange={(event) =>
                      updateField('variant_name', event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                  />
                </label>
                {numberFields.map(([name, label]) => (
                  <label key={name} className="text-sm font-semibold">
                    {label}
                    <input
                      type="number"
                      min={0}
                      step={name === 'weight_kg' ? '0.01' : '1'}
                      value={form[name]}
                      onChange={(event) => updateField(name, event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                    />
                  </label>
                ))}
                {textFields.map(([name, label]) => (
                  <label key={name} className="text-sm font-semibold">
                    {label}
                    <input
                      value={form[name]}
                      onChange={(event) => updateField(name, event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                    />
                  </label>
                ))}
                <label className="text-sm font-semibold">
                  Trạng thái
                  <select
                    value={form.status}
                    onChange={(event) => updateField('status', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="INACTIVE">Ngừng hoạt động</option>
                  </select>
                </label>
              </div>
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
                  {saving ? 'Đang lưu...' : 'Lưu biến thể'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                >
                  + Thêm biến thể
                </button>
              </div>
              {loading ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Đang tải biến thể...
                </p>
              ) : variants.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Sản phẩm chưa có biến thể.
                </p>
              ) : (
                <div className="space-y-3">
                  {visibleVariants.map((variant) => (
                    <article
                      key={variant.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{variant.variant_name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            SKU: {variant.sku}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          variant.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {variant.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                        <span>Giá: {variant.price === null ? '—' : formatVnd(Number(variant.price))}</span>
                        <span>Tồn kho: {formatGroupedNumber(variant.stock_quantity)}</span>
                        <span>CPU: {variant.cpu || '—'}</span>
                        <span>RAM: {variant.ram || '—'}</span>
                        <span>Lưu trữ: {variant.storage || '—'}</span>
                        <span>Màu: {variant.color || '—'}</span>
                      </div>
                      <div className="mt-3 flex justify-end gap-4 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => openEdit(variant)}
                          className="text-sm font-semibold text-cyan-800"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingVariant(variant)}
                          className="text-sm font-semibold text-rose-700"
                        >
                          Xóa
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {!loading && variants.length > 0 && (
                <Pagination pagination={pagination} onPageChange={setPage} />
              )}
            </>
          )}
        </div>
      </Modal>
      {deletingVariant && (
        <Modal
          title="Xác nhận xóa biến thể"
          onClose={() => setDeletingVariant(null)}
        >
          <div className="space-y-4 p-6">
            <p className="text-sm text-slate-600">
              Bạn có chắc muốn xóa biến thể <strong>{deletingVariant.variant_name}</strong> không?
            </p>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingVariant(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDelete()}
                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
