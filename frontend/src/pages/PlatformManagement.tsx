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
  Link
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  fetchPlatforms, configurePlatform, testPlatformConnection,
  type Platform 
} from '../services/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PlatformManagement = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const loadPlatforms = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchPlatforms();
      setPlatforms(data);
    } catch (err) {
      console.error('Failed to load platforms:', err);
      setError(err instanceof Error ? err.message : 'Failed to load platforms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlatforms();
  }, [loadPlatforms]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-accent-fg" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-danger">
        <AlertCircle size={48} className="mb-4" />
        <p className="text-lg font-medium">{error}</p>
        <button 
          onClick={loadPlatforms}
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
            onClick={loadPlatforms}
            className="p-2 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-all"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 bg-surface p-4 rounded-lg border border-border-default">
        <div className="relative flex-1 min-w-[200px]">
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

      {/* Platforms Table */}
      <div className="bg-surface rounded-lg border border-border-default overflow-hidden">
        <div className="overflow-x-auto">
          {filteredPlatforms.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-border-default">
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wider">Configured</th>
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wider">Actions</th>
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wider text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredPlatforms.map((platform) => (
                  <tr key={platform.id} className="group hover:bg-surface-container transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-fg-default">{platform.name}</span>
                        <span className="text-xs text-fg-muted">{platform.version}</span>
                        {platform.description && (
                          <span className="text-xs text-fg-muted truncate max-w-xs">{platform.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded",
                        platform.type === 'soap' ? "bg-accent-fg/10 text-accent-fg" : "bg-success/10 text-success"
                      )}>
                        {platform.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded",
                        platform.status === 'active' ? "bg-success/10 text-success" : "bg-fg-muted/10 text-fg-muted"
                      )}>
                        {platform.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {platform.configured ? (
                        <CheckCircle size={18} className="text-success" />
                      ) : (
                        <XCircle size={18} className="text-fg-muted" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {platform.actions.slice(0, 3).map((action, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-xs bg-surface-container text-fg-muted rounded">
                            {action}
                          </span>
                        ))}
                        {platform.actions.length > 3 && (
                          <span className="px-2 py-0.5 text-xs bg-surface-container text-fg-muted rounded">
                            +{platform.actions.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleConfigure(platform)} 
                          className="p-1.5 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-colors"
                          title="Configure"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleTestConnection(platform)} 
                          disabled={testingId === platform.id || !platform.configured}
                          className="p-1.5 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-colors disabled:opacity-50"
                          title="Test Connection"
                        >
                          {testingId === platform.id ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Zap size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <div className="bg-surface p-6 w-full max-w-md rounded-lg border border-border-default shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-fg-default">
                Configure {selectedPlatform.name}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
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

export default PlatformManagement;
