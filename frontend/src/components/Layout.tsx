/**
 * File: Layout.tsx
 * Purpose: 主布局组件，包含侧边栏、头部导航和昼夜模式切换
 * Input/Output: 接收子组件，渲染完整页面布局
 * Logic: 提供导航、用户信息和全局昼夜模式切换功能
 */

import React, { useState, useEffect } from 'react';
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
  Wallet,
  Sun,
  Moon,
  FlaskConical,
  LineChart,
  MousePointerClick,
  CheckCircle,
  Shield,
  ThumbsUp,
  Target,
  Home
} from 'lucide-react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { loadBootstrapForLocation } from '../services/bootstrap';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 昼夜模式 Hook - Stitch Design: 添加过渡动画
function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // 从 localStorage 读取用户偏好，如果没有则根据时间自动判断
    const saved = localStorage.getItem('dark-mode');
    if (saved !== null) {
      return saved === 'true';
    }
    // 默认根据时间判断：晚上6点到早上6点为暗色模式
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  });

  useEffect(() => {
    // 保存用户偏好到 localStorage
    localStorage.setItem('dark-mode', isDarkMode.toString());
    
    // 添加过渡动画类
    document.documentElement.classList.add('theme-transitioning');
    
    // 应用或移除 dark-mode 类
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    
    // 移除过渡动画类
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return { isDarkMode, toggleDarkMode };
}

// 优化：添加ARIA标签和无障碍支持的SidebarItem
const SidebarItem = ({ 
  icon: Icon, 
  label, 
  to, 
  active = false, 
  onClick,
  onPrefetch,
}: { 
  icon: any, 
  label: string, 
  to: string, 
  active?: boolean, 
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void,
  onPrefetch?: () => void,
}) => (
  <Link 
    to={to}
    onClick={onClick}
    onMouseEnter={onPrefetch}
    onFocus={onPrefetch}
    aria-current={active ? "page" : undefined}
    aria-label={label}
    className={cn(
      "flex items-center gap-3 px-4 py-3 cursor-pointer transition-all group relative rounded-md mx-2",
      "focus-visible:ring-2 focus-visible:ring-accent-fg focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
      active 
        ? "bg-accent-muted text-accent-fg font-medium" 
        : "text-fg-muted hover:bg-surface-container hover:text-fg-default"
    )}
  >
    <Icon size={18} className={cn(active ? "text-accent-fg" : "group-hover:text-fg-default")} aria-hidden="true" />
    <span className="text-sm">{label}</span>
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent-fg rounded-r-full" aria-hidden="true" />}
  </Link>
);

export const Layout = () => {
  // 桌面端默认展开侧边栏，移动端不显示侧边栏（只用底部导航）
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return true;
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const prefetchRouteBootstrap = async (to: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextUrl = new URL(to, window.location.origin);
    await loadBootstrapForLocation({ url: nextUrl }).catch(() => null);
  };

  const handleNavigation =
    (to: string) =>
    async (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      await prefetchRouteBootstrap(to);
      navigate(to);
    };

  const handlePrefetch = (to: string) => {
    void prefetchRouteBootstrap(to);
  };

  // 监听窗口大小变化，自动调整侧边栏状态（仅桌面端）
  useEffect(() => {
    const handleResize = () => {
      const shouldBeOpen = window.innerWidth >= 1024;
      setSidebarOpen(shouldBeOpen);
    };

    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navSections = [
    {
      title: "Main",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", to: "/" },
        { icon: Zap, label: "Campaigns", to: "/campaigns" },
        { icon: Image, label: "Landings", to: "/landings" },
        { icon: Gift, label: "Offers", to: "/offers" },
      ]
    },
    {
      title: "Sources",
      items: [
        { icon: Globe, label: "Traffic Sources", to: "/traffic-sources" },
        { icon: Network, label: "Affiliate Networks", to: "/affiliate-networks" },
        { icon: Home, label: "Domains", to: "/domains" },
      ]
    },
    {
      title: "Report",
      items: [
        { icon: LineChart, label: "Trends", to: "/trends" },
        { icon: MousePointerClick, label: "Click Log", to: "/audit" },
        { icon: CheckCircle, label: "Conversions", to: "/conversions" },
      ]
    },
    {
      title: "Tools",
      items: [
        { icon: Zap, label: "Autorules", to: "/rules" },
        { icon: Shield, label: "Blacklist", to: "/blacklist" },
        { icon: ThumbsUp, label: "Whitelist", to: "/whitelist" },
        { icon: Target, label: "Target", to: "/target" },
      ]
    },
    {
      title: "Account",
      items: [
        { icon: Settings, label: "Settings", to: "/settings" },
        { icon: HelpCircle, label: "Help Center", to: "/help" },
      ]
    }
  ];

  return (
    <div className="flex min-h-screen bg-canvas-inset selection:bg-accent-muted">
      {/* Desktop Sidebar only */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-surface-container-lowest dark:bg-surface-container flex flex-col",
          "lg:relative lg:translate-x-0",
          "transition-transform duration-300 ease-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ width: 256 }}
        aria-label="Main navigation"
        role="navigation"
      >
        <div className="p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 bg-accent-fg flex items-center justify-center rounded-md" 
              aria-hidden="true"
            >
              <TrendingUp size={18} className="text-on-primary" />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight text-fg-default">CFTracking</h1>
          </div>
        </div>

        {/* 优化：导航区域添加ARIA标签 */}
        <nav className="flex-1 overflow-y-auto no-scrollbar py-4" aria-label="Sidebar navigation">
          {navSections.map((section) => (
            <div key={section.title} className="mb-6">
              <p 
                className="px-4 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle mb-2"
                aria-label={`${section.title} section`}
              >
                {section.title}
              </p>
              <div className="space-y-1" role="list">
                {section.items.map((item) => {
                  // 修复首页 active 判断，支持 HashRouter 的路径格式
                  const isActive = item.to === "/" 
                    ? location.pathname === "/" || location.pathname === ""
                    : location.pathname === item.to;
                  
                  return (
                    <div key={item.to} role="listitem">
                      <SidebarItem 
                        icon={item.icon} 
                        label={item.label} 
                        to={item.to}
                        active={isActive}
                        onClick={handleNavigation(item.to)}
                        onPrefetch={() => handlePrefetch(item.to)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Stitch Design: No-Line 规则 */}
        <header 
          className="h-16 bg-surface-container-lowest dark:bg-surface-container flex items-center justify-between px-6" 
          role="banner"
        >
          <div className="flex items-center gap-4 flex-1 max-w-md">
            {/* 移除移动端菜单按钮，只保留桌面端 */}
            <Search size={18} className="text-fg-subtle" aria-hidden="true" />
            <input 
              type="text" 
              placeholder="Search analytics, links..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-fg-subtle text-fg-default focus-visible:outline-none"
              aria-label="Search analytics and links"
            />
          </div>
          
          <div className="flex items-center gap-4">
            {/* 优化：昼夜模式切换按钮 - 添加ARIA标签 */}
            <button
              onClick={toggleDarkMode}
              className={cn(
                "p-2 rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent-fg focus-visible:ring-offset-2",
                isDarkMode 
                  ? "bg-surface-container-low text-fg-muted hover:text-fg-default hover:bg-surface-container-high" 
                  : "bg-surface-container-low text-fg-muted hover:text-fg-default hover:bg-surface-container-high"
              )}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={isDarkMode}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <div className="transition-transform duration-300" style={{ transform: isDarkMode ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                {isDarkMode ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
              </div>
            </button>
            
            {/* 优化：通知按钮 - 添加ARIA标签 */}
            <button 
              className="relative cursor-pointer focus-visible:ring-2 focus-visible:ring-accent-fg focus-visible:ring-offset-2 rounded-md p-1"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-fg-muted hover:text-fg-default transition-colors" aria-hidden="true" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full" aria-hidden="true" />
            </button>
            <div className="h-6 w-px bg-border-default" aria-hidden="true" />
            
            {/* 优化：用户信息 - 添加ARIA标签 */}
            <button 
              className="flex items-center gap-3 cursor-pointer group focus-visible:ring-2 focus-visible:ring-accent-fg focus-visible:ring-offset-2 rounded-md p-1"
              aria-label="User menu"
            >
              <div className="text-right">
                <p className="text-sm font-semibold text-fg-default group-hover:text-accent-fg transition-colors">User Name</p>
                <p className="text-xs text-fg-muted">Elite Partner</p>
              </div>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border-default bg-surface-container text-xs font-semibold text-fg-default"
                aria-hidden="true"
              >
                UN
              </div>
            </button>
          </div>
        </header>

        {/* Page Content - 优化：添加ARIA标签 */}
        <div 
          className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar"
          role="main"
          aria-label="Page content"
        >
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation - Scrollable */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <Link to="/" onClick={handleNavigation('/')} onMouseEnter={() => handlePrefetch('/')} onFocus={() => handlePrefetch('/')} className={cn("mobile-nav-item", (location.pathname === "/" || location.pathname === "") && "active")} title="Dashboard">
          <LayoutDashboard size={20} aria-hidden="true" />
          <span>Dashboard</span>
        </Link>
        <Link to="/campaigns" onClick={handleNavigation('/campaigns')} onMouseEnter={() => handlePrefetch('/campaigns')} onFocus={() => handlePrefetch('/campaigns')} className={cn("mobile-nav-item", location.pathname === "/campaigns" && "active")} title="Campaigns">
          <Zap size={20} aria-hidden="true" />
          <span>Campaigns</span>
        </Link>
        <Link to="/landings" onClick={handleNavigation('/landings')} onMouseEnter={() => handlePrefetch('/landings')} onFocus={() => handlePrefetch('/landings')} className={cn("mobile-nav-item", location.pathname === "/landings" && "active")} title="Landings">
          <Image size={20} aria-hidden="true" />
          <span>Landings</span>
        </Link>
        <Link to="/offers" onClick={handleNavigation('/offers')} onMouseEnter={() => handlePrefetch('/offers')} onFocus={() => handlePrefetch('/offers')} className={cn("mobile-nav-item", location.pathname === "/offers" && "active")} title="Offers">
          <Gift size={20} aria-hidden="true" />
          <span>Offers</span>
        </Link>
        <Link to="/traffic-sources" onClick={handleNavigation('/traffic-sources')} onMouseEnter={() => handlePrefetch('/traffic-sources')} onFocus={() => handlePrefetch('/traffic-sources')} className={cn("mobile-nav-item", location.pathname === "/traffic-sources" && "active")} title="Traffic Sources">
          <Globe size={20} aria-hidden="true" />
          <span>Sources</span>
        </Link>
        <Link to="/trends" onClick={handleNavigation('/trends')} onMouseEnter={() => handlePrefetch('/trends')} onFocus={() => handlePrefetch('/trends')} className={cn("mobile-nav-item", location.pathname === "/trends" && "active")} title="Trends">
          <LineChart size={20} aria-hidden="true" />
          <span>Trends</span>
        </Link>
        <Link to="/audit" onClick={handleNavigation('/audit')} onMouseEnter={() => handlePrefetch('/audit')} onFocus={() => handlePrefetch('/audit')} className={cn("mobile-nav-item", location.pathname === "/audit" && "active")} title="Click Log">
          <MousePointerClick size={20} aria-hidden="true" />
          <span>Clicks</span>
        </Link>
        <Link to="/rules" onClick={handleNavigation('/rules')} onMouseEnter={() => handlePrefetch('/rules')} onFocus={() => handlePrefetch('/rules')} className={cn("mobile-nav-item", location.pathname === "/rules" && "active")} title="Autorules">
          <Shield size={20} aria-hidden="true" />
          <span>Rules</span>
        </Link>
        <Link to="/settings" onClick={handleNavigation('/settings')} onMouseEnter={() => handlePrefetch('/settings')} onFocus={() => handlePrefetch('/settings')} className={cn("mobile-nav-item", location.pathname === "/settings" && "active")} title="Settings">
          <Settings size={20} aria-hidden="true" />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
};
