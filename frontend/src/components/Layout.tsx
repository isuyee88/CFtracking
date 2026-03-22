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
import { Link, useLocation, Outlet } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  onClick 
}: { 
  icon: any, 
  label: string, 
  to: string, 
  active?: boolean, 
  onClick?: () => void 
}) => (
  <Link 
    to={to}
    onClick={onClick}
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
  // 移动端默认收起侧边栏，桌面端默认展开
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return true;
  });
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // 监听窗口大小变化，自动调整侧边栏状态
  useEffect(() => {
    const handleResize = () => {
      const shouldBeOpen = window.innerWidth >= 1024;
      setSidebarOpen(prev => {
        // 只在状态需要变化时才更新，避免不必要的渲染
        if (prev !== shouldBeOpen) {
          return shouldBeOpen;
        }
        return prev;
      });
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
      {/* Mobile Sidebar Overlay - CSS 动画替代 motion */}
      {!isSidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(true)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
        />
      )}

      {/* Sidebar - CSS 动画替代 motion */}
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
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="lg:hidden text-fg-muted hover:text-fg-default hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-accent-fg focus-visible:ring-offset-2 rounded-md p-1 transition-colors"
            aria-label="Close sidebar"
          >
            <X size={20} aria-hidden="true" />
          </button>
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
                        onClick={() => {
                          // Close sidebar on mobile when navigating
                          if (window.innerWidth < 1024) {
                            setSidebarOpen(false);
                          }
                        }}
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
            <button 
              onClick={() => setSidebarOpen(true)} 
              className={cn(
                "lg:hidden text-fg-muted hover:text-fg-default hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-accent-fg focus-visible:ring-offset-2 rounded-md p-1 transition-colors",
                isSidebarOpen && "hidden"
              )}
              aria-label="Open sidebar"
              aria-expanded={isSidebarOpen}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
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
                <p className="text-xs text-fg-subtle">Elite Partner</p>
              </div>
              <img 
                src="https://picsum.photos/seed/avatar/100/100" 
                alt="User profile" 
                className="w-8 h-8 rounded-md border border-border-default"
                referrerPolicy="no-referrer"
              />
            </button>
          </div>
        </header>

        {/* Page Content - 优化：添加ARIA标签 */}
        <div 
          className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar"
          role="main"
          aria-label="Page content"
        >
          {/* Debug: 显示当前路由路径 */}
          <div className="text-xs text-fg-muted mb-2" aria-hidden="true">Current Path: {location.pathname}</div>
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <Link to="/" className={cn("mobile-nav-item", (location.pathname === "/" || location.pathname === "") && "active")}>
          <Home size={20} aria-hidden="true" />
          <span>Home</span>
        </Link>
        <Link to="/campaigns" className={cn("mobile-nav-item", location.pathname === "/campaigns" && "active")}>
          <Zap size={20} aria-hidden="true" />
          <span>Campaigns</span>
        </Link>
        <Link to="/trends" className={cn("mobile-nav-item", location.pathname === "/trends" && "active")}>
          <LineChart size={20} aria-hidden="true" />
          <span>Trends</span>
        </Link>
        <Link to="/audit" className={cn("mobile-nav-item", location.pathname === "/audit" && "active")}>
          <MousePointerClick size={20} aria-hidden="true" />
          <span>Clicks</span>
        </Link>
        <Link to="/settings" className={cn("mobile-nav-item", location.pathname === "/settings" && "active")}>
          <Settings size={20} aria-hidden="true" />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
};