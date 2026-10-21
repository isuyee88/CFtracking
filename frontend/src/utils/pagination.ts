/**
 * @file 分页计算纯函数。
 * @description 客户端分页的页码收敛、页窗口计算与切片，供 useClientPagination 与 TablePagination 共用。
 * @owner frontend
 * @invariant 页码从 1 开始；空数据集仍视为 1 页，避免出现 "0 / 0" 或负页码。
 * @see src/hooks/useClientPagination.ts
 */

export interface PageWindow {
  /** 收敛到 [1, totalPages] 的当前页。 */
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  /** 当前页首行在整体中的 1-based 序号；空数据为 0。 */
  start: number;
  /** 当前页末行在整体中的 1-based 序号；空数据为 0。 */
  end: number;
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toNonNegativeInt(value: unknown): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** 按总条数与每页条数计算总页数，空数据返回 1。 */
export function getTotalPages(totalItems: number, pageSize: number): number {
  const size = toPositiveInt(pageSize, 1);
  const items = toNonNegativeInt(totalItems);
  return Math.max(1, Math.ceil(items / size));
}

/** 把任意页码收敛到 [1, totalPages]。 */
export function clampPage(page: number, totalPages: number): number {
  const pages = toPositiveInt(totalPages, 1);
  const requested = Math.floor(Number(page));
  const safe = Number.isFinite(requested) && requested > 0 ? requested : 1;
  return Math.min(Math.max(1, safe), pages);
}

/**
 * 计算页脚展示窗口（"x–y of n"）。
 * 不负责 clamp 页码，调用方需先传入 clampPage 的结果。
 */
export function getPageWindow(totalItems: number, pageSize: number, page: number): PageWindow {
  const size = toPositiveInt(pageSize, 1);
  const items = toNonNegativeInt(totalItems);
  const totalPages = getTotalPages(items, size);
  const current = clampPage(page, totalPages);

  if (items === 0) {
    return { page: current, pageSize: size, totalItems: 0, totalPages, start: 0, end: 0 };
  }

  const start = (current - 1) * size + 1;
  const end = Math.min(current * size, items);
  return { page: current, pageSize: size, totalItems: items, totalPages, start, end };
}

/** 取出当前页数据；越界页返回空数组。 */
export function slicePage<T>(rows: readonly T[], pageSize: number, page: number): T[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }
  const size = toPositiveInt(pageSize, rows.length);
  const totalPages = getTotalPages(rows.length, size);
  const current = clampPage(page, totalPages);
  const offset = (current - 1) * size;
  return rows.slice(offset, offset + size);
}
