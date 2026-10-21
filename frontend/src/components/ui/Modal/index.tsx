/**
 * Modal 对话框组件
 * 
 * 用途：显示对话框、确认框、信息提示等弹窗
 * 输入：显隐状态、标题、内容、操作按钮配置
 * 输出：模态对话框元素
 * 交互：打开/关闭、确认/取消、点击遮罩关闭
 */

import React, { useEffect, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Info, HelpCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { SemanticButton, CancelButton, DeleteButton, SaveButton } from '../SemanticButton';
import { semanticColors } from '@/theme/colors';

export interface ModalProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 标题 */
  title?: React.ReactNode;
  /** 内容 */
  children: React.ReactNode;
  /** 底部操作区域 */
  footer?: React.ReactNode;
  /** 是否显示关闭按钮 */
  closable?: boolean;
  /** 点击遮罩是否关闭 */
  maskClosable?: boolean;
  /** 是否显示遮罩 */
  mask?: boolean;
  /** 宽度 */
  width?: string | number;
  /** 自定义类名 */
  className?: string;
  /** 内容区域类名 */
  contentClassName?: string;
  /** 是否居中显示 */
  centered?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  closable = true,
  maskClosable = true,
  mask = true,
  width = 520,
  className,
  contentClassName,
  centered = false,
}) => {
  // ESC 键关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && closable) {
      onClose();
    }
  }, [closable, onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  const handleMaskClick = () => {
    if (maskClosable) {
      onClose();
    }
  };

  const widthStyle = typeof width === 'number' ? `${width}px` : width;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      {mask && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          onClick={handleMaskClick}
        />
      )}

      {/* 对话框 */}
      <div
        className={cn(
          'relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl',
          'flex flex-col max-h-[90vh]',
          'animate-in zoom-in-95 duration-200',
          centered && 'my-auto',
          className
        )}
        style={{ width: widthStyle, maxWidth: 'calc(100vw - 32px)' }}
        role="dialog"
        aria-modal="true"
      >
        {/* 头部 */}
        {title !== undefined && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </div>
            {closable && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* 内容 */}
        <div className={cn('flex-1 overflow-auto p-6', contentClassName)}>
          {children}
        </div>

        {/* 底部 */}
        {footer !== undefined && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== 预设对话框组件 ====================

export interface ConfirmModalProps extends Omit<ModalProps, 'children' | 'footer'> {
  /** 内容描述 */
  content: React.ReactNode;
  /** 确认按钮文字 */
  okText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 确认回调 */
  onOk?: () => void | Promise<void>;
  /** 确认按钮语义 */
  okSemantic?: 'primary' | 'danger' | 'success';
  /** 是否显示取消按钮 */
  showCancel?: boolean;
  /** 是否加载中 */
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  content,
  okText = 'Confirm',
  cancelText = 'Cancel',
  onOk,
  onClose,
  okSemantic = 'primary',
  showCancel = true,
  loading = false,
  ...modalProps
}) => {
  const handleOk = async () => {
    if (onOk) {
      await onOk();
    }
    onClose();
  };

  return (
    <Modal
      {...modalProps}
      onClose={onClose}
      width={400}
      footer={
        <>
          {showCancel && (
            <CancelButton onClick={onClose} disabled={loading}>
              {cancelText}
            </CancelButton>
          )}
          <SemanticButton
            semantic={okSemantic}
            onClick={handleOk}
            loading={loading}
          >
            {okText}
          </SemanticButton>
        </>
      }
    >
      <div className="text-gray-600 dark:text-gray-300">
        {content}
      </div>
    </Modal>
  );
};

export interface AlertModalProps extends Omit<ModalProps, 'children' | 'footer'> {
  /** 内容描述 */
  content: React.ReactNode;
  /** 确认按钮文字 */
  okText?: string;
  /** 确认回调 */
  onOk?: () => void;
  /** 警告类型 */
  type?: 'info' | 'success' | 'warning' | 'error';
}

export const AlertModal: React.FC<AlertModalProps> = ({
  content,
  okText = 'Got it',
  onOk,
  onClose,
  type = 'info',
  ...modalProps
}) => {
  const iconConfig = {
    info: { icon: Info, color: semanticColors.primary.DEFAULT },
    success: { icon: CheckCircle, color: semanticColors.success.DEFAULT },
    warning: { icon: AlertTriangle, color: '#F59E0B' },
    error: { icon: AlertTriangle, color: semanticColors.danger.DEFAULT },
  };

  const { icon: Icon, color } = iconConfig[type];

  const handleOk = () => {
    onOk?.();
    onClose();
  };

  return (
    <Modal
      {...modalProps}
      onClose={onClose}
      width={400}
      footer={
        <SemanticButton semantic="primary" onClick={handleOk}>
          {okText}
        </SemanticButton>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div className="flex-1 text-gray-600 dark:text-gray-300 pt-1">
          {content}
        </div>
      </div>
    </Modal>
  );
};

export interface DeleteConfirmModalProps extends Omit<ModalProps, 'children' | 'footer'> {
  /** 要删除的项目名称 */
  itemName?: string;
  /** 确认回调 */
  onConfirm: () => void | Promise<void>;
  /** 是否加载中 */
  loading?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  itemName,
  onConfirm,
  onClose,
  loading = false,
  ...modalProps
}) => {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Modal
      {...modalProps}
      onClose={onClose}
      title="Confirm Delete"
      width={420}
      footer={
        <>
          <CancelButton onClick={onClose} disabled={loading}>
            Cancel
          </CancelButton>
          <DeleteButton onClick={handleConfirm} loading={loading}>
            Delete
          </DeleteButton>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${semanticColors.danger.light}` }}
        >
          <AlertTriangle className="w-6 h-6" style={{ color: semanticColors.danger.DEFAULT }} />
        </div>
        <div className="flex-1">
          <p className="text-gray-900 dark:text-white font-medium mb-1">
            Are you sure you want to delete?
          </p>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            {itemName ? (
              <>
                You are about to delete <strong className="text-gray-900 dark:text-white">{itemName}</strong>.
                This action cannot be undone.
              </>
            ) : (
              'This action cannot be undone.'
            )}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export interface FormModalProps extends Omit<ModalProps, 'footer'> {
  /** 确认按钮文字 */
  okText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 确认回调 */
  onSubmit?: () => void | Promise<void>;
  /** 是否加载中 */
  loading?: boolean;
  /** 是否可以提交 */
  submitDisabled?: boolean;
}

export const FormModal: React.FC<FormModalProps> = ({
  children,
  okText = 'Save',
  cancelText = 'Cancel',
  onSubmit,
  onClose,
  loading = false,
  submitDisabled = false,
  ...modalProps
}) => {
  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit();
    }
  };

  return (
    <Modal
      {...modalProps}
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} disabled={loading}>
            {cancelText}
          </CancelButton>
          <SaveButton
            onClick={handleSubmit}
            loading={loading}
            disabled={submitDisabled}
          >
            {okText}
          </SaveButton>
        </>
      }
    >
      {children}
    </Modal>
  );
};

export interface DrawerModalProps extends Omit<ModalProps, 'centered'> {
  /** 抽屉位置 */
  placement?: 'left' | 'right';
}

export const DrawerModal: React.FC<DrawerModalProps> = ({
  placement = 'right',
  className,
  ...modalProps
}) => {
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 遮罩层 */}
      {modalProps.mask && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          onClick={modalProps.maskClosable ? modalProps.onClose : undefined}
        />
      )}

      {/* 抽屉 */}
      <div
        className={cn(
          'absolute top-0 bottom-0 bg-white dark:bg-gray-800 shadow-2xl',
          'flex flex-col',
          placement === 'left' && 'left-0 animate-in slide-in-from-left duration-300',
          placement === 'right' && 'right-0 animate-in slide-in-from-right duration-300',
          className
        )}
        style={{ width: modalProps.width || 400, maxWidth: '100vw' }}
        role="dialog"
        aria-modal="true"
      >
        {/* 头部 */}
        {modalProps.title !== undefined && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {modalProps.title}
            </div>
            {modalProps.closable !== false && (
              <button
                onClick={modalProps.onClose}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* 内容 */}
        <div className={cn('flex-1 overflow-auto p-6', modalProps.contentClassName)}>
          {modalProps.children}
        </div>

        {/* 底部 */}
        {modalProps.footer !== undefined && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            {modalProps.footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
