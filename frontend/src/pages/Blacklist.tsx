/**
 * File: Blacklist.tsx
 * Purpose: 黑名单管理页面，支持查看、添加、编辑、同步黑名单
 * Input/Output: 显示黑名单列表，支持CRUD操作和同步到流量平台
 * Logic: 从 API 获取黑名单数据，支持按流量平台筛选，支持IP/UA类型
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Globe,
  Smartphone,
  Palette,
  User,
  Hash,
  MapPin,
  Monitor
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { readBootstrapPage } from '../services/bootstrap';
import { FIELD_MAX_LENGTH, DISPLAY_MAX_LENGTH } from '../constants/fieldConstraints';
import { clampInput, truncateLabel } from '../utils/text';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type BlacklistType = 'zone' | 'creative' | 'publisher' | 'sub_id' | 'geo' | 'device' | 'ip' | 'user_agent';
type IpMatchMode = 'exact' | 'cidr';
type UaMatchMode = 'exact' | 'contains';

interface BlacklistEntry {
  id: string;
  trafficSourceId: string;
  trafficSourceName?: string;
  type: BlacklistType;
  value: string;
  name?: string;
  reason?: string;
  status: 'active' | 'removed';
  synced: boolean;
  syncedAt?: string;
  campaignId?: string;
  ipMatchMode?: IpMatchMode;
  uaMatchMode?: UaMatchMode;
  syncToPlatform?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TrafficSource {
  id: string;
  name: string;
}

interface FormData {
  trafficSourceId: string;
  type: BlacklistType;
  value: string;
  name: string;
  reason: string;
  campaignId: string;
  ipMatchMode: IpMatchMode;
  uaMatchMode: UaMatchMode;
  syncToPlatform: boolean;
}

const initialFormData: FormData = {
  trafficSourceId: '',
  type: 'zone',
  value: '',
  name: '',
  reason: '',
  campaignId: '',
  ipMatchMode: 'exact',
  uaMatchMode: 'exact',
  syncToPlatform: true,
};

const typeOptions: { value: BlacklistType; label: string; icon: React.ReactNode }[] = [
  { value: 'zone', label: 'Zone', icon: <Globe size={16} /> },
  { value: 'creative', label: 'Creative', icon: <Palette size={16} /> },
  { value: 'publisher', label: 'Publisher', icon: <User size={16} /> },
  { value: 'sub_id', label: 'Sub ID', icon: <Hash size={16} /> },
  { value: 'geo', label: 'Geo', icon: <MapPin size={16} /> },
  { value: 'device', label: 'Device', icon: <Smartphone size={16} /> },
  { value: 'ip', label: 'IP Address', icon: <Monitor size={16} /> },
  { value: 'user_agent', label: 'User Agent', icon: <ExternalLink size={16} /> },
];

const getBlacklistValueMaxLength = (type: BlacklistType) =>
  type === 'user_agent' ? FIELD_MAX_LENGTH.USER_AGENT_VALUE : FIELD_MAX_LENGTH.TRAFFIC_ENTRY_VALUE;

export const Blacklist = () => {
  const bootstrap = readBootstrapPage<{
    entries?: BlacklistEntry[];
    trafficSources?: TrafficSource[];
  }>('blacklist');
  const hasBootstrap = Boolean(bootstrap);
  const [entries, setEntries] = useState<BlacklistEntry[]>(Array.isArray(bootstrap?.data?.entries) ? bootstrap.data.entries : []);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>(
    Array.isArray(bootstrap?.data?.trafficSources) ? bootstrap.data.trafficSources : []
  );
  const [loading, setLoading] = useState(!hasBootstrap);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterSynced, setFilterSynced] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (!hasBootstrap && entries.length === 0) {
        setLoading(true);
      }
      const bundle = readBootstrapPage<{
        entries?: BlacklistEntry[];
        trafficSources?: TrafficSource[];
      }>('blacklist');

      setEntries(Array.isArray(bundle?.data?.entries) ? bundle.data.entries : []);
      setTrafficSources(Array.isArray(bundle?.data?.trafficSources) ? bundle.data.trafficSources : []);
    } catch (err) {
      console.error('Failed to fetch blacklist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (trafficSourceId: string) => {
    try {
      setSyncing(trafficSourceId);
      const response = await fetch(`/api/blacklist/sync/${trafficSourceId}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        alert(`Sync completed: ${data.data.synced} synced, ${data.data.failed} failed`);
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to sync:', err);
    } finally {
      setSyncing(null);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this entry from blacklist?')) return;
    
    try {
      const response = await fetch(`/api/blacklist/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setEntries(prev => prev.filter(entry => entry.id !== id));
      }
    } catch (err) {
      console.error('Failed to remove:', err);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (entry: BlacklistEntry) => {
    setIsEditMode(true);
    setEditingId(entry.id);
    setFormData({
      trafficSourceId: entry.trafficSourceId,
      type: entry.type,
      value: clampInput(entry.value, getBlacklistValueMaxLength(entry.type)),
      name: clampInput(entry.name || '', FIELD_MAX_LENGTH.NAME),
      reason: clampInput(entry.reason || '', FIELD_MAX_LENGTH.REASON),
      campaignId: clampInput(entry.campaignId || '', FIELD_MAX_LENGTH.CAMPAIGN_ID),
      ipMatchMode: entry.ipMatchMode || 'exact',
      uaMatchMode: entry.uaMatchMode || 'exact',
      syncToPlatform: entry.syncToPlatform !== false,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.trafficSourceId) {
      errors.trafficSourceId = 'Traffic source is required';
    }
    if (!formData.value.trim()) {
      errors.value = 'Value is required';
    }

    // IP validation
    if (formData.type === 'ip') {
      if (formData.ipMatchMode === 'cidr') {
        const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
        if (!cidrRegex.test(formData.value)) {
          errors.value = 'Invalid CIDR format. Expected: x.x.x.x/y';
        }
      } else {
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipv4Regex.test(formData.value)) {
          errors.value = 'Invalid IP address format';
        }
      }
    }

    // UA validation
    if (formData.type === 'user_agent' && formData.value.length > 1000) {
      errors.value = 'User Agent too long (max 1000 characters)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = isEditMode ? `/api/blacklist/${editingId}` : '/api/blacklist';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        name: formData.name || undefined,
        reason: formData.reason || undefined,
        campaignId: formData.campaignId || undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        const savedEntry = result?.data;
        if (savedEntry?.id) {
          setEntries(prev =>
            isEditMode
              ? prev.map(entry => entry.id === savedEntry.id ? savedEntry : entry)
              : [savedEntry, ...prev]
          );
        }
        closeModal();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save blacklist entry');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save blacklist entry');
    } finally {
      setSubmitting(false);
    }
  };

  const getTrafficSourceName = (id: string) => {
    return trafficSources.find(ts => ts.id === id)?.name || id;
  };

  const getTypeLabel = (type: string) => {
    const option = typeOptions.find(opt => opt.value === type);
    return option?.label || type;
  };

  const getTypeIcon = (type: string) => {
    const option = typeOptions.find(opt => opt.value === type);
    return option?.icon || <Globe size={16} />;
  };

  // Filter entries
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      entry.value?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = filterSource === 'all' || entry.trafficSourceId === filterSource;
    const matchesSynced = filterSynced === 'all' || 
      (filterSynced === 'synced' && entry.synced) ||
      (filterSynced === 'unsynced' && !entry.synced);
    const matchesType = filterType === 'all' || entry.type === filterType;
    return matchesSearch && matchesSource && matchesSynced && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={48} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Blacklist</h1>
          <p className="text-sm text-on-surface-variant">
            Manage blocked zones, creatives, IPs, user agents and other traffic sources
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button 
            onClick={openAddModal}
            className="btn-create flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors"
          >
            <Plus size={16} />
            Add Entry
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-error/10 rounded-sm flex items-center justify-center">
              <Shield size={20} className="text-error" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Total Blocked</p>
              <p className="text-2xl font-bold text-primary">{entries.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary-container rounded-sm flex items-center justify-center">
              <CheckCircle size={20} className="text-secondary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Synced</p>
              <p className="text-2xl font-bold text-primary">{entries.filter(e => e.synced).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-sm flex items-center justify-center">
              <AlertTriangle size={20} className="text-warning" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Pending Sync</p>
              <p className="text-2xl font-bold text-primary">{entries.filter(e => !e.synced && e.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
              <ExternalLink size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Traffic Sources</p>
              <p className="text-2xl font-bold text-primary">{trafficSources.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest p-4 whisper-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
            <input 
              type="text" 
              placeholder="Search by value, name or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all min-w-[300px]"
            />
          </div>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none"
          >
            <option value="all">All Traffic Sources</option>
            {trafficSources.map(ts => (
              <option key={ts.id} value={ts.id} title={ts.name}>
                {truncateLabel(ts.name, DISPLAY_MAX_LENGTH.SELECT_OPTION_LABEL)}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none"
          >
            <option value="all">All Types</option>
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={filterSynced}
            onChange={(e) => setFilterSynced(e.target.value)}
            className="px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none"
          >
            <option value="all">All Status</option>
            <option value="synced">Synced</option>
            <option value="unsynced">Not Synced</option>
          </select>
        </div>
        <div className="flex gap-2">
          {trafficSources.map(ts => (
            <button
              key={ts.id}
              onClick={() => handleSync(ts.id)}
              disabled={syncing === ts.id}
              title={`Sync ${ts.name}`}
              className="modal-btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
            >
              {syncing === ts.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Sync {truncateLabel(ts.name, DISPLAY_MAX_LENGTH.BUTTON_LABEL)}
            </button>
          ))}
        </div>
      </div>

      {/* Blacklist Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Value</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Type</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Traffic Source</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Reason</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Sync Status</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Created</th>
                <th className="px-4 py-4 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.map((entry) => (
                <tr 
                  key={entry.id} 
                  className="border-t border-outline-variant/10 hover:bg-surface-container/50 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="min-w-0">
                      <p className="font-bold text-primary truncate max-w-[220px]" title={entry.value}>
                        {truncateLabel(entry.value, DISPLAY_MAX_LENGTH.TABLE_VALUE_TEXT)}
                      </p>
                      {entry.name && (
                        <p className="text-xs text-on-surface-variant truncate max-w-[220px]" title={entry.name}>
                          {truncateLabel(entry.name, DISPLAY_MAX_LENGTH.TABLE_PRIMARY_TEXT)}
                        </p>
                      )}
                      {entry.type === 'ip' && entry.ipMatchMode && (
                        <p className="text-xs text-on-surface-variant/60">Mode: {entry.ipMatchMode}</p>
                      )}
                      {entry.type === 'user_agent' && entry.uaMatchMode && (
                        <p className="text-xs text-on-surface-variant/60">Mode: {entry.uaMatchMode}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm bg-surface-container text-on-surface-variant">
                      {getTypeIcon(entry.type)}
                      {getTypeLabel(entry.type)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-on-surface inline-block max-w-[180px] truncate" title={getTrafficSourceName(entry.trafficSourceId)}>
                      {truncateLabel(getTrafficSourceName(entry.trafficSourceId), DISPLAY_MAX_LENGTH.TABLE_PRIMARY_TEXT)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-on-surface-variant inline-block max-w-[220px] truncate" title={entry.reason || '-'}>
                      {truncateLabel(entry.reason || '-', DISPLAY_MAX_LENGTH.TABLE_REASON_TEXT)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm",
                      entry.status === 'active' ? "status-deleted" : "status-paused"
                    )}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {entry.synced ? (
                        <>
                          <CheckCircle size={16} className="text-secondary" />
                          <span className="text-xs text-secondary">Synced</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} className="text-warning" />
                          <span className="text-xs text-warning">Not Synced</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-on-surface-variant">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openEditModal(entry)}
                        className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                        title="Edit blacklist entry"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleRemove(entry.id)}
                        className="p-2 text-on-surface-variant hover:text-error transition-colors"
                        title="Remove from blacklist"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEntries.length === 0 && (
          <div className="p-8 text-center text-on-surface-variant">
            <Shield size={48} className="mx-auto mb-4 opacity-30" />
            <p>No blacklist entries found</p>
            <p className="text-sm mt-2">Add entries using the Add Entry button</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-outline-variant/10">
            <span className="text-sm text-on-surface-variant">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredEntries.length)} of {filteredEntries.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={cn(
                  "p-2 rounded-sm transition-colors",
                  currentPage === 1 
                    ? "text-on-surface-variant/30 cursor-not-allowed" 
                    : "text-on-surface-variant hover:bg-surface-container"
                )}
              >
                <ChevronLeft size={20} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-8 h-8 text-sm font-medium rounded-sm transition-colors",
                    currentPage === page
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container"
                  )}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={cn(
                  "p-2 rounded-sm transition-colors",
                  currentPage === totalPages 
                    ? "text-on-surface-variant/30 cursor-not-allowed" 
                    : "text-on-surface-variant hover:bg-surface-container"
                )}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-primary mb-4">
                {isEditMode ? 'Edit Blacklist Entry' : 'Add Blacklist Entry'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Traffic Source */}
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">
                    Traffic Source <span className="text-error">*</span>
                  </label>
                  <select
                    value={formData.trafficSourceId}
                    onChange={(e) => setFormData({ ...formData, trafficSourceId: e.target.value })}
                    className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none"
                    disabled={isEditMode}
                  >
                    <option value="">Select traffic source</option>
                    {trafficSources.map(ts => (
                      <option key={ts.id} value={ts.id} title={ts.name}>
                        {truncateLabel(ts.name, DISPLAY_MAX_LENGTH.SELECT_OPTION_LABEL)}
                      </option>
                    ))}
                  </select>
                  {formErrors.trafficSourceId && (
                    <p className="text-xs text-error mt-1">{formErrors.trafficSourceId}</p>
                  )}
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">
                    Type <span className="text-error">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const nextType = e.target.value as BlacklistType;
                      setFormData({
                        ...formData,
                        type: nextType,
                        value: clampInput(formData.value, getBlacklistValueMaxLength(nextType)),
                      });
                    }}
                    className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none"
                    disabled={isEditMode}
                  >
                    {typeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Value */}
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">
                    Value <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: clampInput(e.target.value, getBlacklistValueMaxLength(formData.type)) })}
                    placeholder={formData.type === 'ip' ? '192.168.1.1' : formData.type === 'user_agent' ? 'Mozilla/5.0...' : 'Enter value'}
                    className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none"
                    disabled={isEditMode}
                    maxLength={getBlacklistValueMaxLength(formData.type)}
                  />
                  {formErrors.value && (
                    <p className="text-xs text-error mt-1">{formErrors.value}</p>
                  )}
                  {formData.type === 'ip' && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      Enter IP address. Use CIDR mode for ranges (e.g., 192.168.1.0/24)
                    </p>
                  )}
                  {formData.type === 'user_agent' && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      Enter User Agent string or pattern
                    </p>
                  )}
                </div>

                {/* IP Match Mode */}
                {formData.type === 'ip' && (
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1">
                      Match Mode
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="exact"
                          checked={formData.ipMatchMode === 'exact'}
                          onChange={(e) => setFormData({ ...formData, ipMatchMode: e.target.value as IpMatchMode })}
                          className="text-primary"
                        />
                        <span className="text-sm">Exact Match</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="cidr"
                          checked={formData.ipMatchMode === 'cidr'}
                          onChange={(e) => setFormData({ ...formData, ipMatchMode: e.target.value as IpMatchMode })}
                          className="text-primary"
                        />
                        <span className="text-sm">CIDR Range</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* UA Match Mode */}
                {formData.type === 'user_agent' && (
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1">
                      Match Mode
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="exact"
                          checked={formData.uaMatchMode === 'exact'}
                          onChange={(e) => setFormData({ ...formData, uaMatchMode: e.target.value as UaMatchMode })}
                          className="text-primary"
                        />
                        <span className="text-sm">Exact Match</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="contains"
                          checked={formData.uaMatchMode === 'contains'}
                          onChange={(e) => setFormData({ ...formData, uaMatchMode: e.target.value as UaMatchMode })}
                          className="text-primary"
                        />
                        <span className="text-sm">Contains</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Sync to Platform */}
                {(formData.type === 'ip' || formData.type === 'user_agent') && (
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.syncToPlatform}
                        onChange={(e) => setFormData({ ...formData, syncToPlatform: e.target.checked })}
                        className="text-primary"
                      />
                      <span className="text-sm">Sync to traffic platform (if supported)</span>
                    </label>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">
                    Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: clampInput(e.target.value, FIELD_MAX_LENGTH.NAME) })}
                    placeholder="Enter a descriptive name"
                    className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none"
                    maxLength={FIELD_MAX_LENGTH.NAME}
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: clampInput(e.target.value, FIELD_MAX_LENGTH.REASON) })}
                    placeholder="Why is this being blacklisted?"
                    rows={3}
                    className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none resize-none"
                    maxLength={FIELD_MAX_LENGTH.REASON}
                  />
                </div>

                {/* Campaign ID */}
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1">
                    Campaign ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.campaignId}
                    onChange={(e) => setFormData({ ...formData, campaignId: clampInput(e.target.value, FIELD_MAX_LENGTH.CAMPAIGN_ID) })}
                    placeholder="Associated campaign ID"
                    className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none"
                    maxLength={FIELD_MAX_LENGTH.CAMPAIGN_ID}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-outline-variant text-primary text-sm font-medium hover:bg-surface-container transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-create flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {isEditMode ? 'Update' : 'Add'} Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blacklist;
