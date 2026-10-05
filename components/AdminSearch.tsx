'use client';

export function normalizeSearchText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi');
}

export function matchesSearch(values: unknown[], query: string) {
  const normalizedQuery = normalizeSearchText(query.trim());
  return (
    !normalizedQuery ||
    values.some((value) => normalizeSearchText(value).includes(normalizedQuery))
  );
}

export default function AdminSearch({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="mb-4 block">
      <span className="sr-only">Tìm kiếm dữ liệu</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100 sm:max-w-md"
      />
    </label>
  );
}
