/**
 * File: index.tsx
 * Purpose: 数据趋势指示器组件 - 显示数据增长/下降趋势
 * Input/Output: 接收趋势值和方向，渲染对应颜色的趋势指示
 * Logic: 根据isPositive和value显示绿色（增长）或红色（下降）的箭头
 */

import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { trendColors } from '@/theme/colors';
import { cn } from '@/utils/cn';

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface TrendIndicatorProps {
  /** 趋势值（百分比或数值） */
  value: number;
  /** 是否正向趋势（增长） */
  isPositive?: boolean;
  /** 趋势方向（可选，如果不提供则根据value自动判断） */
  direction?: TrendDirection;
  /** 是否显示百分比符号 */
  showPercentage?: boolean;
  /** 自定义前缀（如 + 或 -） */
  prefix?: string;
  /** 自定义后缀（如 %） */
  suffix?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 反转颜色逻辑（用于特殊场景，如成本下降是好事） */
  reverseColor?: boolean;
}

/**
 * 数据趋势指示器组件
 * 
 * @example
 * // 增长趋势 - 绿色箭头向上
 * <TrendIndicator value={12.5} isPositive={true} />
 * 
 * // 下降趋势 - 红色箭头向下
 * <TrendIndicator value={-8.3} isPositive={false} />
 * 
 * // 中性趋势
 * <TrendIndicator value={0} direction="neutral" />
 * 
 * // 自定义显示
 * <TrendIndicator value={25} suffix="%" size="lg" />
 */
export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  value,
  isPositive,
  direction,
  showPercentage = true,
  prefix,
  suffix,
  size = 'md',
  showIcon = true,
  className,
  reverseColor = false,
}) => {
  // 确定趋势方向
  const getDirection = (): TrendDirection => {
    if (direction) return direction;
    if (value > 0) return 'up';
    if (value < 0) return 'down';
    return 'neutral';
  };

  const trendDirection = getDirection();
  
  // 确定是否为正向（考虑reverseColor）
  const isPositiveTrend = isPositive !== undefined 
    ? isPositive 
    : trendDirection === 'up';
  
  // 最终颜色逻辑
  const isGoodTrend = reverseColor ? !isPositiveTrend : isPositiveTrend;

  // 获取颜色
  const getColor = () => {
    if (trendDirection === 'neutral') return trendColors.neutral.DEFAULT;
    return isGoodTrend ? trendColors.up.DEFAULT : trendColors.down.DEFAULT;
  };

  // 获取背景色（浅色）
  const getBgColor = () => {
    if (trendDirection === 'neutral') return trendColors.neutral.light;
    return isGoodTrend ? trendColors.up.light : trendColors.down.light;
  };

  const color = getColor();
  const bgColor = getBgColor();

  // 尺寸配置
  const sizeConfig = {
    sm: {
      iconSize: 12,
      fontSize: '12px',
      padding: '2px 6px',
      gap: '2px',
    },
    md: {
      iconSize: 14,
      fontSize: '14px',
      padding: '4px 8px',
      gap: '4px',
    },
    lg: {
      iconSize: 16,
      fontSize: '16px',
      padding: '6px 12px',
      gap: '6px',
    },
  };

  const config = sizeConfig[size];

  // 格式化数值
  const formatValue = (): string => {
    const absValue = Math.abs(value);
    const formattedValue = absValue % 1 === 0 ? absValue.toString() : absValue.toFixed(1);
    
    let result = '';
    
    // 添加前缀
    if (prefix !== undefined) {
      result += prefix;
    } else if (value > 0) {
      result += '+';
    }
    
    result += formattedValue;
    
    // 添加后缀
    if (suffix !== undefined) {
      result += suffix;
    } else if (showPercentage) {
      result += '%';
    }
    
    return result;
  };

  // 获取图标
  const getIcon = () => {
    if (!showIcon) return null;
    
    const iconProps = {
      size: config.iconSize,
      color: color,
    };

    switch (trendDirection) {
      case 'up':
        return <ArrowUp {...iconProps} />;
      case 'down':
        return <ArrowDown {...iconProps} />;
      case 'neutral':
        return <Minus {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md',
        className
      )}
      style={{
        color: color,
        backgroundColor: bgColor,
        fontSize: config.fontSize,
        padding: config.padding,
        gap: config.gap,
      }}
    >
      {getIcon()}
      <span>{formatValue()}</span>
    </span>
  );
};

/**
 * 简化版趋势指示器 - 仅显示图标
 */
export const TrendIcon: React.FC<{
  direction: TrendDirection;
  size?: number;
  className?: string;
}> = ({ direction, size = 16, className }) => {
  const getColor = () => {
    switch (direction) {
      case 'up':
        return trendColors.up.DEFAULT;
      case 'down':
        return trendColors.down.DEFAULT;
      case 'neutral':
        return trendColors.neutral.DEFAULT;
      default:
        return trendColors.neutral.DEFAULT;
    }
  };

  const color = getColor();

  const iconProps = {
    size,
    color,
    className: cn('inline-block', className),
  };

  switch (direction) {
    case 'up':
      return <ArrowUp {...iconProps} />;
    case 'down':
      return <ArrowDown {...iconProps} />;
    case 'neutral':
      return <Minus {...iconProps} />;
    default:
      return null;
  }
};

export default TrendIndicator;

/**
 * 趋势徽章组件 - 用于表格和列表中的紧凑显示
 */
export interface TrendBadgeProps {
  /** 趋势值 */
  value: number;
  /** 是否正向趋势 */
  isPositive?: boolean;
  /** 是否显示百分比 */
  showPercentage?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({
  value,
  isPositive,
  showPercentage = true,
  className,
}) => {
  const direction: TrendDirection = value > 0 ? 'up' : value < 0 ? 'down' : 'neutral';
  const isGood = isPositive !== undefined ? isPositive : direction === 'up';
  
  const color = direction === 'neutral' 
    ? trendColors.neutral.DEFAULT 
    : isGood ? trendColors.up.DEFAULT : trendColors.down.DEFAULT;

  const formatValue = (): string => {
    const prefix = value > 0 ? '+' : '';
    const suffix = showPercentage ? '%' : '';
    return `${prefix}${value.toFixed(1)}${suffix}`;
  };

  return (
    <span
      className={cn('inline-flex items-center text-xs font-medium', className)}
      style={{ color }}
    >
      {formatValue()}
    </span>
  );
};
