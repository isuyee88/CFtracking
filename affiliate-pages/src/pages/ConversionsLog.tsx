/**
 * File: ConversionsLog.tsx
 * Purpose: 转化日志页面，展示所有转化记录
 * Input/Output: 显示转化数据列表，支持搜索和筛选
 * Logic: 展示转化事件的详细信息，包括时间、活动、收益等
 */

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Globe, 
  Clock, 
  Monitor,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Download,
  DollarSign,
  TrendingUp
} from 'lucide-react';

const CONVERSIONS_DATA = [
  { id: 'CVT-001', time: "2024-03-19 07:01:46", campaign: "FB_US_Lookalike_V1", ip: "192.168.1.1", country: "US", device: "Mobile", browser: "Chrome", source: "Facebook Ads", sub1: "ad_set_1", payout: "$24.50", status: "Approved", type: "Sale" },
  { id: 'CVT-002', time: "2024-03-19 07:00:12", campaign: "Google_Search_Brand", ip: "82.45.12.98", country: "UK", device: "Desktop", browser: "Safari", source: "Google Ads", sub1: "brand_kw", payout: "$45.00", status: "Approved", type: "Lead" },
  { id: 'CVT-003', time: "2024-03-19 06:58:33", campaign: "TikTok_Global_UGC", ip: "103.22.45.11", country: "BR", device: "Mobile", browser: "TikTok", source: "TikTok Ads", sub1: "ugc_video_2", payout: "$12.00", status: "Pending", type: "Sale" },
  { id: 'CVT-004', time: "2024-03-19 06:55:05", campaign: "FB_US_Lookalike_V1", ip: "172.16.0.5", country: "US", device: "Mobile", browser: "FB App", source: "Facebook Ads", sub1: "ad_set_1", payout: "$24.50", status: "Approved", type: "Sale" },
  { id: 'CVT-005', time: "2024-03-19 06:52:11", campaign: "Native_Taboola_US", ip: "45.12.33.22", country: "US", device: "Desktop", browser: "Edge", source: "Taboola", sub1: "widget_45", payout: "$8.50", status: "Rejected", type: "Lead" },
  { id: 'CVT-006', time: "2024-03-19 06:50:44", campaign: "Google_Search_Brand", ip: "91.22.11.88", country: "DE", device: "Desktop", browser: "Chrome", source: "Google Ads", sub1: "brand_kw", payout: "$32.00", status: "Approved", type: "Sale" },
];

export const ConversionsLog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredConversions = CONVERSIONS_DATA.filter(conv => {
    const matchesSearch = conv.campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         conv.ip.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || conv.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = filteredConversions
    .filter(c => c.status === 'Approved')
    .reduce((sum, c) => sum + parseFloat(c.payout.replace('$', '')), 0);

  const totalConversions = filteredConversions.length;
  const approvedConversions = filteredConversions.filter(c => c.status === 'Approved').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Conversions Log</h1>
          <p className="text-sm text-on-surface-variant">Track all your conversion events and revenue.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.location.reload()}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all rounded-sm" 
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={() => alert('Export functionality coming soon!')}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-secondary/90 transition-all rounded-sm"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-4 whisper-shadow border border-outline-variant/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 text-secondary rounded-sm">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Total Conversions</p>
              <p className="text-xl font-display font-bold text-primary">{totalConversions}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow border border-outline-variant/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-sm">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Approved</p>
              <p className="text-xl font-display font-bold text-secondary">{approvedConversions}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow border border-outline-variant/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-sm">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Total Revenue</p>
              <p className="text-xl font-display font-bold text-primary">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-surface-container-lowest p-3 whisper-shadow border border-outline-variant/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            <input 
              type="text" 
              placeholder="Search by ID, Campaign, or IP..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container border-none focus:ring-1 focus:ring-primary text-xs"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-container border border-outline-variant/30 text-xs font-bold uppercase tracking-widest focus:border-primary outline-none"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
            Showing {filteredConversions.length} conversions
          </span>
        </div>
      </div>

      {/* Conversions Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/10">
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Time</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">ID</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Campaign</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Type</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Payout</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Country</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Device</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Source</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filteredConversions.map((conv) => (
                <tr key={conv.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant">
                      <Clock size={12} />
                      {conv.time}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[10px] font-mono text-on-surface-variant">{conv.id}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-primary hover:underline cursor-pointer">{conv.campaign}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {conv.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono font-bold text-secondary">{conv.payout}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm",
                      conv.status === 'Approved' ? "bg-emerald-100 text-emerald-700" : 
                      conv.status === 'Pending' ? "bg-amber-100 text-amber-700" : 
                      "bg-error/10 text-error"
                    )}>
                      {conv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <Globe size={14} />
                      {conv.country}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase">
                      {conv.device === 'Mobile' ? <Smartphone size={14} /> : <Monitor size={14} />}
                      {conv.device}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{conv.source}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => alert(`View details for conversion ${conv.id}`)}
                        className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button 
                        onClick={() => alert(`More options for conversion ${conv.id}`)}
                        className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default ConversionsLog;
