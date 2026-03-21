/**
 * File: Toast.tsx
 * Purpose: Toast 通知组件，用于显示操作反馈
 * Input/Output: 接收消息和类型，显示临时通知
 * Logic: 支持成功、错误、警告、信息四种类型，自动消失
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onDismiss: (id: string) => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={20} className="text-success" />,
  error: <AlertCircle size={20} className="text-error" />,
  warning: <AlertTriangle size={20} className="text-warning" />,
  info: <Info size={20} className="text-info" />,
};

const styles: Record<ToastType, string> = {
  success: 'border-success/30 bg-success/10',
  error: 'border-error/30 bg-error/10',
  warning: 'border-warning/30 bg-warning/10',
  info: 'border-info/30 bg-info/10',
};

const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(message.id);
    }, message.duration || 5000);

    return () => clearTimeout(timer);
  }, [message.id, message.duration, onDismiss]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right-full',
        styles[message.type]
      )}
    >
      {icons[message.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg-default">{message.title}</p>
        {message.description && (
          <p className="text-xs text-fg-muted mt-1">{message.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(message.id)}
        className="p-1 text-fg-muted hover:text-fg-default transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ messages, onDismiss }) => {
  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {messages.map((message) => (
        <Toast key={message.id} message={message} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

interface ToastContextValue {
  toast: (type: ToastType, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setMessages((prev) => [...prev, { id, type, title, description }]);
  }, []);

  const value = React.useMemo(() => ({
    toast,
    success: (title: string, description?: string) => toast('success', title, description),
    error: (title: string, description?: string) => toast('error', title, description),
    warning: (title: string, description?: string) => toast('warning', title, description),
    info: (title: string, description?: string) => toast('info', title, description),
  }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer messages={messages} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export default Toast;
