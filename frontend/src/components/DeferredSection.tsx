import React, { useEffect, useRef, useState } from 'react';

interface DeferredSectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  rootMargin?: string;
  minHeight?: number | string;
  idleTimeoutMs?: number;
}

export function DeferredSection({
  children,
  fallback = null,
  className,
  rootMargin = '320px 0px',
  minHeight,
  idleTimeoutMs = 160,
}: DeferredSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender || !containerRef.current) {
      return;
    }

    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const scheduleRender = () => {
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(() => setShouldRender(true), {
          timeout: idleTimeoutMs,
        });
        return;
      }

      timeoutId = window.setTimeout(() => setShouldRender(true), 1);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }

        scheduleRender();
        observer.disconnect();
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      if (idleId !== undefined) {
        window.cancelIdleCallback?.(idleId);
      }
    };
  }, [idleTimeoutMs, rootMargin, shouldRender]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={minHeight ? { minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight } : undefined}
    >
      {shouldRender ? children : fallback}
    </div>
  );
}

export default DeferredSection;
