import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  ChevronDown,
  RefreshCw,
  Settings2,
  Table as TableIcon
} from 'lucide-react';

const REPORT_DATA = [
  { dimension: "Facebook Ads", clicks: 45200, conversions: 1240, revenue: "$12,400", cost: "$7,200", profit: "$5,200", roi: "72%", cr: "2.74%", epc: "$0.27", cpc: "$0.16" },
  { dimension: "Google Ads", clicks: 12000, conversions: 850, revenue: "$8,500", cost: "$2,400", profit: "$6,100", roi: "254%", cr: "7.08%", epc: "$0.71", cpc: "$0.20" },
  { dimension: "TikTok Ads", clicks: 32000, conversions: 420, revenue: "$4,200", cost: "$2,900", profit: "$1,300", roi: "45%", cr: "1.31%", epc: "$0.13", cpc: "$0.09" },
  { dimension: "Taboola", clicks: 15000, conversions: 180, revenue: "$1,800", cost: "$2,020", profit: "-$220", roi: "-11%", cr: "1.20%", epc: "$0.12", cpc: "$0.13" },
  { dimension: "Snapchat", clicks: 8500, conversions: 95, revenue: "$950", cost: "$800", profit: "$150", roi: "19%", cr: "1.12%", epc: "$0.11", cpc: "$0.09" },
];

export const Reports = () => {
  const [grouping, setGrouping] = useState('Traffic Source');
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Reports</h1>
          <p className="text-sm text-on-surface-variant">Analyze your traffic with multi-dimensional reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-container p-1 rounded-sm border border-outline-variant/10">
            <button 
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${viewMode === 'table' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
            >
              Table
            </button>
            <button 
              onClick={() => setViewMode('chart')}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${viewMode === 'chart' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
            >
              Chart
            </button>
          </div>
          <button 
            onClick={() => alert('Export functionality coming soon!')}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-secondary/90 transition-all rounded-sm"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Report Controls */}
      <div className="bg-surface-container-lowest p-4 whisper-shadow border border-outline-variant/10 flex flex-wrap items-center gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Grouping</label>
          <div className="relative">
            <select 
              value={grouping}
              onChange={(e) => setGrouping(e.target.value)}
              className="appearance-none bg-surface-container border border-outline-variant/30 pl-3 pr-10 py-2 text-xs font-bold text-primary focus:ring-1 focus:ring-primary outline-none min-w-[180px]"
            >
              <option>Traffic Source</option>
              <option>Campaign</option>
              <option>Offer</option>
              <option>Landing</option>
              <option>Country</option>
              <option>Device</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Date Range</label>
          <button 
            onClick={() => alert('Date picker coming soon!')}
            className="flex items-center gap-3 px-4 py-2 bg-surface-container border border-outline-variant/30 text-xs font-bold text-primary hover:bg-surface-container-highest transition-all"
          >
            <Calendar size={14} />
            <span>Last 7 Days (Mar 12 - Mar 19)</span>
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Filters</label>
          <button 
            onClick={() => alert('Filter panel coming soon!')}
            className="flex items-center gap-2 px-4 py-2 border border-dashed border-outline-variant/50 text-xs font-bold text-on-surface-variant hover:border-primary hover:text-primary transition-all"
          >
            <Filter size={14} /> Add Filter
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2 self-end">
          <button 
            onClick={() => window.location.reload()}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all rounded-sm" 
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={() => alert('Column settings coming soon!')}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all rounded-sm" 
            title="Columns"
          >
            <Settings2 size={18} />
          </button>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden border border-outline-variant/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/10">
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{grouping}</th>
                <th className="px-4 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Clicks</th>
                <th className="px-4 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Conv.</th>
                <th className="px-4 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Revenue</th>
                <th className="px-4 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Cost</th>
                <th className="px-4 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Profit</th>
                <th className="px-4 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">ROI</th>
                <th className="px-4 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">CR</th>
                <th className="px-4 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">EPC</th>
                <th className="px-4 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">CPC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {REPORT_DATA.map((row, i) => (
                <tr key={i} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-primary">{row.dimension}</span>
                  </td>
                  <td className="px-4 py-4 text-xs font-mono text-on-surface-variant text-right">{row.clicks.toLocaleString()}</td>
                  <td className="px-4 py-4 text-xs font-mono text-on-surface-variant text-right">{row.conversions.toLocaleString()}</td>
                  <td className="px-4 py-4 text-xs font-mono text-primary font-bold text-right">{row.revenue}</td>
                  <td className="px-4 py-4 text-xs font-mono text-on-surface-variant text-right">{row.cost}</td>
                  <td className="px-4 py-4 text-xs font-mono font-bold text-primary text-right">{row.profit}</td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-sm",
                      row.roi.startsWith('-') ? "bg-error/10 text-error" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {row.roi}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs font-mono text-on-surface-variant text-right">{row.cr}</td>
                  <td className="px-4 py-4 text-xs font-mono text-on-surface-variant text-right">{row.epc}</td>
                  <td className="px-4 py-4 text-xs font-mono text-on-surface-variant text-right">{row.cpc}</td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-surface-container-low font-bold">
                <td className="px-6 py-4 text-xs text-primary uppercase tracking-widest">Total</td>
                <td className="px-4 py-4 text-xs font-mono text-primary text-right">112,700</td>
                <td className="px-4 py-4 text-xs font-mono text-primary text-right">2,790</td>
                <td className="px-4 py-4 text-xs font-mono text-primary text-right">$27,850</td>
                <td className="px-4 py-4 text-xs font-mono text-primary text-right">$15,320</td>
                <td className="px-4 py-4 text-xs font-mono text-primary text-right">$12,530</td>
                <td className="px-4 py-4 text-xs font-mono text-emerald-700 text-right">81%</td>
                <td className="px-4 py-4 text-xs font-mono text-primary text-right">2.47%</td>
                <td className="px-4 py-4 text-xs font-mono text-primary text-right">$0.25</td>
                <td className="px-4 py-4 text-xs font-mono text-primary text-right">$0.14</td>
              </tr>
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

export default Reports;
