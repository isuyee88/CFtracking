/**
 * File: EntityForm.tsx
 * Purpose: 通用实体表单组件，用于 Landing Pages、Offers、Traffic Sources、Affiliate Networks 的创建和编辑
 * Input/Output: 接收实体类型、字段配置、初始数据，输出表单提交事件
 * Logic: 动态渲染表单字段，支持验证和提交
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DISPLAY_MAX_LENGTH } from '../constants/fieldConstraints';
import { clampInput, truncateLabel } from '../utils/text';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface FormField {
  name: string;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'select'
    | 'multiselect'
    | 'number'
    | 'url'
    | 'email'
    | 'password'
    | 'json'
    | 'checkbox'
    | 'file';
  required?: boolean;
  maxLength?: number;
  optionLabelMaxLength?: number;
  placeholder?: string;
  options?: { value: string; label: string }[];
  accept?: string;
  maxFileSizeMB?: number;
  fileAsBase64?: boolean;
  description?: string;
  validation?: (value: any) => string | null;
  showWhen?: (data: Record<string, any>) => boolean;
}

function isFieldVisible(field: FormField, data: Record<string, any>): boolean {
  return field.showWhen ? field.showWhen(data) : true;
}

interface EntityFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  title: string;
  fields: FormField[];
  initialData?: Record<string, any>;
  mode: 'create' | 'edit';
}

export const EntityForm: React.FC<EntityFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  fields,
  initialData,
  mode
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const computedInitialData = useMemo(() => {
    if (!isOpen) return null;
    const initial: Record<string, any> = {};
    fields.forEach(field => {
      initial[field.name] = initialData?.[field.name] ??
        (field.type === 'multiselect' ? [] : field.type === 'checkbox' ? false : '');
    });
    return initial;
  }, [isOpen, initialData, fields]);

  useEffect(() => {
    if (isOpen && computedInitialData) {
      setFormData(computedInitialData);
      setErrors({});
      setTouched({});
    }
  }, [isOpen, computedInitialData]);

  const handleChange = (name: string, value: any) => {
    const field = fields.find(item => item.name === name);
    let nextValue = value;

    if (
      field?.maxLength &&
      typeof value === 'string' &&
      (field.type === 'text' ||
        field.type === 'textarea' ||
        field.type === 'url' ||
        field.type === 'email' ||
        field.type === 'password')
    ) {
      nextValue = clampInput(value, field.maxLength);
    }

    setFormData(prev => ({ ...prev, [name]: nextValue }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, formData[name]);
  };

  const validateField = (name: string, value: any): boolean => {
    const field = fields.find(f => f.name === name);
    if (!field) return true;
    if (!isFieldVisible(field, formData)) {
      return true;
    }

    // Required validation
    if (field.required) {
      if (field.type === 'file') {
        if (!value || typeof value !== 'object' || !value.base64) {
          setErrors(prev => ({ ...prev, [name]: `${field.label} is required` }));
          return false;
        }
      } else if (field.type === 'checkbox') {
        if (!value) {
          setErrors(prev => ({ ...prev, [name]: `${field.label} is required` }));
          return false;
        }
      } else
      if (field.type === 'multiselect') {
        if (!value || value.length === 0) {
          setErrors(prev => ({ ...prev, [name]: `${field.label} is required` }));
          return false;
        }
      } else if (!value || value.toString().trim() === '') {
        setErrors(prev => ({ ...prev, [name]: `${field.label} is required` }));
        return false;
      }
    }

    // Custom validation
    if (field.validation && value) {
      const error = field.validation(value);
      if (error) {
        setErrors(prev => ({ ...prev, [name]: error }));
        return false;
      }
    }

    return true;
  };

  const validateForm = (): boolean => {
    let isValid = true;
    fields.forEach(field => {
      if (!isFieldVisible(field, formData)) {
        return;
      }
      if (!validateField(field.name, formData[field.name])) {
        isValid = false;
      }
    });
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    fields.forEach(field => {
      allTouched[field.name] = true;
    });
    setTouched(allTouched);

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name];
    const error = touched[field.name] ? errors[field.name] : null;
    const optionLabelMaxLength = field.optionLabelMaxLength ?? DISPLAY_MAX_LENGTH.SELECT_OPTION_LABEL;

    const baseInputClass = cn(
      "w-full px-4 py-3 bg-surface border rounded-sm text-sm transition-all",
      "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20",
      error ? "border-error" : "border-outline-variant hover:border-outline"
    );

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field.name)}
            placeholder={field.placeholder}
            rows={4}
            maxLength={field.maxLength}
            className={cn(baseInputClass, "resize-none")}
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field.name)}
            className={baseInputClass}
          >
            <option value="">Select {field.label}...</option>
            {field.options?.map(option => {
              const fullLabel = option.label || option.value;
              return (
                <option key={option.value} value={option.value} title={fullLabel}>
                  {truncateLabel(fullLabel, optionLabelMaxLength)}
                </option>
              );
            })}
          </select>
        );

      case 'multiselect':
        // 如果有预定义选项，使用下拉选择模式
        if (field.options && field.options.length > 0) {
          const selectedValues = value || [];
          const availableOptions = field.options.filter(opt => !selectedValues.includes(opt.value));
          
          return (
            <div className="space-y-2">
              {/* 已选择的项 */}
              <div className="flex flex-wrap gap-2">
                {selectedValues.map((item: string, idx: number) => {
                  const option = field.options?.find(o => o.value === item);
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-sm"
                      title={option?.label || item}
                    >
                      {truncateLabel(option?.label || item, optionLabelMaxLength)}
                      <button
                        type="button"
                        onClick={() => {
                          const newValue = selectedValues.filter((_: any, i: number) => i !== idx);
                          handleChange(field.name, newValue);
                        }}
                        className="text-on-surface-variant hover:text-error ml-1"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  );
                })}
              </div>
              
              {/* 下拉选择框 */}
              {availableOptions.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleChange(field.name, [...selectedValues, e.target.value]);
                      e.target.value = '';
                    }
                  }}
                  className={baseInputClass}
                >
                  <option value="">Select {field.label}...</option>
                  {availableOptions.map(option => {
                    const fullLabel = option.label || option.value;
                    return (
                      <option key={option.value} value={option.value} title={fullLabel}>
                        {truncateLabel(fullLabel, optionLabelMaxLength)}
                      </option>
                    );
                  })}
                </select>
              )}
              
              {/* 搜索/过滤输入框 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={field.placeholder || "Search or add custom value..."}
                  className={cn(baseInputClass, "flex-1")}
                  maxLength={field.maxLength}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const inputValue = clampInput(input.value.trim(), field.maxLength).trim();
                      if (inputValue && !selectedValues.includes(inputValue)) {
                        handleChange(field.name, [...selectedValues, inputValue]);
                        input.value = '';
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                    const inputValue = clampInput(input.value.trim(), field.maxLength).trim();
                    if (inputValue && !selectedValues.includes(inputValue)) {
                      handleChange(field.name, [...selectedValues, inputValue]);
                      input.value = '';
                    }
                  }}
                  className="px-4 py-3 bg-surface-container text-primary hover:bg-surface-container-high rounded-sm transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          );
        }
        
        // 没有预定义选项时，使用手动输入模式
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {(value || []).map((item: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-surface-container text-sm rounded-sm"
                  title={item}
                >
                  {truncateLabel(item, optionLabelMaxLength)}
                  <button
                    type="button"
                    onClick={() => {
                      const newValue = (value || []).filter((_: any, i: number) => i !== idx);
                      handleChange(field.name, newValue);
                    }}
                    className="text-on-surface-variant hover:text-error"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add item..."
                  className={cn(baseInputClass, "flex-1")}
                  maxLength={field.maxLength}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const nextValue = clampInput(input.value.trim(), field.maxLength).trim();
                      if (nextValue) {
                        handleChange(field.name, [...(value || []), nextValue]);
                        input.value = '';
                      }
                    }
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                  const nextValue = clampInput(input.value.trim(), field.maxLength).trim();
                  if (nextValue) {
                    handleChange(field.name, [...(value || []), nextValue]);
                    input.value = '';
                  }
                }}
                className="px-4 py-3 bg-surface-container text-primary hover:bg-surface-container-high rounded-sm transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        );

      case 'json':
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleChange(field.name, parsed);
              } catch {
                handleChange(field.name, e.target.value);
              }
            }}
            onBlur={() => handleBlur(field.name)}
            placeholder={field.placeholder || '{"key": "value"}'}
            rows={6}
            className={cn(baseInputClass, "resize-none font-mono text-xs")}
          />
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleChange(field.name, e.target.checked)}
              className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <span className="text-sm text-on-surface-variant">{field.description}</span>
          </label>
        );

      case 'file':
        return (
          <div className="space-y-2">
            <input
              type="file"
              accept={field.accept}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  handleChange(field.name, null);
                  return;
                }

                if (field.maxFileSizeMB && file.size > field.maxFileSizeMB * 1024 * 1024) {
                  setErrors(prev => ({
                    ...prev,
                    [field.name]: `${field.label} must be <= ${field.maxFileSizeMB}MB`,
                  }));
                  return;
                }

                const reader = new FileReader();
                reader.onload = () => {
                  const content = typeof reader.result === 'string' ? reader.result : '';
                  handleChange(field.name, {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    base64: content,
                  });
                  setErrors(prev => {
                    const next = { ...prev };
                    delete next[field.name];
                    return next;
                  });
                };
                reader.onerror = () => {
                  setErrors(prev => ({
                    ...prev,
                    [field.name]: `Failed to read ${field.label}`,
                  }));
                };
                if (field.fileAsBase64 === false) {
                  reader.readAsText(file);
                } else {
                  reader.readAsDataURL(file);
                }
              }}
              onBlur={() => handleBlur(field.name)}
              className={baseInputClass}
            />
            {value && typeof value === 'object' ? (
              <p className="text-xs text-on-surface-variant">
                Selected: {truncateLabel(String(value.name || ''), 80)} ({Math.round((Number(value.size) || 0) / 1024)} KB)
              </p>
            ) : null}
          </div>
        );

      default:
        return (
          <input
            type={field.type}
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field.name)}
            placeholder={field.placeholder}
            maxLength={
              field.type === 'text' || field.type === 'url' || field.type === 'email' || field.type === 'password'
                ? field.maxLength
                : undefined
            }
            className={baseInputClass}
          />
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-container-lowest w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/10">
          <h2 className="text-xl font-display font-bold text-primary">
            {mode === 'create' ? `Create ${title}` : `Edit ${title}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-sm transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {fields.map((field) => {
              // Check if field should be shown based on showWhen condition
              if (!isFieldVisible(field, formData)) {
                return null;
              }

              return (
                <div key={field.name}>
                  {field.type !== 'checkbox' && (
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                      {field.label}
                      {field.required && <span className="text-error ml-1">*</span>}
                    </label>
                  )}
                  {renderField(field)}
                  {field.description && field.type !== 'checkbox' && (
                    <p className="mt-1 text-xs text-on-surface-variant/60">{field.description}</p>
                  )}
                  {touched[field.name] && errors[field.name] && (
                    <p className="mt-1 text-xs text-error">{errors[field.name]}</p>
                  )}
                </div>
              );
            })}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-outline-variant/10">
          <button
            type="button"
            onClick={onClose}
            className="modal-btn-secondary px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors rounded-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className={cn(
              "px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors rounded-sm",
              mode === 'create' ? "btn-create" : "modal-btn-primary"
            )}
          >
            {mode === 'create' ? 'Create' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntityForm;
