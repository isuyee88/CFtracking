import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight,
  MoreHorizontal,
  Download,
  Filter,
  Calendar,
  Users,
  Link2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STATS = [
  { label: "Clicks", value: "124,502", trend: "+12.5%", isPositive: true },
  { label: "Conversions", value: "3,842", trend: "+8.2%", isPositive: true },
  { label: "Revenue", value: "$48,290", trend: "+15.3%", isPositive: true },
  { label: "Profit", value: "$22,140", trend: "+18.1%", isPositive: true },
  { label: "ROI", value: "84.5%", trend: "+5.2%", isPositive: true },
  { label: "EPC", value: "$0.39", trend: "+2.1%", isPositive: true },
  { label: "CPC", value: "$0.21", trend: "-1.5%", isPositive: true },
  { label: "CR", value: "3.09%", trend: "-0.5%", isPositive: false },
];

const CHART_DATA = [
  { name: '00:00', clicks: 400, conversions: 24 },
  { name: '04:00', clicks: 300, conversions: 18 },
  { name: '08:00', clicks: 900, conversions: 45 },
  { name: '12:00', clicks: 1200, conversions: 72 },
  { name: '16:00', clicks: 1500, conversions: 98 },
  { name: '20:00', clicks: 1100, conversions: 65 },
  { name: '23:59', clicks: 800, conversions: 42 },
];

const TOP_CAMPAIGNS = [
  { id: '1', name: 'FB_US_Lookalike_V1', clicks: 45200, conversions: 1240, revenue: '$12,400', roi: '120%' },
  { id: '2', name: 'Google_Search_Brand', clicks: 12000, conversions: 850, revenue: '$8,500', roi: '340%' },
  { id: '3', name: 'TikTok_Global_UGC', clicks: 32000, conversions: 420, revenue: '$4,200', roi: '45%' },
  { id: '4', name: 'Native_Taboola_US', clicks: 15000, conversions: 180, revenue: '$1,800', roi: '-12%' },
];

export const Dashboard = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-primary">Dashboard</h2>
          <p className="text-sm text-on-surface-variant">Real-time tracking overview for all campaigns</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-surface-container p-1 rounded-sm">
            {['Today', 'Yesterday', 'Last 7 Days', 'This Month'].map((range) => (
              <button 
                key={range}
                className={cn(
                  "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all",
                  range === 'Today' ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-highest"
                )}
              >
                {range}
              </button>
            ))}
          </div>
          <button 
            onClick={() => alert('Date picker coming soon!')}
            className="p-2 bg-surface-container-highest text-primary hover:bg-primary hover:text-on-primary transition-all"
          >
            <Calendar size={18} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-surface-container-lowest p-4 whisper-shadow border-b-2 border-transparent hover:border-secondary transition-all">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">{stat.label}</p>
            <h3 className="text-xl font-display font-bold text-primary">{stat.value}</h3>
            <p className={cn(
              "text-[10px] font-bold mt-1",
              stat.isPositive ? "text-secondary" : "text-error"
            )}>
              {stat.trend}
            </p>
          </div>
        ))}
      </section>

      {/* Chart Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 whisper-shadow">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-display font-bold text-primary">Clicks & Conversions</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-primary rounded-full" />
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Clicks</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-secondary rounded-full" />
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Conversions</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006b5c" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#006b5c" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConvs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#44ddc1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#44ddc1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eceef0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#44474c' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#44474c' }} />
                <Tooltip contentStyle={{ backgroundColor: '#041627', border: 'none', color: '#fff', fontSize: '12px' }} />
                <Area type="monotone" dataKey="clicks" stroke="#006b5c" strokeWidth={2} fill="url(#colorClicks)" />
                <Area type="monotone" dataKey="conversions" stroke="#44ddc1" strokeWidth={2} fill="url(#colorConvs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 whisper-shadow flex flex-col">
          <h3 className="text-xl font-display font-bold text-primary mb-6">Top Traffic Sources</h3>
          <div className="space-y-6 flex-1">
            {[
              { name: 'Facebook Ads', value: 45, clicks: '56k' },
              { name: 'Google Ads', value: 30, clicks: '38k' },
              { name: 'TikTok Ads', value: 15, clicks: '19k' },
              { name: 'Taboola', value: 10, clicks: '12k' },
            ].map((source) => (
              <div key={source.name}>
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                  <span>{source.name}</span>
                  <span className="text-on-surface-variant/60">{source.clicks} clicks</span>
                </div>
                <div className="h-2 bg-surface-container w-full">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${source.value}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-primary" 
                  />
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => alert('View all traffic sources coming soon!')}
            className="mt-8 w-full py-3 border border-outline-variant/30 text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-all"
          >
            View All Sources
          </button>
        </div>
      </section>

      {/* Top Campaigns Table */}
      <section className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <div className="p-8 flex items-center justify-between border-b border-outline-variant/10">
          <h3 className="text-xl font-display font-bold text-primary">Top Campaigns</h3>
          <button 
            onClick={() => alert('Full report coming soon!')}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:text-secondary transition-colors"
          >
            View Full Report <ChevronRight size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Campaign Name</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Clicks</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Conversions</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Revenue</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">ROI</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {TOP_CAMPAIGNS.map((camp) => (
                <tr key={camp.id} className="group hover:bg-surface-container-low transition-colors">
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-primary">{camp.name}</span>
                  </td>
                  <td className="px-8 py-5 text-sm text-on-surface-variant">{camp.clicks.toLocaleString()}</td>
                  <td className="px-8 py-5 text-sm text-on-surface-variant">{camp.conversions.toLocaleString()}</td>
                  <td className="px-8 py-5 text-sm font-bold text-primary">{camp.revenue}</td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm",
                      camp.roi.startsWith('-') ? "bg-error/10 text-error" : "bg-secondary-container text-secondary"
                    )}>
                      {camp.roi}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => alert(`More options for ${camp.name}`)}
                      className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
