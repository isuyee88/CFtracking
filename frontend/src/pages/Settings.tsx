/**
 * @fileoverview Settings 页面：本机偏好设置（时区/货币/日期格式/主题/语言/通知开关）。
 * @owner frontend
 * @invariant 偏好只写入 localStorage；当前 Worker 没有 /api/settings 契约，页面不得暗示已同步到账号。
 * @invariant 不提供「修改密码 / 双因素」等没有后端支撑的假控件。
 * @see docs/architecture/cftracking-admin-ux-review-2026-10-20.md
 */

import React, { useState } from 'react';
import { Settings as SettingsIcon, Globe, Bell, Save, Moon, Sun, Monitor } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TimezoneSelector } from '../components/TimezoneSelector';
import { PageNotice } from '../components/PageNotice';
import { useTheme } from '../context/ThemeContext';
import type { UserSettings } from '../services/api';

const SETTINGS_KEY = 'cftracking-settings';

const defaultSettings: UserSettings = {
  timezone: 'UTC',
  currency: 'USD',
  dateFormat: 'YYYY-MM-DD',
  theme: 'system',
  language: 'en',
  emailNotifications: true,
  pushNotifications: false,
  weeklyReports: true,
  twoFactorAuth: false,
};

/** 读取本机偏好；损坏的 JSON 回退到默认值，避免设置页白屏。 */
function loadSettings(): UserSettings {
  try {
    const saved = window.localStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...defaultSettings, ...(JSON.parse(saved) as Partial<UserSettings>) };
  } catch {
    // 存储不可用时使用默认值即可，保存按钮会显示失败状态由用户自行处理。
  }
  return defaultSettings;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const themeOptions = [
  { value: 'light' as const, icon: Sun, label: 'Light' },
  { value: 'dark' as const, icon: Moon, label: 'Dark' },
  { value: 'system' as const, icon: Monitor, label: 'System' },
];

const notificationOptions = [
  { key: 'emailNotifications' as const, label: 'Email Notifications', desc: 'Receive email updates about your campaigns' },
  { key: 'pushNotifications' as const, label: 'Push Notifications', desc: 'Receive push notifications in the browser' },
  { key: 'weeklyReports' as const, label: 'Weekly Reports', desc: 'Receive a weekly performance summary' },
];

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications'>('general');
  const [saved, setSaved] = useState(false);
  const { setMode } = useTheme();
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Globe },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  ];

  const handleSave = () => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setMode(settings.theme);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setSaved(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-secondary-container">
            <SettingsIcon size={20} className="text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-primary">Settings</h1>
            <p className="text-sm text-on-surface-variant">Manage your local preferences for this browser</p>
          </div>
        </div>
      </header>

      <PageNotice
        className="mb-6"
        title="Preferences are stored in this browser"
        description="This deployment has no settings API yet, so changes here apply to the current browser only and are not synced to your account."
        hint="Use the same browser to keep these preferences; clearing site data resets them."
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav aria-label="Settings sections" className="w-full space-y-2 lg:w-64">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container',
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 bg-surface-container-lowest whisper-shadow">
          {activeTab === 'general' && (
            <div className="p-6">
              <h2 className="mb-6 text-lg font-bold text-primary">General</h2>

              <div className="space-y-6">
                <TimezoneSelector value={settings.timezone} onChange={(timezone) => setSettings({ ...settings, timezone })} />

                <div>
                  <label htmlFor="settings-currency" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Currency
                  </label>
                  <select
                    id="settings-currency"
                    value={settings.currency}
                    onChange={(event) => setSettings({ ...settings, currency: event.target.value })}
                    className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CNY">CNY (¥)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="settings-date-format" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Date Format
                  </label>
                  <select
                    id="settings-date-format"
                    value={settings.dateFormat}
                    onChange={(event) => setSettings({ ...settings, dateFormat: event.target.value })}
                    className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                  </select>
                </div>

                <fieldset>
                  <legend className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Theme</legend>
                  <div className="flex flex-wrap gap-2">
                    {themeOptions.map((theme) => (
                      <button
                        key={theme.value}
                        type="button"
                        onClick={() => setSettings({ ...settings, theme: theme.value })}
                        aria-pressed={settings.theme === theme.value}
                        className={cn(
                          'flex items-center gap-2 border px-4 py-2 transition-colors',
                          settings.theme === theme.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline-variant text-on-surface hover:bg-surface-container',
                        )}
                      >
                        <theme.icon size={16} />
                        <span className="text-sm">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor="settings-language" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Language
                  </label>
                  <select
                    id="settings-language"
                    value={settings.language}
                    onChange={(event) => setSettings({ ...settings, language: event.target.value })}
                    className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="zh">中文</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ja">日本語</option>
                    <option value="ko">한국어</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="p-6">
              <h2 className="mb-6 text-lg font-bold text-primary">Notifications</h2>
              <div className="space-y-4">
                {notificationOptions.map((item) => {
                  const checked = Boolean(settings[item.key]);
                  return (
                    <div key={item.key} className="flex items-center justify-between gap-4 rounded-sm bg-surface-container p-4">
                      <div>
                        <div className="font-medium text-on-surface">{item.label}</div>
                        <div className="text-xs text-on-surface-variant">{item.desc}</div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        aria-label={item.label}
                        onClick={() => setSettings({ ...settings, [item.key]: !checked })}
                        className={cn('relative h-6 w-12 rounded-full transition-colors', checked ? 'bg-success' : 'bg-outline-variant')}
                      >
                        <span
                          className={cn(
                            'absolute top-1 h-4 w-4 rounded-full bg-white transition-transform',
                            checked ? 'left-7' : 'left-1',
                          )}
                        />
                      </button>
                    </div>
                  );
                })}
                <p className="text-xs text-fg-subtle">
                  Delivery channels are not wired to a backend yet; these switches only record the preference locally.
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-outline-variant/10 p-6">
            <button
              type="button"
              onClick={handleSave}
              className="modal-btn-primary flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest"
            >
              <Save size={16} />
              {saved ? 'Saved in this browser' : 'Save in this browser'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
