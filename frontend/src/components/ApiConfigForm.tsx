/**
 * @fileoverview API 配置表单组件
 * @description 用于配置和测试 Traffic Source API 连接
 * @module components/ApiConfigForm
 */

import React, { useState } from 'react';
import { Check, X, Loader2, Plug } from 'lucide-react';
import { testTrafficSourceConnection } from '../services/api';

interface ApiConfigFormProps {
  apiBaseUrl: string;
  apiKey: string;
  platformType?: string;
  onBaseUrlChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
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

export const ApiConfigForm: React.FC<ApiConfigFormProps> = ({
  apiBaseUrl,
  apiKey,
  platformType,
  onBaseUrlChange,
  onApiKeyChange,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const handleTestConnection = async () => {
    if (!apiBaseUrl || !apiKey) {
      setTestResult({
        success: false,
        message: 'Please enter both API Base URL and API Key',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await testTrafficSourceConnection({
        apiBaseUrl,
        apiKey,
        platformType,
      });

      if (response.success) {
        setTestResult({
          success: true,
          message: response.data?.message || 'Connection successful!',
          details: response.data?.details,
        });
      } else {
        setTestResult({
          success: false,
          message: response.error?.message || 'Connection failed',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* API Base URL */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          API Base URL
        </label>
        <input
          type="url"
          value={apiBaseUrl}
          onChange={(e) => onBaseUrlChange(e.target.value)}
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
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Enter your API key"
          className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
        <p className="mt-1 text-xs text-on-surface-variant/60">
          API key for authentication
        </p>
      </div>

      {/* Test Connection Button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={isTesting || !apiBaseUrl || !apiKey}
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
          <div
            className={`flex items-center gap-2 text-sm ${
              testResult.success ? 'text-secondary' : 'text-error'
            }`}
          >
            {testResult.success ? <Check size={16} /> : <X size={16} />}
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
              <p>
                Balance: {testResult.details.balance}{' '}
                {testResult.details.currency}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiConfigForm;
