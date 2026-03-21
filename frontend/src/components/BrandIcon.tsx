/**
 * File: BrandIcon.tsx
 * Purpose: 品牌图标组件，根据浏览器/操作系统名称动态显示对应的品牌图标
 * Input/Output: 接收品牌名称，输出对应的品牌图标组件
 * Logic: 使用CSS渐变背景模拟品牌图标，支持主流浏览器和操作系统
 */

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type BrandType = 
  | 'chrome' | 'safari' | 'firefox' | 'edge' | 'opera' | 'ie' | 'brave'
  | 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown';

interface BrandIconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const BROWSER_ICONS: Record<string, { brand: BrandType; label: string; shortLabel: string }> = {
  chrome: { brand: 'chrome', label: 'Chrome', shortLabel: 'Ch' },
  safari: { brand: 'safari', label: 'Safari', shortLabel: 'Sf' },
  firefox: { brand: 'firefox', label: 'Firefox', shortLabel: 'Fx' },
  edge: { brand: 'edge', label: 'Edge', shortLabel: 'Eg' },
  opera: { brand: 'opera', label: 'Opera', shortLabel: 'Op' },
  'internet explorer': { brand: 'ie', label: 'IE', shortLabel: 'IE' },
  'ie': { brand: 'ie', label: 'IE', shortLabel: 'IE' },
  brave: { brand: 'brave', label: 'Brave', shortLabel: 'Br' },
};

const OS_ICONS: Record<string, { brand: BrandType; label: string; shortLabel: string }> = {
  windows: { brand: 'windows', label: 'Windows', shortLabel: 'Wi' },
  'windows nt': { brand: 'windows', label: 'Windows', shortLabel: 'Wi' },
  macos: { brand: 'macos', label: 'macOS', shortLabel: 'Mc' },
  'mac os': { brand: 'macos', label: 'macOS', shortLabel: 'Mc' },
  'mac os x': { brand: 'macos', label: 'macOS', shortLabel: 'Mc' },
  darwin: { brand: 'macos', label: 'macOS', shortLabel: 'Mc' },
  linux: { brand: 'linux', label: 'Linux', shortLabel: 'Lx' },
  ubuntu: { brand: 'linux', label: 'Linux', shortLabel: 'Lx' },
  android: { brand: 'android', label: 'Android', shortLabel: 'An' },
  ios: { brand: 'ios', label: 'iOS', shortLabel: 'iO' },
  'iphone': { brand: 'ios', label: 'iOS', shortLabel: 'iO' },
  'ipad': { brand: 'ios', label: 'iOS', shortLabel: 'iO' },
};

const SIZE_CLASSES = {
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-6 h-6 text-xs',
  lg: 'w-8 h-8 text-sm',
};

export const BrowserIcon: React.FC<BrandIconProps> = ({ 
  name, 
  size = 'md', 
  showLabel = false,
  className = '' 
}) => {
  const normalizedName = name?.toLowerCase().trim() || '';
  const iconInfo = BROWSER_ICONS[normalizedName] || { brand: 'unknown' as BrandType, label: name || 'Unknown', shortLabel: '?' };
  
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div 
        className={cn(
          "brand-icon rounded-sm font-bold",
          SIZE_CLASSES[size],
          `brand-icon-${iconInfo.brand}`
        )}
        title={iconInfo.label}
      >
        {iconInfo.shortLabel}
      </div>
      {showLabel && (
        <span className="text-xs text-on-surface-variant">{iconInfo.label}</span>
      )}
    </div>
  );
};

export const OSIcon: React.FC<BrandIconProps> = ({ 
  name, 
  size = 'md', 
  showLabel = false,
  className = '' 
}) => {
  const normalizedName = name?.toLowerCase().trim() || '';
  const iconInfo = OS_ICONS[normalizedName] || { brand: 'unknown' as BrandType, label: name || 'Unknown', shortLabel: '?' };
  
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div 
        className={cn(
          "brand-icon rounded-sm font-bold",
          SIZE_CLASSES[size],
          `brand-icon-${iconInfo.brand}`
        )}
        title={iconInfo.label}
      >
        {iconInfo.shortLabel}
      </div>
      {showLabel && (
        <span className="text-xs text-on-surface-variant">{iconInfo.label}</span>
      )}
    </div>
  );
};

export const getBrowserIcon = (name: string): BrandType => {
  const normalizedName = name?.toLowerCase().trim() || '';
  return BROWSER_ICONS[normalizedName]?.brand || 'unknown';
};

export const getOSIcon = (name: string): BrandType => {
  const normalizedName = name?.toLowerCase().trim() || '';
  return OS_ICONS[normalizedName]?.brand || 'unknown';
};

export default { BrowserIcon, OSIcon, getBrowserIcon, getOSIcon };
