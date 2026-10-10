/**
 * File: useConfirmDialog.ts
 * Purpose: 确认对话框自定义 Hook，管理确认对话框状态
 * Input/Output: 提供 confirm 函数（返回 Promise<boolean>）和 ConfirmDialogComponent
 * Logic: 使用 Promise + 状态管理实现异步确认流程，支持链式调用
 */

import { useState, useCallback, useRef } from 'react';
import { ConfirmDialog, type ConfirmOptions } from '../components/ConfirmDialog';

/** Hook 返回值接口 */
interface UseConfirmDialogReturn {
  /** 触发确认对话框，返回 Promise<boolean>，true 表示用户确认 */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** 需要渲染到 JSX 中的确认对话框组件 */
  ConfirmDialogComponent: React.ReactElement;
}

/**
 * useConfirmDialog 自定义 Hook
 *
 * 用于在组件中快速集成二次确认功能。
 *
 * @example
 * ```tsx
 * const { confirm, ConfirmDialogComponent } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Delete Campaign',
 *     message: 'This action cannot be undone. Are you sure?',
 *     confirmText: 'Delete',
 *     variant: 'danger'
 *   });
 *   if (confirmed) {
 *     await deleteCampaign(id);
 *   }
 * };
 *
 * // 在 JSX 中渲染:
 * return (
 *   <div>
 *     {ConfirmDialogComponent}
 *     <button onClick={handleDelete}>Delete</button>
 *   </div>
 * );
 * ```
 */
export function useConfirmDialog(): UseConfirmDialogReturn {
  /** 对话框状态 */
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
  }>({
    isOpen: false,
    options: { title: '', variant: 'danger' },
  });

  /** Promise resolve 引用，用于异步回调 */
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  /** 关闭对话框并返回结果 */
  const handleClose = useCallback((confirmed: boolean) => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    // 延迟调用 resolve，确保退出动画完成
    setTimeout(() => {
      if (resolveRef.current) {
        resolveRef.current(confirmed);
        resolveRef.current = null;
      }
    }, 150);
  }, []);

  /**
   * 打开确认对话框
   * @param options - 对话框配置选项
   * @returns Promise<boolean> - 用户是否点击了确认按钮
   */
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    // 如果已经有一个打开的对话框，先关闭它
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDialogState({
        isOpen: true,
        options: {
          ...options,
          variant: options.variant ?? 'danger',
          confirmText: options.confirmText ?? 'Confirm',
          cancelText: options.cancelText ?? 'Cancel',
        },
      });
    });
  }, []);

  /** 构建对话框组件元素 */
  const ConfirmDialogComponent = (
    <ConfirmDialog
      state={
        dialogState.isOpen
          ? { isOpen: true, options: dialogState.options, resolve: null }
          : null
      }
      onClose={handleClose}
      key="confirm-dialog"
    />
  );

  return { confirm, ConfirmDialogComponent };
}

export default useConfirmDialog;
