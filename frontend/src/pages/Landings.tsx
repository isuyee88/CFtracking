/**
 * File: Landings.tsx
 * Purpose: Landing Pages 管理页面，支持完整的 CRUD 操作
 * Input/Output: 显示 Landing Page 列表，支持创建、编辑、删除
 * Logic: 使用 EntityForm 组件实现表单，支持搜索、筛选、分页
 */

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  Image,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Play,
  Pause,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EntityForm, type FormField } from '../components/EntityForm';
import { LandingVisualEditor, EMPTY_VISUAL_CONTENT, buildVisualLandingHtml, parseVisualLandingHtml, type VisualLandingContent } from '../components/LandingVisualEditor';
import { VirtualTableEnhanced, type VirtualTableColumn } from '../components/VirtualTableEnhanced';
import { fetchLandings, createLanding, updateLanding, deleteLanding, uploadHostedAsset, fetchLandingVersions, createLandingVersion, publishLandingVersion, pauseLandingVersion, rollbackLandingVersion, type LandingPageVersion } from '../services/api';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { ExportButton } from '../components/ExportButton';
import { formatLandingPageForExport } from '../utils/export';
import { QuickDateRangePicker } from '@/components/DateRangePicker';
import { FilterPanel, type FilterConfig, type FilterValues } from '../components/FilterPanel';
import { useToast } from '../components/Toast';
import { readBootstrapPage } from '../services/bootstrap';
import { useLocation } from 'react-router-dom';
import { FIELD_MAX_LENGTH, DISPLAY_MAX_LENGTH } from '../constants/fieldConstraints';
import { truncateLabel } from '../utils/text';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LandingPage {
  id: string;
  displayId?: string;
  name: string;
  url: string;
  sourceSlug?: string | null;
  hostingMode?: 'remote' | 'local' | 'zip';
  assetId?: string | null;
  status: 'active' | 'paused' | 'deleted';
  group: string;
  clicks: number;
  conversions: number;
  cr: number | string;
  campaignCount?: number;
  updatedAt: string;
}

type LandingHostingMode = 'hosted' | 'local' | 'zip';
type HostedFileValue = { name?: string; type?: string; size?: number; base64?: string };
type LandingFormData = Partial<LandingPage> & {
  hostMode?: LandingHostingMode;
  localHtml?: string;
  zipFile?: HostedFileValue | null;
};

function encodeUtf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function inferLandingHostingMode(url: string | undefined): LandingHostingMode {
  if (!url) {
    return 'hosted';
  }
  if (url.includes('/hosted-assets/') && url.includes('mode=zip')) {
    return 'zip';
  }
  if (url.includes('/hosted-assets/') && url.includes('mode=local')) {
    return 'local';
  }
  return 'hosted';
}

const LANDING_FIELDS: FormField[] = [
  {
    name: 'hostMode',
    label: 'Hosting Mode',
    type: 'select',
    required: true,
    options: [
      { value: 'hosted', label: 'Hosted URL' },
      { value: 'local', label: 'Local HTML' },
      { value: 'zip', label: 'ZIP Archive' },
    ],
    description: 'Choose how this landing page is hosted (remote URL, inline HTML, or ZIP archive).',
  },
  {
    name: 'name',
    label: 'Landing Page Name',
    type: 'text',
    required: true,
    placeholder: 'Enter landing page name',
    maxLength: FIELD_MAX_LENGTH.NAME,
  },
  {
    name: 'url',
    label: 'URL',
    type: 'url',
    required: true,
    placeholder: 'https://example.com/landing-page',
    maxLength: FIELD_MAX_LENGTH.URL,
    showWhen: (data) => (data.hostMode || 'hosted') === 'hosted',
    validation: (value) => {
      try {
        new URL(value);
        return null;
      } catch {
        return 'Please enter a valid URL';
      }
    }
  },
  {
    name: 'localHtml',
    label: 'Local HTML',
    type: 'textarea',
    required: true,
    placeholder: '<!DOCTYPE html><html><head>...</head><body>...</body></html>',
    description: 'Paste full HTML document, or build one with the Visual Editor below. System hosts it as a managed landing asset.',
    showWhen: (data) => data.hostMode === 'local',
  },
  {
    name: 'zipFile',
    label: 'ZIP Archive',
    type: 'file',
    required: true,
    accept: '.zip,application/zip',
    maxFileSizeMB: 8,
    description: 'Upload a ZIP package. System stores archive and provides hosted asset URL.',
    showWhen: (data) => data.hostMode === 'zip',
  },
  {
    name: 'group',
    label: 'Group',
    type: 'text',
    placeholder: 'Select or create group',
    maxLength: FIELD_MAX_LENGTH.GROUP,
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'active', label: 'Active' },
      { value: 'paused', label: 'Paused' }
    ]
  },
  {
    name: 'notes',
    label: 'Notes',
    type: 'textarea',
    placeholder: 'Add notes about this landing page...',
    maxLength: FIELD_MAX_LENGTH.NOTES,
  }
];

/** GrapesJS Pro 编辑器懒加载：核心 ~600KB 独立分块，仅在打开 Pro Studio 时下载 */
const GrapesVisualEditor = React.lazy(() => import('../components/GrapesVisualEditor'));

/** 可视化编辑器包装：三态入口（Quick 结构化 / Pro Studio GrapesJS 画布），实时把生成 HTML 写回 localHtml 表单字段 */
function VisualEditorField({
  formData,
  handleChange,
}: {
  formData: Record<string, any>;
  handleChange: (name: string, value: any) => void;
}) {
  const [mode, setMode] = useState<'none' | 'quick' | 'pro'>('none');
  const [content, setContent] = useState<VisualLandingContent>(EMPTY_VISUAL_CONTENT);

  if (mode === 'none') {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('quick')}
          className="inline-flex items-center gap-1.5 rounded border border-border-default px-3 py-1.5 text-xs text-fg-muted hover:text-fg-default"
        >
          <Image size={13} /> Quick Editor (hero / images / CTA)
        </button>
        <button
          type="button"
          onClick={() => setMode('pro')}
          className="inline-flex items-center gap-1.5 rounded border border-border-default px-3 py-1.5 text-xs text-fg-muted hover:text-fg-default"
        >
          <Edit3 size={13} /> Pro Studio (GrapesJS drag &amp; drop)
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {mode === 'quick' ? (
        <>
          <p className="mb-2 text-xs text-fg-muted">
            Editor output overwrites the Local HTML field below on every change. Use tracking URLs in CTA links to
            keep click attribution.
          </p>
          <button
            type="button"
            onClick={() => {
              const current = typeof formData.localHtml === 'string' ? formData.localHtml : '';
              const parsed = parseVisualLandingHtml(current);
              if (parsed) {
                setContent(parsed);
                handleChange('localHtml', buildVisualLandingHtml(parsed));
              } else {
                alert('Could not parse the current Local HTML into Quick Editor fields.\nMake sure the HTML contains at least an <h1> or a visible <a> link.');
              }
            }}
            className="mb-2 inline-flex items-center gap-1.5 rounded border border-border-default px-3 py-1.5 text-xs text-fg-muted hover:text-fg-default"
          >
            <Edit3 size={13} /> Import from HTML (Pro → Quick)
          </button>
          <LandingVisualEditor
            value={content}
            onChange={(next) => {
              setContent(next);
              handleChange('localHtml', buildVisualLandingHtml(next));
            }}
          />
        </>
      ) : (
        <>
          <p className="mb-2 text-xs text-fg-muted">
            Pro Studio canvas (GrapesJS). Drag blocks from the Affiliate category, edit inline, and the Local HTML
            field updates automatically. Output is sanitized (no scripts / inline handlers).
          </p>
          <Suspense
            fallback={
              <div className="flex items-center gap-2 rounded border border-border-default p-4 text-xs text-fg-muted">
                <Loader2 size={14} className="animate-spin" /> Loading Pro Studio...
              </div>
            }
          >
            <GrapesVisualEditor
              initialHtml={typeof formData.localHtml === 'string' ? formData.localHtml : ''}
              onChange={(html) => handleChange('localHtml', html)}
            />
          </Suspense>
        </>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('none')}
          className="rounded border border-border-default px-3 py-1.5 text-xs text-fg-muted hover:text-fg-default"
        >
          Close Editor
        </button>
      </div>
    </div>
  );
}

export const Landings = () => {
  const toast = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const location = useLocation();

  // localHtml 字段挂载可视化编辑器（结构化编辑 hero/图片/CTA，实时生成 HTML 写回 localHtml）
  const formFields: FormField[] = useMemo(
    () =>
      LANDING_FIELDS.map((field) =>
        field.name === 'localHtml'
          ? {
              ...field,
              renderExtra: (formData, handleChange) => (
                <VisualEditorField formData={formData} handleChange={handleChange} />
              ),
            }
          : field
      ),
    []
  );

  const bootstrap = readBootstrapPage<{ landings?: LandingPage[] }>('landings');
  const hasBootstrap = Boolean(bootstrap);
  const [landings, setLandings] = useState<LandingPage[]>(Array.isArray(bootstrap?.data?.landings) ? bootstrap.data.landings : []);
  const [loading, setLoading] = useState(!hasBootstrap);
  const [error, setError] = useState<string | null>(null);
  
  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedLanding, setSelectedLanding] = useState<LandingFormData | undefined>(undefined);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return new URLSearchParams(window.location.search).get('search') || '';
  });
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Paused'>('All');
  
  // Date range state
  const [dateRange, setDateRange] = useState<{from: string; to: string}>({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Filter panel state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [versionLanding, setVersionLanding] = useState<LandingPage | null>(null);
  const [versions, setVersions] = useState<LandingPageVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionActionLoading, setVersionActionLoading] = useState<string | null>(null);

  const handleOpenVersions = async (landing: LandingPage) => {
    setVersionLanding(landing);
    setVersionsLoading(true);
    try {
      setVersions(await fetchLandingVersions(landing.id));
    } catch (err) {
      toast.error('Failed to load versions', err instanceof Error ? err.message : 'Unknown error');
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  const runVersionAction = async (
    action: string,
    task: () => Promise<LandingPageVersion>,
    successMessage: string,
  ) => {
    if (!versionLanding) return;
    setVersionActionLoading(action);
    try {
      const updated = await task();
      setVersions((current) => {
        const existing = current.some((item) => item.id === updated.id);
        return existing ? current.map((item) => item.id === updated.id ? updated : item) : [...current, updated];
      });
      toast.success(successMessage);
    } catch (err) {
      toast.error('Landing version action failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setVersionActionLoading(null);
    }
  };

  const handleCreateDraftVersion = async () => {
    if (!versionLanding) return;
    await runVersionAction(
      'create',
      () => createLandingVersion(versionLanding.id, {
        assetId: versionLanding.assetId,
        status: 'draft',
      }),
      'Draft version created',
    );
  };

  const handlePublishVersion = async (version: LandingPageVersion) => {
    if (!versionLanding || !(await confirm({
      title: 'Publish Landing Version',
      message: `Publish version ${version.versionNumber}? The current published version will be archived.`,
      confirmText: 'Publish',
      variant: 'info',
    }))) return;
    await runVersionAction(
      `publish-${version.id}`,
      () => publishLandingVersion(versionLanding.id, version.id, 'dashboard-user'),
      `Version ${version.versionNumber} published`,
    );
  };

  const handlePauseVersion = async (version: LandingPageVersion) => {
    if (!versionLanding || !(await confirm({
      title: 'Pause Landing Version',
      message: `Pause version ${version.versionNumber}?`,
      confirmText: 'Pause',
      variant: 'warning',
    }))) return;
    await runVersionAction(
      `pause-${version.id}`,
      () => pauseLandingVersion(versionLanding.id, version.id),
      `Version ${version.versionNumber} paused`,
    );
  };

  const handleRollbackVersion = async (version: LandingPageVersion) => {
    if (!versionLanding || !(await confirm({
      title: 'Rollback Landing Version',
      message: `Rollback to version ${version.versionNumber}? The current published version will be archived.`,
      confirmText: 'Rollback',
      variant: 'warning',
    }))) return;
    await runVersionAction(
      `rollback-${version.id}`,
      () => rollbackLandingVersion(versionLanding.id, version.versionNumber, 'dashboard-user'),
      `Rolled back to version ${version.versionNumber}`,
    );
  };

  const handleCopyVersion = async (version: LandingPageVersion) => {
    if (!versionLanding) return;
    await runVersionAction(
      `copy-${version.id}`,
      () => createLandingVersion(versionLanding.id, {
        assetId: version.assetId,
        manifestSnapshot: version.manifestSnapshot,
        status: 'draft',
        rollbackFromVersion: version.versionNumber,
        contentHash: version.contentHash,
        etag: version.etag,
      }),
      `Version ${version.versionNumber} copied as draft`,
    );
  };

  const renderVersionManagement = () => (
    <>
      {ConfirmDialogComponent}
      {versionLanding && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
          <div className="max-w-3xl w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden rounded-lg bg-surface-container shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border-default p-5">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-fg-default">Version Management</h2>
                <p className="truncate text-sm text-fg-muted" title={versionLanding.url}>{versionLanding.name} · {versionLanding.url}</p>
              </div>
              <button type="button" onClick={() => setVersionLanding(null)} className="rounded p-2 text-fg-muted hover:text-fg-default" aria-label="Close version management">×</button>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border-default p-4">
              <p className="text-xs text-fg-muted">Editing creates drafts. Publish is a separate confirmed action.</p>
              <button type="button" onClick={handleCreateDraftVersion} disabled={Boolean(versionActionLoading)} className="inline-flex shrink-0 items-center gap-2 rounded bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-60">
                {versionActionLoading === 'create' && <Loader2 size={14} className="animate-spin" />} Create Draft
              </button>
            </div>
            <div className="max-h-[calc(100vh-14rem)] overflow-x-auto overflow-y-auto p-4">
              {versionsLoading ? (
                <div className="flex items-center gap-2 p-6 text-sm text-fg-muted"><Loader2 size={16} className="animate-spin" /> Loading versions...</div>
              ) : versions.length === 0 ? (
                <p className="p-6 text-sm text-fg-muted">No versions yet. Create a draft to start a publishable revision.</p>
              ) : (
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-fg-muted"><tr><th className="p-3">Version</th><th className="p-3">Status</th><th className="p-3">Updated</th><th className="p-3 text-right">Actions</th></tr></thead>
                  <tbody>{[...versions].sort((a, b) => b.versionNumber - a.versionNumber).map((version) => {
                    const busy = versionActionLoading?.endsWith(version.id) ?? false;
                    return <tr key={version.id} className="border-t border-border-default/70"><td className="p-3 font-medium">v{version.versionNumber}</td><td className="p-3"><span className="rounded bg-surface-container-high px-2 py-1 text-xs">{version.status}</span></td><td className="p-3 text-xs text-fg-muted">{new Date(version.updatedAt).toLocaleString()}</td><td className="p-3"><div className="flex flex-wrap justify-end gap-2"><a href={versionLanding.url} target="_blank" rel="noopener noreferrer" className="rounded border border-border-default px-2 py-1 text-xs hover:text-primary">Preview</a><button type="button" onClick={() => handleCopyVersion(version)} disabled={Boolean(versionActionLoading)} className="rounded border border-border-default px-2 py-1 text-xs disabled:opacity-50">{busy && versionActionLoading?.startsWith('copy-') ? <Loader2 size={12} className="animate-spin" /> : 'Copy'}</button>{version.status !== 'published' && <button type="button" onClick={() => handlePublishVersion(version)} disabled={Boolean(versionActionLoading)} className="rounded bg-primary px-2 py-1 text-xs text-on-primary disabled:opacity-50">{busy && versionActionLoading?.startsWith('publish-') ? <Loader2 size={12} className="animate-spin" /> : 'Publish'}</button>}{version.status === 'published' && <button type="button" onClick={() => handlePauseVersion(version)} disabled={Boolean(versionActionLoading)} className="rounded border border-warning px-2 py-1 text-xs text-warning-fg disabled:opacity-50">{busy && versionActionLoading?.startsWith('pause-') ? <Loader2 size={12} className="animate-spin" /> : 'Pause'}</button>}{version.status !== 'published' && <button type="button" onClick={() => handleRollbackVersion(version)} disabled={Boolean(versionActionLoading)} className="rounded border border-border-default px-2 py-1 text-xs disabled:opacity-50">{busy && versionActionLoading?.startsWith('rollback-') ? <Loader2 size={12} className="animate-spin" /> : 'Rollback'}</button>}</div></td></tr>;
                  })}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Fetch landings from API
  useEffect(() => {
    setSearchTerm(new URLSearchParams(location.search).get('search') || '');
  }, [location.search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterValues]);

  useEffect(() => {
    const loadLandings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchLandings(true, {
          startDate: dateRange.from,
          endDate: dateRange.to,
        });
        if (Array.isArray(data)) {
          setLandings(data);
        } else {
          setError('Failed to load landings');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load landings');
      } finally {
        setLoading(false);
      }
    };

    loadLandings();
  }, [dateRange.from, dateRange.to, hasBootstrap]);

  const handleCreateLanding = () => {
    setFormMode('create');
    setSelectedLanding({
      hostMode: 'hosted',
      status: 'active',
    });
    setIsFormOpen(true);
  };

  const handleEditLanding = (landing: LandingPage) => {
    setFormMode('edit');
    setSelectedLanding({
      ...landing,
      hostMode: landing.hostingMode === 'local' || landing.hostingMode === 'zip'
        ? landing.hostingMode
        : inferLandingHostingMode(landing.url),
    });
    setIsFormOpen(true);
  };

  /** 克隆着陆页为 A/B 变体基础：hosted HTML 资产拉渲染端点回填内容，其余仅克隆元数据 */
  const handleDuplicateLanding = async (landing: LandingPage) => {
    const clone: LandingFormData = {
      name: `${landing.name} (B)`,
      group: landing.group,
      status: 'active',
      hostMode: inferLandingHostingMode(landing.url),
    };
    if (clone.hostMode === 'local' && landing.url) {
      try {
        const res = await fetch(landing.url);
        const html = res.ok ? await res.text() : '';
        if (html.trim()) {
          clone.localHtml = html;
        }
      } catch {
        // 跨域或网络失败时降级为仅克隆元数据，用户可在编辑器中重建内容
      }
    }
    if (clone.hostMode === 'zip') {
      toast.warning('ZIP content cannot be cloned', 'Duplicate copies metadata only — re-upload the ZIP archive in the form.');
    }
    setFormMode('create');
    setSelectedLanding(clone);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    const hostMode = (formData.hostMode || 'hosted') as LandingHostingMode;
    const submitData: Record<string, any> = { ...formData };

    if (hostMode === 'local') {
      const html = typeof formData.localHtml === 'string' ? formData.localHtml.trim() : '';
      if (!html) {
        toast.error('Local HTML is required', 'Please provide HTML content before saving.');
        return;
      }

      try {
        const upload = await uploadHostedAsset({
          entityType: 'landing',
          mode: 'local',
          name: submitData.name || 'landing-local',
          fileName: `${(submitData.name || 'landing').replace(/\s+/g, '-').toLowerCase()}.html`,
          mimeType: 'text/html; charset=utf-8',
          contentBase64: encodeUtf8ToBase64(html),
        });
        submitData.url = upload.publicUrl;
        submitData.hostingMode = 'local';
        submitData.assetId = upload.assetId;
      } catch (err) {
        toast.error('Failed to upload local HTML', err instanceof Error ? err.message : 'Unknown error');
        return;
      }
    }

    if (hostMode === 'zip') {
      const zipFile = formData.zipFile as HostedFileValue | undefined;
      if (!zipFile?.base64) {
        toast.error('ZIP archive is required', 'Please select a ZIP file before saving.');
        return;
      }

      try {
        const upload = await uploadHostedAsset({
          entityType: 'landing',
          mode: 'zip',
          name: submitData.name || 'landing-zip',
          fileName: zipFile.name || `${(submitData.name || 'landing').replace(/\s+/g, '-').toLowerCase()}.zip`,
          mimeType: zipFile.type || 'application/zip',
          contentBase64: zipFile.base64,
        });
        submitData.url = upload.publicUrl;
        submitData.hostingMode = 'zip';
        submitData.assetId = upload.assetId;
      } catch (err) {
        toast.error('Failed to upload ZIP archive', err instanceof Error ? err.message : 'Unknown error');
        return;
      }
    }

    delete submitData.hostMode;
    delete submitData.localHtml;
    delete submitData.zipFile;

    try {
      if (formMode === 'create') {
        const landing = await createLanding(submitData);
        if (landing && landing.id) {
          setLandings(prev => [...prev, landing]);
        }
      } else if (selectedLanding?.id) {
        const landing = await updateLanding(selectedLanding.id, submitData);
        if (landing && landing.id) {
          setLandings(prev =>
            prev.map(lp => lp.id === selectedLanding.id ? landing : lp)
          );
        }
      }
      setIsFormOpen(false);
    } catch (err) {
      toast.error('Failed to save landing page', err instanceof Error ? err.message : 'Unknown error');
      return;
    }
  };

  const handleDeleteLanding = async (id: string) => {
    if (!confirm('Are you sure you want to delete this landing page?')) return;
    
    try {
      await deleteLanding(id);
      setLandings(prev => prev.filter(lp => lp.id !== id));
      toast.success('Landing page deleted successfully');
    } catch (err) {
      toast.error('Failed to delete landing page', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItems(new Set(filteredLandings.map(lp => lp.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkAction = async (action: 'activate' | 'pause' | 'delete') => {
    const ids = Array.from(selectedItems);
    
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${ids.length} landing pages?`)) return;
    }

    try {
      if (action === 'delete') {
        await Promise.all(ids.map(id => deleteLanding(id)));
        setLandings(prev => prev.filter(lp => !ids.includes(lp.id)));
      } else {
        const newStatus = action === 'activate' ? 'active' : 'paused';
        await Promise.all(ids.map(id => updateLanding(id, { status: newStatus })));
        setLandings(prev => 
          prev.map(lp => 
            ids.includes(lp.id) ? { ...lp, status: newStatus as any } : lp
          )
        );
      }
      setSelectedItems(new Set());
      toast.success('Bulk action completed successfully');
    } catch (err) {
      toast.error('Bulk action failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Filter configs
  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'paused', label: 'Paused' },
        { value: 'deleted', label: 'Deleted' },
      ],
    },
    {
      key: 'group',
      label: 'Group',
      type: 'search',
      placeholder: 'Search by group...',
    },
  ];

  // Filter landings
  const filteredLandings = landings.filter(landing => {
    const matchesSearch = 
      landing.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      landing.url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      landing.group?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const matchesStatus = filterStatus === 'All' || landing.status === filterStatus.toLowerCase();
    
    // Apply filter panel filters
    const matchesFilters = Object.entries(filterValues).every(([key, value]) => {
      if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
        return true;
      }
      const landingValue = (landing as any)[key];
      const landingValueStr = landingValue?.toString().toLowerCase() || '';
      const filterValueStr = value?.toString().toLowerCase() || '';
      
      if (Array.isArray(value)) {
        return value.some(v => landingValueStr === v.toLowerCase());
      }
      
      // For search type, use includes
      const config = filterConfigs.find(c => c.key === key);
      if (config?.type === 'search') {
        return landingValueStr.includes(filterValueStr);
      }
      
      return landingValueStr === filterValueStr;
    });
    
    return matchesSearch && matchesStatus && matchesFilters;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLandings.length / itemsPerPage);
  const paginatedLandings = filteredLandings.slice(
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
      {/* Entity Form Modal */}
      <EntityForm
        key={`${formMode}-${selectedLanding?.id || 'new'}`}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        title="Landing Page"
        fields={formFields}
        initialData={selectedLanding}
        mode={formMode}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Landing Pages</h1>
          <p className="text-sm text-on-surface-variant">Manage and optimize your landing pages</p>
        </div>
        <div className="flex gap-3 items-center">
          {/* Date Range Picker */}
          <div className="w-[280px]">
            <QuickDateRangePicker
              value="today"
              onChange={(preset, range) => {
                if (range) {
                  setDateRange({
                    from: range.startDate.split('T')[0],
                    to: range.endDate.split('T')[0]
                  });
                }
              }}
              showTime={false}
              maxRangeDays={365}
            />
          </div>
          <button 
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
          >
            <Filter size={16} />
            Filters
            {Object.keys(filterValues).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-primary text-on-primary text-xs rounded-full">
                {Object.keys(filterValues).length}
              </span>
            )}
          </button>
          <ExportButton 
            data={landings.map(formatLandingPageForExport)}
            filename="landing-pages"
            label="Export"
          />
          <button 
            onClick={handleCreateLanding}
            className="btn-create flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-sm"
          >
            <Plus size={18} />
            New Landing Page
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-sm border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="bg-surface-container-lowest p-4 whisper-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <span className="text-sm text-on-surface-variant mr-2">{selectedItems.size} selected</span>
          )}
          <button 
            onClick={() => handleBulkAction('activate')}
            disabled={selectedItems.size === 0}
            className={cn(
              "btn-icon-create p-2 rounded transition-colors",
              selectedItems.size === 0 && "opacity-40 cursor-not-allowed pointer-events-none"
            )}
            title="Activate"
          >
            <Play size={18} />
          </button>
          <button 
            onClick={() => handleBulkAction('pause')}
            disabled={selectedItems.size === 0}
            className={cn(
              "btn-icon-pause p-2 rounded transition-colors",
              selectedItems.size === 0 && "opacity-40 cursor-not-allowed pointer-events-none"
            )}
            title="Pause"
          >
            <Pause size={18} />
          </button>
          <button 
            onClick={() => handleBulkAction('delete')}
            disabled={selectedItems.size === 0}
            className={cn(
              "btn-icon-delete p-2 rounded transition-colors",
              selectedItems.size === 0 && "opacity-40 cursor-not-allowed pointer-events-none"
            )}
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
          <div className="h-6 w-px bg-outline-variant/20 mx-2" />
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, URL, or group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
            Total: {filteredLandings.length}
          </span>
          <div className="flex bg-surface-container p-1 rounded-sm">
            {(['All', 'Active', 'Paused'] as const).map((tab) => (
              <button 
                key={tab}
                onClick={() => { setFilterStatus(tab); setCurrentPage(1); }}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all",
                  filterStatus === tab 
                    ? tab === 'Active' 
                      ? "tab-status-active active" 
                      : tab === 'Paused' 
                        ? "tab-status-paused active" 
                        : "tab-status-all active"
                    : tab === 'Active'
                      ? "tab-status-active"
                      : tab === 'Paused'
                        ? "tab-status-paused"
                        : "tab-status-all"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Landing Pages Table - 使用虚拟滚动 */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <VirtualTableEnhanced
          tableId="landings"
          columns={[
            {
              key: 'select',
              label: '',
              width: '50px',
              render: (_, row) => (
                <input
                  type="checkbox"
                  className="rounded border-outline-variant"
                  checked={selectedItems.has(row.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleSelectItem(row.id);
                  }}
                />
              ),
            },
            {
              key: 'name',
              label: 'Landing Page',
              width: '300px',
              // 筛选和排序配置
              sorter: (a, b) => a.name.localeCompare(b.name),
              showSorter: true,
              render: (_, row) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
                    <Image size={20} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-primary truncate max-w-[220px]" title={row.name}>
                      {truncateLabel(row.name, DISPLAY_MAX_LENGTH.TABLE_PRIMARY_TEXT)}
                    </h3>
                    <a 
                      href={row.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-secondary hover:underline flex items-center gap-1 max-w-[220px]"
                      title={row.url}
                    >
                      <span className="truncate">
                        {truncateLabel(row.url, DISPLAY_MAX_LENGTH.TABLE_SECONDARY_TEXT)}
                      </span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              width: '120px',
              // 筛选和排序配置
              filters: [
                { text: 'Active', value: 'active' },
                { text: 'Paused', value: 'paused' },
              ],
              onFilter: (value, record) => record.status === value,
              sorter: (a, b) => a.status.localeCompare(b.status),
              showSorter: true,
              showFilter: true,
              render: (_, row) => (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-sm w-fit",
                  row.status === 'active' ? "status-active" : "status-paused"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    row.status === 'active' ? "bg-green-500" : "bg-yellow-500"
                  )} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{row.status}</span>
                </div>
              ),
            },
            {
              key: 'group',
              label: 'Group',
              width: '150px',
              // 筛选和排序配置
              filters: [
                { text: 'Default', value: 'Default' },
                { text: 'Custom', value: 'Custom' },
              ],
              onFilter: (value, record) => (record.group || 'Default').includes(value),
              sorter: (a, b) => (a.group || 'Default').localeCompare(b.group || 'Default'),
              showSorter: true,
              showFilter: true,
              render: (_, row) => (
                <span
                  className="px-3 py-1 bg-surface-container text-xs font-bold uppercase tracking-widest text-on-surface-variant rounded-sm inline-block max-w-[120px] truncate"
                  title={row.group || 'Default'}
                >
                  {truncateLabel(row.group || 'Default', DISPLAY_MAX_LENGTH.TAG_TEXT)}
                </span>
              ),
            },
            {
              key: 'campaignCount',
              label: 'Campaigns',
              width: '100px',
              align: 'center',
              render: (value) => (
                <span className="text-sm font-medium text-on-surface">
                  {value !== undefined ? value : '-'}
                </span>
              ),
            },
            {
              key: 'clicks',
              label: 'Clicks',
              width: '100px',
              align: 'right',
              // 排序配置
              sorter: (a, b) => (a.clicks || 0) - (b.clicks || 0),
              showSorter: true,
              render: (value) => (
                <span className="text-sm font-medium text-on-surface">{(value || 0).toLocaleString()}</span>
              ),
            },
            {
              key: 'conversions',
              label: 'Conv.',
              width: '80px',
              align: 'right',
              // 排序配置
              sorter: (a, b) => (a.conversions || 0) - (b.conversions || 0),
              showSorter: true,
              render: (value) => (
                <span className="text-sm font-medium text-on-surface">{(value || 0).toLocaleString()}</span>
              ),
            },
            {
              key: 'cr',
              label: 'CR',
              width: '80px',
              align: 'right',
              render: (value) => (
                <span className="text-sm font-medium text-secondary">
                  {typeof value === 'number' ? `${value}%` : value}
                </span>
              ),
            },
            {
              key: 'actions',
              label: '',
              width: '210px',
              render: (_, row) => (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenVersions(row as LandingPage)}
                    className="rounded border border-primary/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary hover:bg-primary/10"
                    title="Manage versions"
                  >
                    Versions
                  </button>
                  <button
                    onClick={() => handleEditLanding(row as LandingPage)}
                    className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDuplicateLanding(row as LandingPage)}
                    className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                    title="Duplicate as A/B variant"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteLanding(row.id)}
                    className="p-2 text-on-surface-variant hover:text-error transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          data={paginatedLandings}
          rowHeight={80}
          height="100%"
          overscan={5}
          selectable={false}
          selectedRows={selectedItems}
          onSelectionChange={setSelectedItems}
          getRowId={(row) => row.id}
          emptyMessage="No landing pages found"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-outline-variant/10">
            <span className="text-sm text-on-surface-variant">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLandings.length)} of {filteredLandings.length}
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

      {renderVersionManagement()}

      {/* Filter Panel */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        configs={filterConfigs}
        values={filterValues}
        onChange={setFilterValues}
        onApply={() => {
          setCurrentPage(1);
          setIsFilterOpen(false);
        }}
        onReset={() => {
          setFilterValues({});
          setCurrentPage(1);
        }}
        resultCount={filteredLandings.length}
        totalCount={landings.length}
      />
    </div>
  );
};

export default Landings;
