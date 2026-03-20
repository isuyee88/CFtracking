import React from 'react';
import { Rocket, Check, ArrowRight, Play, BookOpen, ShieldCheck, Zap, Users, Wallet } from 'lucide-react';

const steps = [
  { id: 1, title: "Complete Profile", description: "Fill in your personal details and upload a profile picture.", status: "Completed", icon: ShieldCheck },
  { id: 2, title: "Setup Payout Method", description: "Connect your bank account or PayPal to receive earnings.", status: "In Progress", icon: Wallet },
  { id: 3, title: "Create First Link", description: "Generate your first affiliate link and start tracking traffic.", status: "Pending", icon: Zap },
  { id: 4, title: "Invite Partners", description: "Grow your network by inviting sub-affiliates to join.", status: "Pending", icon: Users },
];

export const Onboarding = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-secondary/10 text-secondary flex items-center justify-center mx-auto rounded-sm mb-6">
          <Rocket size={40} />
        </div>
        <h1 className="text-5xl font-display font-black tracking-tighter text-primary uppercase italic">Welcome to Atelier</h1>
        <p className="text-on-surface-variant/60 font-medium max-w-xl mx-auto">Follow these steps to fully set up your account and start maximizing your earnings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-primary p-10 rounded-sm text-on-primary space-y-6 flex flex-col justify-between whisper-shadow">
          <div className="space-y-4">
            <h2 className="text-3xl font-display font-black tracking-tighter uppercase italic">Quick Start Guide</h2>
            <p className="text-on-primary/60 font-medium leading-relaxed">Watch our 2-minute introduction video to learn how to navigate the dashboard and use our core features effectively.</p>
          </div>
          <button className="w-full py-4 bg-secondary text-on-primary font-bold uppercase tracking-widest hover:bg-secondary/90 transition-colors flex items-center justify-center gap-3 mt-8">
            <Play size={20} />
            Watch Video
          </button>
        </div>

        <div className="bg-surface-container p-10 whisper-shadow space-y-6 border border-outline-variant">
          <h2 className="text-2xl font-display font-black text-primary uppercase italic">Resources</h2>
          <div className="space-y-4">
            <a href="#" className="flex items-center justify-between p-4 bg-surface hover:bg-surface-container-highest transition-colors border border-outline-variant group">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-secondary" />
                <span className="font-bold text-primary">Documentation</span>
              </div>
              <ArrowRight size={18} className="text-on-surface-variant/40 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#" className="flex items-center justify-between p-4 bg-surface hover:bg-surface-container-highest transition-colors border border-outline-variant group">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-secondary" />
                <span className="font-bold text-primary">Compliance Rules</span>
              </div>
              <ArrowRight size={18} className="text-on-surface-variant/40 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-display font-black text-primary uppercase italic">Setup Progress</h2>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.id} className={`p-6 flex items-center gap-6 border whisper-shadow transition-all ${
              step.status === 'Completed' ? 'bg-secondary/5 border-secondary/20' : 
              step.status === 'In Progress' ? 'bg-surface-container border-secondary' : 
              'bg-surface-container border-outline-variant opacity-60'
            }`}>
              <div className={`w-12 h-12 flex items-center justify-center rounded-sm shrink-0 ${
                step.status === 'Completed' ? 'bg-secondary text-white' : 
                step.status === 'In Progress' ? 'bg-secondary/10 text-secondary' : 
                'bg-on-surface-variant/10 text-on-surface-variant'
              }`}>
                {step.status === 'Completed' ? <Check size={24} /> : <step.icon size={24} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-primary">{step.title}</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    step.status === 'Completed' ? 'text-secondary' : 
                    step.status === 'In Progress' ? 'text-secondary' : 
                    'text-on-surface-variant/40'
                  }`}>{step.status}</span>
                </div>
                <p className="text-sm text-on-surface-variant/60">{step.description}</p>
              </div>
              {step.status !== 'Completed' && (
                <button className="p-3 bg-primary text-on-primary hover:bg-primary/90 transition-colors">
                  <ArrowRight size={20} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
