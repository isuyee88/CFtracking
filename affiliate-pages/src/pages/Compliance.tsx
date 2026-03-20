import React from 'react';
import { ShieldCheck, FileText, Check, AlertCircle, Download, ExternalLink, Shield, Lock } from 'lucide-react';

export const Compliance = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tighter text-primary uppercase italic">Tax & Compliance</h1>
          <p className="text-on-surface-variant/60 font-medium">Manage your tax forms and legal agreements.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm self-start">
            <FileText size={18} />
            Submit New Form
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface-container p-8 whisper-shadow border-l-4 border-secondary space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-secondary/10 text-secondary">
              <ShieldCheck size={24} />
            </div>
            <span className="px-2 py-1 bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-wider">Verified</span>
          </div>
          <h2 className="text-2xl font-display font-black text-primary uppercase italic">Tax Information</h2>
          <p className="text-sm text-on-surface-variant/60 leading-relaxed">Your tax information has been successfully verified. You are eligible to receive payouts.</p>
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between p-4 bg-surface border border-outline-variant">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-on-surface-variant/40" />
                <span className="font-bold text-primary">W-9 Form (2024)</span>
              </div>
              <button className="p-2 text-on-surface-variant/40 hover:text-secondary transition-colors">
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface-container p-8 whisper-shadow border-l-4 border-primary space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary/10 text-primary">
              <Lock size={24} />
            </div>
            <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Action Required</span>
          </div>
          <h2 className="text-2xl font-display font-black text-primary uppercase italic">Legal Agreements</h2>
          <p className="text-sm text-on-surface-variant/60 leading-relaxed">Please review and sign the updated Affiliate Program Terms and Conditions.</p>
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between p-4 bg-surface border border-outline-variant">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-primary" />
                <span className="font-bold text-primary">Updated Terms (v2.4)</span>
              </div>
              <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary hover:underline">
                Sign Now
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container whisper-shadow overflow-hidden">
        <div className="p-6 border-b border-outline-variant">
          <h2 className="text-xl font-display font-black text-primary uppercase italic">Privacy & Security Policies</h2>
        </div>
        <div className="divide-y divide-outline-variant">
          {[
            { title: "Privacy Policy", lastUpdated: "Jan 15, 2024", icon: Shield },
            { title: "Cookie Policy", lastUpdated: "Jan 15, 2024", icon: Lock },
            { title: "Data Processing Agreement", lastUpdated: "Feb 01, 2024", icon: ShieldCheck },
            { title: "Anti-Spam Policy", lastUpdated: "Dec 10, 2023", icon: Shield },
          ].map((policy, i) => (
            <div key={i} className="p-6 flex items-center justify-between hover:bg-surface-container-highest/30 transition-colors group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-on-surface-variant/10 text-on-surface-variant group-hover:bg-secondary group-hover:text-white transition-colors">
                  <policy.icon size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-primary">{policy.title}</h3>
                  <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Last Updated: {policy.lastUpdated}</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-on-surface-variant/40 group-hover:translate-x-1 transition-transform" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ArrowRight = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export default Compliance;
