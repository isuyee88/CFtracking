/**
 * File: antd-theme.ts
 * Purpose: Ant Design主题定制配置
 * Input/Output: 提供Ant Design的ConfigProvider配置
 * Logic: 根据语义化颜色系统定制Ant Design组件样式
 */

import type { ThemeConfig } from 'antd';
import { semanticColors } from './colors';

// 白天模式主题配置
export const lightTheme: ThemeConfig = {
  token: {
    // 主色调
    colorPrimary: semanticColors.primary.DEFAULT,
    colorPrimaryHover: semanticColors.primary.hover,
    colorPrimaryActive: semanticColors.primary.active,
    
    // 成功色
    colorSuccess: semanticColors.success.DEFAULT,
    colorSuccessHover: semanticColors.success.hover,
    colorSuccessActive: semanticColors.success.active,
    
    // 错误色
    colorError: semanticColors.danger.DEFAULT,
    colorErrorHover: semanticColors.danger.hover,
    colorErrorActive: semanticColors.danger.active,
    
    // 警告色
    colorWarning: semanticColors.warning.DEFAULT,
    colorWarningHover: semanticColors.warning.hover,
    colorWarningActive: semanticColors.warning.active,
    
    // 信息色
    colorInfo: semanticColors.primary.DEFAULT,
    
    // 文字颜色
    colorText: '#0F172A',
    colorTextSecondary: '#475569',
    colorTextTertiary: '#94A3B8',
    colorTextQuaternary: '#CBD5E1',
    
    // 背景颜色
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#F1F5F9',
    colorBgLayout: '#F8FAFC',
    colorBgSpotlight: '#0F172A',
    
    // 边框颜色
    colorBorder: '#E2E8F0',
    colorBorderSecondary: '#F1F5F9',
    
    // 圆角
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    borderRadiusXS: 2,
    
    // 字体
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    
    // 间距
    paddingXS: 8,
    paddingSM: 12,
    padding: 16,
    paddingMD: 20,
    paddingLG: 24,
    paddingXL: 32,
    
    // 控件高度
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,
    controlHeightXS: 24,
    
    // 阴影
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.12)',
    boxShadowTertiary: '0 8px 32px rgba(0, 0, 0, 0.15)',
  },
  
  components: {
    // 按钮定制
    Button: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      paddingContentHorizontal: 16,
      paddingContentHorizontalLG: 20,
      paddingContentHorizontalSM: 12,
      defaultBg: '#FFFFFF',
      defaultColor: '#0F172A',
      defaultBorderColor: '#E2E8F0',
      defaultHoverBg: '#F8FAFC',
      defaultHoverColor: '#0F172A',
      defaultHoverBorderColor: '#CBD5E1',
      defaultActiveBg: '#F1F5F9',
      defaultActiveColor: '#0F172A',
      defaultActiveBorderColor: '#94A3B8',
    },
    
    // 表格定制
    Table: {
      borderRadius: 8,
      headerBg: '#F8FAFC',
      headerColor: '#475569',
      headerSplitColor: '#E2E8F0',
      rowHoverBg: '#F1F5F9',
      rowSelectedBg: '#DBEAFE',
      rowSelectedHoverBg: '#BFDBFE',
      padding: 12,
      paddingXS: 8,
      paddingSM: 12,
      paddingMD: 16,
    },
    
    // 卡片定制
    Card: {
      borderRadius: 8,
      paddingLG: 20,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
      boxShadowTertiary: '0 8px 32px rgba(0, 0, 0, 0.15)',
    },
    
    // 弹窗定制
    Modal: {
      borderRadius: 12,
      paddingContentHorizontalLG: 24,
      paddingMD: 20,
      contentBg: '#FFFFFF',
      headerBg: '#FFFFFF',
      footerBg: '#FFFFFF',
    },
    
    // 输入框定制
    Input: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      paddingInline: 12,
      paddingInlineLG: 16,
      paddingInlineSM: 8,
      activeBg: '#FFFFFF',
      hoverBg: '#FFFFFF',
    },
    
    // 选择器定制
    Select: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
    },
    
    // 标签页定制
    Tabs: {
      borderRadius: 6,
      margin: 0,
      padding: 12,
      paddingLG: 16,
      paddingSM: 8,
    },
    
    // 菜单定制
    Menu: {
      borderRadius: 6,
      itemBorderRadius: 6,
      itemMarginBlock: 4,
      itemMarginInline: 8,
      itemHeight: 40,
      subMenuItemBorderRadius: 6,
    },
    
    // 分页定制
    Pagination: {
      borderRadius: 6,
      itemSize: 36,
      itemSizeSM: 28,
      itemActiveBg: '#DBEAFE',
    },
    
    // 表单定制
    Form: {
      labelRequiredMarkColor: '#DC2626',
      labelColor: '#475569',
    },
    
    // 消息提示定制
    Message: {
      borderRadius: 8,
    },
    
    // 通知定制
    Notification: {
      borderRadius: 8,
    },
  },
};

// 夜晚模式主题配置
export const darkTheme: ThemeConfig = {
  token: {
    // 主色调
    colorPrimary: '#60A5FA',
    colorPrimaryHover: '#7AA7FF',
    colorPrimaryActive: '#5E8DE6',
    
    // 成功色
    colorSuccess: '#4ADE80',
    colorSuccessHover: '#22C55E',
    colorSuccessActive: '#16A34A',
    
    // 错误色
    colorError: '#F87171',
    colorErrorHover: '#EF4444',
    colorErrorActive: '#DC2626',
    
    // 警告色
    colorWarning: '#FB923C',
    colorWarningHover: '#F97316',
    colorWarningActive: '#EA580C',
    
    // 信息色
    colorInfo: '#7DD3FC',
    
    // 文字颜色
    colorText: '#F8FAFC',
    colorTextSecondary: '#CBD5E1',
    colorTextTertiary: '#64748B',
    colorTextQuaternary: '#475569',
    
    // 背景颜色
    colorBgContainer: '#1E293B',
    colorBgElevated: '#334155',
    colorBgLayout: '#0F172A',
    colorBgSpotlight: '#F8FAFC',
    
    // 边框颜色
    colorBorder: '#334155',
    colorBorderSecondary: '#1E293B',
    
    // 圆角保持一致
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    borderRadiusXS: 2,
    
    // 字体
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    
    // 间距
    paddingXS: 8,
    paddingSM: 12,
    padding: 16,
    paddingMD: 20,
    paddingLG: 24,
    paddingXL: 32,
    
    // 控件高度
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,
    controlHeightXS: 24,
    
    // 阴影 - 夜晚模式更深
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.4)',
    boxShadowTertiary: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  
  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      paddingContentHorizontal: 16,
      paddingContentHorizontalLG: 20,
      paddingContentHorizontalSM: 12,
      defaultBg: '#1E293B',
      defaultColor: '#F8FAFC',
      defaultBorderColor: '#334155',
      defaultHoverBg: '#334155',
      defaultHoverColor: '#F8FAFC',
      defaultHoverBorderColor: '#475569',
      defaultActiveBg: '#475569',
      defaultActiveColor: '#F8FAFC',
      defaultActiveBorderColor: '#64748B',
    },
    
    Table: {
      borderRadius: 8,
      headerBg: '#334155',
      headerColor: '#CBD5E1',
      headerSplitColor: '#475569',
      rowHoverBg: '#334155',
      rowSelectedBg: '#1E3A8A',
      rowSelectedHoverBg: '#1E40AF',
      padding: 12,
      paddingXS: 8,
      paddingSM: 12,
      paddingMD: 16,
      colorBgContainer: '#1E293B',
    },
    
    Card: {
      borderRadius: 8,
      paddingLG: 20,
      colorBgContainer: '#1E293B',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
      boxShadowTertiary: '0 8px 32px rgba(0, 0, 0, 0.5)',
    },
    
    Modal: {
      borderRadius: 12,
      paddingContentHorizontalLG: 24,
      paddingMD: 20,
      contentBg: '#334155',
      headerBg: '#334155',
      footerBg: '#334155',
    },
    
    Input: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      paddingInline: 12,
      paddingInlineLG: 16,
      paddingInlineSM: 8,
      colorBgContainer: '#1E293B',
      colorBorder: '#334155',
      hoverBg: '#1E293B',
      activeBg: '#1E293B',
    },
    
    Select: {
      borderRadius: 6,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      colorBgContainer: '#1E293B',
      colorBorder: '#334155',
    },
    
    Tabs: {
      borderRadius: 6,
      margin: 0,
      padding: 12,
      paddingLG: 16,
      paddingSM: 8,
      colorBgContainer: '#1E293B',
    },
    
    Menu: {
      borderRadius: 6,
      itemBorderRadius: 6,
      itemMarginBlock: 4,
      itemMarginInline: 8,
      itemHeight: 40,
      subMenuItemBorderRadius: 6,
      colorBgContainer: '#1E293B',
      itemColor: '#CBD5E1',
      itemSelectedColor: '#60A5FA',
      itemSelectedBg: 'rgba(96, 165, 250, 0.1)',
    },
    
    Pagination: {
      borderRadius: 6,
      itemSize: 36,
      itemSizeSM: 28,
      itemActiveBg: '#1E3A8A',
      colorBgContainer: '#1E293B',
    },
    
    Form: {
      labelRequiredMarkColor: '#F87171',
      labelColor: '#CBD5E1',
    },
    
    DatePicker: {
      colorBgContainer: '#1E293B',
      colorBgElevated: '#334155',
      colorBorder: '#334155',
    },
    
    Dropdown: {
      colorBgElevated: '#334155',
    },
    
    Tooltip: {
      colorBgDefault: '#334155',
    },
  },
};
