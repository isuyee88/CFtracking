/**
 * @fileoverview Settings Page
 * @description System settings and user preferences
 * @module pages/Settings
 */

import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Globe, 
  Bell, 
  Shield, 
  Database,
  Save,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TimezoneSelector } from '../components/TimezoneSelector';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'account' | 'notifications' | 'security'>('general');
  const [settings, setSettings] = useState({
    timezone: 'UTC',
    currency: 'USD',
    dateFormat: 'YYYY-MM-DD',
    theme: 'system',
    language: 'en',
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true,
    twoFactorAuth: false,
  });

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const handleSave = () => {
    // Save settings to backend
    console.log('Saving settings:', settings);
  };

  return (
    <div className="min-h-screen bg-surface p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-secondary-container rounded-sm flex items-center justify-center">
            <SettingsIcon size={20} className="text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-primary">Settings</h1>
            <p className="text-sm text-on-surface-variant">Manage your account and system preferences</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-lowest text-on-surface hover:bg-surface-container"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-surface-container-lowest whisper-shadow">
          {activeTab === 'general' && (
            <div className="p-6">
              <h2 className="text-lg font-bold text-primary mb-6">General Settings</h2>
              
              <div className="space-y-6">
                {/* Timezone */}
                <div>
                  <TimezoneSelector 
                    value={settings.timezone}
                    onChange={(tz) => setSettings({ ...settings, timezone: tz })}
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Currency
                  </label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant text-sm"
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

                {/* Date Format */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Date Format
                  </label>
                  <select
                    value={settings.dateFormat}
                    onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant text-sm"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                  </select>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Theme
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'light', icon: Sun, label: 'Light' },
                      { value: 'dark', icon: Moon, label: 'Dark' },
                      { value: 'system', icon: Monitor, label: 'System' },
                    ].map((theme) => (
                      <button
                        key={theme.value}
                        onClick={() => setSettings({ ...settings, theme: theme.value })}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 border transition-colors",
                          settings.theme === theme.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-outline-variant text-on-surface hover:bg-surface-container"
                        )}
                      >
                        <theme.icon size={16} />
                        <span className="text-sm">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant text-sm"
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

          {activeTab === 'account' && (
            <div className="p-6">
              <h2 className="text-lg font-bold text-primary mb-6">Account Settings</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value="user@example.com"
                    disabled
                    className="w-full px-3 py-2 bg-surface-container border border-outline-variant text-sm text-on-surface-variant"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Admin User"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Company
                  </label>
                  <input
                    type="text"
                    placeholder="Your company name"
                    className="w-full px-3 py-2 bg-surface border border-outline-variant text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="p-6">
              <h2 className="text-lg font-bold text-primary mb-6">Notification Settings</h2>
              <div className="space-y-4">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive email updates about your campaigns' },
                  { key: 'pushNotifications', label: 'Push Notifications', desc: 'Receive push notifications in browser' },
                  { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Receive weekly performance reports' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-surface-container rounded-sm">
                    <div>
                      <div className="font-medium text-on-surface">{item.label}</div>
                      <div className="text-xs text-on-surface-variant">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, [item.key]: !settings[item.key as keyof typeof settings] })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        settings[item.key as keyof typeof settings] ? "bg-success" : "bg-outline-variant"
                      )}
                    >
                      <span className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                        settings[item.key as keyof typeof settings] ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="p-6">
              <h2 className="text-lg font-bold text-primary mb-6">Security Settings</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-surface-container rounded-sm">
                  <div>
                    <div className="font-medium text-on-surface">Two-Factor Authentication</div>
                    <div className="text-xs text-on-surface-variant">Add an extra layer of security to your account</div>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, twoFactorAuth: !settings.twoFactorAuth })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      settings.twoFactorAuth ? "bg-success" : "bg-outline-variant"
                    )}
                  >
                    <span className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                      settings.twoFactorAuth ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="border-t border-outline-variant/10 pt-6">
                  <h3 className="text-sm font-bold text-on-surface mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 bg-surface border border-outline-variant text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 bg-surface border border-outline-variant text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 bg-surface border border-outline-variant text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="p-6 border-t border-outline-variant/10">
            <button
              onClick={handleSave}
              className="modal-btn-primary flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
