/**
 * File: ConfirmDialog.tsx
 * Purpose: 通用确认对话框组件，用于删除等破坏性操作的二次确认
 * Input/Output: 接收标题、描述、按钮文案等配置，返回用户确认结果
 * Logic: 支持多种变体（danger/warning/info），带进入/退出动画，ESC键关闭
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { TriangleAlert, AlertCircle, Info, X, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 确认对话框变体类型 */
export type ConfirmVariant = 'danger' | 'warning' | 'info';

/** 确认对话框配置选项 */
export interface ConfirmOptions {
  /** 对话框标题 */
  title: string;
  /** 对话框描述内容 */
  message?: string;
  /** 确认按钮文案 */
  confirmText?: string;
  /** 取消按钮文案 */
  cancelText?: string;
  /** 对话框变体，影响图标和确认按钮颜色 */
  variant?: ConfirmVariant;
  /** 是否显示加载状态（异步操作时使用） */
  loading?: boolean;
  /** 点击遮罩层是否可关闭 */
  closeOnOverlayClick?: boolean;
  /** 自定义确认按钮的额外类名 */
  confirmClassName?: string;
}

/** 内部状态接口 */
interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
}

/** 变体对应的图标和颜色配置 */
const variantConfig: Record<ConfirmVariant, {
  icon: React.ReactNode;
  iconBgColor: string;
  iconTextColor: string;
  confirmBtnClass: string;
  confirmBtnHoverClass: string;
}> = {
  danger: {
    icon: <TriangleAlert size={24} />,
    iconBgColor: 'bg-danger/10',
    iconTextColor: 'text-danger',
    confirmBtnClass: 'bg-danger text-white',
    confirmBtnHoverClass: 'hover:bg-danger/90',
  },
  warning: {
    icon: <AlertCircle size={24} />,
    iconBgColor: 'bg-warning/10',
    iconTextColor: 'text-warning-fg',
    confirmBtnClass: 'bg-warning-fg text-white',
    confirmBtnHoverClass: 'hover:bg-warning-fg/90',
  },
  info: {
    icon: <Info size={24} />,
    iconBgColor: 'bg-info/10',
    iconTextColor: 'text-info',
    confirmBtnClass: 'bg-primary text-on-primary',
    confirmBtnHoverClass: 'hover:bg-primary/90',
  },
};

interface ConfirmDialogProps {
  state: ConfirmState | null;
  onClose: (confirmed: boolean) => void;
}

/**
 * ConfirmDialog 确认对话框组件
 *
 * 用于危险操作（如删除）的二次确认，支持三种视觉变体：
 * - danger: 红色主题，适用于不可逆的破坏性操作
 * - warning: 黄色主题，适用于需要用户注意的操作
 * - info: 蓝色主题，适用于一般性确认
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ state, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const prevActiveElement = useRef<Element | null>(null);

  const options = state?.options ?? {
    title: '',
    variant: 'danger' as ConfirmVariant,
  };
  const variant = options.variant ?? 'danger';
  const config = variantConfig[variant];

  // ESC 键关闭
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state?.isOpen && !options.loading) {
        onClose(false);
      }
    },
    [state?.isOpen, options.loading, onClose]
  );

  // 聚焦管理：打开时记住焦点，关闭时恢复
  useEffect(() => {
    if (state?.isOpen) {
      prevActiveElement.current = document.activeElement;
      // 延迟聚焦到确认按钮，确保动画完成后再聚焦
      setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 100);
    }

    return () => {
      if (prevActiveElement.current instanceof HTMLElement) {
        prevActiveElement.current.focus();
      }
    };
  }, [state?.isOpen]);

  // 全局键盘事件监听
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 打开时禁止背景滚动
  useEffect(() => {
    if (state?.isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [state?.isOpen]);

  if (!state?.isOpen) {
    return null;
  }

  const handleOverlayClick = () => {
    if (options.closeOnOverlayClick !== false && !options.loading) {
      onClose(false);
    }
  };

  const handleConfirm = () => {
    if (!options.loading) {
      onClose(true);
    }
  };

  const handleCancel = () => {
    if (!options.loading) {
      onClose(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={options.message ? 'confirm-dialog-description' : undefined}
    >
      <div
        ref={dialogRef}
        className={cn(
          'bg-surface-container rounded-lg shadow-xl p-6 max-w-md w-full mx-4',
          'animate-in zoom-in-95 fade-in duration-150'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 图标和关闭按钮 */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn('rounded-full p-2.5', config.iconBgColor)}>
            <span className={config.iconTextColor}>{config.icon}</span>
          </div>
          {!options.loading && (
            <button
              onClick={handleCancel}
              className={cn(
                'p-1 rounded-md transition-colors',
                'text-fg-muted hover:text-fg-default hover:bg-surface-container-high'
              )}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* 标题 */}
        <h3
          id="confirm-dialog-title"
          className="text-lg font-semibold text-fg-default"
        >
          {options.title}
        </h3>

        {/* 描述 */}
        {options.message && (
          <p
            id="confirm-dialog-description"
            className="text-sm text-fg-muted mt-2 leading-relaxed"
          >
            {options.message}
          </p>
        )}

        {/* 按钮组 */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handleCancel}
            disabled={options.loading}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              'border border-border-default text-fg-default',
              'hover:bg-surface-container-high',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {options.cancelText ?? 'Cancel'}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={handleConfirm}
            disabled={options.loading}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-2',
              config.confirmBtnClass,
              config.confirmBtnHoverClass,
              'disabled:cursor-not-allowed disabled:opacity-70',
              options.confirmClassName
            )}
          >
            {options.loading && <Loader2 size={16} className="animate-spin" />}
            {options.loading ? 'Processing...' : (options.confirmText ?? 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
