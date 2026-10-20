/**
 * @file 表格分页条：固定在表格上方，避免长表格把下一页推到视窗外。
 * @platform cftracking
 * @owner frontend
 * @invariant 当前页变化只回调，不直接改数据。
 */
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  label = 'rows',
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  const pages = Math.max(1, totalPages);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-default bg-surface px-3 py-2">
      <span className="text-xs text-fg-muted">
        {start}–{end} of {totalItems} {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="rounded-md p-1.5 text-fg-muted hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-14 text-center text-xs font-medium text-fg-default">
          {currentPage} / {pages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pages, currentPage + 1))}
          disabled={currentPage >= pages}
          aria-label="Next page"
          className="rounded-md p-1.5 text-fg-muted hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default TablePagination;
