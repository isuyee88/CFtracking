/**
 * @fileoverview Custom Metrics 管理页面
 * @description 自定义指标的创建、编辑、删除和预览
 * @module frontend/src/pages/CustomMetrics
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calculator, AlertCircle, Check, X } from 'lucide-react';

interface CustomMetric {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  formula: string;
  dataType: 'number' | 'percentage' | 'currency';
  format: string;
  category: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MetricVariable {
  name: string;
  displayName: string;
  description: string;
}

const AVAILABLE_VARIABLES: MetricVariable[] = [
  { name: 'clicks', displayName: 'Clicks', description: 'Total clicks' },
  { name: 'conversions', displayName: 'Conversions', description: 'Total conversions' },
  { name: 'revenue', displayName: 'Revenue', description: 'Total revenue' },
  { name: 'cost', displayName: 'Cost', description: 'Total cost' },
  { name: 'profit', displayName: 'Profit', description: 'Revenue - Cost' },
  { name: 'impressions', displayName: 'Impressions', description: 'Total impressions' },
  { name: 'visitors', displayName: 'Visitors', description: 'Unique visitors' },
  { name: 'leads', displayName: 'Leads', description: 'Total leads' },
];

const DATA_TYPES = [
  { value: 'number', label: 'Number' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'currency', label: 'Currency' },
];

const CATEGORIES = [
  { value: 'performance', label: 'Performance' },
  { value: 'financial', label: 'Financial' },
  { value: 'quality', label: 'Quality' },
  { value: 'custom', label: 'Custom' },
];

export default function CustomMetrics() {
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<CustomMetric | null>(null);
  const [previewResult, setPreviewResult] = useState<{ value: number; formatted: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    formula: '',
    dataType: 'number' as 'number' | 'percentage' | 'currency',
    format: '',
    category: 'custom',
    enabled: true,
  });

  const [previewContext, setPreviewContext] = useState({
    clicks: 1000,
    conversions: 50,
    revenue: 500,
    cost: 200,
    profit: 300,
    impressions: 5000,
    visitors: 800,
    leads: 30,
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/custom-metrics');
      const data = await response.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateFormula = async (formula: string): Promise<boolean> => {
    if (!formula.trim()) return false;
    try {
      const response = await fetch('/api/custom-metrics/validate-formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formula }),
      });
      const data = await response.json();
      if (data.success && data.data.valid) {
        setValidationError(null);
        return true;
      } else {
        setValidationError(data.data?.error || 'Invalid formula');
        return false;
      }
    } catch {
      setValidationError('Failed to validate formula');
      return false;
    }
  };

  const previewFormula = async () => {
    if (!formData.formula.trim()) return;
    try {
      const response = await fetch('/api/custom-metrics/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formula: formData.formula, context: previewContext }),
      });
      const data = await response.json();
      if (data.success) {
        setPreviewResult({
          value: data.data.value,
          formatted: data.data.formatted,
        });
      }
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await validateFormula(formData.formula);
    if (!isValid) return;

    try {
      const url = editingMetric 
        ? `/api/custom-metrics/${editingMetric.id}`
        : '/api/custom-metrics';
      const method = editingMetric ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        fetchMetrics();
        closeModal();
      }
    } catch (error) {
      console.error('Failed to save metric:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this metric?')) return;
    
    try {
      await fetch(`/api/custom-metrics/${id}`, { method: 'DELETE' });
      fetchMetrics();
    } catch (error) {
      console.error('Failed to delete metric:', error);
    }
  };

  const openModal = (metric?: CustomMetric) => {
    if (metric) {
      setEditingMetric(metric);
      setFormData({
        name: metric.name,
        displayName: metric.displayName,
        description: metric.description || '',
        formula: metric.formula,
        dataType: metric.dataType,
        format: metric.format,
        category: metric.category,
        enabled: metric.enabled,
      });
    } else {
      setEditingMetric(null);
      setFormData({
        name: '',
        displayName: '',
        description: '',
        formula: '',
        dataType: 'number',
        format: '',
        category: 'custom',
        enabled: true,
      });
    }
    setShowModal(true);
    setValidationError(null);
    setPreviewResult(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMetric(null);
    setValidationError(null);
    setPreviewResult(null);
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      formula: prev.formula + `{{${variable}}}`,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Metrics</h1>
          <p className="text-gray-600 mt-1">Create and manage custom calculation metrics</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Metric
        </button>
      </div>

      <div className="grid gap-4">
        {metrics.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No custom metrics yet</p>
            <p className="text-sm text-gray-500 mt-1">Create your first custom metric to get started</p>
          </div>
        ) : (
          metrics.map((metric) => (
            <div key={metric.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{metric.displayName}</h3>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {metric.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      metric.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {metric.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {metric.description && (
                    <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span className="font-mono bg-gray-50 px-2 py-1 rounded">{metric.formula}</span>
                    <span>Type: {metric.dataType}</span>
                    <span>Category: {metric.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openModal(metric)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(metric.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {editingMetric ? 'Edit Metric' : 'Create Metric'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (ID)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., roi_percentage"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., ROI Percentage"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Describe what this metric calculates"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Formula
                </label>
                <textarea
                  value={formData.formula}
                  onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 ${
                    validationError ? 'border-red-500' : ''
                  }`}
                  rows={3}
                  placeholder="e.g., ({{revenue}} - {{cost}}) / {{cost}} * 100"
                  required
                />
                {validationError && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {validationError}
                  </p>
                )}
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Available variables (click to insert):</p>
                  <div className="flex flex-wrap gap-1">
                    {AVAILABLE_VARIABLES.map((v) => (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => insertVariable(v.name)}
                        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                        title={v.description}
                      >
                        {v.displayName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Type
                  </label>
                  <select
                    value={formData.dataType}
                    onChange={(e) => setFormData({ ...formData, dataType: e.target.value as 'number' | 'percentage' | 'currency' })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {DATA_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format (optional)
                </label>
                <input
                  type="text"
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 0.00% or $0,0.00"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="enabled" className="text-sm text-gray-700">Enabled</label>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Preview</h3>
                  <button
                    type="button"
                    onClick={previewFormula}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Calculate Preview
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {Object.entries(previewContext).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-xs text-gray-500">{key}</label>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setPreviewContext({ ...previewContext, [key]: Number(e.target.value) })}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
                {previewResult && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-mono text-green-800">
                      Result: {previewResult.formatted} ({previewResult.value})
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingMetric ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
