'use client';

import { useState } from 'react';
import CrudManager from '@/components/CrudManager';
import Modal from '@/components/Modal';
import { getResourceList } from '@/api/adminResourceApi';
import { getVoucherProducts, setVoucherProducts } from '@/api/voucherProductApi';
import type { VoucherProduct } from '@/api/voucherProductApi';
import type { ResourceRow } from '@/interfaces/adminResources';
import type { ResourceDefinition } from '@/interfaces/adminResources';
import { resolveImageUrl } from '@/api/api';

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

export default function VouchersPage() {
  const [voucher, setVoucher] = useState<ResourceRow | null>(null);
  const [products, setProducts] = useState<ResourceRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function openProductPicker(row: ResourceRow) {
    setVoucher(row);
    setLoadingProducts(true);
    setError('');
    try {
      const [productRows, linkedProducts] = await Promise.all([
        getResourceList('/api/products'),
        getVoucherProducts(row.id),
      ]);
      setProducts(productRows);
      setSelectedIds(linkedProducts.map((product: VoucherProduct) => product.id));
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
            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}
            {loadingProducts ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Đang tải sản phẩm...
              </p>
            ) : products.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Chưa có sản phẩm.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {products.map((product) => (
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
                  </label>
                ))}
              </div>
            )}
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
