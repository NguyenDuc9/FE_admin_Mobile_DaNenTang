const VALUE_LABELS: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  BLOCKED: 'Bị khóa',
  DRAFT: 'Bản nháp',
  PENDING: 'Đang chờ',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  ASSEMBLING: 'Đang lắp ráp',
  PACKED: 'Đã đóng gói',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  DELIVERY_FAILED: 'Giao thất bại',
  APPROVED: 'Đã duyệt',
  HIDDEN: 'Đã ẩn',
  EXPIRED: 'Đã hết hạn',
  CLAIMED: 'Đã yêu cầu bảo hành',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
  IMPORT: 'Nhập kho',
  SALE: 'Bán hàng',
  CANCEL: 'Hủy đơn',
  ADJUSTMENT: 'Điều chỉnh kho',
  PERCENT: 'Phần trăm',
  FIXED: 'Số tiền cố định',
  READY_PRODUCT: 'Sản phẩm có sẵn',
  CUSTOM_BUILD: 'PC tự chọn',
  DELIVERY: 'Giao tận nơi',
  PICKUP: 'Nhận tại cửa hàng',
  COD: 'Thanh toán khi nhận hàng',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
  MOMO: 'Ví MoMo',
  VNPAY: 'VNPAY',
};

export function getAdminValueLabel(name: string, value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  const label = VALUE_LABELS[String(value).toUpperCase()];
  if (label) return label;
  if (name.toLowerCase().includes('status')) return 'Trạng thái khác';
  return String(value);
}
