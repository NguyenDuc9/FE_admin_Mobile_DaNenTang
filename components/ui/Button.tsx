import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'secondary';
  loading?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-cyan-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    secondary:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading ? 'Đang xử lý...' : children}
    </button>
  );
}
