/**
 * @fileoverview Settings page backed by user preferences APIs.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Globe,
  Monitor,
  Moon,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sun,
  User,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TimezoneSelector } from '../components/TimezoneSelector';
import {
  fetchUserPreferences,
  saveUserPreferences,
  type SaveUserPreferencesPayload,
  type UserPreferenceDocument,
} from '../services/api';
import { loadBootstrapForLocation, readBootstrapPage } from '../services/bootstrap';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SettingsTab = 'general' | 'account' | 'notifications' | 'security';
type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsFormState {
  timezone: string;
  currency: string;
  dateFormat: string;
  theme: ThemeMode;
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReports: boolean;
  twoFactorAuth: boolean;
  displayName: string;
  company: string;
}

const SETTINGS_USER_ID = 'default-user';

const DEFAULT_SETTINGS: SettingsFormState = {
  timezone: 'UTC',
  currency: 'USD',
  dateFormat: 'YYYY-MM-DD',
  theme: 'system',
  language: 'en',
  emailNotifications: true,
  pushNotifications: false,
  weeklyReports: true,
  twoFactorAuth: false,
  displayName: 'Workspace Admin',
  company: '',
};

const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Globe }> = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'account', label: 'Account', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

function mapThemeFromDocument(theme?: string): ThemeMode {
  if (theme === 'light' || theme === 'dark') {
    return theme;
  }

  return 'system';
}

function mapThemeToDocument(theme: ThemeMode): 'light' | 'dark' | 'auto' {
  return theme === 'system' ? 'auto' : theme;
}

function readSettingsView(document: UserPreferenceDocument | null): Partial<SettingsFormState> {
  const rawViews = document?.preferences.views;
  if (!rawViews || typeof rawViews !== 'object') {
    return {};
  }

  const settingsView = rawViews.settings;
  if (!settingsView || typeof settingsView !== 'object') {
    return {};
  }

  return settingsView as Partial<SettingsFormState>;
}

function mapDocumentToForm(document: UserPreferenceDocument): SettingsFormState {
  const settingsView = readSettingsView(document);

  return {
    timezone: document.preferences.system.timezone || DEFAULT_SETTINGS.timezone,
    currency:
      typeof settingsView.currency === 'string' ? settingsView.currency : DEFAULT_SETTINGS.currency,
    dateFormat:
      typeof settingsView.dateFormat === 'string'
        ? settingsView.dateFormat
        : DEFAULT_SETTINGS.dateFormat,
    theme: mapThemeFromDocument(document.preferences.ui.theme),
    language: document.preferences.system.language || DEFAULT_SETTINGS.language,
    emailNotifications:
      typeof settingsView.emailNotifications === 'boolean'
        ? settingsView.emailNotifications
        : DEFAULT_SETTINGS.emailNotifications,
    pushNotifications:
      typeof settingsView.pushNotifications === 'boolean'
        ? settingsView.pushNotifications
        : DEFAULT_SETTINGS.pushNotifications,
    weeklyReports:
      typeof settingsView.weeklyReports === 'boolean'
        ? settingsView.weeklyReports
        : DEFAULT_SETTINGS.weeklyReports,
    twoFactorAuth:
      typeof settingsView.twoFactorAuth === 'boolean'
        ? settingsView.twoFactorAuth
        : DEFAULT_SETTINGS.twoFactorAuth,
    displayName:
      typeof settingsView.displayName === 'string'
        ? settingsView.displayName
        : DEFAULT_SETTINGS.displayName,
    company: typeof settingsView.company === 'string' ? settingsView.company : DEFAULT_SETTINGS.company,
  };
}

export const Settings: React.FC = () => {
  const bootstrapBundle = readBootstrapPage<{ preferenceDocument?: UserPreferenceDocument }>('settings');
  const bootstrapPreferenceDocument = bootstrapBundle?.data?.preferenceDocument ?? null;
  const needsBootstrapRefresh = Boolean(bootstrapBundle && !bootstrapPreferenceDocument);

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<SettingsFormState>(() =>
    bootstrapPreferenceDocument ? mapDocumentToForm(bootstrapPreferenceDocument) : DEFAULT_SETTINGS
  );
  const [document, setDocument] = useState<UserPreferenceDocument | null>(bootstrapPreferenceDocument);
  const [loading, setLoading] = useState(!bootstrapPreferenceDocument);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const preferenceDocument = await fetchUserPreferences(SETTINGS_USER_ID);
      setDocument(preferenceDocument);
      setSettings(mapDocumentToForm(preferenceDocument));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (needsBootstrapRefresh) {
      void loadBootstrapForLocation({ force: true })
        .catch(() => null)
        .then(() => {
          void loadSettings();
        });
      return;
    }

    if (bootstrapPreferenceDocument) {
      return;
    }

    void loadSettings();
  }, [bootstrapPreferenceDocument, loadSettings, needsBootstrapRefresh]);

  const handleSettingChange = useCallback(
    <K extends keyof SettingsFormState>(key: K, value: SettingsFormState[K]) => {
      setSuccessMessage(null);
      setSettings((current) => ({
        ...current,
        [key]: value,
      }));
    },
    []
  );

  const securityStatus = useMemo(() => {
    if (settings.twoFactorAuth) {
      return 'Preference saved. Enforcement will be handled after Cloudflare One auth is introduced.';
    }

    return 'Authentication and password enforcement are intentionally deferred to Cloudflare One.';
  }, [settings.twoFactorAuth]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const currentViews = ((document?.preferences.views ?? {}) as Record<string, unknown>) || {};
      const existingSettingsView =
        currentViews.settings && typeof currentViews.settings === 'object'
          ? (currentViews.settings as Record<string, unknown>)
          : {};

      const payload: SaveUserPreferencesPayload = {
        lastKnownVersion: document?.lastUpdated,
        preferences: {
          ui: {
            ...(document?.preferences.ui ?? {
              density: 'standard',
              fontSize: 'medium',
              sidebarCollapsed: false,
            }),
            theme: mapThemeToDocument(settings.theme),
          },
          views: {
            ...currentViews,
            settings: {
              ...existingSettingsView,
              currency: settings.currency,
              dateFormat: settings.dateFormat,
              emailNotifications: settings.emailNotifications,
              pushNotifications: settings.pushNotifications,
              weeklyReports: settings.weeklyReports,
              twoFactorAuth: settings.twoFactorAuth,
              displayName: settings.displayName,
              company: settings.company,
            },
          },
          system: {
            language: settings.language,
            timezone: settings.timezone,
            refreshInterval: document?.preferences.system.refreshInterval ?? 30000,
          },
        },
      };

      const savedDocument = await saveUserPreferences(SETTINGS_USER_ID, payload);
      setDocument(savedDocument);
      setSettings(mapDocumentToForm(savedDocument));
      setSuccessMessage('Settings saved to cloud preferences.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [document, settings]);

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-secondary-container">
            <SettingsIcon size={20} className="text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-primary">Settings</h1>
            <p className="text-sm text-on-surface-variant">
              Manage workspace preferences stored in Durable Objects.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-sm border border-outline-variant/30 bg-surface-container-low p-4 text-sm text-on-surface-variant">
        Authentication, login, password rotation, and enforcement are intentionally excluded from this phase.
        After development, access control will be handled with Cloudflare One.
      </div>

      {error && (
        <div className="mb-6 rounded-sm border border-error/20 bg-error/10 p-4 text-sm text-error">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-sm border border-success/20 bg-success/10 p-4 text-sm text-success">
          {successMessage}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full space-y-2 lg:w-64">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full px-4 py-3 text-sm font-medium transition-colors',
                'flex items-center gap-3',
                activeTab === tab.id
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-surface-container-lowest whisper-shadow">
          {loading ? (
            <div className="p-8 text-sm text-on-surface-variant">Loading settings...</div>
          ) : (
            <>
              {activeTab === 'general' && (
                <div className="p-6">
                  <h2 className="mb-6 text-lg font-bold text-primary">General Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <TimezoneSelector
                        value={settings.timezone}
                        onChange={(timezone) => handleSettingChange('timezone', timezone)}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Currency
                      </label>
                      <select
                        value={settings.currency}
                        onChange={(event) => handleSettingChange('currency', event.target.value)}
                        className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (EUR)</option>
                        <option value="GBP">GBP (GBP)</option>
                        <option value="JPY">JPY (JPY)</option>
                        <option value="CNY">CNY (CNY)</option>
                        <option value="AUD">AUD (AUD)</option>
                        <option value="CAD">CAD (CAD)</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Date Format
                      </label>
                      <select
                        value={settings.dateFormat}
                        onChange={(event) => handleSettingChange('dateFormat', event.target.value)}
                        className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm"
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY/MM/DD">YYYY/MM/DD</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Theme
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: 'light' as const, icon: Sun, label: 'Light' },
                          { value: 'dark' as const, icon: Moon, label: 'Dark' },
                          { value: 'system' as const, icon: Monitor, label: 'System' },
                        ].map((theme) => (
                          <button
                            key={theme.value}
                            onClick={() => handleSettingChange('theme', theme.value)}
                            className={cn(
                              'flex items-center gap-2 border px-4 py-2 transition-colors',
                              settings.theme === theme.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-outline-variant text-on-surface hover:bg-surface-container'
                            )}
                          >
                            <theme.icon size={16} />
                            <span className="text-sm">{theme.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Language
                      </label>
                      <select
                        value={settings.language}
                        onChange={(event) => handleSettingChange('language', event.target.value)}
                        className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm"
                      >
                        <option value="en">English</option>
                        <option value="zh">Chinese</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="ja">Japanese</option>
                        <option value="ko">Korean</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="p-6">
                  <h2 className="mb-6 text-lg font-bold text-primary">Account Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Identity Provider
                      </label>
                      <input
                        type="text"
                        value="Cloudflare One (planned post-development)"
                        disabled
                        className="w-full border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface-variant"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={settings.displayName}
                        onChange={(event) => handleSettingChange('displayName', event.target.value)}
                        className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Company
                      </label>
                      <input
                        type="text"
                        value={settings.company}
                        onChange={(event) => handleSettingChange('company', event.target.value)}
                        placeholder="Your company name"
                        className="w-full border border-outline-variant bg-surface px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="rounded-sm border border-outline-variant/20 bg-surface-container p-4 text-sm text-on-surface-variant">
                      Email address, login identity, and access policy will be sourced from Cloudflare One instead of
                      this page.
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="p-6">
                  <h2 className="mb-6 text-lg font-bold text-primary">Notification Settings</h2>
                  <div className="space-y-4">
                    {[
                      {
                        key: 'emailNotifications' as const,
                        label: 'Email Notifications',
                        description: 'Receive email updates about important campaign changes.',
                      },
                      {
                        key: 'pushNotifications' as const,
                        label: 'Push Notifications',
                        description: 'Receive browser notifications for major operational events.',
                      },
                      {
                        key: 'weeklyReports' as const,
                        label: 'Weekly Reports',
                        description: 'Receive a weekly summary of performance and anomalies.',
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between rounded-sm bg-surface-container p-4"
                      >
                        <div>
                          <div className="font-medium text-on-surface">{item.label}</div>
                          <div className="text-xs text-on-surface-variant">{item.description}</div>
                        </div>
                        <button
                          onClick={() => handleSettingChange(item.key, !settings[item.key])}
                          className={cn(
                            'relative h-6 w-12 rounded-full transition-colors',
                            settings[item.key] ? 'bg-success' : 'bg-outline-variant'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-1 h-4 w-4 rounded-full bg-white transition-transform',
                              settings[item.key] ? 'left-7' : 'left-1'
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="p-6">
                  <h2 className="mb-6 text-lg font-bold text-primary">Security Settings</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between rounded-sm bg-surface-container p-4">
                      <div>
                        <div className="font-medium text-on-surface">Two-Factor Authentication Preference</div>
                        <div className="text-xs text-on-surface-variant">
                          This saves preference state only. Actual enforcement will come from Cloudflare One.
                        </div>
                      </div>
                      <button
                        onClick={() => handleSettingChange('twoFactorAuth', !settings.twoFactorAuth)}
                        className={cn(
                          'relative h-6 w-12 rounded-full transition-colors',
                          settings.twoFactorAuth ? 'bg-success' : 'bg-outline-variant'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1 h-4 w-4 rounded-full bg-white transition-transform',
                            settings.twoFactorAuth ? 'left-7' : 'left-1'
                          )}
                        />
                      </button>
                    </div>

                    <div className="rounded-sm border border-outline-variant/20 bg-surface-container p-4 text-sm text-on-surface-variant">
                      {securityStatus}
                    </div>

                    <div className="rounded-sm border border-outline-variant/20 bg-surface p-4">
                      <h3 className="mb-2 text-sm font-bold text-on-surface">Password & Login Controls</h3>
                      <p className="text-sm text-on-surface-variant">
                        This area remains informational for now. Password workflows and SSO policy will be configured
                        after Cloudflare One authentication is integrated.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="border-t border-outline-variant/10 p-6">
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="modal-btn-primary flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
