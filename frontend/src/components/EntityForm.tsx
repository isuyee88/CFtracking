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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'url' | 'email' | 'password' | 'json' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  description?: string;
  validation?: (value: any) => string | null;
  showWhen?: (data: Record<string, any>) => boolean;
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
    setFormData(prev => ({ ...prev, [name]: value }));
    
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

    // Required validation
    if (field.required) {
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
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
                    >
                      {option?.label || item}
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
                  {availableOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              
              {/* 搜索/过滤输入框 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={field.placeholder || "Search or add custom value..."}
                  className={cn(baseInputClass, "flex-1")}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const input = e.target as HTMLInputElement;
                      const inputValue = input.value.trim();
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
                    const inputValue = input.value.trim();
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
                >
                  {item}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      handleChange(field.name, [...(value || []), input.value.trim()]);
                      input.value = '';
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                  if (input.value.trim()) {
                    handleChange(field.name, [...(value || []), input.value.trim()]);
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

      default:
        return (
          <input
            type={field.type}
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field.name)}
            placeholder={field.placeholder}
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
              if (field.showWhen && !field.showWhen(formData)) {
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
