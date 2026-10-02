'use client';

import CrudManager from '@/components/CrudManager';
import type { ResourceDefinition } from '@/interfaces/adminResources';

function serializeItems(value: unknown) {
  if (!Array.isArray(value)) return '[]';
  const items = value.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const record = item as Record<string, unknown>;
    return {
      productId: record.productId ?? record.product_id,
      productVariantId: record.productVariantId ?? record.product_variant_id,
      componentType: record.componentType ?? record.component_type,
      quantity: record.quantity,
      sortOrder: record.sortOrder ?? record.sort_order ?? 0,
    };
  });
  return JSON.stringify(items, null, 2);
}

const definition: ResourceDefinition = {
  title: 'Cấu hình mẫu',
  description:
    'Tạo, cập nhật và bật/tắt cấu hình lắp ráp với sản phẩm và biến thể được chọn từ danh sách.',
  endpoint: '/api/build-templates',
  allowDelete: false,
  statusField: 'status',
  loadOneForEdit: true,
  lookups: [
    { name: 'products', endpoint: '/api/products', label: 'name' },
    {
      name: 'variants',
      endpoint: '/api/product-variants',
      label: 'variant_name',
    },
  ],
  fields: [
    {
      name: 'name',
      label: 'Tên cấu hình',
      type: 'text',
      required: true,
      maxLength: 180,
    },
    { name: 'description', label: 'Mô tả', type: 'textarea' },
    {
      name: 'items',
      label: 'Linh kiện (JSON)',
      type: 'template-items',
      required: true,
      serializeFrom: serializeItems,
    },
  ],
  columns: [
    { name: 'id', label: 'ID' },
    { name: 'name', label: 'Tên cấu hình' },
    { name: 'status', label: 'Trạng thái' },
    { name: 'estimated_total', label: 'Tổng dự kiến' },
    { name: 'created_at', label: 'Ngày tạo' },
  ],
};

export default function BuildTemplatesPage() {
  return <CrudManager definition={definition} />;
}
