/**
 * @fileoverview Exported Reports 页面
 * @description 管理报表导出任务,查看历史记录,下载文件
 * @module pages/ExportedReports
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Download,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface ExportTask {
  id: string;
  name: string;
  entityType: string;
  format: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalRecords: number;
  fileName?: string;
  fileUrl?: string;
  fileSize: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

interface ExportTaskStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  campaigns: 'Campaigns',
  'landing-pages': 'Landing Pages',
  offers: 'Offers',
  'traffic-sources': 'Traffic Sources',
  'affiliate-networks': 'Affiliate Networks',
  clicks: 'Clicks Log',
  conversions: 'Conversions Log',
  flows: 'Flows',
  reports: 'Reports',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-600 bg-yellow-50',
    icon: <Clock className="w-4 h-4" />,
  },
  running: {
    label: 'Running',
    color: 'text-blue-600 bg-blue-50',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600 bg-green-50',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600 bg-red-50',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-600 bg-gray-50',
    icon: <XCircle className="w-4 h-4" />,
  },
};

const EXPORT_TASK_DRAFT_STORAGE_KEY = 'cftracking.export-task-draft.v1';

export default function ExportedReports() {
  const [tasks, setTasks] = useState<ExportTask[]>([]);
  const [stats, setStats] = useState<ExportTaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/export-tasks');
      const data = await response.json();
      if (data.success) {
        setTasks(data.data.list);
      }
    } catch (error) {
      console.error('Failed to fetch export tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/export-tasks/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch export task stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchStats();
    const interval = setInterval(fetchTasks, 5000); // 每5秒刷新一次
    return () => clearInterval(interval);
  }, [fetchTasks, fetchStats]);

  const handleDownload = async (task: ExportTask) => {
    if (!task.fileUrl) return;
    window.open(`/api/export-tasks/${task.id}/download`, '_blank');
  };

  const handleCancel = async (taskId: string) => {
    try {
      const response = await fetch(`/api/export-tasks/${taskId}/cancel`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  const handleRetry = async (taskId: string) => {
    try {
      const response = await fetch(`/api/export-tasks/${taskId}/retry`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to retry task:', error);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const response = await fetch(`/api/export-tasks/${taskId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        fetchTasks();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Exported Reports
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Export
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow">
              <div className="text-sm text-yellow-600">Pending</div>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow">
              <div className="text-sm text-blue-600">Running</div>
              <div className="text-2xl font-bold">{stats.running}</div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg shadow">
              <div className="text-sm text-green-600">Completed</div>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg shadow">
              <div className="text-sm text-red-600">Failed</div>
              <div className="text-2xl font-bold">{stats.failed}</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Export History</h2>
            <button
              onClick={fetchTasks}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No export tasks yet</p>
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {tasks.map((task) => {
              const statusConfig = STATUS_CONFIG[task.status];
              return (
                <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{task.name}</h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div className="flex items-center gap-4">
                          <span>Type: {ENTITY_TYPE_LABELS[task.entityType] || task.entityType}</span>
                          <span>Format: {task.format.toUpperCase()}</span>
                          {task.totalRecords > 0 && <span>Records: {task.totalRecords}</span>}
                          {task.fileSize > 0 && <span>Size: {formatFileSize(task.fileSize)}</span>}
                        </div>

                        <div className="flex items-center gap-4">
                          <span>Created: {formatDate(task.createdAt)}</span>
                          {task.completedAt && <span>Completed: {formatDate(task.completedAt)}</span>}
                        </div>

                        {task.status === 'running' && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs">Progress</span>
                              <span className="text-xs">{task.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {task.error && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-red-600 text-xs">
                            {task.error}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {task.status === 'completed' && task.fileUrl && (
                        <button
                          onClick={() => handleDownload(task)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      )}

                      {task.status === 'running' && (
                        <button
                          onClick={() => handleCancel(task.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel
                        </button>
                      )}

                      {task.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(task.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Retry
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(task.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateExportModal onClose={() => setShowCreateModal(false)} onSuccess={fetchTasks} />
      )}
    </div>
  );
}

function CreateExportModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState('campaigns');
  const [format, setFormat] = useState<'csv' | 'excel' | 'json'>('csv');
  const [filters, setFilters] = useState<Record<string, unknown> | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string } | undefined>(undefined);
  const [fields, setFields] = useState<string[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.sessionStorage.getItem(EXPORT_TASK_DRAFT_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const draft = JSON.parse(raw) as {
        name?: string;
        entityType?: string;
        format?: 'csv' | 'excel' | 'json';
        filters?: Record<string, unknown>;
        dateRange?: { startDate: string; endDate: string };
        fields?: string[];
      };

      if (draft.name) {
        setName(draft.name);
      }
      if (draft.entityType) {
        setEntityType(draft.entityType);
      }
      if (draft.format) {
        setFormat(draft.format);
      }
      if (draft.filters && typeof draft.filters === 'object') {
        setFilters(draft.filters);
      }
      if (draft.dateRange?.startDate && draft.dateRange?.endDate) {
        setDateRange(draft.dateRange);
      }
      if (Array.isArray(draft.fields)) {
        setFields(draft.fields);
      }

      window.sessionStorage.removeItem(EXPORT_TASK_DRAFT_STORAGE_KEY);
    } catch {
      // Ignore session storage failures in restricted contexts.
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/export-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || `${entityType}-export-${new Date().toISOString().split('T')[0]}`,
          entityType,
          format,
          filters,
          dateRange,
          fields,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Failed to create export task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold">Create Export Task</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Export name (optional)"
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-700"
            >
              <option value="campaigns">Campaigns</option>
              <option value="landing-pages">Landing Pages</option>
              <option value="offers">Offers</option>
              <option value="traffic-sources">Traffic Sources</option>
              <option value="affiliate-networks">Affiliate Networks</option>
              <option value="clicks">Clicks Log</option>
              <option value="conversions">Conversions Log</option>
              <option value="flows">Flows</option>
              <option value="reports">Reports</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
              className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-700"
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
