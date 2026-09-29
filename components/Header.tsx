'use client';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:px-8">
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
      <div className="hidden lg:block">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">
          Admin workspace
        </p>
        <p className="text-sm font-semibold text-slate-700">
          Quản trị cửa hàng
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-bold text-slate-800">Quản trị viên</p>
          <p className="text-xs text-slate-500">Administrator</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-700 text-sm font-bold text-white">
          A
        </div>
      </div>
    </header>
  );
}
