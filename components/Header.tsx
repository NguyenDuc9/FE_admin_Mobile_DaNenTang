'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserInfo } from '@/interfaces/user';
interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Không thể đọc thông tin user:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    setUser(null);
    setIsMenuOpen(false);

    router.push('/auth/login');
  };

  const displayName =
    user?.name || user?.username || user?.email || 'Quản trị viên';

  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-8">
      {/* Menu mobile */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Mở menu điều hướng"
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
      >
        <span className="block h-0.5 w-5 bg-current" />
        <span className="mt-1 block h-0.5 w-5 bg-current" />
        <span className="mt-1 block h-0.5 w-5 bg-current" />
      </button>

      {/* Title */}
      <div className="hidden lg:block">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
          Admin workspace
        </p>

        <p className="text-sm font-semibold text-slate-700">
          Quản trị cửa hàng
        </p>
      </div>

      {/* User */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-slate-100"
        >
          {/* Tên user */}
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-slate-800">{displayName}</p>

            <p className="text-xs text-slate-500">Administrator</p>
          </div>

          {/* Avatar */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-700 text-sm font-bold text-white">
            {avatarLetter}
          </div>
        </button>

        {/* Dropdown */}
        {isMenuOpen && (
          <div className="absolute right-0 top-12 z-50 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">
                {displayName}
              </p>

              {user?.fullName && (
                <p className="mt-1 truncate text-xs text-slate-500">
                  {user.fullName}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
