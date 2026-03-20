import React, { useState } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Download, 
  Filter, 
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Eye
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';

const PERFORMANCE_DATA = [
  { name: 'Week 1', revenue: 4500, clicks: 12000, conv: 3.2 },
  { name: 'Week 2', revenue: 5200, clicks: 15000, conv: 3.5 },
  { name: 'Week 3', revenue: 3800, clicks: 11000, conv: 2.9 },
  { name: 'Week 4', revenue: 6100, clicks: 18000, conv: 4.1 },
  { name: 'Week 5', revenue: 4900, clicks: 14000, conv: 3.4 },
];

const PerformanceMetric = ({ label, value, trend, isPositive, icon: Icon }: { label: string, value: string, trend: string, isPositive: boolean, icon: any }) => (
  <div className="bg-surface-container-lowest p-6 whisper-shadow border-l-4 border-primary">
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 bg-surface-container flex items-center justify-center text-primary">
        <Icon size={20} />
      </div>
      <div className={cn(
        "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-sm",
        isPositive ? "bg-secondary-container text-secondary" : "bg-error/10 text-error"
      )}>
        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {trend}
      </div>
    </div>
    <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
    <h3 className="text-2xl font-display font-bold text-primary">{value}</h3>
  </div>
);

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export const Performance = () => {
  const [timeframe, setTimeframe] = useState('Last 30 Days');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-primary">Performance Analytics</h2>
          <p className="text-on-surface-variant">Deep dive into your conversion and traffic data.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant/30 text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-all">
            <Calendar size={14} /> {timeframe} <ChevronDown size={14} />
          </button>
          <button className="px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm">
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PerformanceMetric label="Impressions" value="248.5K" trend="+18.2%" isPositive={true} icon={Eye} />
        <PerformanceMetric label="Total Clicks" value="12,450" trend="+12.5%" isPositive={true} icon={TrendingUp} />
        <PerformanceMetric label="Conversion Rate" value="3.82%" trend="-0.5%" isPositive={false} icon={Target} />
        <PerformanceMetric label="EPC (Avg)" value="$1.42" trend="+8.1%" isPositive={true} icon={Zap} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface-container-lowest p-8 whisper-shadow">
          <h3 className="text-xl font-display font-bold text-primary mb-6">Revenue vs Clicks</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={PERFORMANCE_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eceef0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#44474c' }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#44474c' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#44474c' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#041627', border: 'none', borderRadius: '0px', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconType="square" />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#006b5c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="#041627" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 whisper-shadow">
          <h3 className="text-xl font-display font-bold text-primary mb-6">Weekly Conversion Rate</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PERFORMANCE_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eceef0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#44474c' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#44474c' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#041627', border: 'none', borderRadius: '0px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="conv" fill="#44ddc1" radius={[2, 2, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-surface-container-lowest p-8 whisper-shadow">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-display font-bold text-primary">Device & Platform Breakdown</h3>
          <button className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
            View Full Report
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Mobile', value: '62%', sub: '154.2K Impressions', color: 'bg-secondary' },
            { label: 'Desktop', value: '35%', sub: '86.9K Impressions', color: 'bg-primary' },
            { label: 'Tablet', value: '3%', sub: '7.4K Impressions', color: 'bg-surface-container-highest' },
          ].map((item) => (
            <div key={item.label} className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{item.label}</p>
                  <p className="text-2xl font-display font-bold text-primary">{item.value}</p>
                </div>
                <p className="text-[10px] text-on-surface-variant">{item.sub}</p>
              </div>
              <div className="h-2 bg-surface-container w-full">
                <div className={cn("h-full", item.color)} style={{ width: item.value }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
