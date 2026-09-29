# AGENTS.md

## 1. Mục tiêu dự án

Đây là dự án Frontend sử dụng:

- Next.js
- React
- TypeScript
- Tailwind CSS
- REST API
- Axios hoặc Fetch API

Mục tiêu là xây dựng giao diện CRUD đơn giản, dễ hiểu, dễ bảo trì và phù hợp với bài tập lớn.

---

# 2. Nguyên tắc quan trọng

AI PHẢI tuân thủ các nguyên tắc sau:

1. Không tự ý thay đổi kiến trúc dự án.
2. Không tự ý thêm thư viện nếu chưa thực sự cần thiết.
3. Ưu tiên code đơn giản, dễ đọc, dễ hiểu.
4. Không over-engineering.
5. Không tạo cấu trúc phức tạp như các dự án Enterprise nếu không được yêu cầu.
6. Không viết code thừa.
7. Không tạo file mới nếu có thể sử dụng file hiện tại.
8. Trước khi sửa code, phải kiểm tra code hiện tại.
9. Chỉ sửa những phần liên quan đến yêu cầu.
10. Không tự ý thay đổi API backend.
11. Không tự ý thay đổi tên field API.
12. Không tự ý thay đổi database.
13. Không tự ý xóa code đang hoạt động nếu không được yêu cầu.

---

# 3. Công nghệ

Project sử dụng:

- Next.js
- React
- TypeScript
- Tailwind CSS
- REST API

Không sử dụng thêm:

- Redux
- Zustand
- React Query
- SWR
- shadcn/ui
- Material UI
- Ant Design

trừ khi người dùng yêu cầu rõ ràng.

---

# 4. Cấu trúc thư mục

Ưu tiên cấu trúc đơn giản:

```text
src/
│
├── app/
│   ├── page.tsx
│   │
│   └── categories/
│       └── page.tsx
│
├── components/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── Loading.tsx
│
├── api/
│   └── categoryApi.ts
│
├── interfaces/
│   └── category.ts
│
└── styles/
```

Không tự ý tạo thêm:

```text
hooks/
contexts/
providers/
stores/
services/
repositories/
utils/
constants/
features/
schemas/
middlewares/
```

nếu chưa có nhu cầu thực tế.

---

# 5. Component

Component phải:

- Nhỏ
- Dễ hiểu
- Có trách nhiệm rõ ràng
- Có thể tái sử dụng khi cần

Ví dụ:

```tsx
<Button />
<Input />
<Modal />
<Loading />
```

Không tạo component chỉ để chứa vài dòng code nếu việc đó làm code phức tạp hơn.

---

# 6. API

Tất cả API phải được đặt trong:

```text
src/api/
```

Ví dụ:

```text
src/api/categoryApi.ts
```

API Category:

```text
GET    /api/categories
GET    /api/categories/:id
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id
```

Không gọi API trực tiếp ở nhiều nơi nếu có thể gom vào file API tương ứng.

Ví dụ:

```ts
export async function getCategories() {}

export async function getCategoryById(id: number) {}

export async function createCategory(data: CategoryRequest) {}

export async function updateCategory(id: number, data: CategoryRequest) {}

export async function deleteCategory(id: number) {}
```

---

# 7. Interface / TypeScript

Các interface phải đặt trong:

```text
src/interfaces/
```

Ví dụ:

```ts
export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  status: 'ACTIVE' | 'INACTIVE';
}
```

Không sử dụng `any` nếu có thể xác định được kiểu dữ liệu.

Không tạo type/interface trùng nhau ở nhiều file.

---

# 8. CRUD

Mỗi chức năng CRUD phải có đầy đủ:

### Create

- Form nhập dữ liệu
- Validate dữ liệu cơ bản
- Gọi POST API
- Hiển thị thông báo
- Cập nhật danh sách

### Read

- Gọi GET API
- Hiển thị loading
- Hiển thị danh sách
- Xử lý trường hợp không có dữ liệu
- Xử lý lỗi API

### Update

- Mở form chỉnh sửa
- Load dữ liệu hiện tại
- Cho phép chỉnh sửa
- Gọi PUT API
- Cập nhật danh sách

### Delete

- Hiển thị xác nhận trước khi xóa
- Gọi DELETE API
- Cập nhật danh sách
- Hiển thị lỗi nếu xóa thất bại

---

# 9. UI

UI phải:

- Đơn giản
- Sạch sẽ
- Dễ sử dụng
- Responsive cơ bản

Ưu tiên Tailwind CSS.

Ví dụ:

```tsx
className = 'px-4 py-2 rounded bg-blue-500 text-white';
```

Không tạo CSS phức tạp nếu Tailwind có thể xử lý.

---

# 10. Table

Đối với bảng dữ liệu, sử dụng HTML thuần:

```tsx
<table>
  <thead>
  <tbody>
  <tr>
  <th>
  <td>
</table>
```

Không sử dụng thư viện Table UI.

Không tạo bảng có horizontal scroll nếu không cần thiết.

Các cột phải được bố trí hợp lý để phù hợp với màn hình.

---

# 11. Modal

Nếu cần Modal:

```text
src/components/Modal.tsx
```

Modal được sử dụng cho:

- Thêm
- Sửa
- Xác nhận xóa

Không sử dụng thư viện Modal bên ngoài.

---

# 12. Form

Form phải đơn giản:

```tsx
<form>
  <input />
  <select />
  <textarea />
  <button />
</form>
```

Validate các trường bắt buộc.

Hiển thị lỗi gần trường tương ứng.

Không sử dụng thư viện Form nếu chưa được yêu cầu.

---

# 13. Error Handling

API phải có xử lý lỗi.

Ví dụ:

```ts
try {
  const data = await getCategories();
} catch (error) {
  console.error(error);
}
```

UI nên hiển thị thông báo dễ hiểu cho người dùng.

Không để lỗi API làm crash toàn bộ trang.

---

# 14. Loading

Khi đang gọi API phải có trạng thái loading.

Ví dụ:

```tsx
if (loading) {
  return <Loading />;
}
```

Không để giao diện đứng im mà không có thông báo.

---

# 15. Quy tắc Next.js

Sử dụng App Router.

Các page nằm trong:

```text
src/app/
```

Ví dụ:

```text
src/app/categories/page.tsx
```

Chỉ sử dụng:

```tsx
'use client';
```

khi component thực sự cần:

- useState
- useEffect
- event handler
- browser API

Không thêm `"use client"` vào mọi file.

---

# 16. Quy tắc code

Ưu tiên:

```ts
const
```

hơn:

```ts
let;
```

Không sử dụng:

```ts
var
```

Tên biến sử dụng camelCase:

```ts
categoryName;
imageUrl;
categoryList;
```

Tên component sử dụng PascalCase:

```tsx
CategoryForm;
CategoryTable;
CategoryModal;
```

Tên file component:

```text
CategoryForm.tsx
CategoryTable.tsx
```

---

# 17. Không được tự ý làm

AI KHÔNG ĐƯỢC tự ý:

- Đổi framework.
- Đổi Next.js sang React Vite.
- Đổi TypeScript sang JavaScript.
- Đổi API.
- Đổi database.
- Đổi cấu trúc backend.
- Cài thêm thư viện không cần thiết.
- Xóa package.
- Xóa file.
- Đổi tên API.
- Đổi tên field.
- Tạo kiến trúc Enterprise.
- Thêm Redux.
- Thêm Context nếu chưa cần.
- Thêm Zustand.
- Thêm React Query.
- Thêm UI library.

---

# 18. Quy trình trước khi code

Mỗi khi nhận yêu cầu, AI phải thực hiện:

### Bước 1

Đọc:

```text
AGENTS.md
```

### Bước 2

Kiểm tra cấu trúc project hiện tại.

### Bước 3

Đọc các file liên quan đến yêu cầu.

### Bước 4

Xác định chính xác những file cần sửa.

### Bước 5

Chỉ sửa những file cần thiết.

### Bước 6

Kiểm tra lỗi TypeScript/ESLint nếu có.

### Bước 7

Tóm tắt những file đã thay đổi.

---

# 19. Khi không chắc chắn

Nếu yêu cầu không rõ:

- Không tự suy đoán API.
- Không tự tạo field.
- Không tự thay đổi kiến trúc.
- Không tự cài thư viện.

Hãy hỏi người dùng trước khi thực hiện thay đổi lớn.

---

# 20. Khi hoàn thành

Sau khi code xong, AI phải báo:

### Đã thực hiện

- File nào đã sửa.
- Chức năng nào đã thêm/sửa.

### Kiểm tra

- TypeScript
- ESLint
- Build

### Nếu có lỗi

Nêu chính xác:

```text
Lỗi:
Nguyên nhân:
Cách khắc phục:
```

Không nói "đã chạy thành công" nếu chưa thực sự kiểm tra.
