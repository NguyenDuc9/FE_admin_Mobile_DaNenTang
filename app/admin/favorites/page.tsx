import CrudManager from '@/components/CrudManager';
import type { ResourceDefinition } from '@/interfaces/adminResources';

const definition: ResourceDefinition = {
  title: 'Sản phẩm yêu thích',
  description: 'Theo dõi và quản lý sản phẩm được người dùng yêu thích.',
  endpoint: '/api/admin-fe/favorites',
  allowEdit: false,
  fields: [
    {
      name: 'user_id',
      label: 'Người dùng',
      type: 'select',
      required: true,
      optionsEndpoint: '/api/users',
      optionLabel: 'full_name',
      valueType: 'number',
    },
    {
      name: 'product_id',
      label: 'Sản phẩm',
      type: 'select',
      required: true,
      optionsEndpoint: '/api/products',
      optionLabel: 'name',
      valueType: 'number',
    },
  ],
  columns: [
    { name: 'id', label: 'ID' },
    { name: 'user_id', label: 'Người dùng' },
    { name: 'product_id', label: 'Sản phẩm' },
    { name: 'created_at', label: 'Ngày thêm' },
  ],
};

export default function FavoritesPage() {
  return <CrudManager definition={definition} />;
}
