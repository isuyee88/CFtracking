/**
 * File: Blacklist.tsx
 * Purpose: 黑名单管理页面，支持查看、添加、同步黑名单
 * Input/Output: 显示黑名单列表，支持批量操作和同步到流量平台
 * Logic: 从 API 获取黑名单数据，支持按流量平台筛选
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
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BlacklistEntry {
  id: string;
  trafficSourceId: string;
  trafficSourceName?: string;
  type: 'zone' | 'creative' | 'publisher' | 'sub_id' | 'geo' | 'device';
  value: string;
  name?: string;
  reason?: string;
  status: 'active' | 'removed';
  synced: boolean;
  syncedAt?: string;
  campaignId?: string;
  createdAt: string;
}

interface TrafficSource {
  id: string;
  name: string;
}

export const Blacklist = () => {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterSynced, setFilterSynced] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch blacklist entries
      const response = await fetch('/api/blacklist');
      const data = await response.json();
      if (data.success) {
        setEntries(data.data || []);
      }

      // Fetch traffic sources for filter
      const tsResponse = await fetch('/api/traffic-sources');
      const tsData = await tsResponse.json();
      if (tsData.success) {
        setTrafficSources(tsData.data || []);
      }
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
        fetchData();
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
        fetchData();
      }
    } catch (err) {
      console.error('Failed to remove:', err);
    }
  };

  const getTrafficSourceName = (id: string) => {
    return trafficSources.find(ts => ts.id === id)?.name || id;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      zone: 'Zone',
      creative: 'Creative',
      publisher: 'Publisher',
      sub_id: 'Sub ID',
      geo: 'Geo',
      device: 'Device'
    };
    return labels[type] || type;
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
    return matchesSearch && matchesSource && matchesSynced;
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
            Manage blocked zones, creatives, and other traffic sources
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
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
              <option key={ts.id} value={ts.id}>{ts.name}</option>
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
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {syncing === ts.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Sync {ts.name}
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
                <th className="px-4 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.map((entry) => (
                <tr 
                  key={entry.id} 
                  className="border-t border-outline-variant/10 hover:bg-surface-container/50 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-bold text-primary">{entry.value}</p>
                      {entry.name && (
                        <p className="text-xs text-on-surface-variant">{entry.name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm bg-surface-container text-on-surface-variant">
                      {getTypeLabel(entry.type)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-on-surface">{getTrafficSourceName(entry.trafficSourceId)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-on-surface-variant">{entry.reason || '-'}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm",
                      entry.status === 'active' ? "bg-error/10 text-error" : "bg-on-surface-variant/10 text-on-surface-variant"
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
                    <button 
                      onClick={() => handleRemove(entry.id)}
                      className="p-2 text-on-surface-variant hover:text-error transition-colors"
                      title="Remove from blacklist"
                    >
                      <Trash2 size={16} />
                    </button>
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
            <p className="text-sm mt-2">Add entries from the Reports page</p>
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
    </div>
  );
};

export default Blacklist;
