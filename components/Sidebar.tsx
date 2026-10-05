'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navigationItems = [
  { label: 'Tổng quan', href: '/admin', icon: '⌂' },
  { label: 'Danh mục', href: '/admin/categories', icon: '#' },
  { label: 'Thương hiệu', href: '/admin/brands', icon: 'B' },
  { label: 'Sản phẩm', href: '/admin/products', icon: '▣' },
  { label: 'Đánh giá', href: '/admin/reviews', icon: '★' },
  { label: 'Voucher', href: '/admin/vouchers', icon: '%' },
  { label: 'Đơn hàng', href: '/admin/orders', icon: '□' },
  { label: 'Yêu thích', href: '/admin/favorites', icon: '♡' },
  { label: 'Tồn kho', href: '/admin/inventory', icon: '▥' },
  { label: 'Bảo hành', href: '/admin/warranties', icon: '◷' },
  { label: 'Người dùng', href: '/admin/users', icon: '♙' },
  { label: 'Vai trò', href: '/admin/roles', icon: '⚑' },
  { label: 'Cấu hình mẫu', href: '/admin/build-templates', icon: '▤' },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          onClick={onClose}
          className="fixed inset-0 z-20 bg-slate-950/40 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center border-b border-slate-800 px-6">
          <Link
            href="/"
            onClick={onClose}
            className="text-lg font-black tracking-tight"
          >
            Store<span className="text-cyan-400">Admin</span>
          </Link>
        </div>
        <nav
          className="min-h-0 flex-1 overflow-y-auto px-3 py-5"
          aria-label="Điều hướng chính"
        >
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Workspace
          </p>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const isActive =
                item.href === '/admin'
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? 'bg-cyan-700 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-sm">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="border-t border-slate-800 p-4">
          <p className="text-xs leading-5 text-slate-500">
            Hệ thống quản trị nội bộ
          </p>
        </div>
      </aside>
    </>
  );
}
