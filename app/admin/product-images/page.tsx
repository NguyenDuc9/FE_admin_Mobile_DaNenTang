import CrudManager from '@/components/CrudManager';
import type { ResourceDefinition } from '@/interfaces/adminResources';

const definition: ResourceDefinition = {
  title: 'Ảnh sản phẩm',
  description: 'Quản lý ảnh, thứ tự hiển thị và ảnh đại diện của sản phẩm.',
  endpoint: '/api/product-images',
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
    { name: 'image_url', label: 'Ảnh sản phẩm', type: 'image', required: true },
    {
      name: 'sort_order',
      label: 'Thứ tự hiển thị',
      type: 'number',
      min: 0,
      default: '',
      valueType: 'number',
    },
    { name: 'is_primary', label: 'Ảnh chính', type: 'checkbox' },
  ],
  columns: [
    { name: 'id', label: 'ID' },
    { name: 'product_id', label: 'Sản phẩm' },
    { name: 'image_url', label: 'Hình ảnh' },
    { name: 'sort_order', label: 'Thứ tự' },
    { name: 'is_primary', label: 'Ảnh chính' },
  ],
};

export default function ProductImagesPage() {
  return <CrudManager definition={definition} />;
}
