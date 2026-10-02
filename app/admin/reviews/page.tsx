import CrudManager from '@/components/CrudManager';
import type { ResourceDefinition } from '@/interfaces/adminResources';

const definition: ResourceDefinition = {
  title: 'Đánh giá',
  description: 'Theo dõi và chỉnh sửa đánh giá sản phẩm.',
  endpoint: '/api/reviews',
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
    {
      name: 'rating',
      label: 'Số sao',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
    },
    { name: 'comment', label: 'Nội dung', type: 'textarea' },
    {
      name: 'status',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { value: 'PENDING', label: 'Chờ duyệt' },
        { value: 'APPROVED', label: 'Đã duyệt' },
        { value: 'HIDDEN', label: 'Đã ẩn' },
      ],
    },
  ],
  columns: [
    { name: 'id', label: 'ID' },
    { name: 'user_id', label: 'Người dùng' },
    { name: 'product_id', label: 'Sản phẩm' },
    { name: 'rating', label: 'Số sao' },
    { name: 'status', label: 'Trạng thái' },
    { name: 'created_at', label: 'Ngày tạo' },
  ],
};

export default function ReviewsPage() {
  return <CrudManager definition={definition} />;
}
