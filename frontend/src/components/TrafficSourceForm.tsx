/**
 * File: TrafficSourceForm.tsx
 * Purpose: Traffic Source 表单组件，参考 Keitaro 的模板系统
 * Input/Output: 支持模板选择、参数配置、Postback 配置、API 集成
 * Logic: 分步骤表单，支持从模板自动填充参数
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Loader2, 
  Plug, 
  Check, 
  AlertCircle, 
  Plus, 
  Trash2, 
  ChevronRight,
  ChevronLeft,
  Settings,
  Link,
  Code,
  Globe,
  FileText,
  Key
} from 'lucide-react';
import { testTrafficSourceConnection } from '../services/api';
import { 
  TRAFFIC_SOURCE_TEMPLATES, 
  getTemplateById, 
  getTemplateOptions 
} from '../data/trafficSourceTemplates';
import type { 
  ParameterTemplate, 
  PostbackConfig, 
  TrafficSourceApiConfig,
  ConversionStatus 
} from '../types/trafficSource';

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

type FormStep = 'basic' | 'parameters' | 'postback' | 'api';

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

const CONVERSION_STATUSES: { value: ConversionStatus; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'sale', label: 'Sale' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'pending', label: 'Pending' }
];

const EMPTY_PARAMETER: ParameterTemplate = {
  alias: '',
  paramName: '',
  macro: ''
};

export const TrafficSourceForm: React.FC<TrafficSourceFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode
}) => {
  const [currentStep, setCurrentStep] = useState<FormStep>('basic');
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    type: 'other',
    postbackUrl: '',
    costModel: 'cpc',
    costValue: '',
    currency: 'USD',
    status: 'active',
    notes: '',
    templateId: '',
    parameters: [] as ParameterTemplate[],
    postbackConfig: {
      url: '',
      sendOnlyStatuses: ['sale', 'lead'] as ConversionStatus[],
      customParams: {},
      taboolaKey: ''
    } as PostbackConfig,
    apiEnabled: false,
    apiBaseUrl: '',
    apiKey: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    if (isOpen && initialData) {
      const parsedParams = parseJsonField<ParameterTemplate[]>(initialData.parameters, []);
      const parsedPostback = parseJsonField<PostbackConfig>(initialData.postbackConfig, {
        url: initialData.postbackUrl || '',
        sendOnlyStatuses: ['sale', 'lead'],
        customParams: {},
        taboolaKey: ''
      });
      const parsedApiConfig = parseJsonField<TrafficSourceApiConfig>(initialData.apiConfig, {
        enabled: false,
        baseUrl: '',
        apiKey: ''
      });

      setFormData({
        name: initialData.name || '',
        type: initialData.type || 'other',
        postbackUrl: initialData.postbackUrl || '',
        costModel: initialData.costModel || 'cpc',
        costValue: initialData.costValue?.toString() || '',
        currency: initialData.currency || 'USD',
        status: initialData.status || 'active',
        notes: initialData.notes || '',
        templateId: initialData.templateId || '',
        parameters: parsedParams,
        postbackConfig: parsedPostback,
        apiEnabled: parsedApiConfig.enabled,
        apiBaseUrl: parsedApiConfig.baseUrl || '',
        apiKey: parsedApiConfig.apiKey || ''
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
        templateId: '',
        parameters: [],
        postbackConfig: {
          url: '',
          sendOnlyStatuses: ['sale', 'lead'],
          customParams: {},
          taboolaKey: ''
        },
        apiEnabled: false,
        apiBaseUrl: '',
        apiKey: ''
      });
    }
    setErrors({});
    setTestResult(null);
    setCurrentStep('basic');
  }, [isOpen, initialData]);

  const parseJsonField = <T,>(field: any, defaultValue: T): T => {
    if (!field) return defaultValue;
    if (typeof field === 'object') return field as T;
    try {
      return JSON.parse(field) as T;
    } catch {
      return defaultValue;
    }
  };

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    if (name === 'apiBaseUrl' || name === 'apiKey') {
      setTestResult(null);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = getTemplateById(templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        templateId,
        type: template.type,
        parameters: [...template.parameters],
        postbackConfig: {
          ...prev.postbackConfig,
          url: template.postbackUrl
        },
        postbackUrl: template.postbackUrl
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        templateId: '',
        parameters: [],
        postbackConfig: {
          ...prev.postbackConfig,
          url: ''
        }
      }));
    }
  };

  const handleParameterChange = (index: number, field: keyof ParameterTemplate, value: string) => {
    setFormData(prev => {
      const newParams = [...(prev.parameters || [])];
      newParams[index] = { ...newParams[index], [field]: value };
      return { ...prev, parameters: newParams };
    });
  };

  const addParameter = () => {
    setFormData(prev => ({
      ...prev,
      parameters: [...(prev.parameters || []), { ...EMPTY_PARAMETER }]
    }));
  };

  const removeParameter = (index: number) => {
    setFormData(prev => ({
      ...prev,
      parameters: (prev.parameters || []).filter((_, i) => i !== index)
    }));
  };

  const handlePostbackStatusChange = (status: ConversionStatus, checked: boolean) => {
    setFormData(prev => {
      const currentStatuses = prev.postbackConfig?.sendOnlyStatuses || [];
      const newStatuses = checked
        ? [...currentStatuses, status]
        : currentStatuses.filter((s: ConversionStatus) => s !== status);
      return {
        ...prev,
        postbackConfig: {
          ...prev.postbackConfig,
          sendOnlyStatuses: newStatuses
        }
      };
    });
  };

  const validateStep = (step: FormStep): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 'basic') {
      if (!formData.name?.trim()) {
        newErrors.name = 'Traffic Source Name is required';
      }
      if (!formData.costValue || parseFloat(formData.costValue) < 0) {
        newErrors.costValue = 'Cost Value is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 'basic' && validateStep('basic')) {
      setCurrentStep('parameters');
    } else if (currentStep === 'parameters') {
      setCurrentStep('postback');
    } else if (currentStep === 'postback') {
      setCurrentStep('api');
    }
  };

  const handleBack = () => {
    if (currentStep === 'parameters') {
      setCurrentStep('basic');
    } else if (currentStep === 'postback') {
      setCurrentStep('parameters');
    } else if (currentStep === 'api') {
      setCurrentStep('postback');
    }
  };

  const handleSubmit = () => {
    if (!validateStep('basic')) {
      setCurrentStep('basic');
      return;
    }

    const apiConfig: TrafficSourceApiConfig | undefined = formData.apiEnabled ? {
      enabled: true,
      baseUrl: formData.apiBaseUrl || '',
      apiKey: formData.apiKey || ''
    } : undefined;

    const submitData = {
      name: formData.name,
      type: formData.type,
      postbackUrl: formData.postbackUrl,
      costModel: formData.costModel,
      costValue: parseFloat(formData.costValue) || 0,
      currency: formData.currency,
      status: formData.status,
      notes: formData.notes,
      templateId: formData.templateId || undefined,
      parameters: formData.parameters?.length > 0 ? formData.parameters : undefined,
      postbackConfig: formData.postbackConfig?.url ? {
        ...formData.postbackConfig,
        url: formData.postbackConfig.url
      } : undefined,
      apiConfig
    };

    onSubmit(submitData);
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

  const steps: { key: FormStep; label: string; icon: React.ReactNode }[] = [
    { key: 'basic', label: 'Basic', icon: <Settings size={16} /> },
    { key: 'parameters', label: 'Parameters', icon: <Code size={16} /> },
    { key: 'postback', label: 'Postback', icon: <Link size={16} /> },
    { key: 'api', label: 'API', icon: <Plug size={16} /> }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-container-lowest w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/10">
          <div>
            <h2 className="text-xl font-display font-bold text-primary">
              {mode === 'create' ? 'Create Traffic Source' : 'Edit Traffic Source'}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Configure your traffic source settings
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-sm transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center px-6 py-4 bg-surface-container/30 border-b border-outline-variant/10">
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              <button
                onClick={() => setCurrentStep(step.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm transition-all ${
                  currentStep === step.key
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {step.icon}
                <span className="text-xs font-bold uppercase tracking-widest">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight size={16} className="mx-2 text-on-surface-variant/30" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Basic Info */}
          {currentStep === 'basic' && (
            <div className="space-y-6">
              {/* Template Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Template
                </label>
                <select
                  value={formData.templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                >
                  {getTemplateOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-on-surface-variant/60">
                  Select a template to auto-fill parameters and postback settings
                </p>
              </div>

              {/* Name */}
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

              {/* Cost Model & Value */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
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
                <div className="col-span-1">
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
                <div className="col-span-1">
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
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Status <span className="text-error">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              {/* Tracking Fields Preview */}
              <div className="bg-surface-container/50 p-4 rounded-sm">
                <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
                  <Link size={16} className="text-primary" />
                  Tracking Fields
                </h3>
                <p className="text-xs text-on-surface-variant mb-3">
                  These fields will be captured from traffic source and available in reports:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {formData.parameters && formData.parameters.length > 0 ? (
                    formData.parameters.map((param: ParameterTemplate, index: number) => (
                      <div key={index} className="flex items-center gap-2 px-3 py-2 bg-surface rounded-sm border border-outline-variant/20">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-on-surface truncate">{param.alias}</p>
                          <p className="text-[10px] text-on-surface-variant font-mono">{param.paramName}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-secondary font-mono">←</span>
                          <span className="text-[10px] text-primary font-mono truncate max-w-[80px]">{param.macro}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-xs text-on-surface-variant/50 text-center py-4">
                      No tracking fields configured. Select a template or add parameters manually.
                    </div>
                  )}
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
            </div>
          )}

          {/* Step 2: Parameters */}
          {currentStep === 'parameters' && (
            <div className="space-y-6">
              <div className="bg-surface-container/50 p-4 rounded-sm">
                <h3 className="text-sm font-bold text-on-surface mb-2 flex items-center gap-2">
                  <Code size={16} className="text-primary" />
                  Campaign Parameters
                </h3>
                <p className="text-xs text-on-surface-variant mb-4">
                  Define UTM parameters that will be automatically added to campaign URLs. 
                  Use the format: tracker will add ?paramName=macro to your URLs.
                </p>
              </div>

              {/* Parameters Table */}
              <div className="border border-outline-variant/20 rounded-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-surface-container">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Alias (for reports)
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Parameter Name
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        Macro/Token
                      </th>
                      <th className="px-4 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.parameters || []).map((param: ParameterTemplate, index: number) => (
                      <tr key={index} className="border-t border-outline-variant/10">
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={param.alias}
                            onChange={(e) => handleParameterChange(index, 'alias', e.target.value)}
                            placeholder="e.g., Campaign"
                            className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm focus:border-primary focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={param.paramName}
                            onChange={(e) => handleParameterChange(index, 'paramName', e.target.value)}
                            placeholder="e.g., utm_campaign"
                            className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm focus:border-primary focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={param.macro}
                            onChange={(e) => handleParameterChange(index, 'macro', e.target.value)}
                            placeholder="e.g., {campaign_id}"
                            className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-sm text-sm focus:border-primary focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => removeParameter(index)}
                            className="p-2 text-on-surface-variant hover:text-error transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(formData.parameters || []).length === 0 && (
                  <div className="p-8 text-center text-on-surface-variant/60">
                    <Globe size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No parameters defined yet</p>
                    <p className="text-xs mt-1">Add parameters to track in your campaigns</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={addParameter}
                className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors rounded-sm"
              >
                <Plus size={14} />
                Add Parameter
              </button>

              {/* Common Macros Help */}
              <div className="bg-surface-container/30 p-4 rounded-sm">
                <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Common Macros
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                  <div><code className="bg-surface px-1 py-0.5 rounded">{'{campaign_id}'}</code> - Campaign ID</div>
                  <div><code className="bg-surface px-1 py-0.5 rounded">{'{creative_id}'}</code> - Creative ID</div>
                  <div><code className="bg-surface px-1 py-0.5 rounded">{'{click_id}'}</code> - Click ID</div>
                  <div><code className="bg-surface px-1 py-0.5 rounded">{'{source}'}</code> - Traffic Source</div>
                  <div><code className="bg-surface px-1 py-0.5 rounded">{'{geo}'}</code> - Geo/Country</div>
                  <div><code className="bg-surface px-1 py-0.5 rounded">{'{device}'}</code> - Device Type</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Postback */}
          {currentStep === 'postback' && (
            <div className="space-y-6">
              <div className="bg-surface-container/50 p-4 rounded-sm">
                <h3 className="text-sm font-bold text-on-surface mb-2 flex items-center gap-2">
                  <Link size={16} className="text-primary" />
                  S2S Postback Configuration
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Configure the postback URL for sending conversions back to the traffic source.
                </p>
              </div>

              {/* Postback URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Postback URL
                </label>
                <input
                  type="url"
                  value={formData.postbackConfig?.url || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    postbackConfig: { ...prev.postbackConfig, url: e.target.value }
                  }))}
                  placeholder="https://example.com/postback?click_id={click_id}&payout={payout}"
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
                <p className="mt-1 text-xs text-on-surface-variant/60">
                  Use macros like {'{click_id}'}, {'{payout}'}, {'{revenue}'} in your URL
                </p>
              </div>

              {/* Send Only Statuses */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                  Send Only Statuses
                </label>
                <p className="text-xs text-on-surface-variant/60 mb-3">
                  Select which conversion statuses to send to the traffic source
                </p>
                <div className="flex flex-wrap gap-3">
                  {CONVERSION_STATUSES.map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.postbackConfig?.sendOnlyStatuses?.includes(value) || false}
                        onChange={(e) => handlePostbackStatusChange(value, e.target.checked)}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-on-surface">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Taboola Key (only for Taboola) */}
              {formData.templateId === 'taboola' && (
                <div className="border border-warning/30 bg-warning/5 p-4 rounded-sm">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-warning mb-2">
                    <Key size={14} />
                    Taboola Client Secret API Key
                  </label>
                  <input
                    type="password"
                    value={formData.postbackConfig?.taboolaKey || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      postbackConfig: { ...prev.postbackConfig, taboolaKey: e.target.value }
                    }))}
                    placeholder="Enter your Taboola API key"
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Required for decoding CPC placeholder and tracking costs. 
                    Contact Taboola support to obtain this key (may take up to 72 hours).
                  </p>
                </div>
              )}

              {/* Postback Macros Help */}
              <div className="bg-surface-container/30 p-4 rounded-sm">
                <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Available Postback Macros
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                  <div><code className="bg-surface px-1 py-0.5 rounded">{'{click_id}'}</code> - Click ID</div>
                  <div><code className="bg-surface px-1 py-0.5 rounded">{'{payout}'}</code> - Payout Amount</div>
                  <div><code className="bg-surface px-1 py-0.5 rounded">{'{revenue}'}</code> - Revenue</div>
                  <div><code className="bg-surface px-1 py-0.5 rounded">{'{currency}'}</code> - Currency</div>
                  <div><code className="bg-surface px-1 py-0.5 rounded">{'{status}'}</code> - Conversion Status</div>
                  <div><code className="bg-surface px-1 py-0.5 rounded">{'{timestamp}'}</code> - Timestamp</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: API Integration */}
          {currentStep === 'api' && (
            <div className="space-y-6">
              <div className="bg-surface-container/50 p-4 rounded-sm">
                <h3 className="text-sm font-bold text-on-surface mb-2 flex items-center gap-2">
                  <Plug size={16} className="text-primary" />
                  API Integration
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Enable API integration for automatic blacklist/whitelist management.
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-4 border border-outline-variant/20 rounded-sm hover:bg-surface-container/30 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.apiEnabled}
                  onChange={(e) => handleChange('apiEnabled', e.target.checked)}
                  className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-on-surface">Enable API Integration</span>
                  <p className="text-xs text-on-surface-variant/60">
                    Automatically sync blacklist/whitelist with traffic source
                  </p>
                </div>
              </label>

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
                  </div>

                  {/* Test Connection */}
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

                    {testResult && (
                      <div className={`flex items-center gap-2 text-sm ${
                        testResult.success ? 'text-secondary' : 'text-error'
                      }`}>
                        {testResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>

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
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-outline-variant/10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors rounded-sm"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {currentStep !== 'basic' && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors rounded-sm"
              >
                <ChevronLeft size={14} />
                Back
              </button>
            )}
            {currentStep !== 'api' ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors rounded-sm"
              >
                Next
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors rounded-sm"
              >
                {mode === 'create' ? 'Create' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficSourceForm;
