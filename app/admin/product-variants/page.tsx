'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createProductVariant,
  deleteProductVariant,
  getAllProductVariants,
  updateProductVariant,
} from '@/api/productVariantApi';
import type {
  ProductVariant,
  ProductVariantRequest,
} from '@/api/productVariantApi';
import { getProducts } from '@/api/productApi';
import type { Product } from '@/interfaces/product';
import Modal from '@/components/Modal';
import AdminSearch, { matchesSearch } from '@/components/AdminSearch';
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

function emptyForm(): VariantForm {
  return {
    product_id: '',
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

function variantForm(variant: ProductVariant): VariantForm {
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
    : 'Không thể hoàn tất thao tác biến thể.';
}

function getDiscountPercentage(variant: ProductVariant) {
  if (
    variant.price === null ||
    variant.compare_at_price === null ||
    variant.compare_at_price <= variant.price
  ) {
    return null;
  }
  return Math.round(
    ((variant.compare_at_price - variant.price) / variant.compare_at_price) *
      100,
  );
}

export default function ProductVariantsPage() {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<VariantForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingVariant, setDeletingVariant] =
    useState<ProductVariant | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filteredVariants = variants.filter((variant) => {
    const product = products.find((item) => item.id === variant.product_id);
    return matchesSearch(
      [
        variant.id,
        variant.sku,
        variant.variant_name,
        variant.cpu,
        variant.ram,
        variant.storage,
        variant.gpu,
        variant.status,
        product?.name,
      ],
      search,
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredVariants.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleVariants = filteredVariants.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pagination = {
    page: currentPage,
    limit: pageSize,
    total: filteredVariants.length,
    totalPages,
  };

  async function loadData() {
    setError('');
    try {
      const [variantRows, productRows] = await Promise.all([
        getAllProductVariants(),
        getProducts(),
      ]);
      setVariants(variantRows);
      setProducts(productRows);
      setPage((current) =>
        Math.min(current, Math.max(1, Math.ceil(variantRows.length / pageSize))),
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([getAllProductVariants(), getProducts()])
      .then(([variantRows, productRows]) => {
        if (!active) return;
        setVariants(variantRows);
        setProducts(productRows);
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
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setEditingId(null);
    setError('');
    setFormOpen(true);
  }

  function openEdit(variant: ProductVariant) {
    setForm(variantForm(variant));
    setEditingId(variant.id);
    setError('');
    setFormOpen(true);
  }

  function updateField(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.product_id || !form.sku.trim() || !form.variant_name.trim()) {
      setError('Sản phẩm, SKU và tên biến thể là bắt buộc.');
      return;
    }

    const numberValue = (field: string) =>
      form[field] === '' ? null : Number(form[field]);
    const payload = {
      product_id: Number(form.product_id),
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

    setSaving(true);
    setError('');
    try {
      if (editingId === null) {
        await createProductVariant(payload);
        setNotice('Đã thêm biến thể sản phẩm.');
      } else {
        await updateProductVariant(editingId, payload);
        setNotice('Đã cập nhật biến thể sản phẩm.');
      }
      setFormOpen(false);
      if (editingId === null) setPage(1);
      await loadData();
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
      await loadData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f4f7fb] px-5 py-8 text-slate-900 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-cyan-800">
              Quản trị sản phẩm
            </p>
            <h1 className="mt-1 text-2xl font-bold">Biến thể sản phẩm</h1>
            <p className="mt-1 text-sm text-slate-600">
              Quản lý trực tiếp mọi biến thể và gán chúng cho sản phẩm.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-800"
          >
            + Thêm biến thể
          </button>
        </header>

        {notice && (
          <p
            role="status"
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {notice}
          </p>
        )}
        {error && !formOpen && !deletingVariant && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <AdminSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Tìm theo sản phẩm, SKU, tên biến thể, cấu hình..."
          />
          <p className="-mt-3 text-sm text-slate-500 sm:mt-0">
            {filteredVariants.length} biến thể
          </p>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Pagination pagination={pagination} onPageChange={setPage} />
          {loading ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">
              Đang tải biến thể...
            </p>
          ) : visibleVariants.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">
              {search
                ? 'Không tìm thấy biến thể phù hợp.'
                : 'Chưa có biến thể sản phẩm.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                    <th className="px-4 py-3 font-semibold">Biến thể / SKU</th>
                    <th className="px-4 py-3 font-semibold">Cấu hình</th>
                    <th className="px-4 py-3 text-right font-semibold">Giá</th>
                    <th className="px-4 py-3 text-right font-semibold">Tồn</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleVariants.map((variant) => {
                    const product = products.find(
                      (item) => item.id === variant.product_id,
                    );
                    const discount = getDiscountPercentage(variant);
                    return (
                      <tr key={variant.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {product?.name || `Sản phẩm #${variant.product_id}`}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            {variant.variant_name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {variant.sku}
                          </p>
                        </td>
                        <td className="max-w-xs px-4 py-3 text-xs text-slate-600">
                          {[
                            variant.cpu,
                            variant.ram,
                            variant.storage,
                            variant.gpu,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-semibold text-slate-800">
                            {variant.price === null
                              ? '—'
                              : formatVnd(variant.price)}
                          </p>
                          {discount !== null &&
                          variant.compare_at_price !== null ? (
                            <p className="mt-0.5 text-xs text-slate-500">
                              <span className="line-through">
                                {formatVnd(variant.compare_at_price)}
                              </span>{' '}
                              <span className="font-bold text-rose-700">
                                -{discount}%
                              </span>
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatGroupedNumber(variant.stock_quantity)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              variant.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {variant.status === 'ACTIVE'
                              ? 'Hoạt động'
                              : 'Ngừng hoạt động'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(variant)}
                            className="mr-3 font-semibold text-cyan-800 hover:text-cyan-950"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingVariant(variant)}
                            className="font-semibold text-rose-700 hover:text-rose-900"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination pagination={pagination} onPageChange={setPage} />
        </section>
      </div>

      {formOpen && (
        <Modal
          title={editingId === null ? 'Thêm biến thể' : 'Sửa biến thể'}
          onClose={() => setFormOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="max-h-[78vh] space-y-4 overflow-y-auto p-6"
          >
            <label className="block text-sm font-semibold">
              Sản phẩm *
              <select
                required
                value={form.product_id}
                onChange={(event) => updateField('product_id', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
              >
                <option value="">Chọn sản phẩm</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                SKU *
                <input
                  required
                  maxLength={100}
                  value={form.sku}
                  onChange={(event) => updateField('sku', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                />
              </label>
              <label className="text-sm font-semibold">
                Tên biến thể *
                <input
                  required
                  maxLength={150}
                  value={form.variant_name}
                  onChange={(event) =>
                    updateField('variant_name', event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
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
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                  />
                </label>
              ))}
              {textFields.map(([name, label]) => (
                <label key={name} className="text-sm font-semibold">
                  {label}
                  <input
                    value={form[name]}
                    onChange={(event) => updateField(name, event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                  />
                </label>
              ))}
              <label className="text-sm font-semibold">
                Trạng thái
                <select
                  value={form.status}
                  onChange={(event) => updateField('status', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                >
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
              </label>
            </div>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
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
        </Modal>
      )}

      {deletingVariant && (
        <Modal
          title="Xác nhận xóa biến thể"
          onClose={() => setDeletingVariant(null)}
        >
          <div className="space-y-4 p-6">
            <p className="text-sm text-slate-600">
              Bạn có chắc muốn xóa biến thể{' '}
              <strong>{deletingVariant.variant_name}</strong> không?
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
                {saving ? 'Đang xóa...' : 'Xóa biến thể'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
