'use client';

import { useState } from 'react';
import CrudManager from '@/components/CrudManager';
import Modal from '@/components/Modal';
import {
  getVoucherProductCatalog,
  getVoucherProducts,
  setVoucherProducts,
} from '@/api/voucherProductApi';
import type { VoucherProduct } from '@/api/voucherProductApi';
import { getProducts } from '@/api/productApi';
import { getResourceList } from '@/api/adminResourceApi';
import type { ResourceRow } from '@/interfaces/adminResources';
import type { ResourceDefinition } from '@/interfaces/adminResources';
import { resolveImageUrl } from '@/api/api';
import AdminSearch, { matchesSearch } from '@/components/AdminSearch';
import Pagination from '@/components/Pagination';
import { formatVnd } from '@/utils/displayFormat';

const definition: ResourceDefinition = {
  title: 'Voucher',
  description:
    'Tạo và cập nhật mã giảm giá. Trạng thái được quản lý riêng; BE không có thao tác xóa.',
  endpoint: '/api/vouchers',
  allowDelete: false,
  statusField: 'status',
  fields: [
    {
      name: 'code',
      label: 'Mã voucher',
      type: 'text',
      required: true,
      maxLength: 50,
    },
    { name: 'name', label: 'Tên voucher', type: 'text', maxLength: 150 },
    { name: 'description', label: 'Mô tả', type: 'textarea' },
    {
      name: 'type',
      source: 'discount_type',
      label: 'Loại giảm giá',
      type: 'select',
      required: true,
      options: [
        { value: 'PERCENT', label: 'Phần trăm' },
        { value: 'FIXED', label: 'Số tiền cố định' },
      ],
    },
    {
      name: 'value',
      source: 'discount_value',
      label: 'Giá trị giảm',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'min_order_amount',
      source: 'min_order_value',
      label: 'Đơn tối thiểu',
      type: 'number',
      min: 0,
    },
    {
      name: 'max_discount_amount',
      source: 'max_discount',
      label: 'Giảm tối đa',
      type: 'number',
      min: 0,
    },
    {
      name: 'start_at',
      label: 'Bắt đầu',
      type: 'datetime-local',
      required: true,
    },
    {
      name: 'end_at',
      label: 'Kết thúc',
      type: 'datetime-local',
      required: true,
    },
    {
      name: 'usage_limit',
      label: 'Giới hạn lượt dùng',
      type: 'number',
      min: 0,
    },
  ],
  columns: [
    { name: 'code', label: 'Mã' },
    { name: 'name', label: 'Voucher' },
    { name: 'discount_type', label: 'Loại' },
    { name: 'discount_value', label: 'Mức giảm' },
    { name: 'used_count', label: 'Đã dùng' },
    { name: 'status', label: 'Trạng thái' },
  ],
};
const productPageSize = 15;

export default function VouchersPage() {
  const [voucher, setVoucher] = useState<ResourceRow | null>(null);
  const [products, setProducts] = useState<VoucherProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  const [error, setError] = useState('');
  const [imageWarning, setImageWarning] = useState('');
  const [notice, setNotice] = useState('');
  const visibleProducts = products.filter((product) =>
    matchesSearch([product.id, product.name, product.slug], productSearch),
  );
  const productPagination = {
    page: productPage,
    limit: productPageSize,
    total: visibleProducts.length,
    totalPages: Math.max(
      1,
      Math.ceil(visibleProducts.length / productPageSize),
    ),
  };
  const pagedProducts = visibleProducts.slice(
    (productPage - 1) * productPageSize,
    productPage * productPageSize,
  );
  const selectedProducts = visibleProducts.filter((product) =>
    selectedIds.includes(product.id),
  );
  const formatPrice = (price: number | undefined) =>
    formatVnd(price);

  async function openProductPicker(row: ResourceRow) {
    setVoucher(row);
    setLoadingProducts(true);
    setError('');
    setImageWarning('');
    try {
      const [productRows, linkedProducts] = await Promise.all([
        getVoucherProductCatalog(row.id),
        getVoucherProducts(row.id),
      ]);
      let productsWithImages = productRows;
      if (productRows.some((product) => !product.thumbnail_url)) {
        const [productsResult, imagesResult] = await Promise.allSettled([
          getProducts(),
          getResourceList('/api/product-images'),
        ]);
        const catalogProducts =
          productsResult.status === 'fulfilled' ? productsResult.value : [];
        const images =
          imagesResult.status === 'fulfilled' ? imagesResult.value : [];
        const primaryImageByProduct = new Map<number, string>();
        const imageByProduct = new Map<number, string>();

        for (const image of images) {
          const productId = Number(image.product_id);
          if (
            !Number.isFinite(productId) ||
            typeof image.image_url !== 'string' ||
            !image.image_url
          ) {
            continue;
          }
          const isPrimary =
            image.is_primary === true ||
            image.is_primary === 1 ||
            image.is_primary === '1';
          if (isPrimary) {
            primaryImageByProduct.set(productId, image.image_url);
          } else if (!imageByProduct.has(productId)) {
            imageByProduct.set(productId, image.image_url);
          }
        }

        productsWithImages = productRows.map((product) => {
          if (product.thumbnail_url) return product;
          const productInfo = catalogProducts.find(
            (candidate) => candidate.id === product.id,
          );
          const thumbnailUrl =
            productInfo?.thumbnail_url ||
            primaryImageByProduct.get(product.id) ||
            imageByProduct.get(product.id);
          return thumbnailUrl ? { ...product, thumbnail_url: thumbnailUrl } : product;
        });

        if (
          productsResult.status === 'rejected' ||
          imagesResult.status === 'rejected'
        ) {
          setImageWarning('Một số ảnh sản phẩm có thể chưa tải được.');
        }
      }
      setProducts(productsWithImages);
      setSelectedIds(linkedProducts.map((product: VoucherProduct) => product.id));
      setProductSearch('');
      setProductPage(1);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không tải được danh sách sản phẩm khuyến mại.',
      );
    } finally {
      setLoadingProducts(false);
    }
  }

  async function saveProducts() {
    if (!voucher) return;
    setSavingProducts(true);
    setError('');
    try {
      await setVoucherProducts(voucher.id, selectedIds);
      setNotice(`Đã cập nhật sản phẩm áp dụng cho ${String(voucher.code)}.`);
      setVoucher(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Không lưu được sản phẩm khuyến mại.',
      );
    } finally {
      setSavingProducts(false);
    }
  }

  function toggleProduct(productId: number) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  return (
    <>
      {error && (
        <p role="alert" className="mx-auto mt-4 max-w-7xl px-5 text-sm text-rose-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mx-auto mt-4 max-w-7xl px-5 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      <CrudManager
        definition={definition}
        rowAction={{ label: 'Chọn sản phẩm', onClick: (row) => void openProductPicker(row) }}
      />
      {voucher && (
        <Modal
          title={`Sản phẩm khuyến mại: ${String(voucher.name || voucher.code)}`}
          onClose={() => setVoucher(null)}
        >
          <div className="max-h-[78vh] space-y-4 overflow-y-auto p-6">
            <p className="text-sm text-slate-600">
              Chọn một hoặc nhiều sản phẩm áp dụng cho khuyến mại này.
            </p>
            <AdminSearch
              value={productSearch}
              onChange={(value) => {
                setProductSearch(value);
                setProductPage(1);
              }}
              placeholder="Tìm sản phẩm khuyến mãi theo tên, slug..."
            />
            <p className="-mt-2 text-xs text-slate-500">
              Giá hiển thị là giá thấp nhất của biến thể đang hoạt động. Với
              voucher giảm số tiền cố định, giá sau giảm là giá tham khảo cho
              một sản phẩm; lúc thanh toán khoản giảm được áp dụng một lần cho
              đơn hàng.
            </p>
            {imageWarning && (
              <p role="status" className="text-xs text-amber-700">
                {imageWarning}
              </p>
            )}
            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}
            {loadingProducts ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Đang tải sản phẩm...
              </p>
            ) : visibleProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                {productSearch
                  ? 'Không tìm thấy sản phẩm phù hợp.'
                  : 'Chưa có sản phẩm.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {pagedProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-center gap-3 p-3 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="h-4 w-4 accent-cyan-800"
                    />
                    {typeof product.thumbnail_url === 'string' &&
                    product.thumbnail_url ? (
                      <img
                        src={resolveImageUrl(product.thumbnail_url)}
                        alt=""
                        className="h-11 w-11 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-lg bg-slate-100" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {String(product.name || `Sản phẩm ${product.id}`)}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {String(product.slug || '')}
                      </span>
                    </span>
                    <span className="hidden text-right text-xs sm:block">
                      <span className="block text-slate-500">
                        {formatPrice(product.current_price)}
                      </span>
                      {selectedIds.includes(product.id) && (
                        <span className="block font-semibold text-rose-700">
                          {formatPrice(product.discounted_price)}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {!loadingProducts && visibleProducts.length > 0 && (
              <Pagination
                pagination={productPagination}
                onPageChange={setProductPage}
              />
            )}
            <section className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="font-semibold text-slate-900">
                  Sản phẩm đang áp dụng ({selectedIds.length})
                </h3>
              </div>
              {selectedIds.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">
                  Chưa giới hạn sản phẩm; voucher áp dụng cho toàn đơn hàng.
                </p>
              ) : selectedProducts.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">
                  Không có sản phẩm áp dụng khớp với từ khóa tìm kiếm.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <span className="font-medium">{product.name}</span>
                      <span className="text-right">
                        <span className="mr-2 text-slate-500 line-through">
                          {formatPrice(product.current_price)}
                        </span>
                        <span className="font-bold text-rose-700">
                          {formatPrice(product.discounted_price)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Đã chọn {selectedIds.length} sản phẩm
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setVoucher(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={loadingProducts || savingProducts}
                  onClick={() => void saveProducts()}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {savingProducts ? 'Đang lưu...' : 'Lưu sản phẩm'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
