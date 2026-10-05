'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '@/api/categoryApi';
import Modal from '@/components/Modal';
import ImageUpload from '@/components/ImageUpload';
import Pagination from '@/components/Pagination';
import { resolveImageUrl } from '@/api/api';
import AdminSearch, { matchesSearch } from '@/components/AdminSearch';
import type {
  Category,
  CategoryRequest,
  CategoryStatus,
} from '@/interfaces/category';

const emptyForm: CategoryRequest = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  status: 'ACTIVE',
};
const pageSize = 15;

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryRequest>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const filteredCategories = categories.filter((category) =>
    matchesSearch(
      [
        category.id,
        category.name,
        category.slug,
        category.description,
        category.status,
      ],
      search,
    ),
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / pageSize),
  );
  const visibleCategories = filteredCategories.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const pagination = {
    page,
    limit: pageSize,
    total: filteredCategories.length,
    totalPages,
  };

  async function loadCategories() {
    setLoading(true);
    setError('');
    try {
      const result = await getCategories();
      setCategories(result);
      const filteredCount = result.filter((category) =>
        matchesSearch(
          [
            category.id,
            category.name,
            category.slug,
            category.description,
            category.status,
          ],
          search,
        ),
      ).length;
      setPage(
        (currentPage) =>
          Math.min(
            currentPage,
            Math.max(1, Math.ceil(filteredCount / pageSize)),
          ),
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getCategories()
      .then((data) => {
        if (active) setCategories(data);
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

  function openEdit(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      imageUrl: category.image_url || '',
      status: category.status,
    });
    setFormOpen(true);
    setError('');
  }

  function updateField(field: keyof CategoryRequest, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadingImage) return;
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Tên danh mục và slug là bắt buộc.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        slug: form.slug.trim(),
      };
      if (editingId === null) {
        await createCategory(payload);
        setNotice('Đã thêm danh mục thành công.');
      } else {
        await updateCategory(editingId, payload);
        setNotice('Đã cập nhật danh mục thành công.');
      }
      closeForm();
      await loadCategories();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingCategory) return;
    setSaving(true);
    try {
      await deleteCategory(deletingCategory.id);
      setDeletingCategory(null);
      setNotice('Đã xóa danh mục.');
      await loadCategories();
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
            <p className="text-sm text-slate-500">Danh mục sản phẩm</p>
            <h2 className="mt-1 text-xl font-bold">Danh sách danh mục</h2>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-800"
          >
            + Thêm danh mục
          </button>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Tổng danh mục" value={categories.length} />
          <Stat
            label="Đang hoạt động"
            value={
              categories.filter((category) => category.status === 'ACTIVE')
                .length
            }
            tone="text-emerald-600"
          />
          <Stat
            label="Không hoạt động"
            value={
              categories.filter((category) => category.status === 'INACTIVE')
                .length
            }
            tone="text-slate-500"
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
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Tìm danh mục theo tên, slug hoặc mô tả..."
        />
        <Pagination pagination={pagination} onPageChange={setPage} />
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="px-5 py-16 text-center text-sm text-slate-500">
              Đang tải danh sách...
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="font-bold">
                {search ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có danh mục nào'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Tạo danh mục đầu tiên để bắt đầu.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Danh mục</th>
                    <th className="px-5 py-3 font-semibold">Slug</th>
                    <th className="px-5 py-3 font-semibold">Trạng thái</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {category.image_url ? (
                            <img
                              src={resolveImageUrl(category.image_url)}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 font-bold text-cyan-700">
                              {category.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold">{category.name}</p>
                            <p className="max-w-sm truncate text-xs text-slate-500">
                              {category.description || 'Chưa có mô tả'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">
                        {category.slug}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${category.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {category.status === 'ACTIVE'
                            ? 'Đang hoạt động'
                            : 'Không hoạt động'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          className="mr-3 font-semibold text-cyan-700 hover:text-cyan-900"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCategory(category)}
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
        <Pagination pagination={pagination} onPageChange={setPage} />
      </main>
      {formOpen && (
        <Modal
          title={editingId === null ? 'Thêm danh mục' : 'Chỉnh sửa danh mục'}
          onClose={closeForm}
        >
          <CategoryForm
            form={form}
            saving={saving}
            uploadingImage={uploadingImage}
            onChange={updateField}
            onUploadError={setError}
            onUploadingChange={setUploadingImage}
            onSubmit={handleSubmit}
            onCancel={closeForm}
          />
        </Modal>
      )}
      {deletingCategory && (
        <Modal title="Xác nhận xóa" onClose={() => setDeletingCategory(null)}>
          <div className="p-6">
            <p className="text-sm text-slate-600">
              Bạn có chắc muốn xóa danh mục{' '}
              <strong>{deletingCategory.name}</strong> không?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
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
                {saving ? 'Đang xóa...' : 'Xóa danh mục'}
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
      <p className={`mt-2 text-3xl font-black ${tone}`}>{value}</p>
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

interface CategoryFormProps {
  form: CategoryRequest;
  saving: boolean;
  uploadingImage: boolean;
  onChange: (field: keyof CategoryRequest, value: string) => void;
  onUploadError: (message: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

function CategoryForm({
  form,
  saving,
  uploadingImage,
  onChange,
  onUploadError,
  onUploadingChange,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 p-6">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">
          Tên danh mục <span className="text-rose-500">*</span>
        </label>
        <input
          id="name"
          value={form.name}
          onChange={(event) => onChange('name', event.target.value)}
          maxLength={100}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
      </div>
      <div>
        <label htmlFor="slug" className="mb-1.5 block text-sm font-semibold">
          Slug <span className="text-rose-500">*</span>
        </label>
        <input
          id="slug"
          value={form.slug}
          onChange={(event) => onChange('slug', event.target.value)}
          maxLength={120}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
      </div>
      <div>
        <label
          htmlFor="description"
          className="mb-1.5 block text-sm font-semibold"
        >
          Mô tả
        </label>
        <textarea
          id="description"
          rows={3}
          value={form.description}
          onChange={(event) => onChange('description', event.target.value)}
          className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        />
      </div>
      <ImageUpload
        label="Ảnh danh mục"
        value={form.imageUrl}
        onChange={(url) => onChange('imageUrl', url)}
        onError={onUploadError}
        onUploadingChange={onUploadingChange}
      />
      <div>
        <label htmlFor="status" className="mb-1.5 block text-sm font-semibold">
          Trạng thái
        </label>
        <select
          id="status"
          value={form.status}
          onChange={(event) =>
            onChange('status', event.target.value as CategoryStatus)
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="INACTIVE">Không hoạt động</option>
        </select>
      </div>
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
          disabled={saving || uploadingImage}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving
            ? 'Đang lưu...'
            : uploadingImage
              ? 'Đang tải ảnh...'
              : 'Lưu danh mục'}
        </button>
      </div>
    </form>
  );
}
