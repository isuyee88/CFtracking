/**
 * @fileoverview Traffic Source 表单组件
 * @description 包含 API 配置和测试连接功能的完整表单
 * @module components/TrafficSourceForm
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, Plug, Check, AlertCircle } from 'lucide-react';
import { testTrafficSourceConnection } from '../services/api';

interface TrafficSourceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
  mode: 'create' | 'edit';
}

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    accountName?: string;
    accountId?: string;
    balance?: number;
    currency?: string;
  };
}

const TYPE_OPTIONS = [
  { value: 'social', label: 'Social' },
  { value: 'search', label: 'Search' },
  { value: 'native', label: 'Native' },
  { value: 'push', label: 'Push' },
  { value: 'pop', label: 'Pop' },
  { value: 'display', label: 'Display' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' }
];

const COST_MODEL_OPTIONS = [
  { value: 'cpc', label: 'CPC (Cost Per Click)' },
  { value: 'cpm', label: 'CPM (Cost Per Mille)' },
  { value: 'cpa', label: 'CPA (Cost Per Action)' },
  { value: 'fixed', label: 'Fixed' }
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CNY', label: 'CNY' }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' }
];

export const TrafficSourceForm: React.FC<TrafficSourceFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    type: 'other',
    postbackUrl: '',
    costModel: 'cpc',
    costValue: '',
    currency: 'USD',
    status: 'active',
    notes: '',
    apiEnabled: false,
    apiBaseUrl: '',
    apiKey: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        name: initialData.name || '',
        type: initialData.type || 'other',
        postbackUrl: initialData.postbackUrl || '',
        costModel: initialData.costModel || 'cpc',
        costValue: initialData.costValue?.toString() || '',
        currency: initialData.currency || 'USD',
        status: initialData.status || 'active',
        notes: initialData.notes || '',
        apiEnabled: initialData.apiEnabled || false,
        apiBaseUrl: initialData.apiBaseUrl || '',
        apiKey: initialData.apiKey || ''
      });
    } else if (isOpen) {
      setFormData({
        name: '',
        type: 'other',
        postbackUrl: '',
        costModel: 'cpc',
        costValue: '',
        currency: 'USD',
        status: 'active',
        notes: '',
        apiEnabled: false,
        apiBaseUrl: '',
        apiKey: ''
      });
    }
    setErrors({});
    setTestResult(null);
  }, [isOpen, initialData]);

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    // Clear test result when API config changes
    if (name === 'apiBaseUrl' || name === 'apiKey') {
      setTestResult(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Traffic Source Name is required';
    }
    if (!formData.costValue || parseFloat(formData.costValue) < 0) {
      newErrors.costValue = 'Cost Value is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData = {
        ...formData,
        costValue: parseFloat(formData.costValue) || 0
      };
      onSubmit(submitData);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.apiBaseUrl || !formData.apiKey) {
      setTestResult({
        success: false,
        message: 'Please enter both API Base URL and API Key'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await testTrafficSourceConnection({
        apiBaseUrl: formData.apiBaseUrl,
        apiKey: formData.apiKey,
        platformType: formData.type
      });

      if (response.success) {
        setTestResult({
          success: true,
          message: response.data?.message || 'Connection successful!',
          details: response.data?.details
        });
      } else {
        setTestResult({
          success: false,
          message: response.error?.message || 'Connection failed'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-container-lowest w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/10">
          <h2 className="text-xl font-display font-bold text-primary">
            {mode === 'create' ? 'Create Traffic Source' : 'Edit Traffic Source'}
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
            {/* Basic Info */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Traffic Source Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter traffic source name"
                className={`w-full px-4 py-3 bg-surface border rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 ${
                  errors.name ? 'border-error' : 'border-outline-variant'
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-error">{errors.name}</p>}
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Type <span className="text-error">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Postback URL */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Postback URL
              </label>
              <input
                type="url"
                value={formData.postbackUrl}
                onChange={(e) => handleChange('postbackUrl', e.target.value)}
                placeholder="https://example.com/postback"
                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {/* Cost Model & Value */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Cost Model <span className="text-error">*</span>
                </label>
                <select
                  value={formData.costModel}
                  onChange={(e) => handleChange('costModel', e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                >
                  {COST_MODEL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Cost Value <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  value={formData.costValue}
                  onChange={(e) => handleChange('costValue', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`w-full px-4 py-3 bg-surface border rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 ${
                    errors.costValue ? 'border-error' : 'border-outline-variant'
                  }`}
                />
                {errors.costValue && <p className="mt-1 text-xs text-error">{errors.costValue}</p>}
              </div>
            </div>

            {/* Currency & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Currency <span className="text-error">*</span>
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                >
                  {CURRENCY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Status <span className="text-error">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add notes about this traffic source..."
                rows={3}
                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none"
              />
            </div>

            {/* API Integration */}
            <div className="border-t border-outline-variant/20 pt-6">
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={formData.apiEnabled}
                  onChange={(e) => handleChange('apiEnabled', e.target.checked)}
                  className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-on-surface">Enable API Integration</span>
              </label>
              <p className="text-xs text-on-surface-variant/60 mb-4">
                Enable API integration for automatic blacklist/whitelist management
              </p>

              {formData.apiEnabled && (
                <div className="space-y-4 p-4 bg-surface-container/50 rounded-sm">
                  {/* API Base URL */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                      API Base URL
                    </label>
                    <input
                      type="url"
                      value={formData.apiBaseUrl}
                      onChange={(e) => handleChange('apiBaseUrl', e.target.value)}
                      placeholder="https://api.example.com/v1"
                      className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                    <p className="mt-1 text-xs text-on-surface-variant/60">
                      The base URL for the traffic source API
                    </p>
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                      placeholder="Enter your API key"
                      className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                    />
                    <p className="mt-1 text-xs text-on-surface-variant/60">
                      API key for authentication
                    </p>
                  </div>

                  {/* Test Connection Button */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting || !formData.apiBaseUrl || !formData.apiKey}
                      className="flex items-center gap-2 px-4 py-2 bg-surface-container text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container-high transition-colors rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Plug size={14} />
                          Test Connection
                        </>
                      )}
                    </button>

                    {/* Test Result */}
                    {testResult && (
                      <div className={`flex items-center gap-2 text-sm ${
                        testResult.success ? 'text-secondary' : 'text-error'
                      }`}>
                        {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Connection Details */}
                  {testResult?.success && testResult.details && (
                    <div className="p-3 bg-surface-container rounded-sm text-sm">
                      <p className="font-medium text-on-surface mb-2">Connection Details:</p>
                      <div className="space-y-1 text-on-surface-variant">
                        {testResult.details.accountName && (
                          <p>Account: {testResult.details.accountName}</p>
                        )}
                        {testResult.details.accountId && (
                          <p>Account ID: {testResult.details.accountId}</p>
                        )}
                        {testResult.details.balance !== undefined && (
                          <p>Balance: {testResult.details.balance} {testResult.details.currency}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-outline-variant/10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors rounded-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors rounded-sm"
          >
            {mode === 'create' ? 'Create' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrafficSourceForm;
