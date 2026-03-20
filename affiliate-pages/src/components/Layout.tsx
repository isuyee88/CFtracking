import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Zap, 
  Image, 
  Gift, 
  Globe, 
  Network, 
  BarChart3, 
  History, 
  Settings, 
  HelpCircle,
  Menu,
  X,
  Search,
  Bell,
  TrendingUp,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SidebarItem = ({ icon: Icon, label, to, active = false }: { icon: any, label: string, to: string, active?: boolean, key?: string }) => (
  <Link to={to} className={cn(
    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-all group",
    active ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"
  )}>
    <Icon size={20} className={cn(active ? "text-on-primary" : "group-hover:text-primary")} />
    <span className="text-sm font-medium">{label}</span>
    {active && <motion.div layoutId="active-pill" className="ml-auto w-1 h-4 bg-secondary-fixed-dim" />}
  </Link>
);

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const navSections = [
    {
      title: "Main",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", to: "/" },
        { icon: Zap, label: "Campaigns", to: "/campaigns" },
        { icon: Image, label: "Landings", to: "/assets" },
        { icon: Gift, label: "Offers", to: "/links" },
      ]
    },
    {
      title: "Sources",
      items: [
        { icon: Globe, label: "Traffic Sources", to: "/integrations" },
        { icon: Network, label: "Affiliate Networks", to: "/referrals" },
      ]
    },
    {
      title: "Analytics",
      items: [
        { icon: BarChart3, label: "Reports", to: "/reports" },
        { icon: History, label: "Logs", to: "/audit" },
        { icon: TrendingUp, label: "Performance", to: "/performance" },
      ]
    },
    {
      title: "Account",
      items: [
        { icon: Wallet, label: "Payouts", to: "/payouts" },
        { icon: ShieldCheck, label: "Compliance", to: "/compliance" },
        { icon: Settings, label: "Settings", to: "/settings" },
        { icon: HelpCircle, label: "Help Center", to: "/help" },
      ]
    }
  ];

  return (
    <div className="flex min-h-screen bg-surface selection:bg-secondary/30">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(true)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-surface-container-highest w-64 transition-transform duration-300 lg:relative lg:translate-x-0 flex flex-col",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="p-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary flex items-center justify-center">
              <TrendingUp size={18} className="text-secondary-fixed-dim" />
            </div>
            <h1 className="text-xl font-display font-extrabold tracking-tighter text-primary">ATELIER</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-primary">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto no-scrollbar py-4">
          {navSections.map((section) => (
            <div key={section.title} className="mb-6">
              <p className="px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50 mb-2">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SidebarItem 
                    key={item.to}
                    icon={item.icon} 
                    label={item.label} 
                    to={item.to}
                    active={location.pathname === item.to} 
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-6 shrink-0">
          <div className="bg-primary p-4 rounded-sm">
            <p className="text-xs text-on-primary/60 mb-1">Current Balance</p>
            <p className="text-xl font-display font-bold text-on-primary">$12,450.80</p>
            <button className="mt-4 w-full py-2 bg-secondary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-secondary/90 transition-colors rounded-sm">
              Withdraw
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-surface-container-lowest flex items-center justify-between px-8 border-b border-outline-variant/10">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <button onClick={() => setSidebarOpen(true)} className={cn("lg:hidden text-primary", isSidebarOpen && "hidden")}>
              <Menu size={20} />
            </button>
            <Search size={18} className="text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Search analytics, links..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-on-surface-variant/50"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative cursor-pointer">
              <Bell size={20} className="text-on-surface-variant hover:text-primary transition-colors" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full" />
            </div>
            <div className="h-8 w-px bg-outline-variant/20" />
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="text-right">
                <p className="text-sm font-bold text-primary group-hover:text-secondary transition-colors">Julian Dan</p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Elite Partner</p>
              </div>
              <img 
                src="https://picsum.photos/seed/avatar/100/100" 
                alt="Profile" 
                className="w-10 h-10 rounded-none border-2 border-surface-container"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
};
