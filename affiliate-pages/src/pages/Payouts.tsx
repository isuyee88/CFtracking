import React, { useState } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Filter, 
  Search, 
  CreditCard, 
  Banknote,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const TRANSACTIONS_DATA = [
  { id: '1', type: 'Withdrawal', method: 'Bank Transfer', amount: '-$1,200.00', status: 'Completed', date: 'Mar 15, 2026' },
  { id: '2', type: 'Commission', method: 'March Earnings', amount: '+$4,250.80', status: 'Completed', date: 'Mar 10, 2026' },
  { id: '3', type: 'Withdrawal', method: 'PayPal', amount: '-$850.00', status: 'Processing', date: 'Mar 08, 2026' },
  { id: '4', type: 'Commission', method: 'February Bonus', amount: '+$500.00', status: 'Completed', date: 'Mar 02, 2026' },
  { id: '5', type: 'Withdrawal', method: 'Bank Transfer', amount: '-$2,100.00', status: 'Failed', date: 'Feb 28, 2026' },
];

export const Payouts = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-primary">Payouts & Wallet</h2>
          <p className="text-on-surface-variant">Manage your earnings and withdrawal methods.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-secondary/90 transition-all rounded-sm">
          <Wallet size={18} /> Request Payout
        </button>
      </div>

      {/* Balance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-primary p-10 text-on-primary relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-secondary-fixed-dim mb-4">
              <Wallet size={16} />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Available Balance</span>
            </div>
            <h3 className="text-6xl font-display font-bold text-on-primary mb-8">$12,450.80</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary/60 mb-2">Pending Payouts</p>
                <p className="text-2xl font-display font-bold text-on-primary">$850.00</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary/60 mb-2">Total Paid Out</p>
                <p className="text-2xl font-display font-bold text-on-primary">$34,200.00</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 blur-[120px] -translate-y-1/2 translate-x-1/2" />
        </div>

        <div className="bg-surface-container-lowest p-8 whisper-shadow flex flex-col">
          <h3 className="text-xl font-display font-bold text-primary mb-6">Payout Methods</h3>
          <div className="space-y-4 flex-1">
            <div className="p-4 bg-surface-container flex items-center justify-between border-l-4 border-secondary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary text-on-primary flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">Bank Transfer</p>
                  <p className="text-xs text-on-surface-variant">Ending in 4242</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">Primary</span>
            </div>
            <div className="p-4 bg-surface-container flex items-center justify-between border-l-4 border-transparent hover:border-outline-variant transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-container-highest text-primary flex items-center justify-center">
                  <Banknote size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">PayPal</p>
                  <p className="text-xs text-on-surface-variant">julian@atelier.io</p>
                </div>
              </div>
            </div>
          </div>
          <button className="mt-8 w-full py-3 border border-outline-variant/30 text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-all">
            Add New Method
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-surface-container-lowest whisper-shadow overflow-hidden">
        <div className="p-8 flex items-center justify-between border-b border-outline-variant/10">
          <h3 className="text-xl font-display font-bold text-primary">Transaction History</h3>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
              <Download size={14} /> Export
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Type / Method</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Amount</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Status</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">Date</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {TRANSACTIONS_DATA.map((tx) => (
                <tr key={tx.id} className="group hover:bg-surface-container-low transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 flex items-center justify-center",
                        tx.amount.startsWith('+') ? "bg-secondary-container text-secondary" : "bg-primary text-on-primary"
                      )}>
                        {tx.amount.startsWith('+') ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">{tx.type}</p>
                        <p className="text-xs text-on-surface-variant">{tx.method}</p>
                      </div>
                    </div>
                  </td>
                  <td className={cn(
                    "px-8 py-5 text-sm font-bold",
                    tx.amount.startsWith('+') ? "text-secondary" : "text-primary"
                  )}>
                    {tx.amount}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      {tx.status === 'Completed' ? <CheckCircle2 size={14} className="text-secondary" /> : 
                       tx.status === 'Processing' ? <Clock size={14} className="text-on-surface-variant" /> : 
                       <XCircle size={14} className="text-error" />}
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        tx.status === 'Completed' ? "text-secondary" : 
                        tx.status === 'Processing' ? "text-on-surface-variant" : 
                        "text-error"
                      )}>
                        {tx.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm text-on-surface-variant">{tx.date}</td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                      <Download size={18} />
                    </button>
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
