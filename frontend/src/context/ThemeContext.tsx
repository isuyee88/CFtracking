/**
 * @file 全局主题状态：light / dark / system。
 * @platform cftracking
 * @owner frontend
 * @invariant 用户选择优先于系统；主题只通过根节点 class 表达，不在页面内重复切换。
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

const STORAGE_KEY = 'cftracking-theme';
const LEGACY_KEY = 'dark-mode';
const DARK_CLASS = 'dark-mode';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  // 兼容旧版 dark-mode=true/false；迁移后即删除。
  const legacy = window.localStorage.getItem(LEGACY_KEY);
  if (legacy !== null) {
    const migrated: ThemeMode = legacy === 'true' ? 'dark' : 'light';
    window.localStorage.setItem(STORAGE_KEY, migrated);
    window.localStorage.removeItem(LEGACY_KEY);
    return migrated;
  }
  return 'system';
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle(DARK_CLASS, resolved === 'dark');
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

function resolve(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? systemTheme() : mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(readMode()));

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const cycleMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light');
  }, [mode, setMode]);

  useEffect(() => {
    const next = resolve(mode);
    setResolved(next);
    applyTheme(next);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'system' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = media.matches ? 'dark' : 'light';
      setResolved(next);
      applyTheme(next);
    };
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, isDark: resolved === 'dark', setMode, cycleMode }),
    [mode, resolved, setMode, cycleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
