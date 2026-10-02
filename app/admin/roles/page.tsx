import CrudManager from '@/components/CrudManager';
import type { ResourceDefinition } from '@/interfaces/adminResources';

const definition: ResourceDefinition = {
  title: 'Vai trò',
  description: 'Quản lý vai trò truy cập trong hệ thống.',
  endpoint: '/api/roles',
  fields: [
    {
      name: 'name',
      label: 'Tên vai trò',
      type: 'text',
      required: true,
      maxLength: 50,
    },
    { name: 'description', label: 'Mô tả', type: 'textarea', maxLength: 255 },
  ],
  columns: [
    { name: 'id', label: 'ID' },
    { name: 'name', label: 'Vai trò' },
    { name: 'description', label: 'Mô tả' },
  ],
};

export default function RolesPage() {
  return <CrudManager definition={definition} />;
}
