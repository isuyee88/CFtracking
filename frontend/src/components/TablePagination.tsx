/**
 * @file 表格分页条：固定在表格上方，避免长表格把下一页推到视窗外。
 * @platform cftracking
 * @owner frontend
 * @invariant 当前页变化只回调，不直接改数据；页码越界由本组件收敛回最后一页。
 * @invariant 移动端同样可用：不得把本组件包在 `hidden md:block` 容器里。
 */
import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clampPage } from '../utils/pagination';

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
  const pages = Math.max(1, Math.floor(Number(totalPages)) || 1);
  const page = clampPage(currentPage, pages);
  const items = Math.max(0, Math.floor(Number(totalItems)) || 0);
  const size = Math.max(1, Math.floor(Number(itemsPerPage)) || 1);
  const start = items === 0 ? 0 : (page - 1) * size + 1;
  const end = items === 0 ? 0 : Math.min(page * size, items);
  const isFirst = page <= 1;
  const isLast = page >= pages;

  useEffect(() => {
    if (currentPage > pages) onPageChange(pages);
  }, [currentPage, pages, onPageChange]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-default bg-surface px-3 py-2">
      <span className="text-xs text-fg-muted" aria-live="polite">
        {start}–{end} of {items} {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={isFirst}
          aria-label="Previous page"
          className="rounded-md p-1.5 text-fg-muted hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-14 text-center text-xs font-medium text-fg-default">
          {page} / {pages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pages, page + 1))}
          disabled={isLast}
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
