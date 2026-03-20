import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Globe, 
  Shield, 
  Database, 
  Users, 
  Bell, 
  Save, 
  Plus, 
  Trash2, 
  ExternalLink,
  Key,
  Server
} from 'lucide-react';

const TABS = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'domains', label: 'Domains', icon: Globe },
  { id: 'postbacks', label: 'Postbacks', icon: Database },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'users', label: 'Users', icon: Users },
];

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary tracking-tight">Maintenance</h1>
          <p className="text-sm text-on-surface-variant">Configure your tracker settings and manage resources.</p>
        </div>
        <button 
          onClick={() => alert('Settings saved successfully!')}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm"
        >
          <Save size={16} /> Save Changes
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-primary text-on-primary shadow-md" 
                  : "text-on-surface-variant hover:bg-surface-container-highest"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {activeTab === 'general' && (
            <div className="bg-surface-container-lowest p-6 whisper-shadow border border-outline-variant/10 space-y-6">
              <h3 className="text-lg font-display font-bold text-primary border-b border-outline-variant/10 pb-2">General Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Language</label>
                  <select className="w-full p-2 bg-surface-container border border-outline-variant/30 text-sm focus:border-primary outline-none">
                    <option>English</option>
                    <option>Russian</option>
                    <option>Chinese</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Timezone</label>
                  <select className="w-full p-2 bg-surface-container border border-outline-variant/30 text-sm focus:border-primary outline-none">
                    <option>(UTC+00:00) UTC</option>
                    <option>(UTC-05:00) Eastern Time</option>
                    <option>(UTC+08:00) Beijing</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Currency</label>
                  <select className="w-full p-2 bg-surface-container border border-outline-variant/30 text-sm focus:border-primary outline-none">
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                    <option>GBP (£)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Click Expiration (Days)</label>
                  <input type="number" defaultValue={30} className="w-full p-2 bg-surface-container border border-outline-variant/30 text-sm focus:border-primary outline-none" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'domains' && (
            <div className="space-y-6">
              <div className="bg-surface-container-lowest p-6 whisper-shadow border border-outline-variant/10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-display font-bold text-primary">Custom Domains</h3>
                  <button 
                  onClick={() => alert('Add domain functionality coming soon!')}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-primary text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/90 transition-all"
                >
                  <Plus size={14} /> Add Domain
                </button>
                </div>
                <div className="space-y-4">
                  {[
                    { url: 'track.myoffer.com', status: 'Active', type: 'Main' },
                    { url: 'go.secure-link.io', status: 'Active', type: 'Tracking' },
                    { url: 'cdn.assets-srv.net', status: 'Pending', type: 'Assets' },
                  ].map((domain, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low border border-outline-variant/5">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/5 text-primary rounded-sm">
                          <Globe size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{domain.url}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{domain.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm",
                          domain.status === 'Active' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {domain.status}
                        </span>
                        <button 
                          onClick={() => alert(`Delete domain ${domain.url}`)}
                          className="p-2 text-on-surface-variant hover:text-error transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'postbacks' && (
            <div className="bg-surface-container-lowest p-6 whisper-shadow border border-outline-variant/10 space-y-6">
              <h3 className="text-lg font-display font-bold text-primary border-b border-outline-variant/10 pb-2">Global Postback</h3>
              <div className="space-y-4">
                <p className="text-xs text-on-surface-variant">This URL will be called for every conversion across all campaigns unless overridden.</p>
                <div className="relative">
                  <input 
                    type="text" 
                    readOnly 
                    value="https://my-tracker.com/postback?clickid={subid}&payout={payout}&status={status}"
                    className="w-full p-3 bg-surface-container border border-outline-variant/30 text-xs font-mono pr-24"
                  />
                  <button 
                    onClick={() => alert('Postback URL copied to clipboard!')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest"
                  >
                    Copy
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="p-4 border border-outline-variant/20 rounded-sm space-y-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Server size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">S2S Postback</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant">Recommended for most integrations.</p>
                  </div>
                  <div className="p-4 border border-outline-variant/20 rounded-sm space-y-2">
                    <div className="flex items-center gap-2 text-primary">
                      <Key size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">Pixel Tracking</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant">Use for client-side conversion tracking.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-surface-container-lowest p-6 whisper-shadow border border-outline-variant/10 space-y-6">
              <h3 className="text-lg font-display font-bold text-primary border-b border-outline-variant/10 pb-2">Security Settings</h3>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Authentication</h4>
                  <div className="flex items-center justify-between p-4 bg-surface-container-low border border-outline-variant/5">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/5 text-primary rounded-sm">
                        <Shield size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">Two-Factor Authentication</p>
                        <p className="text-[10px] text-on-surface-variant/60">Add an extra layer of security to your account.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => alert('Two-Factor Authentication setup coming soon!')}
                      className="px-4 py-2 bg-secondary text-on-primary text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/90 transition-all"
                    >
                      Enable
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Password</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Current Password</label>
                      <input type="password" placeholder="••••••••" className="w-full p-2 bg-surface-container border border-outline-variant/30 text-sm focus:border-primary outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full p-2 bg-surface-container border border-outline-variant/30 text-sm focus:border-primary outline-none" />
                    </div>
                  </div>
                  <button 
                    onClick={() => alert('Password updated successfully!')}
                    className="px-4 py-2 border border-outline-variant text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-surface-container transition-all"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-surface-container-lowest p-6 whisper-shadow border border-outline-variant/10 space-y-6">
              <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
                <h3 className="text-lg font-display font-bold text-primary">User Management</h3>
                <button 
                  onClick={() => alert('Add user functionality coming soon!')}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-primary text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/90 transition-all"
                >
                  <Plus size={14} /> Add User
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'Julian Dan', email: 'julian@atelier.io', role: 'Administrator', status: 'Active' },
                  { name: 'Alex Smith', email: 'alex@atelier.io', role: 'Manager', status: 'Active' },
                ].map((user, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-surface-container-low border border-outline-variant/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 flex items-center justify-center text-primary font-bold rounded-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">{user.name}</p>
                        <p className="text-[10px] text-on-surface-variant/60">{user.email} • {user.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => alert(`View user ${user.name}`)}
                        className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button 
                        onClick={() => alert(`Delete user ${user.name}`)}
                        className="p-2 text-on-surface-variant hover:text-error transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default Settings;
