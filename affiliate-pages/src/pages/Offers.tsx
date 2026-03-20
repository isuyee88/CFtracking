import React, { useState } from 'react';
import { 
  Plus, 
  Copy, 
  ExternalLink, 
  MoreHorizontal, 
  Search,
  Filter,
  MousePointer2,
  ShoppingBag,
  DollarSign,
  Edit3,
  Trash2,
  Play,
  Pause,
  Calendar
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { QuickDateRangePicker, type DateRangeValue, getDateRange } from '@/components/DateRangePicker';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const OFFERS_DATA = [
  { id: 201, name: 'Nutra_Slim_US_V1', group: 'Nutra', network: 'AdCombo', payout: '$24.50', cap: '100/day', clicks: 1240, conversions: 45, revenue: '$1,102.50', roi: '145%', cr: '3.63%', status: 'Active' },
  { id: 202, name: 'Crypto_Master_UK', group: 'Finance', network: 'ClickBank', payout: '$450.00', cap: 'No Cap', clicks: 850, conversions: 12, revenue: '$5,400.00', roi: '320%', cr: '1.41%', status: 'Active' },
  { id: 203, name: 'Sweepstakes_iPhone15', group: 'Sweeps', network: 'Zeydoo', payout: '$2.10', cap: '500/day', clicks: 3200, conversions: 89, revenue: '$186.90', roi: '12%', cr: '2.78%', status: 'Active' },
  { id: 204, name: 'Dating_Flirt_DE', group: 'Dating', network: 'CrakRevenue', payout: '$3.50', cap: '200/day', clicks: 450, conversions: 5, revenue: '$17.50', roi: '-15%', cr: '1.11%', status: 'Paused' },
  { id: 205, name: 'Gambling_Slot_BR', group: 'Gambling', network: 'Pin-Up', payout: '$120.00', cap: '50/day', clicks: 2100, conversions: 34, revenue: '$4,080.00', roi: '85%', cr: '1.62%', status: 'Active' },
];

export const Offers = () => {
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
          <h2 className="text-3xl font-display font-bold text-primary">Offers</h2>
          <p className="text-sm text-on-surface-variant">Manage your affiliate offers and conversion caps</p>
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
          <button onClick={() => alert('Create new offer coming soon!')} className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm">
            <Plus size={18} /> New Offer
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-surface-container-lowest p-4 whisper-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => alert('Resume selected offers')} className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Play"><Play size={18} /></button>
          <button onClick={() => alert('Pause selected offers')} className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Pause"><Pause size={18} /></button>
          <button onClick={() => alert('Copy selected offers')} className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Copy"><Copy size={18} /></button>
          <button onClick={() => alert('Delete selected offers')} className="p-2 text-on-surface-variant hover:text-error transition-colors" title="Delete"><Trash2 size={18} /></button>
          <div className="h-6 w-px bg-outline-variant/20 mx-2" />
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, ID, or network..." 
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

      {/* Offers Table */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-4 py-4 w-10">
                  <input type="checkbox" className="rounded-none border-outline-variant" />
                </th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">ID</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant min-w-[200px]">Offer Name</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Status</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Group</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Network</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Payout</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Cap</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Clicks</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Conv.</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">ROI</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">CR</th>
                <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {OFFERS_DATA.map((offer) => (
                <tr key={offer.id} className="group hover:bg-surface-container-low transition-colors">
                  <td className="px-4 py-4">
                    <input type="checkbox" className="rounded-none border-outline-variant" />
                  </td>
                  <td className="px-4 py-4 text-[10px] font-mono text-on-surface-variant">{offer.id}</td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-bold text-primary group-hover:text-secondary transition-colors cursor-pointer">{offer.name}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        offer.status === 'Active' ? "bg-secondary" : "bg-on-surface-variant/30"
                      )} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{offer.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[10px] font-bold text-on-surface-variant">{offer.group}</td>
                  <td className="px-4 py-4 text-[10px] font-bold text-on-surface-variant">{offer.network}</td>
                  <td className="px-4 py-4 text-[10px] font-mono text-primary font-bold">{offer.payout}</td>
                  <td className="px-4 py-4 text-[10px] font-bold text-on-surface-variant">{offer.cap}</td>
                  <td className="px-4 py-4 text-[10px] font-mono text-primary">{offer.clicks.toLocaleString()}</td>
                  <td className="px-4 py-4 text-[10px] font-mono text-primary">{offer.conversions.toLocaleString()}</td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-sm",
                      offer.roi.startsWith('-') ? "bg-error/10 text-error" : "bg-secondary-container text-secondary"
                    )}>
                      {offer.roi}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[10px] font-mono text-on-surface-variant">{offer.cr}</td>
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
