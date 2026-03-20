import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Globe, 
  Clock, 
  Monitor,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Download
} from 'lucide-react';

const CLICKS_DATA = [
  { id: '54210', time: "2024-03-19 07:01:46", campaign: "FB_US_Lookalike_V1", ip: "192.168.1.1", country: "US", device: "Mobile", browser: "Chrome", source: "Facebook Ads", sub1: "ad_set_1", status: "Click" },
  { id: '54209', time: "2024-03-19 07:00:12", campaign: "Google_Search_Brand", ip: "82.45.12.98", country: "UK", device: "Desktop", browser: "Safari", source: "Google Ads", sub1: "brand_kw", status: "Conversion" },
  { id: '54208', time: "2024-03-19 06:58:33", campaign: "TikTok_Global_UGC", ip: "103.22.45.11", country: "BR", device: "Mobile", browser: "TikTok", source: "TikTok Ads", sub1: "ugc_video_2", status: "Click" },
  { id: '54207', time: "2024-03-19 06:55:05", campaign: "FB_US_Lookalike_V1", ip: "172.16.0.5", country: "US", device: "Mobile", browser: "FB App", source: "Facebook Ads", sub1: "ad_set_1", status: "Lead" },
  { id: '54206', time: "2024-03-19 06:52:11", campaign: "Native_Taboola_US", ip: "45.12.33.22", country: "US", device: "Desktop", browser: "Edge", source: "Taboola", sub1: "widget_45", status: "Click" },
  { id: '54205', time: "2024-03-19 06:50:44", campaign: "Google_Search_Brand", ip: "91.22.11.88", country: "DE", device: "Desktop", browser: "Chrome", source: "Google Ads", sub1: "brand_kw", status: "Click" },
];

export const ClicksLog = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Clicks Log</h1>
          <p className="text-sm text-on-surface-variant">Real-time stream of all incoming traffic and events.</p>
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

      {/* Toolbar */}
      <div className="bg-surface-container-lowest p-3 whisper-shadow border border-outline-variant/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            <input 
              type="text" 
              placeholder="Search by IP, ID, or Campaign..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container border-none focus:ring-1 focus:ring-primary text-xs"
            />
          </div>
          <button 
            onClick={() => alert('Filter panel coming soon!')}
            className="flex items-center gap-2 px-3 py-2 border border-outline-variant/30 text-[10px] font-bold uppercase tracking-widest hover:bg-surface-container transition-all"
          >
            <Filter size={14} /> Filter
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Showing last 1000 clicks</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/10">
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Time</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">ID</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Campaign</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">IP Address</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Country</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Device</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Source</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Sub ID 1</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {CLICKS_DATA.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant">
                      <Clock size={12} />
                      {log.time}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[10px] font-mono text-on-surface-variant">{log.id}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-primary hover:underline cursor-pointer">{log.campaign}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-on-surface-variant">{log.ip}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <Globe size={14} />
                      {log.country}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase">
                      {log.device === 'Mobile' ? <Smartphone size={14} /> : <Monitor size={14} />}
                      {log.device}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">{log.source}</td>
                  <td className="px-4 py-3 text-xs font-mono text-on-surface-variant">{log.sub1}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm",
                      log.status === 'Conversion' ? "bg-emerald-100 text-emerald-700" : 
                      log.status === 'Lead' ? "bg-blue-100 text-blue-700" : 
                      "bg-surface-container-highest text-on-surface-variant"
                    )}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => alert(`View details for click ${log.id}`)}
                        className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button 
                        onClick={() => alert(`More options for click ${log.id}`)}
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

export default ClicksLog;
