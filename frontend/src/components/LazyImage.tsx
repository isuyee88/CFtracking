/**
 * File: LazyImage.tsx
 * Purpose: 图片懒加载组件，使用 Intersection Observer API 实现
 * Input: 图片 URL、alt 文本、尺寸等属性
 * Output: 带有懒加载和占位符效果的图片组件
 * Logic: 使用 Intersection Observer 检测元素可见性，加载时显示骨架屏占位符
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholderColor?: string;
  threshold?: number;
  rootMargin?: string;
  effect?: 'blur' | 'fade' | 'none';
  aspectRatio?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  placeholderColor = '#f0f0f0',
  threshold = 0.1,
  rootMargin = '50px',
  effect = 'blur',
  aspectRatio,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 图片加载成功回调
  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    onLoad?.(e);
  }, [onLoad]);

  // 图片加载失败回调
  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    setIsLoaded(true);
    onError?.(e);
  }, [onError]);

  useEffect(() => {
    // 创建 Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // 元素进入视口后停止观察
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    // 观察图片元素
    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    // 清理观察器
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin]);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gray-100',
        aspectRatio && aspectRatio,
        className
      )}
      style={{
        backgroundColor: placeholderColor,
      }}
    >
      {/* 骨架屏占位符 */}
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0 animate-pulse',
            effect === 'blur' && 'blur-sm',
            effect === 'fade' && 'opacity-50'
          )}
          style={{
            background: `linear-gradient(90deg, 
              ${placeholderColor} 0%, 
              ${placeholderColor}dd 50%, 
              ${placeholderColor} 100%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      )}

      {/* 错误占位符 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}

      {/* 实际图片 */}
      <img
        ref={imgRef}
        src={isInView && !hasError ? src : undefined}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          'w-full h-full object-cover transition-all duration-500',
          isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105',
          hasError && 'hidden'
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />

      {/* 内联 shimmer 动画样式 */}
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default LazyImage;
