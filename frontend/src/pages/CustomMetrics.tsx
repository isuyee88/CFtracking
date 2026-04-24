import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Calculator, AlertCircle, Check, X } from 'lucide-react';
import {
  createCustomMetric,
  deleteCustomMetric,
  fetchCustomMetrics,
  previewCustomMetricFormula,
  updateCustomMetric,
  validateCustomMetricFormula,
  type CreateCustomMetricPayload,
  type CustomMetricDataType,
  type CustomMetricDefinition,
  type CustomMetricFormat,
  type CustomMetricStatus,
  type CustomMetricType,
  type UpdateCustomMetricPayload,
} from '@/services/api';

interface MetricVariable {
  name: string;
  displayName: string;
  description: string;
}

interface MetricFormState {
  name: string;
  displayName: string;
  description: string;
  type: CustomMetricType;
  formula: string;
  dataType: CustomMetricDataType;
  format: CustomMetricFormat;
  decimals: number;
  prefix: string;
  suffix: string;
  status: CustomMetricStatus;
}

const AVAILABLE_VARIABLES: MetricVariable[] = [
  { name: 'clicks', displayName: 'Clicks', description: 'Total clicks' },
  { name: 'impressions', displayName: 'Impressions', description: 'Total impressions' },
  { name: 'conversions', displayName: 'Conversions', description: 'Approved conversions' },
  { name: 'revenue', displayName: 'Revenue', description: 'Total revenue' },
  { name: 'spend', displayName: 'Spend', description: 'Total spend' },
  { name: 'cost', displayName: 'Cost', description: 'Alias of spend' },
  { name: 'profit', displayName: 'Profit', description: 'Revenue minus spend' },
  { name: 'unique_visitors', displayName: 'Unique Visitors', description: 'Distinct visitors' },
  { name: 'fraud_clicks', displayName: 'Fraud Clicks', description: 'Flagged fraudulent clicks' },
  { name: 'avg_fraud_score', displayName: 'Avg Fraud Score', description: 'Average fraud score' },
  { name: 'blacklist_rate', displayName: 'Blacklist Rate', description: 'Percent of blacklisted traffic' },
];

const DATA_TYPES: Array<{ value: CustomMetricDataType; label: string }> = [
  { value: 'number', label: 'Number' },
  { value: 'percent', label: 'Percent' },
  { value: 'currency', label: 'Currency' },
];

const METRIC_TYPES: Array<{ value: CustomMetricType; label: string }> = [
  { value: 'calculated', label: 'Calculated' },
  { value: 'aggregated', label: 'Aggregated' },
];

const FORMAT_OPTIONS: Array<{ value: CustomMetricFormat; label: string }> = [
  { value: 'number', label: 'Number' },
  { value: 'percent', label: 'Percent' },
  { value: 'currency', label: 'Currency' },
  { value: 'custom', label: 'Custom' },
];

const STATUS_OPTIONS: Array<{ value: CustomMetricStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const INITIAL_FORM_STATE: MetricFormState = {
  name: '',
  displayName: '',
  description: '',
  type: 'calculated',
  formula: '',
  dataType: 'number',
  format: 'number',
  decimals: 2,
  prefix: '',
  suffix: '',
  status: 'active',
};

const INITIAL_PREVIEW_CONTEXT: Record<string, number> = {
  clicks: 1000,
  impressions: 6000,
  conversions: 80,
  revenue: 960,
  spend: 480,
  cost: 480,
  profit: 480,
  unique_visitors: 820,
  fraud_clicks: 42,
  avg_fraud_score: 3.1,
  blacklist_rate: 4.8,
};

function normalizeOptionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toFormState(metric?: CustomMetricDefinition | null): MetricFormState {
  if (!metric) {
    return { ...INITIAL_FORM_STATE };
  }

  return {
    name: metric.name,
    displayName: metric.displayName,
    description: metric.description || '',
    type: metric.type,
    formula: metric.formula,
    dataType: metric.dataType,
    format: metric.format,
    decimals: metric.decimals,
    prefix: metric.prefix || '',
    suffix: metric.suffix || '',
    status: metric.status,
  };
}

export default function CustomMetrics() {
  const [metrics, setMetrics] = useState<CustomMetricDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<CustomMetricDefinition | null>(null);
  const [previewResult, setPreviewResult] = useState<{ value: number; formatted: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<MetricFormState>({ ...INITIAL_FORM_STATE });
  const [previewContext, setPreviewContext] = useState<Record<string, number>>({ ...INITIAL_PREVIEW_CONTEXT });

  const refreshMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchCustomMetrics({ page: 1, pageSize: 200 });
      setMetrics(result.list.filter((metric) => metric.status !== 'deleted'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshMetrics();
  }, []);

  const openModal = (metric?: CustomMetricDefinition) => {
    const next = toFormState(metric || null);
    setEditingMetric(metric || null);
    setFormData(next);
    setValidationError(null);
    setPreviewResult(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMetric(null);
    setFormData({ ...INITIAL_FORM_STATE });
    setValidationError(null);
    setPreviewResult(null);
  };

  const validateFormula = async (formula: string): Promise<boolean> => {
    if (!formula.trim()) {
      setValidationError('Formula is required');
      return false;
    }

    try {
      const result = await validateCustomMetricFormula(formula);
      if (result.valid) {
        setValidationError(null);
        return true;
      }

      setValidationError(result.error || 'Invalid formula');
      return false;
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to validate formula');
      return false;
    }
  };

  const previewFormula = async () => {
    if (!formData.formula.trim()) {
      return;
    }

    try {
      const result = await previewCustomMetricFormula(formData.formula, previewContext);
      setPreviewResult({
        value: result.value,
        formatted: result.formatted,
      });
      setValidationError(result.error || null);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to preview formula');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const valid = await validateFormula(formData.formula);
      if (!valid) {
        return;
      }

      if (editingMetric) {
        const payload: UpdateCustomMetricPayload = {
          displayName: formData.displayName.trim(),
          description: normalizeOptionalString(formData.description),
          formula: formData.formula.trim(),
          dataType: formData.dataType,
          format: formData.format,
          decimals: Math.max(0, Math.min(10, Number(formData.decimals) || 0)),
          prefix: normalizeOptionalString(formData.prefix),
          suffix: normalizeOptionalString(formData.suffix),
          status: formData.status,
        };
        await updateCustomMetric(editingMetric.id, payload);
      } else {
        const payload: CreateCustomMetricPayload = {
          name: formData.name.trim(),
          displayName: formData.displayName.trim(),
          description: normalizeOptionalString(formData.description),
          type: formData.type,
          formula: formData.formula.trim(),
          dataType: formData.dataType,
          format: formData.format,
          decimals: Math.max(0, Math.min(10, Number(formData.decimals) || 0)),
          prefix: normalizeOptionalString(formData.prefix),
          suffix: normalizeOptionalString(formData.suffix),
        };
        await createCustomMetric(payload);
      }

      await refreshMetrics();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save metric');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (metric: CustomMetricDefinition) => {
    if (!window.confirm(`Delete metric "${metric.displayName}"?`)) {
      return;
    }

    try {
      await deleteCustomMetric(metric.id);
      await refreshMetrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete metric');
    }
  };

  const insertVariable = (variable: string) => {
    setFormData((prev) => {
      const needsSpacer = prev.formula.length > 0 && !prev.formula.endsWith(' ');
      return {
        ...prev,
        formula: `${prev.formula}${needsSpacer ? ' ' : ''}${variable}`,
      };
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Metrics</h1>
          <p className="mt-1 text-gray-600">Configure reusable metrics for Reports and Export flows.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Metric
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {metrics.length === 0 ? (
          <div className="rounded-lg border bg-white py-12 text-center">
            <Calculator className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-600">No custom metrics yet</p>
            <p className="mt-1 text-sm text-gray-500">Create your first metric and use it directly in Reports.</p>
          </div>
        ) : (
          metrics.map((metric) => (
            <div key={metric.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{metric.displayName}</h3>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{metric.name}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        metric.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {metric.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{metric.type}</span>
                  </div>
                  {metric.description && <p className="mt-1 text-sm text-gray-600">{metric.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="rounded bg-gray-50 px-2 py-1 font-mono">{metric.formula}</span>
                    <span>Format: {metric.format}</span>
                    <span>Decimals: {metric.decimals}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openModal(metric)}
                    className="rounded p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                    disabled={metric.isSystem}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void handleDelete(metric)}
                    className="rounded p-2 text-gray-600 hover:bg-red-50 hover:text-red-600"
                    disabled={metric.isSystem}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editingMetric ? 'Edit Metric' : 'Create Metric'}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Name (ID)</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. traffic_quality_index"
                    disabled={Boolean(editingMetric)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Display Name</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, displayName: event.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Traffic Quality Index"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={formData.type}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, type: event.target.value as CustomMetricType }))
                    }
                    className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    disabled={Boolean(editingMetric)}
                  >
                    {METRIC_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, status: event.target.value as CustomMetricStatus }))
                    }
                    className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="What does this metric represent?"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Formula</label>
                <textarea
                  value={formData.formula}
                  onChange={(event) => setFormData((prev) => ({ ...prev, formula: event.target.value }))}
                  className={`w-full rounded-lg border px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500 ${
                    validationError ? 'border-red-500' : ''
                  }`}
                  rows={3}
                  placeholder="e.g. (revenue - spend) / clicks"
                  required
                />
                {validationError && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {validationError}
                  </p>
                )}
                <div className="mt-2">
                  <p className="mb-1 text-xs text-gray-500">Available variables (click to insert):</p>
                  <div className="flex flex-wrap gap-1">
                    {AVAILABLE_VARIABLES.map((variable) => (
                      <button
                        key={variable.name}
                        type="button"
                        onClick={() => insertVariable(variable.name)}
                        className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                        title={variable.description}
                      >
                        {variable.displayName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Data Type</label>
                  <select
                    value={formData.dataType}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, dataType: event.target.value as CustomMetricDataType }))
                    }
                    className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    {DATA_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Format</label>
                  <select
                    value={formData.format}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, format: event.target.value as CustomMetricFormat }))
                    }
                    className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    {FORMAT_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Decimals</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={formData.decimals}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, decimals: Number(event.target.value) || 0 }))
                    }
                    className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Prefix / Suffix</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.prefix}
                      onChange={(event) => setFormData((prev) => ({ ...prev, prefix: event.target.value }))}
                      className="w-full rounded-lg border px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="$"
                    />
                    <input
                      type="text"
                      value={formData.suffix}
                      onChange={(event) => setFormData((prev) => ({ ...prev, suffix: event.target.value }))}
                      className="w-full rounded-lg border px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="%"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Preview</h3>
                  <button type="button" onClick={previewFormula} className="text-sm text-blue-600 hover:text-blue-700">
                    Calculate Preview
                  </button>
                </div>
                <div className="mb-2 grid grid-cols-4 gap-2">
                  {Object.entries(previewContext).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500">{key}</label>
                      <input
                        type="number"
                        value={value}
                        onChange={(event) =>
                          setPreviewContext((prev) => ({
                            ...prev,
                            [key]: Number(event.target.value),
                          }))
                        }
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>
                  ))}
                </div>
                {previewResult && (
                  <div className="flex items-center gap-2 rounded border border-green-200 bg-green-50 p-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="font-mono text-green-800">
                      Result: {previewResult.formatted} ({previewResult.value})
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button type="button" onClick={closeModal} className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingMetric ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
