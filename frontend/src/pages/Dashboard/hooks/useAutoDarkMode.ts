/**
 * @file 兼容旧调用：自动暗色 hook 已并入全局 ThemeProvider。
 * @platform cftracking
 * @owner frontend
 * @invariant 不再按时间覆盖用户主题；只返回当前全局主题。
 */
import { useTheme } from '../../../context/ThemeContext';

export interface AutoDarkModeResult {
  isDarkMode: boolean;
  currentTime: Date;
}

export function useAutoDarkMode(): AutoDarkModeResult {
  const { isDark } = useTheme();
  return { isDarkMode: isDark, currentTime: new Date() };
}
