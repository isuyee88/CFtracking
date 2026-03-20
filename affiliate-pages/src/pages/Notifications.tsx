import React, { useState } from 'react';
import { Bell, Check, Trash2, Filter, MoreHorizontal, Info, AlertCircle, CheckCircle2 } from 'lucide-react';

const notifications = [
  { id: 1, type: 'success', title: 'Payout Successful', message: 'Your payout of $1,240.00 has been processed to your bank account.', time: '2 hours ago', unread: true },
  { id: 2, type: 'info', title: 'New Referral Joined', message: 'Marcus J. has joined your referral network using your link.', time: '5 hours ago', unread: true },
  { id: 3, type: 'alert', title: 'Campaign Budget Alert', message: 'Summer Solstice 2024 has reached 80% of its allocated budget.', time: '1 day ago', unread: false },
  { id: 4, type: 'success', title: 'Conversion Milestone', message: 'You have reached 1,000 total conversions! Bonus reward unlocked.', time: '2 days ago', unread: false },
  { id: 5, type: 'info', title: 'System Update', message: 'New analytics features are now available in the Performance tab.', time: '3 days ago', unread: false },
  { id: 6, type: 'alert', title: 'Security Alert', message: 'A new login was detected from a new device in London, UK.', time: '4 days ago', unread: false },
];

export const Notifications = () => {
  const [activeFilter, setActiveFilter] = useState('all');

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tighter text-primary uppercase italic">Notifications</h1>
          <p className="text-on-surface-variant/60 font-medium">Stay updated with your account activity and performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => alert('All notifications marked as read!')}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-primary text-xs font-bold uppercase tracking-widest hover:bg-surface-container-highest transition-colors"
          >
            <Check size={16} />
            Mark all as read
          </button>
          <button 
            onClick={() => alert('Clear all notifications!')}
            className="p-2 text-on-surface-variant/40 hover:text-primary transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="bg-surface-container whisper-shadow overflow-hidden">
        <div className="p-6 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveFilter('all')}
              className={`text-xs font-bold uppercase tracking-widest pb-1 transition-colors ${activeFilter === 'all' ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant/40 hover:text-primary'}`}
            >
              All
            </button>
            <button 
              onClick={() => setActiveFilter('unread')}
              className={`text-xs font-bold uppercase tracking-widest pb-1 transition-colors ${activeFilter === 'unread' ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant/40 hover:text-primary'}`}
            >
              Unread
            </button>
            <button 
              onClick={() => setActiveFilter('alerts')}
              className={`text-xs font-bold uppercase tracking-widest pb-1 transition-colors ${activeFilter === 'alerts' ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant/40 hover:text-primary'}`}
            >
              Alerts
            </button>
          </div>
          <button 
            onClick={() => alert('Filter panel coming soon!')}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/40 hover:text-primary transition-colors"
          >
            <Filter size={14} />
            Filter
          </button>
        </div>

        <div className="divide-y divide-outline-variant">
          {notifications.map((notif) => (
            <div key={notif.id} className={`p-6 flex gap-4 hover:bg-surface-container-highest/30 transition-colors group ${notif.unread ? 'bg-secondary/5' : ''}`}>
              <div className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-sm ${
                notif.type === 'success' ? 'bg-secondary/10 text-secondary' : 
                notif.type === 'alert' ? 'bg-primary/10 text-primary' : 
                'bg-on-surface-variant/10 text-on-surface-variant'
              }`}>
                {notif.type === 'success' ? <CheckCircle2 size={20} /> : 
                 notif.type === 'alert' ? <AlertCircle size={20} /> : 
                 <Info size={20} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-bold ${notif.unread ? 'text-primary' : 'text-on-surface-variant'}`}>{notif.title}</h3>
                  <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">{notif.time}</span>
                </div>
                <p className="text-sm text-on-surface-variant/60 leading-relaxed">{notif.message}</p>
              </div>
              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => alert(`More options for notification ${notif.id}`)}
                  className="p-2 text-on-surface-variant/40 hover:text-primary transition-colors"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-surface-container-highest/30 text-center">
          <button 
            onClick={() => alert('Loading more notifications...')}
            className="text-xs font-bold uppercase tracking-widest text-secondary hover:underline"
          >
            Load more notifications
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
