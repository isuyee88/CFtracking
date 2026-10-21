/**
 * File: colors.ts
 * Purpose: 定义CF Tracking的语义化颜色系统
 * Input/Output: 提供语义化颜色常量，供主题配置使用
 * Logic: 基于设计规范定义颜色值，支持白天/夜晚模式
 */

// 语义化颜色 - 设计规范
export const semanticColors = {
  // 危险操作 - 红色系 (删除、暂停、归档、禁用)
  danger: {
    DEFAULT: '#DC2626',
    light: '#FEE2E2',
    dark: '#7F1D1D',
    hover: '#B91C1C',
    active: '#991B1B',
    foreground: '#FFFFFF',
  },
  
  // 积极操作 - 绿色系 (新建、启用、保存、确认)
  success: {
    DEFAULT: '#16A34A',
    light: '#DCFCE7',
    dark: '#14532D',
    hover: '#15803D',
    active: '#166534',
    foreground: '#FFFFFF',
  },
  
  // 主要操作 - 蓝色系 (主要按钮、链接)
  primary: {
    DEFAULT: '#2563EB',
    light: '#DBEAFE',
    dark: '#1E3A8A',
    hover: '#1D4ED8',
    active: '#1E40AF',
    foreground: '#FFFFFF',
  },
  
  // 次要操作 - 灰色系 (取消、返回)
  secondary: {
    DEFAULT: '#64748B',
    light: '#F1F5F9',
    dark: '#334155',
    hover: '#475569',
    active: '#334155',
    foreground: '#FFFFFF',
  },
  
  // 警告色
  warning: {
    DEFAULT: '#D97706',
    light: '#FEF3C7',
    dark: '#92400E',
    hover: '#B45309',
    active: '#78350F',
    foreground: '#FFFFFF',
  },
} as const;

// 数据趋势颜色
export const trendColors = {
  up: {
    DEFAULT: '#16A34A',    // 绿色 - 增长良好
    light: '#DCFCE7',
    dark: '#4ADE80',
  },
  down: {
    DEFAULT: '#DC2626',    // 红色 - 下降不良
    light: '#FEE2E2',
    dark: '#F87171',
  },
  neutral: {
    DEFAULT: '#64748B',
    light: '#F1F5F9',
    dark: '#94A3B8',
  },
} as const;

// 中性色阶
export const neutralColors = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
  950: '#020617',
} as const;

// 背景层级颜色
export const backgroundColors = {
  light: {
    canvas: '#F8FAFC',           // 页面背景
    surface: '#FFFFFF',          // 卡片背景
    elevated: '#F1F5F9',         // 悬浮背景
    surfaceContainer: '#F1F5F9',
    surfaceContainerLow: '#F8FAFC',
    surfaceContainerHigh: '#E2E8F0',
  },
  dark: {
    canvas: '#0F172A',
    surface: '#1E293B',
    elevated: '#334155',
    surfaceContainer: '#334155',
    surfaceContainerLow: '#1E293B',
    surfaceContainerHigh: '#475569',
  },
} as const;

// 文字颜色
export const textColors = {
  light: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    disabled: '#CBD5E1',
    inverse: '#FFFFFF',
  },
  dark: {
    primary: '#F8FAFC',
    secondary: '#CBD5E1',
    tertiary: '#64748B',
    disabled: '#475569',
    inverse: '#0F172A',
  },
} as const;

// 边框颜色
export const borderColors = {
  light: {
    DEFAULT: '#E2E8F0',
    strong: '#CBD5E1',
    subtle: '#F1F5F9',
  },
  dark: {
    DEFAULT: '#334155',
    strong: '#475569',
    subtle: '#1E293B',
  },
} as const;

export type SemanticColor = keyof typeof semanticColors;
export type TrendColor = keyof typeof trendColors;
