/**
 * File: PlatformManagement.tsx
 * Purpose: 平台管理页面，管理外部平台集成
 * Input/Output: 显示平台列表，支持配置和测试连接
 * Logic: 从API获取平台数据，提供配置、测试连接功能
 * 前后端交互: 调用 /api/platforms 接口
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  X,
  ChevronDown,
  Search,
  RefreshCw,
  AlertCircle,
  Zap,
  CheckCircle,
  XCircle,
  Play,
  Link
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  fetchPlatforms, configurePlatform, testPlatformConnection,
  type Platform 
} from '../services/api';
import { usePageData } from '@/context/DataCacheContext';
import { VirtualTableEnhanced } from '../components/VirtualTableEnhanced';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PlatformManagement = () => {
  // 使用 usePageData hook 自动处理 SSR 缓存、加载和错误状态
  const { data: platformsData, isLoading, error, refetch } = usePageData(
    'platforms',
    fetchPlatforms
  );
  
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'soap' | 'rest'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    apiKey: '',
    wsdlUrl: '',
    apiUrl: '',
  });

  // 当 platformsData 变化时，更新本地状态
  useEffect(() => {
    if (!platformsData) return;
    if (Array.isArray(platformsData)) {
      setPlatforms(platformsData);
    }
  }, [platformsData]);

  // 配置弹窗支持 Escape 关闭：键盘用户不应被模态框困住。
  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen]);

  const filteredPlatforms = platforms.filter(platform => {
    const matchesSearch = platform.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || platform.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || platform.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleConfigure = (platform: Platform) => {
    setSelectedPlatform(platform);
    setFormData({
      apiKey: platform.config?.apiKey || '',
      wsdlUrl: platform.config?.wsdlUrl || '',
      apiUrl: platform.config?.apiUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleTestConnection = async (platform: Platform) => {
    setTestingId(platform.id);
    try {
      const result = await testPlatformConnection(platform.id);
      alert(result.connected ? `Connection to ${platform.name} successful!` : `Connection to ${platform.name} failed.`);
    } catch (err) {
      console.error('Failed to test connection:', err);
      alert('Failed to test connection');
    } finally {
      setTestingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform) return;

    setSaving(true);
    try {
      const config: Record<string, unknown> = {};
      if (formData.apiKey) config.apiKey = formData.apiKey;
      if (selectedPlatform.type === 'soap' && formData.wsdlUrl) config.wsdlUrl = formData.wsdlUrl;
      if (selectedPlatform.type === 'rest' && formData.apiUrl) config.apiUrl = formData.apiUrl;

      await configurePlatform(selectedPlatform.id, config);
      
      setPlatforms(prev => prev.map(p => 
        p.id === selectedPlatform.id 
          ? { ...p, configured: true, status: 'active', config: { ...p.config, ...config } }
          : p
      ));
      
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to configure platform:', err);
      alert(err instanceof Error ? err.message : 'Failed to configure platform');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && platforms.length === 0) {
    return <PlatformSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-danger">
        <AlertCircle size={48} className="mb-4" />
        <p className="text-lg font-medium">{error?.message || error}</p>
        <button 
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-surface border border-border-default rounded-md text-fg-default hover:bg-surface-container transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-fg-default">Platform Management</h2>
          <p className="text-sm text-fg-muted">Manage your affiliate network connections</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={refetch}
            className="p-2 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-all"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 bg-surface p-4 rounded-lg border border-border-default">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={16} />
          <input 
            type="text" 
            placeholder="Search platforms..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg transition-all"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
          className="px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
        >
          <option value="all">All Types</option>
          <option value="soap">SOAP</option>
          <option value="rest">REST</option>
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
          className="px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-muted">{filteredPlatforms.length} platforms</span>
          <div className="h-6 w-px bg-border-default" />
          <span className="text-xs text-fg-muted">{platforms.length} total</span>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredPlatforms.map((platform) => (
          <article key={platform.id} className="rounded-xl border border-border-default bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-fg-default">{platform.name}</h2>
                <p className="mt-0.5 text-xs text-fg-muted">{platform.type.toUpperCase()} · {platform.version}</p>
              </div>
              <span className={platform.status === 'active' ? 'shrink-0 rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold uppercase text-success' : 'shrink-0 rounded-full bg-fg-muted/10 px-2 py-1 text-[10px] font-bold uppercase text-fg-muted'}>{platform.status === 'active' ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-2">
              <span className="text-xs text-fg-muted">{platform.configured ? 'Configured' : 'Not configured'}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleConfigure(platform)} className="rounded-md border border-border-default px-3 py-1.5 text-xs text-fg-default">Configure</button>
                <button type="button" onClick={() => handleTestConnection(platform)} disabled={testingId === platform.id || !platform.configured} className="rounded-md border border-border-default px-3 py-1.5 text-xs text-fg-default disabled:opacity-40">Test</button>
              </div>
            </div>
          </article>
        ))}
        {filteredPlatforms.length === 0 && <div className="rounded-xl border border-dashed border-border-default p-8 text-center text-sm text-fg-muted">No platforms found</div>}
      </div>

      {/* Platforms Table */}
      <div className="hidden overflow-hidden rounded-lg border border-border-default bg-surface md:block">
        <div className="overflow-x-auto">
          {filteredPlatforms.length > 0 ? (
                    <VirtualTableEnhanced
          tableId="platforms"
          columns={[
            { key: 'name', label: 'Name', width: '240px', className: 'flex-1 min-w-0', render: (_: unknown, platform: any) => <div className="min-w-0"><p className="truncate font-medium text-fg-default">{platform.name}</p><p className="text-xs text-fg-muted">{platform.version}</p></div> },
            { key: 'type', label: 'Type', width: '100px', render: (_: unknown, platform: any) => <span className="rounded bg-accent-fg/10 px-2 py-1 text-xs text-accent-fg">{String(platform.type).toUpperCase()}</span> },
            { key: 'status', label: 'Status', width: '100px', render: (_: unknown, platform: any) => <span className={platform.status === 'active' ? 'rounded bg-success/10 px-2 py-1 text-xs text-success' : 'rounded bg-fg-muted/10 px-2 py-1 text-xs text-fg-muted'}>{platform.status === 'active' ? 'Active' : 'Inactive'}</span> },
            { key: 'configured', label: 'Configured', width: '100px', align: 'center', render: (_: unknown, platform: any) => platform.configured ? <CheckCircle size={18} className="text-success" /> : <XCircle size={18} className="text-fg-muted" /> },
            { key: 'actions', label: 'Actions', width: '220px', render: (_: unknown, platform: any) => <div className="flex flex-wrap gap-1">{platform.actions.slice(0, 3).map((action: string, index: number) => <span key={index} className="rounded bg-surface-container px-2 py-0.5 text-xs text-fg-muted">{action}</span>)}{platform.actions.length > 3 && <span className="rounded bg-surface-container px-2 py-0.5 text-xs text-fg-muted">+{platform.actions.length - 3}</span>}</div> },
            { key: 'operations', label: '', width: '88px', align: 'center', render: (_: unknown, platform: any) => <div className="flex justify-center gap-1"><button type="button" onClick={() => handleConfigure(platform)} className="rounded p-1.5 text-fg-muted hover:bg-surface-container hover:text-fg-default" title="Configure"><Edit3 size={14} /></button><button type="button" onClick={() => handleTestConnection(platform)} disabled={testingId === platform.id || !platform.configured} className="rounded p-1.5 text-fg-muted hover:bg-surface-container hover:text-fg-default disabled:opacity-50" title="Test Connection">{testingId === platform.id ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}</button></div> },
          ]}
          data={filteredPlatforms}
          rowHeight={64}
          height="auto"
          emptyMessage="No platforms found"
        />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
              <Link size={48} className="mb-4" />
              <p>No platforms found</p>
              <p className="text-sm mt-2">Configure your first platform to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="platform-modal-title"
            className="bg-surface p-6 w-full max-w-md rounded-lg border border-border-default shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 id="platform-modal-title" className="text-xl font-bold text-fg-default">
                Configure {selectedPlatform.name}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                aria-label="Close dialog"
                className="p-2 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">
                  API Key *
                </label>
                <input 
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Enter API key"
                  required
                  className="w-full px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                />
              </div>
              
              {selectedPlatform.type === 'soap' && (
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1">
                    WSDL URL
                  </label>
                  <input 
                    type="text" 
                    value={formData.wsdlUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, wsdlUrl: e.target.value }))}
                    placeholder="Enter WSDL URL"
                    className="w-full px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                  />
                </div>
              )}
              
              {selectedPlatform.type === 'rest' && (
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1">
                    API URL
                  </label>
                  <input 
                    type="text" 
                    value={formData.apiUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiUrl: e.target.value }))}
                    placeholder="Enter API URL"
                    className="w-full px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                  />
                </div>
              )}

              <div className="text-xs text-fg-muted">
                Available actions: {selectedPlatform.actions.join(', ')}
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-sm text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-accent-fg text-white text-sm font-medium hover:bg-accent-fg/90 rounded disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Skeleton component for platforms table
const PlatformSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-700">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
      <div className="space-y-2">
        <div className="w-64 h-8 bg-surface-container rounded"></div>
        <div className="w-48 h-4 bg-surface-container rounded"></div>
      </div>
      <div className="flex gap-3 items-center">
        <div className="w-72 h-10 bg-surface-container rounded"></div>
        <div className="w-32 h-10 bg-surface-container rounded"></div>
        <div className="w-24 h-10 bg-surface-container rounded"></div>
      </div>
    </div>
    
    {/* Table */}
    <div className="bg-surface-container-lowest whisper-shadow overflow-hidden animate-pulse">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="border-b border-outline-variant/10 p-4">
          <div className="flex items-center gap-4">
            <div className="w-5 h-5 bg-surface-container rounded"></div>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-surface-container rounded"></div>
              <div className="space-y-2">
                <div className="w-48 h-4 bg-surface-container rounded"></div>
                <div className="w-64 h-3 bg-surface-container rounded"></div>
              </div>
            </div>
            <div className="w-20 h-4 bg-surface-container rounded"></div>
            <div className="w-16 h-4 bg-surface-container rounded"></div>
            <div className="w-16 h-4 bg-surface-container rounded"></div>
            <div className="w-16 h-4 bg-surface-container rounded"></div>
            <div className="w-16 h-4 bg-surface-container rounded"></div>
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-surface-container rounded"></div>
              <div className="w-8 h-8 bg-surface-container rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default PlatformManagement;
