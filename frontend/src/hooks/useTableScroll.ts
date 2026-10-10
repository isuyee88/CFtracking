/**
 * File: useTableScroll.ts
 * Purpose: 表格滚动监听 Hook，用于管理横向滚动容器的阴影显示
 * Input: 可选的容器 ref 和是否启用手势提示
 * Output: 返回 ref 和滚动状态，控制阴影的显示/隐藏
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseTableScrollOptions {
  enableGestureHint?: boolean;
  gestureHintDuration?: number;
}

interface UseTableScrollReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  isScrolledToEnd: boolean;
  isScrolledFromStart: boolean;
  showGestureHint: boolean;
}

export function useTableScroll({
  enableGestureHint = true,
  gestureHintDuration = 3000,
}: UseTableScrollOptions = {}): UseTableScrollReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolledToEnd, setIsScrolledToEnd] = useState(false);
  const [isScrolledFromStart, setIsScrolledFromStart] = useState(false);
  const [showGestureHint, setShowGestureHint] = useState(false);

  const safeGetSessionItem = useCallback((key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }, []);

  const safeSetSessionItem = useCallback((key: string, value: string) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Ignore storage write failures in restricted contexts.
    }
  }, []);

  const checkScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    
    // 判断是否滚动到最右侧（允许 1px 误差）
    const reachedEnd = scrollLeft + clientWidth >= scrollWidth - 1;
    // 判断是否从最左侧开始滚动
    const scrolledFromStart = scrollLeft > 0;

    setIsScrolledToEnd(reachedEnd);
    setIsScrolledFromStart(scrolledFromStart);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 检查是否需要显示手势提示（首次访问且有横向滚动）
    const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
    const hasSeenHint = safeGetSessionItem('table-scroll-hint-seen');
    
    if (enableGestureHint && hasHorizontalScroll && !hasSeenHint) {
      setShowGestureHint(true);
      safeSetSessionItem('table-scroll-hint-seen', 'true');
      
      // 在指定时间后移除提示
      setTimeout(() => {
        setShowGestureHint(false);
      }, gestureHintDuration);
    }

    // 添加滚动监听
    container.addEventListener('scroll', checkScroll, { passive: true });
    
    // 初始检查
    checkScroll();

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll, enableGestureHint, gestureHintDuration, safeGetSessionItem, safeSetSessionItem]);

  return {
    containerRef,
    isScrolledToEnd,
    isScrolledFromStart,
    showGestureHint,
  };
}
