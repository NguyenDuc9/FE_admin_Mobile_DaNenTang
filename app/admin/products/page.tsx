'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from '@/api/productApi';
import { getResourceList } from '@/api/adminResourceApi';
import Modal from '@/components/Modal';
import Pagination from '@/components/Pagination';
import ImageUpload from '@/components/ImageUpload';
import ProductVariantsManager from '@/components/ProductVariantsManager';
import { resolveImageUrl } from '@/api/api';
import AdminSearch, { matchesSearch } from '@/components/AdminSearch';
import { formatGroupedNumber } from '@/utils/displayFormat';
import {
  createProductImage,
  deleteProductImage,
  getProductImages,
  updateProductImage,
} from '@/api/productImageApi';
import type { ProductImage } from '@/api/productImageApi';
import type { ResourceRow } from '@/interfaces/adminResources';
import type { Product, ProductRequest } from '@/interfaces/product';

const emptyForm: ProductRequest = {
  name: '',
  categoryId: 0,
  brandId: 0,
  slug: '',
  description: '',
  thumbnailUrl: '',
  status: 'DRAFT',
};

const productStatusLabels: Record<string, string> = {
  DRAFT: 'Bản nháp',
  ACTIVE: 'Đang bán',
  INACTIVE: 'Ngừng bán',
};
const pageSize = 15;

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

function matchesProductSearch(product: Product, search: string) {
  return matchesSearch(
    [
      product.id,
      product.name,
      product.slug,
      product.description,
      product.category_name,
      product.brand_name,
      product.status,
    ],
    search,
  );
}

async function fetchPrimaryProductImages() {
  const images = await getResourceList('/api/product-images');
  const primaryImages: Record<number, string> = {};
  for (const image of images) {
    if (
      (image.is_primary === true || image.is_primary === 1) &&
      typeof image.product_id === 'number' &&
      typeof image.image_url === 'string'
    ) {
      primaryImages[image.product_id] = image.image_url;
    }
  }
  return primaryImages;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [primaryImages, setPrimaryImages] = useState<Record<number, string>>(
    {},
  );
  const [categories, setCategories] = useState<ResourceRow[]>([]);
  const [brands, setBrands] = useState<ResourceRow[]>([]);
  const [form, setForm] = useState<ProductRequest>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [imagesProduct, setImagesProduct] = useState<Product | null>(null);
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const filteredProducts = products.filter((product) =>
    matchesProductSearch(product, search) &&
    (categoryFilter === '' ||
      product.category_id === Number(categoryFilter)) &&
    (brandFilter === '' || product.brand_id === Number(brandFilter)),
  );
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const visiblePagination = {
    page,
    limit: pageSize,
    total: filteredProducts.length,
    totalPages,
  };

  async function loadProducts(targetPage = page) {
    setLoading(true);
    setError('');
    try {
      const result = await getProducts();
      setProducts(result);
      const filteredCount = result.filter((product) =>
        matchesProductSearch(product, search) &&
        (categoryFilter === '' ||
          product.category_id === Number(categoryFilter)) &&
        (brandFilter === '' || product.brand_id === Number(brandFilter)),
      ).length;
      setPage(
        Math.min(
          targetPage,
          Math.max(1, Math.ceil(filteredCount / pageSize)),
        ),
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadPrimaryImages() {
    setPrimaryImages(await fetchPrimaryProductImages());
  }

  useEffect(() => {
    let active = true;
    getProducts()
      .then((result) => {
        if (!active) return;
        setProducts(result);
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

  useEffect(() => {
    let active = true;
    fetchPrimaryProductImages()
      .then((images) => {
        if (!active) return;
        setPrimaryImages(images);
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      getResourceList('/api/categories'),
      getResourceList('/api/brands'),
    ])
      .then(([categoryData, brandData]) => {
        if (active) {
          setCategories(categoryData);
          setBrands(brandData);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError));
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
      categoryId: product.category_id,
      brandId: product.brand_id,
      slug: product.slug,
      description: product.description || '',
      thumbnailUrl: product.thumbnail_url || '',
      status: product.status,
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
    if (uploadingImage) {
      setError('Vui lòng đợi ảnh tải lên hoàn tất.');
      return;
    }
    if (
      !form.name.trim() ||
      !form.slug.trim() ||
      form.categoryId <= 0 ||
      form.brandId <= 0
    ) {
      setError('Tên, slug, danh mục và thương hiệu là bắt buộc.');
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
      const targetPage = editingId === null ? 1 : page;
      if (targetPage !== page) setPage(targetPage);
      await loadProducts(targetPage);
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <AdminSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Tìm sản phẩm theo tên, slug, danh mục..."
          />
          <label className="mb-4 block">
            <span className="sr-only">Lọc sản phẩm theo danh mục</span>
            <select
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100 sm:min-w-56"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {String(category.name || `Danh mục ${category.id}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="mb-4 block">
            <span className="sr-only">Lọc sản phẩm theo thương hiệu</span>
            <select
              value={brandFilter}
              onChange={(event) => {
                setBrandFilter(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100 sm:min-w-56"
            >
              <option value="">Tất cả thương hiệu</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {String(brand.name || `Thương hiệu ${brand.id}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Pagination
          pagination={visiblePagination}
          onPageChange={setPage}
        />
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="px-5 py-16 text-center text-sm text-slate-500">
              Đang tải danh sách...
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="font-bold">
                {search || categoryFilter || brandFilter
                  ? 'Không tìm thấy sản phẩm phù hợp'
                  : 'Chưa có sản phẩm nào'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Tạo sản phẩm đầu tiên để bắt đầu.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Sản phẩm</th>
                    <th className="px-5 py-3 font-semibold">
                      Danh mục / thương hiệu
                    </th>
                    <th className="px-5 py-3 font-semibold">Slug</th>
                    <th className="px-5 py-3 font-semibold">Trạng thái</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {(primaryImages[product.id] || product.thumbnail_url) ? (
                            <img
                              src={resolveImageUrl(
                                primaryImages[product.id] ||
                                  product.thumbnail_url ||
                                  '',
                              )}
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
                        {product.category_name} / {product.brand_name}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">
                        {product.slug}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${product.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {productStatusLabels[product.status] ||
                            'Trạng thái khác'}
                        </span>
                      </td>
                      <td className="w-36 px-3 py-4">
                        <div className="ml-auto grid max-w-32 grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => setVariantsProduct(product)}
                            className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            Biến thể
                          </button>
                          <button
                            type="button"
                            onClick={() => setImagesProduct(product)}
                            aria-label="Quản lý ảnh sản phẩm"
                            title="Ảnh sản phẩm"
                            className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            Ảnh
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="rounded-md bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingProduct(product)}
                            className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                          >
                            Xóa
                          </button>
                        </div>
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
      </main>
      {formOpen && (
        <Modal
          title={editingId === null ? 'Thêm sản phẩm' : 'Chỉnh sửa sản phẩm'}
          onClose={closeForm}
        >
          <ProductForm
            form={form}
            categories={categories}
            brands={brands}
            saving={saving}
            uploadingImage={uploadingImage}
            onUploadingChange={setUploadingImage}
            onUploadError={setError}
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
      {imagesProduct && (
        <ProductImagesManager
          key={imagesProduct.id}
          product={imagesProduct}
          onClose={() => {
            setImagesProduct(null);
            void loadPrimaryImages().catch((loadError: unknown) =>
              setError(getErrorMessage(loadError)),
            );
          }}
        />
      )}
      {variantsProduct && (
        <ProductVariantsManager
          key={variantsProduct.id}
          product={variantsProduct}
          onClose={() => setVariantsProduct(null)}
        />
      )}
    </div>
  );
}

function ProductImagesManager({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState<number | ''>('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadImages() {
    setLoading(true);
    try {
      setImages(await getProductImages(product.id));
      setError('');
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getProductImages(product.id)
      .then((productImages) => {
        if (active) {
          setImages(productImages);
          setError('');
        }
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

  async function addImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!imageUrl) {
      setError('Vui lòng tải ảnh lên trước khi thêm.');
      return;
    }
    const nextAvailableOrder = new Set(
      images.map((image) => image.sort_order),
    );
    let defaultOrder = 1;
    while (nextAvailableOrder.has(defaultOrder)) defaultOrder += 1;
    setSaving(true);
    setError('');
    try {
      await createProductImage({
        product_id: product.id,
        image_url: imageUrl,
        sort_order: sortOrder === '' ? defaultOrder : sortOrder,
        is_primary: isPrimary,
      });
      setImageUrl('');
      setSortOrder('');
      setIsPrimary(false);
      setNotice('Đã thêm ảnh sản phẩm.');
      await loadImages();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function updateImage(
    image: ProductImage,
    changes: Partial<Pick<ProductImage, 'image_url' | 'is_primary'>> & {
      sort_order?: number | null;
    },
  ) {
    setSaving(true);
    setError('');
    try {
      await updateProductImage(image.id, {
        product_id: product.id,
        image_url: changes.image_url ?? image.image_url,
        sort_order:
          changes.sort_order === null
            ? null
            : (changes.sort_order ?? image.sort_order),
        is_primary: changes.is_primary ?? Boolean(image.is_primary),
      });
      setNotice('Đã cập nhật ảnh sản phẩm.');
      await loadImages();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function removeImage(image: ProductImage) {
    setSaving(true);
    setError('');
    try {
      await deleteProductImage(image.id);
      setNotice('Đã xóa ảnh sản phẩm.');
      await loadImages();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Ảnh sản phẩm: ${product.name}`} onClose={onClose}>
      <div className="max-h-[78vh] space-y-5 overflow-y-auto p-6">
        {error && (
          <Alert message={error} type="error" onClose={() => setError('')} />
        )}
        {notice && (
          <Alert
            message={notice}
            type="success"
            onClose={() => setNotice('')}
          />
        )}
        <form
          onSubmit={addImage}
          className="space-y-4 rounded-xl border border-slate-200 p-4"
        >
          <h3 className="font-bold">Thêm ảnh</h3>
          <ImageUpload
            label="Ảnh sản phẩm"
            value={imageUrl}
            onChange={setImageUrl}
            onError={setError}
          />
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-sm font-semibold">
              Thứ tự
              <input
                type="number"
                min={0}
                step={1}
                value={sortOrder}
                placeholder="Tự động"
                onChange={(event) =>
                  setSortOrder(
                    event.target.value === '' ? '' : Number(event.target.value),
                  )
                }
                className="mt-1 block w-24 rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(event) => setIsPrimary(event.target.checked)}
              />
              Ảnh chính
            </label>
            <button
              type="submit"
              disabled={saving || !imageUrl}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Thêm ảnh
            </button>
          </div>
        </form>
        <section className="space-y-3">
          <h3 className="font-bold">Ảnh hiện có</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Đang tải ảnh...</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-slate-500">
              Sản phẩm chưa có ảnh chi tiết.
            </p>
          ) : (
            images.map((image) => (
              <div
                key={`${image.id}-${image.sort_order}`}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3"
              >
                <div className="min-w-0 flex-1">
                  <ImageUpload
                    label="Thay ảnh"
                    value={image.image_url}
                    onChange={(url) => {
                      if (url) void updateImage(image, { image_url: url });
                    }}
                    onError={setError}
                  />
                </div>
                <label className="text-xs font-semibold">
                  Thứ tự
                  <input
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={image.sort_order}
                    onBlur={(event) => {
                      const nextOrder =
                        event.currentTarget.value === ''
                          ? null
                          : Number(event.currentTarget.value);
                      if (nextOrder !== image.sort_order) {
                        void updateImage(image, { sort_order: nextOrder });
                      }
                    }}
                    className="mt-1 block w-20 rounded-lg border border-slate-300 px-2 py-1.5"
                  />
                </label>
                <button
                  type="button"
                  disabled={saving || Boolean(image.is_primary)}
                  onClick={() => void updateImage(image, { is_primary: true })}
                  className="text-sm font-semibold text-cyan-800 disabled:text-emerald-700"
                >
                  {image.is_primary ? 'Ảnh chính' : 'Đặt ảnh chính'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void removeImage(image)}
                  className="text-sm font-semibold text-rose-700"
                >
                  Xóa
                </button>
              </div>
            ))
          )}
        </section>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
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
      <p className={`mt-2 text-right text-3xl font-black tabular-nums ${tone}`}>
        {formatGroupedNumber(value)}
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
  categories: ResourceRow[];
  brands: ResourceRow[];
  saving: boolean;
  uploadingImage: boolean;
  onUploadingChange: (uploading: boolean) => void;
  onUploadError: (message: string) => void;
  onChange: <K extends keyof ProductRequest>(
    field: K,
    value: ProductRequest[K],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

function ProductForm({
  form,
  categories,
  brands,
  saving,
  uploadingImage,
  onUploadingChange,
  onUploadError,
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
        <label className="block text-sm font-semibold">
          Danh mục <span className="text-rose-500">*</span>
          <select
            required
            value={form.categoryId || ''}
            onChange={(event) =>
              onChange('categoryId', Number(event.target.value))
            }
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          >
            <option value="">Chọn danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {String(category.name || category.id)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Thương hiệu <span className="text-rose-500">*</span>
          <select
            required
            value={form.brandId || ''}
            onChange={(event) =>
              onChange('brandId', Number(event.target.value))
            }
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          >
            <option value="">Chọn thương hiệu</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {String(brand.name || brand.id)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label
          htmlFor="product-slug"
          className="mb-1.5 block text-sm font-semibold"
        >
          Slug <span className="text-rose-500">*</span>
        </label>
        <input
          id="product-slug"
          required
          value={form.slug}
          onChange={(event) => onChange('slug', event.target.value)}
          maxLength={280}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
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
      <ImageUpload
        label="Ảnh đại diện sản phẩm"
        value={form.thumbnailUrl}
        onChange={(url) => onChange('thumbnailUrl', url)}
        onError={onUploadError}
        onUploadingChange={onUploadingChange}
      />
      <div>
        <label
          htmlFor="product-status"
          className="mb-1.5 block text-sm font-semibold"
        >
          Trạng thái
        </label>
        <select
          id="product-status"
          value={form.status}
          onChange={(event) =>
            onChange('status', event.target.value as ProductRequest['status'])
          }
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="DRAFT">Bản nháp</option>
          <option value="ACTIVE">Đang bán</option>
          <option value="INACTIVE">Ngừng bán</option>
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
              : 'Lưu sản phẩm'}
        </button>
      </div>
    </form>
  );
}
