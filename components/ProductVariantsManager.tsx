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

function getDiscountPercentage(
  price: number | null,
  compareAtPrice: number | null,
) {
  if (price === null || compareAtPrice === null || compareAtPrice <= price) {
    return null;
  }
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
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
                <div className="grid gap-4 md:grid-cols-2">
                  {visibleVariants.map((variant) => (
                    <article
                      key={variant.id}
                      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-slate-900">
                            {variant.variant_name}
                          </h3>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            SKU: {variant.sku}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                            variant.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {variant.status === 'ACTIVE'
                            ? 'Đang hoạt động'
                            : 'Ngừng hoạt động'}
                        </span>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Giá bán
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-xl font-black text-cyan-800">
                            {variant.price === null
                              ? 'Chưa thiết lập'
                              : formatVnd(variant.price)}
                          </span>
                          {variant.price !== null &&
                          variant.compare_at_price !== null &&
                          variant.compare_at_price > variant.price ? (
                            <>
                              <span className="text-sm text-slate-400 line-through">
                                {formatVnd(variant.compare_at_price)}
                              </span>
                              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                                -{getDiscountPercentage(
                                  variant.price,
                                  variant.compare_at_price,
                                )}%
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg border border-slate-100 px-3 py-2">
                          <p className="text-xs text-slate-500">Tồn kho</p>
                          <p className="mt-0.5 font-bold text-slate-800">
                            {formatGroupedNumber(variant.stock_quantity)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-100 px-3 py-2">
                          <p className="text-xs text-slate-500">Cấu hình</p>
                          <p className="mt-0.5 truncate font-medium text-slate-800">
                            {[variant.cpu, variant.ram, variant.storage]
                              .filter(Boolean)
                              .join(' · ') || 'Chưa cập nhật'}
                          </p>
                        </div>
                        <div className="col-span-2 flex flex-wrap gap-2">
                          {variant.gpu && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                              GPU: {variant.gpu}
                            </span>
                          )}
                          {variant.color && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                              Màu: {variant.color}
                            </span>
                          )}
                          {variant.screen_size && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                              Màn hình: {variant.screen_size}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-auto flex justify-end gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => openEdit(variant)}
                          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-cyan-800 hover:bg-cyan-50"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingVariant(variant)}
                          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
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
