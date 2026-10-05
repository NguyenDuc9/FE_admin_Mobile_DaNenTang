import { formatGroupedNumber } from '@/utils/displayFormat';

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

      <p className={`mt-2 text-right text-3xl font-black tabular-nums ${className}`}>
        {typeof value === 'number' ? formatGroupedNumber(value) : value}
      </p>
    </div>
  );
}
