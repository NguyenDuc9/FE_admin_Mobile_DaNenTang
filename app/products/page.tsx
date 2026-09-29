'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from '@/api/productApi';
import Modal from '@/components/Modal';
import type { Product, ProductRequest } from '@/interfaces/product';

const emptyForm: ProductRequest = {
  name: '',
  categoryId: 0,
  brandId: 0,
  price: 0,
  stock: 0,
  description: '',
  specifications: '',
  imageUrl: '',
  isActive: true,
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

function isActive(product: Product) {
  return product.isActive === true || product.isActive === 1;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductRequest>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadProducts() {
    setLoading(true);
    setError('');
    try {
      setProducts(await getProducts());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getProducts()
      .then((data) => {
        if (active) setProducts(data);
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

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(true);
    setError('');
  }

  function openEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      categoryId: product.categoryId,
      brandId: product.brandId,
      price: Number(product.price),
      stock: product.stock,
      description: product.description || '',
      specifications: product.specifications || '',
      imageUrl: product.imageUrl || '',
      isActive: isActive(product),
    });
    setFormOpen(true);
    setError('');
  }

  function updateField<K extends keyof ProductRequest>(
    field: K,
    value: ProductRequest[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || form.categoryId <= 0 || form.brandId <= 0) {
      setError('Tên sản phẩm, danh mục và thương hiệu là bắt buộc.');
      return;
    }
    if (form.price < 0 || form.stock < 0) {
      setError('Giá và tồn kho không được nhỏ hơn 0.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = { ...form, name: form.name.trim() };
      if (editingId === null) {
        await createProduct(payload);
        setNotice('Đã thêm sản phẩm thành công.');
      } else {
        await updateProduct(editingId, payload);
        setNotice('Đã cập nhật sản phẩm thành công.');
      }
      closeForm();
      await loadProducts();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingProduct) return;
    setSaving(true);
    try {
      await deleteProduct(deletingProduct.id);
      setDeletingProduct(null);
      setNotice('Đã xóa sản phẩm.');
      await loadProducts();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f4f7fb] text-slate-900">
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-slate-500">Kho hàng</p>
            <h2 className="mt-1 text-xl font-bold">Danh sách sản phẩm</h2>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-800"
          >
            + Thêm sản phẩm
          </button>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Tổng sản phẩm" value={products.length} />
          <Stat
            label="Đang hoạt động"
            value={products.filter(isActive).length}
            tone="text-emerald-600"
          />
          <Stat
            label="Tổng tồn kho"
            value={products.reduce(
              (sum, product) => sum + Number(product.stock) || 0,
              0,
            )}
            tone="text-cyan-700"
          />
        </div>
        {notice && (
          <Alert
            message={notice}
            type="success"
            onClose={() => setNotice('')}
          />
        )}
        {error && (
          <Alert message={error} type="error" onClose={() => setError('')} />
        )}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="px-5 py-16 text-center text-sm text-slate-500">
              Đang tải danh sách...
            </div>
          ) : products.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="font-bold">Chưa có sản phẩm nào</p>
              <p className="mt-1 text-sm text-slate-500">
                Tạo sản phẩm đầu tiên để bắt đầu.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Sản phẩm</th>
                    <th className="px-5 py-3 font-semibold">
                      Danh mục / thương hiệu
                    </th>
                    <th className="px-5 py-3 font-semibold">Giá</th>
                    <th className="px-5 py-3 font-semibold">Tồn kho</th>
                    <th className="px-5 py-3 font-semibold">Trạng thái</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt=""
                              className="h-11 w-11 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-50 font-bold text-cyan-700">
                              {product.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold">{product.name}</p>
                            <p className="max-w-xs truncate text-xs text-slate-500">
                              {product.description || 'Chưa có mô tả'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        #{product.categoryId} / #{product.brandId}
                      </td>
                      <td className="px-5 py-4 font-semibold">
                        {Number(product.price).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-5 py-4">{product.stock}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${isActive(product) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {isActive(product)
                            ? 'Đang hoạt động'
                            : 'Không hoạt động'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          className="mr-3 font-semibold text-cyan-700 hover:text-cyan-900"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProduct(product)}
                          className="font-semibold text-rose-600 hover:text-rose-800"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      {formOpen && (
        <Modal
          title={editingId === null ? 'Thêm sản phẩm' : 'Chỉnh sửa sản phẩm'}
          onClose={closeForm}
        >
          <ProductForm
            form={form}
            saving={saving}
            onChange={updateField}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </Modal>
      )}
      {deletingProduct && (
        <Modal title="Xác nhận xóa" onClose={() => setDeletingProduct(null)}>
          <div className="p-6">
            <p className="text-sm text-slate-600">
              Bạn có chắc muốn xóa sản phẩm{' '}
              <strong>{deletingProduct.name}</strong> không?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDelete()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? 'Đang xóa...' : 'Xóa sản phẩm'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'text-slate-900',
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${tone}`}>
        {value.toLocaleString('vi-VN')}
      </p>
    </div>
  );
}

function Alert({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  return (
    <div
      className={`mb-5 flex justify-between rounded-xl border px-4 py-3 text-sm ${type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
    >
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Đóng thông báo">
        &times;
      </button>
    </div>
  );
}

interface ProductFormProps {
  form: ProductRequest;
  saving: boolean;
  onChange: <K extends keyof ProductRequest>(
    field: K,
    value: ProductRequest[K],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

function ProductForm({
  form,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="max-h-[80vh] space-y-4 overflow-y-auto p-6"
    >
      <div>
        <label
          htmlFor="product-name"
          className="mb-1.5 block text-sm font-semibold"
        >
          Tên sản phẩm <span className="text-rose-500">*</span>
        </label>
        <input
          id="product-name"
          required
          value={form.name}
          onChange={(event) => onChange('name', event.target.value)}
          maxLength={255}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          id="category-id"
          label="ID danh mục"
          value={form.categoryId}
          onChange={(value) => onChange('categoryId', value)}
          required
        />
        <NumberField
          id="brand-id"
          label="ID thương hiệu"
          value={form.brandId}
          onChange={(value) => onChange('brandId', value)}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          id="price"
          label="Giá"
          value={form.price}
          onChange={(value) => onChange('price', value)}
          step="0.01"
          required
        />
        <NumberField
          id="stock"
          label="Tồn kho"
          value={form.stock}
          onChange={(value) => onChange('stock', value)}
          required
        />
      </div>
      <div>
        <label
          htmlFor="product-description"
          className="mb-1.5 block text-sm font-semibold"
        >
          Mô tả
        </label>
        <textarea
          id="product-description"
          rows={3}
          value={form.description}
          onChange={(event) => onChange('description', event.target.value)}
          className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
      </div>
      <div>
        <label
          htmlFor="specifications"
          className="mb-1.5 block text-sm font-semibold"
        >
          Thông số kỹ thuật
        </label>
        <textarea
          id="specifications"
          rows={3}
          value={form.specifications}
          onChange={(event) => onChange('specifications', event.target.value)}
          className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
      </div>
      <div>
        <label
          htmlFor="product-image"
          className="mb-1.5 block text-sm font-semibold"
        >
          URL hình ảnh
        </label>
        <input
          id="product-image"
          type="url"
          value={form.imageUrl}
          onChange={(event) => onChange('imageUrl', event.target.value)}
          maxLength={255}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => onChange('isActive', event.target.checked)}
          className="h-4 w-4 accent-cyan-700"
        />{' '}
        Đang hoạt động
      </label>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
        </button>
      </div>
    </form>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  step = '1',
  required = false,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        id={id}
        type="number"
        min="0"
        step={step}
        required={required}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
      />
    </div>
  );
}
