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
  Monitor,
  Building2,
  Fingerprint
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { VirtualTableEnhanced } from '../components/VirtualTableEnhanced';
import { TablePagination } from '../components/TablePagination';
import { PageNotice } from '../components/PageNotice';
import { useClientPagination } from '../hooks/useClientPagination';
import { readBootstrapPage } from '../services/bootstrap';
import { FIELD_MAX_LENGTH, DISPLAY_MAX_LENGTH } from '../constants/fieldConstraints';
import { clampInput, truncateLabel } from '../utils/text';
import {
  createBlacklistEntry,
  deleteBlacklistEntry,
  fetchBlacklist,
  fetchTrafficSources,
  syncBlacklistEntry,
  updateBlacklistEntry,
} from '../services/api';
import {
  ListConditionsEditor,
  type ListCondition,
  type ListConditionMode,
} from '../components/ListConditionsEditor';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function renderLengthCounter(value: string | undefined, maxLength: number) {
  return (
    <p className="mt-1 text-right text-[11px] text-on-surface-variant/70">
      {(value || '').length}/{maxLength}
    </p>
  );
}

type BlacklistType =
  | 'zone'
  | 'creative'
  | 'publisher'
  | 'sub_id'
  | 'geo'
  | 'country'
  | 'device'
  | 'ip'
  | 'user_agent'
  | 'asn'
  | 'isp'
  | 'isp_type'
  | 'visitor_id'
  | 'org_exact'
  | 'org_keyword'
  | 'network_tag'
  | 'allow_bias_org'
  | 'allow_bias_isp_type'
  | 'suspicious_reason'
  | 'fingerprint'
  | 'rule';
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
  matchMode?: ListConditionMode;
  conditions?: ListCondition[];
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
  ipMatchMode: IpMatchMode;
  uaMatchMode: UaMatchMode;
  syncToPlatform: boolean;
  matchMode: ListConditionMode;
  conditions: ListCondition[];
}

const GENERAL_TRAFFIC_SOURCE_ID = 'general';
const GENERAL_TRAFFIC_SOURCE_NAME = 'General Traffic Source';

const initialFormData: FormData = {
  trafficSourceId: '',
  type: 'zone',
  value: '',
  name: '',
  reason: '',
  ipMatchMode: 'exact',
  uaMatchMode: 'exact',
  syncToPlatform: true,
  matchMode: 'all',
  conditions: [],
};

const typeOptions: { value: BlacklistType; label: string; icon: React.ReactNode }[] = [
  { value: 'zone', label: 'Zone', icon: <Globe size={16} /> },
  { value: 'creative', label: 'Creative', icon: <Palette size={16} /> },
  { value: 'publisher', label: 'Publisher', icon: <User size={16} /> },
  { value: 'sub_id', label: 'Sub ID', icon: <Hash size={16} /> },
  { value: 'country', label: 'Country', icon: <MapPin size={16} /> },
  { value: 'device', label: 'Device', icon: <Smartphone size={16} /> },
  { value: 'ip', label: 'IP Address', icon: <Monitor size={16} /> },
  { value: 'user_agent', label: 'User Agent', icon: <ExternalLink size={16} /> },
  { value: 'asn', label: 'ASN', icon: <Hash size={16} /> },
  { value: 'isp', label: 'ISP', icon: <Building2 size={16} /> },
  { value: 'isp_type', label: 'ISP Type', icon: <Building2 size={16} /> },
  { value: 'visitor_id', label: 'Visitor ID', icon: <User size={16} /> },
  { value: 'org_exact', label: 'Org Exact', icon: <Building2 size={16} /> },
  { value: 'org_keyword', label: 'Org Keyword', icon: <Building2 size={16} /> },
  { value: 'network_tag', label: 'Network Tag', icon: <Shield size={16} /> },
  { value: 'allow_bias_org', label: 'Allow Bias Org', icon: <Building2 size={16} /> },
  { value: 'allow_bias_isp_type', label: 'Allow Bias ISP Type', icon: <Building2 size={16} /> },
  { value: 'suspicious_reason', label: 'Suspicious Reason', icon: <AlertTriangle size={16} /> },
  { value: 'fingerprint', label: 'Fingerprint', icon: <Fingerprint size={16} /> },
  { value: 'rule', label: 'Rule Group', icon: <Shield size={16} /> },
];

const getBlacklistValueMaxLength = (type: BlacklistType) =>
  type === 'user_agent' ? FIELD_MAX_LENGTH.USER_AGENT_VALUE : FIELD_MAX_LENGTH.TRAFFIC_ENTRY_VALUE;

const normalizeDisplayType = (type: string): BlacklistType | string => (type === 'geo' ? 'country' : type);

const normalizeCountryInput = (type: BlacklistType, value: string) =>
  type === 'country' ? value.toUpperCase() : value;

const shouldUseExpandedValueEditor = (type: BlacklistType) =>
  [
    'user_agent',
    'org_exact',
    'org_keyword',
    'network_tag',
    'allow_bias_org',
    'allow_bias_isp_type',
    'suspicious_reason',
    'rule',
  ].includes(type);

const withGeneralTrafficSource = (sources: TrafficSource[]): TrafficSource[] => {
  if (sources.some((source) => source.id === GENERAL_TRAFFIC_SOURCE_ID)) {
    return sources;
  }

  return [
    {
      id: GENERAL_TRAFFIC_SOURCE_ID,
      name: GENERAL_TRAFFIC_SOURCE_NAME,
    },
    ...sources,
  ];
};

export const Blacklist = () => {
  const bootstrap = readBootstrapPage<{
    entries?: BlacklistEntry[];
    trafficSources?: TrafficSource[];
  }>('blacklist');
  const hasBootstrap = Boolean(bootstrap);
  const [entries, setEntries] = useState<BlacklistEntry[]>(Array.isArray(bootstrap?.data?.entries) ? bootstrap.data.entries : []);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>(
    withGeneralTrafficSource(Array.isArray(bootstrap?.data?.trafficSources) ? bootstrap.data.trafficSources : [])
  );
  const [loading, setLoading] = useState(!hasBootstrap);
  // 拉取失败回落到内嵌快照时的提示；成功后清空。
  const [dataWarning, setDataWarning] = useState<string | null>(null);
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
  const [showAdvancedLogic, setShowAdvancedLogic] = useState(false);

  // 渲染层与校验层共用：只有存在条件规则时才隐藏单值输入。
  const hasConditionRules = formData.conditions.length > 0;

  const loadBootstrapData = () => {
    const bundle = readBootstrapPage<{
      entries?: BlacklistEntry[];
      trafficSources?: TrafficSource[];
    }>('blacklist');

    return {
      entries: Array.isArray(bundle?.data?.entries) ? bundle.data.entries : [],
      trafficSources: withGeneralTrafficSource(
        Array.isArray(bundle?.data?.trafficSources) ? bundle.data.trafficSources : []
      ),
    };
  };

  const clearFormError = (field: keyof FormData) => {
    setFormErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (!hasBootstrap && entries.length === 0) {
        setLoading(true);
      }

      const [entriesPayload, trafficSourcesPayload] = await Promise.all([
        fetchBlacklist(),
        fetchTrafficSources(false),
      ]);

      setEntries(Array.isArray(entriesPayload) ? entriesPayload : []);
      setTrafficSources(
        withGeneralTrafficSource(Array.isArray(trafficSourcesPayload) ? trafficSourcesPayload : [])
      );
      setDataWarning(null);
    } catch (err) {
      console.error('Failed to fetch blacklist:', err);
      // 回落到页面内嵌快照时必须说明，否则"旧数据"看起来和实时数据一模一样。
      const fallback = loadBootstrapData();
      setEntries(fallback.entries);
      setTrafficSources(fallback.trafficSources);
      setDataWarning(
        fallback.entries.length > 0
          ? 'Live data could not be loaded. Showing the snapshot embedded in this page, which may be stale.'
          : 'Live data could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (trafficSourceId: string) => {
    try {
      setSyncing(trafficSourceId);
      const data = await syncBlacklistEntry(trafficSourceId);
      if (data.success) {
        alert(`Sync completed: ${data.data.synced} synced, ${data.data.failed} failed`);
        await fetchData();
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
      await deleteBlacklistEntry(id);
      await fetchData();
    } catch (err) {
      console.error('Failed to remove:', err);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData(initialFormData);
    setShowAdvancedLogic(false);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (entry: BlacklistEntry) => {
    const displayType = normalizeDisplayType(entry.type) as BlacklistType;
    setIsEditMode(true);
    setEditingId(entry.id);
    setFormData({
      trafficSourceId: entry.trafficSourceId,
      type: displayType,
      value: clampInput(normalizeCountryInput(displayType, entry.value), getBlacklistValueMaxLength(displayType)),
      name: clampInput(entry.name || '', FIELD_MAX_LENGTH.NAME),
      reason: clampInput(entry.reason || '', FIELD_MAX_LENGTH.REASON),
      ipMatchMode: entry.ipMatchMode || 'exact',
      uaMatchMode: entry.uaMatchMode || 'exact',
      syncToPlatform: entry.syncToPlatform !== false,
      matchMode: entry.matchMode || 'all',
      conditions: Array.isArray(entry.conditions) ? entry.conditions : [],
    });
    setShowAdvancedLogic(Array.isArray(entry.conditions) && entry.conditions.length > 0);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
    setShowAdvancedLogic(false);
    setFormErrors({});
  };

  // 弹窗支持 Escape 关闭；关闭时重置表单，避免下次打开残留上次的输入。
  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
        setFormData(initialFormData);
        setShowAdvancedLogic(false);
        setFormErrors({});
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.trafficSourceId) {
      errors.trafficSourceId = 'Traffic source is required';
    }
    if (!hasConditionRules && !formData.value.trim()) {
      errors.value = 'Value is required';
    }
    if (formData.type === 'rule' && !hasConditionRules) {
      errors.conditions = 'Rule Group requires at least one condition';
    }

    // IP validation
    if (!hasConditionRules && formData.type === 'ip') {
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
    if (!hasConditionRules && formData.type === 'user_agent' && formData.value.length > 1000) {
      errors.value = 'User Agent too long (max 1000 characters)';
    }

    if (!hasConditionRules && formData.type === 'asn') {
      const asnRegex = /^(AS)?\d+$/i;
      if (!asnRegex.test(formData.value.trim())) {
        errors.value = 'Invalid ASN format. Expected: AS12345 or 12345';
      }
    }

    if (!hasConditionRules && formData.type === 'country') {
      const countryCodeRegex = /^[a-z]{2}$/i;
      if (!countryCodeRegex.test(formData.value.trim())) {
        errors.value = 'Invalid country code. Expected ISO 3166-1 alpha-2 like US';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        name: formData.name || undefined,
        reason: formData.reason || undefined,
      };

      if (isEditMode && editingId) {
        await updateBlacklistEntry(editingId, payload);
      } else {
        await createBlacklistEntry(payload);
      }
        await fetchData();
        closeModal();
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
    const option = typeOptions.find(opt => opt.value === normalizeDisplayType(type));
    return option?.label || type;
  };

  const getTypeIcon = (type: string) => {
    const option = typeOptions.find(opt => opt.value === normalizeDisplayType(type));
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
    const matchesType = filterType === 'all' || normalizeDisplayType(entry.type) === filterType;
    return matchesSearch && matchesSource && matchesSynced && matchesType;
  });

  // Pagination：搜索/来源/同步状态/类型变化时回到第 1 页，页码越界自动收敛。
  const {
    rows: paginatedEntries,
    page: currentPage,
    pageSize: itemsPerPage,
    totalPages,
    setPage: setCurrentPage,
  } = useClientPagination(filteredEntries, {
    pageSize: 20,
    resetKey: `${searchTerm}|${filterSource}|${filterSynced}|${filterType}`,
  });

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
            Manage blocked zones, IPs, visitor IDs, org signals, suspicious tags, and other traffic sources
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

      {/* 分页条放在页头之后：移动端在 4 个统计卡 + 筛选区之后要滚动近 900px 才能看到翻页。 */}
      <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredEntries.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} label="blacklist" />

      {dataWarning && (
        <PageNotice
          tone="warning"
          title="Live data unavailable"
          description={dataWarning}
          hint="Hit Refresh to retry the live request."
        />
      )}

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
      <div className="bg-surface-container-lowest p-4 whisper-shadow flex flex-col gap-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(360px,1.4fr),220px,180px,180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
            <input 
              type="text" 
              placeholder="Search by value, name or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full pl-10 pr-4 bg-surface text-base border border-outline-variant focus:border-primary outline-none transition-all"
            />
          </div>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="h-12 w-full px-4 bg-surface text-base border border-outline-variant focus:border-primary outline-none"
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
            className="h-12 w-full px-4 bg-surface text-base border border-outline-variant focus:border-primary outline-none"
          >
            <option value="all">All Types</option>
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={filterSynced}
            onChange={(e) => setFilterSynced(e.target.value)}
            className="h-12 w-full px-4 bg-surface text-base border border-outline-variant focus:border-primary outline-none"
          >
            <option value="all">All Status</option>
            <option value="synced">Synced</option>
            <option value="unsynced">Not Synced</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
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
      <div className="space-y-3 md:hidden">
        {paginatedEntries.map((entry) => (
          <article key={entry.id} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h2 className="truncate text-sm font-bold text-primary">{entry.value}</h2>{entry.name && <p className="truncate text-xs text-fg-muted">{entry.name}</p>}</div>
              <span className={entry.status === 'active' ? 'shrink-0 rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold uppercase text-success' : 'shrink-0 rounded-full bg-warning/10 px-2 py-1 text-[10px] font-bold uppercase text-warning'}>{entry.status}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div><dt className="text-fg-subtle">Type</dt><dd className="mt-0.5 text-fg-default">{getTypeLabel(entry.type)}</dd></div>
              <div><dt className="text-fg-subtle">Source</dt><dd className="mt-0.5 truncate text-fg-default">{getTrafficSourceName(entry.trafficSourceId)}</dd></div>
              <div><dt className="text-fg-subtle">Sync</dt><dd className="mt-0.5 text-fg-default">{entry.synced ? 'Synced' : 'Not synced'}</dd></div>
              <div><dt className="text-fg-subtle">Created</dt><dd className="mt-0.5 text-fg-default">{new Date(entry.createdAt).toLocaleDateString()}</dd></div>
            </dl>
            <div className="mt-3 flex justify-end gap-2 border-t border-outline-variant/10 pt-2">
              <button type="button" onClick={() => openEditModal(entry)} className="rounded-md border border-outline-variant/30 px-3 py-1.5 text-xs text-fg-default">Edit</button>
              <button type="button" onClick={() => handleRemove(entry.id)} className="rounded-md border border-error/20 px-3 py-1.5 text-xs text-error">Remove</button>
            </div>
          </article>
        ))}
        {paginatedEntries.length === 0 && <div className="rounded-xl border border-dashed border-outline-variant/30 p-8 text-center text-sm text-on-surface-variant">No blacklist entries found</div>}
      </div>
      <div className="hidden md:block">
        <VirtualTableEnhanced
          tableId="blacklist"
          columns={[
            { key: 'value', label: 'Value', width: '220px', className: 'flex-1 min-w-0', render: (_: unknown, entry: any) => <div className="min-w-0"><p className="truncate font-bold text-primary">{entry.value}</p>{entry.name && <p className="truncate text-xs text-fg-muted">{entry.name}</p>}</div> },
            { key: 'type', label: 'Type', width: '110px', render: (_: unknown, entry: any) => <span className="inline-flex items-center gap-1 rounded-sm bg-surface-container px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-fg-muted">{getTypeIcon(entry.type)}{getTypeLabel(entry.type)}</span> },
            { key: 'source', label: 'Traffic Source', width: '160px', render: (_: unknown, entry: any) => <span className="truncate text-fg-default">{getTrafficSourceName(entry.trafficSourceId)}</span> },
            { key: 'reason', label: 'Reason', width: '220px', defaultHidden: true, render: (_: unknown, entry: any) => <span className="truncate text-fg-muted">{entry.reason || '-'}</span> },
            { key: 'status', label: 'Status', width: '100px', render: (_: unknown, entry: any) => <span className={entry.status === 'active' ? 'status-active rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-widest' : 'status-paused rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-widest'}>{entry.status}</span> },
            { key: 'sync', label: 'Sync Status', width: '120px', render: (_: unknown, entry: any) => entry.synced ? <span className="flex items-center gap-1 text-xs text-secondary"><CheckCircle size={14} />Synced</span> : <span className="flex items-center gap-1 text-xs text-warning"><XCircle size={14} />Not Synced</span> },
            { key: 'created', label: 'Created', width: '100px', render: (_: unknown, entry: any) => <span className="text-xs text-fg-muted">{new Date(entry.createdAt).toLocaleDateString()}</span> },
            { key: 'actions', label: '', width: '88px', align: 'center', render: (_: unknown, entry: any) => <div className="flex justify-center gap-1"><button type="button" onClick={() => openEditModal(entry)} className="rounded p-2 text-fg-muted hover:text-primary" title="Edit"><Edit2 size={16} /></button><button type="button" onClick={() => handleRemove(entry.id)} className="rounded p-2 text-fg-muted hover:text-error" title="Remove"><Trash2 size={16} /></button></div> },
          ]}
          data={paginatedEntries}
          rowHeight={64}
          height="auto"
          emptyMessage="No blacklist entries found"
        />
      </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="blacklist-modal-title"
            className="bg-surface-container-lowest w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 id="blacklist-modal-title" className="text-xl font-bold text-primary mb-4">
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
                    onChange={(e) => {
                      clearFormError('trafficSourceId');
                      setFormData({ ...formData, trafficSourceId: e.target.value });
                    }}
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
                      clearFormError('value');
                      clearFormError('conditions');
                      setFormData({
                        ...formData,
                        type: nextType,
                        value: clampInput(normalizeCountryInput(nextType, formData.value), getBlacklistValueMaxLength(nextType)),
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
                    Value {formData.conditions.length === 0 && <span className="text-error">*</span>}
                  </label>
                  {shouldUseExpandedValueEditor(formData.type) ? (
                    <textarea
                      value={formData.value}
                      onChange={(e) => {
                        clearFormError('value');
                        setFormData({
                          ...formData,
                          value: clampInput(
                            normalizeCountryInput(formData.type, e.target.value),
                            getBlacklistValueMaxLength(formData.type),
                          ),
                        });
                      }}
                      placeholder={
                        formData.type === 'user_agent'
                          ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...'
                          : formData.type === 'org_exact'
                            ? 'Amazon.com'
                            : formData.type === 'org_keyword'
                              ? 'hosting'
                            : formData.type === 'network_tag'
                              ? 'global_db\nproxy\nbotnet_ips'
                            : formData.type === 'suspicious_reason'
                              ? 'no_js_data\ntz_discrepancy'
                            : formData.type === 'allow_bias_org'
                              ? 'Comcast Cable'
                            : formData.type === 'allow_bias_isp_type'
                              ? 'Mobile ISP'
                            : formData.type === 'rule'
                              ? 'Optional label for this rule group'
                              : 'Enter value'
                      }
                      rows={4}
                      className="w-full px-4 py-3 bg-surface text-sm border border-outline-variant focus:border-primary outline-none resize-y min-h-[112px]"
                      disabled={isEditMode}
                      maxLength={getBlacklistValueMaxLength(formData.type)}
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.value}
                      onChange={(e) => {
                        clearFormError('value');
                        setFormData({
                          ...formData,
                          value: clampInput(
                            normalizeCountryInput(formData.type, e.target.value),
                            getBlacklistValueMaxLength(formData.type),
                          ),
                        });
                      }}
                      placeholder={
                        formData.type === 'ip'
                          ? '192.168.1.1'
                          : formData.type === 'user_agent'
                            ? 'Mozilla/5.0...'
                        : formData.type === 'asn'
                              ? 'AS12345'
                              : formData.type === 'country'
                                ? 'US'
                              : formData.type === 'visitor_id'
                                ? 'visitor_abc123'
                              : formData.type === 'org_exact'
                                ? 'Amazon.com'
                              : formData.type === 'org_keyword'
                                ? 'hosting'
                              : formData.type === 'isp_type'
                                ? 'Data Center/Web Hosting/Transit'
                              : formData.type === 'network_tag'
                                ? 'global_db'
                              : formData.type === 'suspicious_reason'
                                ? 'no_js_data'
                              : formData.type === 'allow_bias_org'
                                ? 'Comcast Cable'
                              : formData.type === 'allow_bias_isp_type'
                                ? 'Mobile ISP'
                              : formData.type === 'rule'
                                ? 'Optional label for this rule group'
                              : 'Enter value'
                      }
                      className="w-full px-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none"
                      disabled={isEditMode}
                      maxLength={getBlacklistValueMaxLength(formData.type)}
                    />
                  )}
                  {renderLengthCounter(formData.value, getBlacklistValueMaxLength(formData.type))}
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
                  {formData.type === 'country' && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      Enter ISO 3166-1 alpha-2 country code, for example US or DE
                    </p>
                  )}
                  {(formData.type === 'org_exact' || formData.type === 'org_keyword' || formData.type === 'isp_type') && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      Use the normalized organization or ISP label exactly as your detection pipeline emits it.
                    </p>
                  )}
                  {(formData.type === 'network_tag' || formData.type === 'suspicious_reason') && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      Good fits here are signals like <code>global_db</code>, <code>proxy</code>, or <code>no_js_data</code>.
                    </p>
                  )}
                  {shouldUseExpandedValueEditor(formData.type) && !hasConditionRules && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      Larger input space is enabled for long labels, stacked tags, and reusable rule-group notes.
                    </p>
                  )}
                  {hasConditionRules ? (
                    <p className="text-xs text-on-surface-variant mt-1">
                      This value acts as the primary match. Use advanced logic below only when you need extra filters.
                    </p>
                  ) : null}
                </div>

                <div className="rounded-sm border border-outline-variant/30 bg-surface-container/30 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-sm font-medium text-on-surface">Advanced Logic (Optional)</div>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        Add extra AND / OR conditions only when the primary type and value above are not enough.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        clearFormError('conditions');
                        setShowAdvancedLogic((current) => !current);
                      }}
                      className="px-3 py-2 border border-outline-variant text-primary text-xs font-semibold hover:bg-surface transition-colors"
                    >
                      {showAdvancedLogic ? 'Hide Logic' : hasConditionRules ? `Edit Logic (${formData.conditions.length})` : 'Configure Logic'}
                    </button>
                  </div>
                  {hasConditionRules && !showAdvancedLogic ? (
                    <p className="mt-3 text-xs text-on-surface-variant">
                      {formData.matchMode.toUpperCase()} logic with {formData.conditions.length} condition{formData.conditions.length === 1 ? '' : 's'} configured.
                    </p>
                  ) : null}
                  {showAdvancedLogic ? (
                    <div className="mt-4 space-y-3">
                      <ListConditionsEditor
                        title="Additional Conditions"
                        matchMode={formData.matchMode}
                        conditions={formData.conditions}
                        onMatchModeChange={(mode) => {
                          clearFormError('conditions');
                          setFormData({ ...formData, matchMode: mode });
                        }}
                        onConditionsChange={(conditions) => {
                          clearFormError('conditions');
                          clearFormError('value');
                          setFormData({ ...formData, conditions });
                        }}
                      />
                      {formErrors.conditions && (
                        <p className="text-xs text-error -mt-2">{formErrors.conditions}</p>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* IP Match Mode */}
                {formData.type === 'ip' && !hasConditionRules && (
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
                {formData.type === 'user_agent' && !hasConditionRules && (
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
                {(formData.type === 'ip' || formData.type === 'user_agent') && !hasConditionRules && (
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
                  {renderLengthCounter(formData.name, FIELD_MAX_LENGTH.NAME)}
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
                  {renderLengthCounter(formData.reason, FIELD_MAX_LENGTH.REASON)}
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
