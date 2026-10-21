/**
 * File: index.tsx
 * Purpose: 语义化按钮组件 - 基于设计规范的颜色系统
 * Input/Output: 接收按钮属性，渲染对应语义颜色的按钮
 * Logic: 根据semantic属性应用不同的颜色方案（danger/success/primary/secondary）
 */

import React from 'react';
import { Button as AntButton } from 'antd';
import type { ButtonProps as AntButtonProps } from 'antd';
import { 
  Plus, 
  Trash2, 
  Pause, 
  Archive, 
  Ban, 
  Play, 
  Check, 
  CheckCircle,
  X,
  ArrowLeft,
  Edit,
  Eye,
  Save
} from 'lucide-react';
import { semanticColors } from '@/theme/colors';
import { cn } from '@/utils/cn';

export type SemanticType = 'primary' | 'success' | 'danger' | 'secondary' | 'warning';
export type ButtonVariant = 'solid' | 'outlined' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface SemanticButtonProps extends Omit<AntButtonProps, 'type' | 'size'> {
  /** 语义化类型 - 决定按钮颜色 */
  semantic?: SemanticType;
  /** 变体样式 */
  variant?: ButtonVariant;
  /** 尺寸 */
  size?: ButtonSize;
  /** 是否加载中 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 子元素 */
  children?: React.ReactNode;
  /** 图标 */
  icon?: React.ReactNode;
}

/**
 * 语义化按钮组件
 * 
 * @example
 * // 新建按钮 - 绿色（积极操作）
 * <SemanticButton semantic="success" icon={<Plus />}>新建活动</SemanticButton>
 * 
 * // 删除按钮 - 红色（危险操作）
 * <SemanticButton semantic="danger" variant="outlined" icon={<Trash2 />}>删除</SemanticButton>
 * 
 * // 保存按钮 - 绿色
 * <SemanticButton semantic="success" icon={<Save />}>保存</SemanticButton>
 * 
 * // 取消按钮 - 灰色（次要操作）
 * <SemanticButton semantic="secondary" variant="outlined">取消</SemanticButton>
 */
export const SemanticButton: React.FC<SemanticButtonProps> = ({
  semantic = 'primary',
  variant = 'solid',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  children,
  icon,
  style,
  ...props
}) => {
  // 获取语义化颜色
  const getSemanticColor = (type: SemanticType) => {
    switch (type) {
      case 'danger':
        return semanticColors.danger;
      case 'success':
        return semanticColors.success;
      case 'primary':
        return semanticColors.primary;
      case 'secondary':
        return semanticColors.secondary;
      case 'warning':
        return semanticColors.warning;
      default:
        return semanticColors.primary;
    }
  };

  const colors = getSemanticColor(semantic);

  // 生成样式
  const getButtonStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      borderRadius: '6px',
      fontWeight: 500,
      transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    };

    // 尺寸样式
    const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
      sm: { height: '28px', padding: '0 12px', fontSize: '12px' },
      md: { height: '36px', padding: '0 16px', fontSize: '14px' },
      lg: { height: '44px', padding: '0 20px', fontSize: '16px' },
    };

    // 变体样式
    const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
      solid: {
        backgroundColor: colors.DEFAULT,
        color: colors.foreground,
        border: `1px solid ${colors.DEFAULT}`,
      },
      outlined: {
        backgroundColor: 'transparent',
        color: colors.DEFAULT,
        border: `1px solid ${colors.DEFAULT}`,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: colors.DEFAULT,
        border: '1px solid transparent',
      },
      link: {
        backgroundColor: 'transparent',
        color: colors.DEFAULT,
        border: 'none',
        textDecoration: 'underline',
        padding: '0',
        height: 'auto',
      },
    };

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...style,
    };
  };

  // 悬停和激活状态处理
  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    if (variant === 'solid') {
      target.style.backgroundColor = colors.hover;
      target.style.borderColor = colors.hover;
    } else if (variant === 'outlined' || variant === 'ghost') {
      target.style.backgroundColor = colors.light;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    if (variant === 'solid') {
      target.style.backgroundColor = colors.DEFAULT;
      target.style.borderColor = colors.DEFAULT;
    } else if (variant === 'outlined' || variant === 'ghost') {
      target.style.backgroundColor = variant === 'outlined' ? 'transparent' : 'transparent';
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    if (variant === 'solid') {
      target.style.backgroundColor = colors.active;
      target.style.borderColor = colors.active;
    } else if (variant === 'outlined' || variant === 'ghost') {
      target.style.backgroundColor = colors.light;
      target.style.opacity = '0.8';
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    if (variant === 'solid') {
      target.style.backgroundColor = colors.hover;
      target.style.borderColor = colors.hover;
    } else if (variant === 'outlined' || variant === 'ghost') {
      target.style.backgroundColor = colors.light;
      target.style.opacity = '1';
    }
  };

  // 映射到Ant Design的type
  const antType: AntButtonProps['type'] = variant === 'link' ? 'link' : 
                                          variant === 'ghost' ? 'text' : 
                                          variant === 'outlined' ? 'default' : 'primary';

  return (
    <AntButton
      type={antType}
      size={size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'middle'}
      loading={loading}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={getButtonStyles()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      icon={icon}
      {...props}
    >
      {children}
    </AntButton>
  );
};

// 预设按钮组件 - 方便使用

/**
 * 新建按钮 - 绿色（积极操作）
 */
export const CreateButton: React.FC<Omit<SemanticButtonProps, 'semantic' | 'icon'>> = (props) => (
  <SemanticButton semantic="success" icon={<Plus size={16} />} {...props} />
);

/**
 * 删除按钮 - 红色（危险操作）
 */
export const DeleteButton: React.FC<Omit<SemanticButtonProps, 'semantic' | 'icon'>> = (props) => (
  <SemanticButton semantic="danger" icon={<Trash2 size={16} />} {...props} />
);

/**
 * 暂停按钮 - 红色（危险操作）
 */
export const PauseButton: React.FC<Omit<SemanticButtonProps, 'semantic' | 'icon'>> = (props) => (
  <SemanticButton semantic="danger" icon={<Pause size={16} />} {...props} />
);

/**
 * 归档按钮 - 红色（危险操作）
 */
export const ArchiveButton: React.FC<Omit<SemanticButtonProps, 'semantic' | 'icon'>> = (props) => (
  <SemanticButton semantic="danger" icon={<Archive size={16} />} {...props} />
);

/**
 * 禁用按钮 - 红色（危险操作）
 */
export const DisableButton: React.FC<Omit<SemanticButtonProps, 'semantic' | 'icon'>> = (props) => (
  <SemanticButton semantic="danger" icon={<Ban size={16} />} {...props} />
);

/**
 * 启用按钮 - 绿色（积极操作）
 */
export const EnableButton: React.FC<Omit<SemanticButtonProps, 'semantic' | 'icon'>> = (props) => (
  <SemanticButton semantic="success" icon={<Play size={16} />} {...props} />
);

/**
 * 保存按钮 - 绿色（积极操作）
 */
export const SaveButton: React.FC<Omit<SemanticButtonProps, 'semantic' | 'icon'>> = (props) => (
  <SemanticButton semantic="success" icon={<Save size={16} />} {...props} />
);

/**
 * 确认按钮 - 绿色（积极操作）
 */
export const ConfirmButton: React.FC<Omit<SemanticButtonProps, 'semantic' | 'icon'>> = (props) => (
  <SemanticButton semantic="success" icon={<CheckCircle size={16} />} {...props} />
);

/**
 * 取消按钮 - 灰色（次要操作）
 */
export const CancelButton: React.FC<Omit<SemanticButtonProps, 'semantic' | 'icon'>> = (props) => (
  <SemanticButton semantic="secondary" variant="outlined" icon={<X size={16} />} {...props} />
);

/**
 * 返回按钮 - 灰色（次要操作）
 */
export const BackButton: React.FC<Omit<SemanticButtonProps, 'semantic' | 'icon'>> = (props) => (
  <SemanticButton semantic="secondary" variant="outlined" icon={<ArrowLeft size={16} />} {...props} />
);

/**
 * 编辑按钮 - 蓝色（主要操作）
 */
export const EditButton: React.FC<Omit<SemanticButtonProps, 'semantic' | 'icon'>> = (props) => (
  <SemanticButton semantic="primary" variant="outlined" icon={<Edit size={16} />} {...props} />
);

/**
 * 查看按钮 - 蓝色（主要操作）
 */
export const ViewButton: React.FC<Omit<SemanticButtonProps, 'semantic' | 'icon'>> = (props) => (
  <SemanticButton semantic="primary" variant="outlined" icon={<Eye size={16} />} {...props} />
);

export default SemanticButton;
