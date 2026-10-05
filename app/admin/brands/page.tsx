import CrudManager from '@/components/CrudManager';
import type { ResourceDefinition } from '@/interfaces/adminResources';

const definition: ResourceDefinition = {
  title: 'Thương hiệu',
  description: 'Quản lý thông tin và trạng thái thương hiệu.',
  endpoint: '/api/brands',
  fields: [
    {
      name: 'name',
      label: 'Tên thương hiệu',
      type: 'text',
      required: true,
      maxLength: 150,
    },
    {
      name: 'slug',
      label: 'Slug',
      type: 'text',
      required: true,
      maxLength: 180,
    },
    { name: 'logo_url', label: 'Logo', type: 'image' },
    { name: 'description', label: 'Mô tả', type: 'textarea' },
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
    { name: 'name', label: 'Thương hiệu' },
    { name: 'logo_url', label: 'Logo' },
    { name: 'slug', label: 'Slug' },
    { name: 'status', label: 'Trạng thái' },
  ],
};

export default function BrandsPage() {
  return <CrudManager definition={definition} />;
}
