/**
 * File: index.tsx
 * Purpose: 空状态组件 - 当没有数据时显示的占位组件
 * Input/Output: 接收空状态配置，渲染图标、标题、描述和操作按钮
 * Logic: 提供多种预设空状态类型，支持自定义内容
 */

import React from 'react';
import {
  Inbox,
  Search,
  FileX,
  AlertCircle,
  Plus,
  RefreshCw,
  Box,
  FileQuestion
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SemanticButton } from '@/components/ui/SemanticButton';
import { cn } from '@/utils/cn';

export type EmptyStateType = 'default' | 'search' | 'error' | 'no-data' | 'create' | 'custom';

export interface EmptyStateProps {
  /** 空状态类型 */
  type?: EmptyStateType;
  /** 自定义图标 */
  icon?: React.ReactNode;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 操作按钮 */
  action?: React.ReactNode;
  /** 操作按钮文本（使用预设按钮） */
  actionText?: string;
  /** 操作按钮回调 */
  onAction?: () => void;
  /** 次要操作按钮文本 */
  secondaryActionText?: string;
  /** 次要操作按钮回调 */
  onSecondaryAction?: () => void;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示边框 */
  bordered?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 空状态组件
 *
 * @example
 * // 默认空状态
 * <EmptyState />
 *
 * // 搜索无结果
 * <EmptyState
 *   type="search"
 *   title="未找到结果"
 *   description="请尝试其他关键词"
 * />
 *
 * // 需要创建数据
 * <EmptyState
 *   type="create"
 *   title="暂无活动"
 *   description="创建您的第一个活动开始追踪"
 *   actionText="创建活动"
 *   onAction={() => {}}
 * />
 *
 * // 错误状态
 * <EmptyState
 *   type="error"
 *   title="加载失败"
 *   description="请检查网络连接后重试"
 *   actionText="重试"
 *   onAction={() => {}}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'default',
  icon,
  title,
  description,
  action,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  size = 'md',
  bordered = true,
  className,
}) => {
  // 预设配置
  const presets: Record<EmptyStateType, {
    icon: LucideIcon;
    title: string;
    description: string;
    iconColor: string;
    bgColor: string;
  }> = {
    default: {
      icon: Inbox,
      title: '暂无数据',
      description: '当前没有可显示的数据',
      iconColor: '#64748B',
      bgColor: '#F1F5F9',
    },
    search: {
      icon: Search,
      title: '未找到结果',
      description: '请尝试调整搜索条件或关键词',
      iconColor: '#2563EB',
      bgColor: '#DBEAFE',
    },
    error: {
      icon: AlertCircle,
      title: '出错了',
      description: '加载数据时发生错误，请稍后重试',
      iconColor: '#DC2626',
      bgColor: '#FEE2E2',
    },
    'no-data': {
      icon: FileX,
      title: '没有数据',
      description: '该时间段内没有相关数据',
      iconColor: '#64748B',
      bgColor: '#F1F5F9',
    },
    create: {
      icon: Box,
      title: '开始创建',
      description: '还没有任何内容，创建第一个项目吧',
      iconColor: '#16A34A',
      bgColor: '#DCFCE7',
    },
    custom: {
      icon: FileQuestion,
      title: '',
      description: '',
      iconColor: '#64748B',
      bgColor: '#F1F5F9',
    },
  };

  const preset = presets[type];
  const IconComponent = preset.icon;

  // 尺寸配置
  const sizeConfig = {
    sm: {
      iconSize: 32,
      titleSize: 'text-base',
      descSize: 'text-xs',
      padding: 'p-4',
      gap: 'gap-2',
    },
    md: {
      iconSize: 48,
      titleSize: 'text-lg',
      descSize: 'text-sm',
      padding: 'p-8',
      gap: 'gap-3',
    },
    lg: {
      iconSize: 64,
      titleSize: 'text-xl',
      descSize: 'text-base',
      padding: 'p-12',
      gap: 'gap-4',
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        config.padding,
        config.gap,
        bordered && 'border border-dashed border-gray-200 dark:border-slate-700 rounded-lg',
        className
      )}
    >
      {/* 图标 */}
      {icon || (
        <div
          className="rounded-full p-4"
          style={{
            backgroundColor: preset.bgColor,
          }}
        >
          <IconComponent
            size={config.iconSize}
            style={{ color: preset.iconColor }}
          />
        </div>
      )}

      {/* 标题 */}
      {(title || preset.title) && (
        <h3
          className={cn(
            'font-semibold text-gray-900 dark:text-white',
            config.titleSize
          )}
        >
          {title || preset.title}
        </h3>
      )}

      {/* 描述 */}
      {(description || preset.description) && (
        <p
          className={cn(
            'text-gray-500 dark:text-gray-400 max-w-md',
            config.descSize
          )}
        >
          {description || preset.description}
        </p>
      )}

      {/* 操作按钮 */}
      {(action || actionText) && (
        <div className="flex items-center gap-3 mt-2">
          {action || (
            <SemanticButton
              semantic="primary"
              icon={<Plus size={16} />}
              onClick={onAction}
            >
              {actionText}
            </SemanticButton>
          )}

          {secondaryActionText && (
            <SemanticButton
              semantic="secondary"
              variant="outlined"
              icon={<RefreshCw size={16} />}
              onClick={onSecondaryAction}
            >
              {secondaryActionText}
            </SemanticButton>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 表格空状态 - 专门用于表格组件
 */
export const TableEmptyState: React.FC<{
  searchQuery?: string;
  onClearSearch?: () => void;
  onCreate?: () => void;
  createText?: string;
}> = ({ searchQuery, onClearSearch, onCreate, createText = '创建' }) => {
  if (searchQuery) {
    return (
      <EmptyState
        type="search"
        title="未找到匹配结果"
        description={`没有找到包含 "${searchQuery}" 的结果`}
        actionText="清除搜索"
        onAction={onClearSearch}
      />
    );
  }

  return (
    <EmptyState
      type="create"
      title="暂无数据"
      description="开始创建您的第一条记录"
      actionText={createText}
      onAction={onCreate}
    />
  );
};

export default EmptyState;
