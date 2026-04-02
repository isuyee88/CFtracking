/**
 * File: ChartWrapper.tsx
 * Purpose: 图表延迟加载包装器，使用 Intersection Observer 实现视口外延迟加载
 * Input: children (图表组件), height (图表高度)
 * Output: 延迟加载的图表组件，减少初始 JS 加载
 * Logic: 只有当图表进入视口时才加载 recharts 库
 */

import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';

// 延迟加载 recharts 组件
const LazyAreaChart = lazy(() => import('recharts').then(m => ({ default: m.AreaChart })));
const LazyArea = lazy(() => import('recharts').then(m => ({ default: m.Area })));
const LazyXAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const LazyYAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const LazyCartesianGrid = lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
const LazyTooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const LazyResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));
const LazyBarChart = lazy(() => import('recharts').then(m => ({ default: m.BarChart })));
const LazyBar = lazy(() => import('recharts').then(m => ({ default: m.Bar })));
const LazyLineChart = lazy(() => import('recharts').then(m => ({ default: m.LineChart })));
const LazyLine = lazy(() => import('recharts').then(m => ({ default: m.Line })));
const LazyPieChart = lazy(() => import('recharts').then(m => ({ default: m.PieChart })));
const LazyPie = lazy(() => import('recharts').then(m => ({ default: m.Pie })));
const LazyCell = lazy(() => import('recharts').then(m => ({ default: m.Cell })));
const LazyLegend = lazy(() => import('recharts').then(m => ({ default: m.Legend })));

interface ChartWrapperProps {
  children: React.ReactNode;
  height?: number | string;
  className?: string;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({ 
  children, 
  height = 300,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [isVisible, hasLoaded]);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [hasLoaded]);

  const skeletonStyle = {
    height: typeof height === 'number' ? `${height}px` : height,
    background: 'linear-gradient(90deg, #f8f8f8 25%, #f0f0f0 50%, #f8f8f8 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: '14px'
  };

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: typeof height === 'number' ? `${height}px` : '200px',
        width: '100%',
        position: 'relative'
      }}
    >
      {hasLoaded && containerSize.width > 0 && containerSize.height > 0 ? (
        <Suspense fallback={<div style={skeletonStyle}>Loading chart...</div>}>
          {children}
        </Suspense>
      ) : (
        <div style={skeletonStyle}>
          {hasLoaded ? 'Calculating chart size...' : 'Chart will load when visible'}
        </div>
      )}
    </div>
  );
};

export {
  LazyAreaChart,
  LazyArea,
  LazyXAxis,
  LazyYAxis,
  LazyCartesianGrid,
  LazyTooltip,
  LazyResponsiveContainer,
  LazyBarChart,
  LazyBar,
  LazyLineChart,
  LazyLine,
  LazyPieChart,
  LazyPie,
  LazyCell,
  LazyLegend
};
