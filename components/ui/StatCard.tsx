interface StatCardProps {
  label: string;
  value: number | string;
  className?: string;
}

export default function StatCard({
  label,
  value,
  className = '',
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>

      <p className={`mt-2 text-3xl font-black ${className}`}>
        {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
      </p>
    </div>
  );
}
