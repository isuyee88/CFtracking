import React, { useState } from 'react';
import { 
  Plus, 
  Copy, 
  MoreHorizontal, 
  Search,
  Filter,
  Edit3,
  Trash2,
  Play,
  Pause,
  Layout,
  Calendar
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { QuickDateRangePicker, type DateRangeValue, getDateRange } from '@/components/DateRangePicker';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SOURCES_DATA = [
  { id: 401, name: 'Facebook Ads', template: 'Facebook Ads', campaigns: 12, clicks: 45200, conversions: 1240, revenue: '$12,400', roi: '120%', status: 'Active' },
  { id: 402, name: 'Google Ads', template: 'Google Ads Search', campaigns: 8, clicks: 12000, conversions: 850, revenue: '$8,500', roi: '340%', status: 'Active' },
  { id: 403, name: 'TikTok Ads', template: 'TikTok Ads', campaigns: 5, clicks: 32000, conversions: 420, revenue: '$4,200', roi: '45%', status: 'Active' },
  { id: 404, name: 'Taboola', template: 'Taboola', campaigns: 3, clicks: 15000, conversions: 180, revenue: '$1,800', roi: '-12%', status: 'Paused' },
  { id: 405, name: 'Snapchat', template: 'Snapchat Ads', campaigns: 2, clicks: 8500, conversions: 95, revenue: '$950', roi: '18%', status: 'Active' },
];

export const TrafficSources = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<string>('last7days');
  const [dateRangeValue, setDateRangeValue] = useState<DateRangeValue>(getDateRange('last7days'));

  const handleDateRangeChange = (preset: string, range?: DateRangeValue) => {
    setDateRange(preset);
    if (range) {
      setDateRangeValue(range);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-primary">Traffic Sources</h2>
          <p className="text-sm text-on-surface-variant">Manage your traffic source templates and postback configurations</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 日期范围选择器 */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-on-surface-variant" />
            <div className="w-[280px]">
              <QuickDateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                showTime={false}
                maxRangeDays={90}
              />
            </div>
          </div>
          <button onClick={() => alert('Filter panel coming soon!')} className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors">
            <Filter size={16} />
            Filters
          </button>
          <button onClick={() => alert('Create new traffic source coming soon!')} className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm">
            <Plus size={18} /> New Source
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-surface-container-lowest p-4 whisper-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => alert('Resume selected sources')} className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Play"><Play size={18} /></button>
          <button onClick={() => alert('Pause selected sources')} className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Pause"><Pause size={18} /></button>
          <button onClick={() => alert('Copy selected sources')} className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Copy"><Copy size={18} /></button>
          <button onClick={() => alert('Delete selected sources')} className="p-2 text-on-surface-variant hover:text-error transition-colors" title="Delete"><Trash2 size={18} /></button>
          <div className="h-6 w-px bg-outline-variant/20 mx-2" />
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, ID, or template..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface text-sm border border-outline-variant focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex bg-surface-container p-1 rounded-sm">
          {['All', 'Active', 'Paused'].map((tab) => (
            <button 
              key={tab}
              className={cn(
                "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all",
                tab === 'All' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-highest"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Sources Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-4 py-4 w-10">
                  <input type="checkbox" className="rounded-none border-outline-variant" />
                </th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">ID</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant min-w-[200px]">Source Name</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Status</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Template</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Campaigns</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Clicks</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Conv.</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Revenue</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">ROI</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {SOURCES_DATA.map((source) => (
                <tr key={source.id} className="group hover:bg-surface-container-low transition-colors">
                  <td className="px-4 py-4">
                    <input type="checkbox" className="rounded-none border-outline-variant" />
                  </td>
                  <td className="px-4 py-4 text-[10px] font-mono text-on-surface-variant">{source.id}</td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-bold text-primary group-hover:text-secondary transition-colors cursor-pointer">{source.name}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        source.status === 'Active' ? "bg-secondary" : "bg-on-surface-variant/30"
                      )} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{source.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant">
                      <Layout size={14} />
                      {source.template}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[10px] font-mono text-primary font-bold">{source.campaigns}</td>
                  <td className="px-4 py-4 text-[10px] font-mono text-primary">{source.clicks.toLocaleString()}</td>
                  <td className="px-4 py-4 text-[10px] font-mono text-primary">{source.conversions.toLocaleString()}</td>
                  <td className="px-4 py-4 text-[10px] font-mono text-primary">{source.revenue}</td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-sm",
                      source.roi.startsWith('-') ? "bg-error/10 text-error" : "bg-secondary-container text-secondary"
                    )}>
                      {source.roi}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"><Edit3 size={14} /></button>
                      <button className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"><MoreHorizontal size={14} /></button>
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

export default TrafficSources;
