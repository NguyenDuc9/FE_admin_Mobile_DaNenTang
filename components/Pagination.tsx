import type { PaginationInfo } from '@/api/adminResourceApi';

export default function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
      <span>
        {pagination.total === 0
          ? '0 bản ghi'
          : `${(pagination.page - 1) * pagination.limit + 1}-${Math.min(
              pagination.page * pagination.limit,
              pagination.total,
            )} / ${pagination.total} bản ghi`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Trang trước
        </button>
        <span className="min-w-20 text-center">
          {pagination.page} / {pagination.totalPages}
        </span>
        <button
          type="button"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Trang sau
        </button>
      </div>
    </div>
  );
}