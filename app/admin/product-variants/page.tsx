import CrudManager from '@/components/CrudManager';
import type { ResourceDefinition } from '@/interfaces/adminResources';

const definition: ResourceDefinition = {
  title: 'Biến thể sản phẩm',
  description: 'Quản lý SKU, cấu hình bán, giá và tồn kho của từng sản phẩm.',
  endpoint: '/api/product-variants',
  fields: [
    {
      name: 'product_id',
      label: 'Sản phẩm',
      type: 'select',
      required: true,
      optionsEndpoint: '/api/products',
      optionLabel: 'name',
      valueType: 'number',
    },
    { name: 'sku', label: 'SKU', type: 'text', required: true, maxLength: 100 },
    {
      name: 'variant_name',
      label: 'Tên cấu hình',
      type: 'text',
      required: true,
      maxLength: 150,
    },
    { name: 'price', label: 'Giá bán', type: 'number', min: 0 },
    { name: 'compare_at_price', label: 'Giá niêm yết', type: 'number', min: 0 },
    { name: 'stock_quantity', label: 'Tồn kho', type: 'number', min: 0 },
    { name: 'cpu', label: 'CPU', type: 'text' },
    { name: 'ram', label: 'RAM', type: 'text' },
    { name: 'storage', label: 'Lưu trữ', type: 'text' },
    { name: 'gpu', label: 'GPU', type: 'text' },
    { name: 'screen_size', label: 'Kích thước màn hình', type: 'text' },
    { name: 'screen_resolution', label: 'Độ phân giải', type: 'text' },
    { name: 'refresh_rate', label: 'Tần số quét', type: 'number', min: 0 },
    { name: 'operating_system', label: 'Hệ điều hành', type: 'text' },
    { name: 'color', label: 'Màu sắc', type: 'text' },
    { name: 'weight_kg', label: 'Khối lượng (kg)', type: 'number', min: 0 },
    {
      name: 'warranty_months',
      label: 'Bảo hành (tháng)',
      type: 'number',
      min: 0,
    },
    {
      name: 'status',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { value: 'ACTIVE', label: 'Đang hoạt động' },
        { value: 'INACTIVE', label: 'Ngừng hoạt động' },
      ],
    },
  ],
  columns: [
    { name: 'id', label: 'ID' },
    { name: 'product_id', label: 'Sản phẩm' },
    { name: 'sku', label: 'SKU' },
    { name: 'variant_name', label: 'Cấu hình' },
    { name: 'price', label: 'Giá' },
    { name: 'stock_quantity', label: 'Tồn kho' },
    { name: 'status', label: 'Trạng thái' },
  ],
};

export default function ProductVariantsPage() {
  return <CrudManager definition={definition} />;
}
