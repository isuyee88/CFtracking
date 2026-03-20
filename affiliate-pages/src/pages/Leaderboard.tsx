import React from 'react';
import { Trophy, Medal, TrendingUp, Search, Filter, ArrowUp, ArrowDown } from 'lucide-react';

const leaders = [
  { rank: 1, name: "Alexander V.", earnings: "$124,500", conversions: 4500, trend: "up", avatar: "https://picsum.photos/seed/alex/100/100" },
  { rank: 2, name: "Elena S.", earnings: "$98,200", conversions: 3800, trend: "up", avatar: "https://picsum.photos/seed/elena/100/100" },
  { rank: 3, name: "Marcus J.", earnings: "$85,400", conversions: 3200, trend: "down", avatar: "https://picsum.photos/seed/marcus/100/100" },
  { rank: 4, name: "Sarah K.", earnings: "$72,100", conversions: 2900, trend: "up", avatar: "https://picsum.photos/seed/sarah/100/100" },
  { rank: 5, name: "David L.", earnings: "$65,800", conversions: 2400, trend: "down", avatar: "https://picsum.photos/seed/david/100/100" },
  { rank: 6, name: "Jessica P.", earnings: "$58,400", conversions: 2100, trend: "up", avatar: "https://picsum.photos/seed/jessica/100/100" },
  { rank: 7, name: "Thomas R.", earnings: "$52,100", conversions: 1800, trend: "up", avatar: "https://picsum.photos/seed/thomas/100/100" },
];

export const Leaderboard = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tighter text-primary uppercase italic">Leaderboard</h1>
          <p className="text-on-surface-variant/60 font-medium">Top performing partners in the Financial Atelier network.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container-highest transition-colors">
            <Filter size={16} />
            Time Range
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {leaders.slice(0, 3).map((leader, i) => (
          <div key={leader.rank} className={`relative bg-surface-container p-8 border-t-8 whisper-shadow ${
            i === 0 ? 'border-secondary scale-105 z-10' : 'border-primary'
          }`}>
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary flex items-center justify-center rotate-12">
              <span className="text-xl font-display font-black text-on-primary">#{leader.rank}</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-surface-container-highest">
                <img src={leader.avatar} alt={leader.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <h3 className="text-xl font-display font-bold text-primary mb-1">{leader.name}</h3>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">Elite Partner</p>
              <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-outline-variant">
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-1">Earnings</p>
                  <p className="text-lg font-display font-bold text-primary">{leader.earnings}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-1">Conversions</p>
                  <p className="text-lg font-display font-bold text-primary">{leader.conversions}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface-container whisper-shadow overflow-hidden">
        <div className="p-6 border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={18} />
            <input 
              type="text" 
              placeholder="Search partners..." 
              className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant focus:border-secondary outline-none transition-colors text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-highest/50">
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Rank</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Partner</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Earnings</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Conversions</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {leaders.slice(3).map((leader) => (
                <tr key={leader.rank} className="hover:bg-surface-container-highest/30 transition-colors group">
                  <td className="px-6 py-4 font-display font-black text-primary italic">#{leader.rank}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={leader.avatar} alt={leader.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <span className="font-bold text-primary">{leader.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-primary">{leader.earnings}</td>
                  <td className="px-6 py-4 font-mono text-xs text-primary">{leader.conversions}</td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-1 font-bold ${leader.trend === 'up' ? 'text-secondary' : 'text-primary/40'}`}>
                      {leader.trend === 'up' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                      {leader.trend === 'up' ? '+12%' : '-5%'}
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

export default Leaderboard;
