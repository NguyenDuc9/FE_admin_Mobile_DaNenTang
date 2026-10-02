interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'default';
}

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
    default: 'bg-slate-100 text-slate-600',
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
