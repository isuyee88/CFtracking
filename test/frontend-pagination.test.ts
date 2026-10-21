/**
 * @file 前端分页纯函数回归测试。
 * @description 覆盖页码收敛、页脚窗口与切片边界，防止"筛选后停留在越界页导致表格空白"回归。
 * @owner frontend
 * @see frontend/src/utils/pagination.ts
 */
import { describe, expect, it } from 'vitest';
import {
  clampPage,
  getPageWindow,
  getTotalPages,
  slicePage,
} from '../frontend/src/utils/pagination';

describe('getTotalPages', () => {
  it('treats an empty dataset as one page', () => {
    expect(getTotalPages(0, 10)).toBe(1);
  });

  it('rounds partial pages up', () => {
    expect(getTotalPages(10, 10)).toBe(1);
    expect(getTotalPages(11, 10)).toBe(2);
    expect(getTotalPages(100, 20)).toBe(5);
  });

  it('falls back to a sane page size for invalid input', () => {
    expect(getTotalPages(10, 0)).toBe(10);
    expect(getTotalPages(10, Number.NaN)).toBe(10);
  });
});

describe('clampPage', () => {
  it('keeps the page inside [1, totalPages]', () => {
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(-5, 3)).toBe(1);
    expect(clampPage(2, 3)).toBe(2);
    expect(clampPage(9, 3)).toBe(3);
  });

  it('handles non-numeric input', () => {
    expect(clampPage(Number.NaN, 3)).toBe(1);
    expect(clampPage(2, 0)).toBe(1);
  });
});

describe('getPageWindow', () => {
  it('reports an empty window for no rows', () => {
    expect(getPageWindow(0, 20, 1)).toMatchObject({
      start: 0,
      end: 0,
      totalPages: 1,
      page: 1,
    });
  });

  it('computes the 1-based row range of the current page', () => {
    expect(getPageWindow(25, 10, 1)).toMatchObject({ start: 1, end: 10, totalPages: 3 });
    expect(getPageWindow(25, 10, 2)).toMatchObject({ start: 11, end: 20 });
    expect(getPageWindow(25, 10, 3)).toMatchObject({ start: 21, end: 25 });
  });

  it('clamps an out-of-range page instead of showing an empty range', () => {
    expect(getPageWindow(25, 10, 99)).toMatchObject({ page: 3, start: 21, end: 25 });
  });
});

describe('slicePage', () => {
  const rows = Array.from({ length: 25 }, (_, index) => index + 1);

  it('returns the rows of the requested page', () => {
    expect(slicePage(rows, 10, 1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(slicePage(rows, 10, 2)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(slicePage(rows, 10, 3)).toEqual([21, 22, 23, 24, 25]);
  });

  it('clamps past-the-end pages to the last page', () => {
    expect(slicePage(rows, 10, 99)).toEqual([21, 22, 23, 24, 25]);
  });

  it('returns an empty slice for an empty dataset', () => {
    expect(slicePage([], 10, 1)).toEqual([]);
  });
});
