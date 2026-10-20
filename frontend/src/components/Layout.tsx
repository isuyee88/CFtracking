/**
 * File: Layout.tsx
 * Purpose: 涓诲竷灞€缁勪欢锛屽寘鍚晶杈规爮銆佸ご閮ㄥ鑸拰鏄煎妯″紡鍒囨崲
 * Input/Output: 鎺ユ敹瀛愮粍浠讹紝娓叉煋瀹屾暣椤甸潰甯冨眬
 * Logic: 鎻愪緵瀵艰埅銆佺敤鎴蜂俊鎭拰鍏ㄥ眬鏄煎妯″紡鍒囨崲鍔熻兘
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Zap,
  Image,
  Gift,
  Globe,
  Network,
  Settings,
  HelpCircle,
  Search,
  X,
  MoreHorizontal,
  TrendingUp,
  Sun,
  Moon,
  Monitor,
  LineChart,
  MousePointerClick,
  CheckCircle,
  Shield,
  ThumbsUp,
  Target,
  BarChart3,
  Layers
} from 'lucide-react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { preloadPage, preloadOnIdle } from '../utils/preload';
import { useTheme } from '../context/ThemeContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 涓婚鐢?ThemeProvider 缁熶竴绠＄悊锛屽竷灞€灞傚彧娑堣垂鐘舵€併€?

// 浼樺寲锛氭坊鍔燗RIA鏍囩鍜屾棤闅滅鏀寔鐨凷idebarItem
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
}) => {
  // 鎮仠鏃堕鍔犺浇椤甸潰
  const handleMouseEnter = () => {
    preloadPage(to);
  };

  // 瑙︽懜鏃堕鍔犺浇椤甸潰锛堢Щ鍔ㄧ鏀寔锛?
  const handleTouchStart = () => {
    preloadPage(to);
  };

  return (
    <Link
      to={to}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      title={label}
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
};

export const Layout = () => {
  const location = useLocation();
  const { isDark, mode, cycleMode } = useTheme();
  const [isMoreOpen, setMoreOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setMoreOpen(false);
    setSearchOpen(false);
    setQuery('');
  }, [location.pathname]);

  // 绌洪棽鏃堕棿棰勫姞杞介珮棰戣闂〉闈?
  useEffect(() => {
    // 寤惰繜鎵ц锛岀‘淇濋椤靛畬鍏ㄥ姞杞?
    const timer = setTimeout(() => {
      preloadOnIdle();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
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
        { icon: BarChart3, label: "Reports", to: "/reports" },
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
        { icon: Layers, label: "Platforms", to: "/platforms" },
        { icon: HelpCircle, label: "Help Center", to: "/help" },
      ]
    }
  ];

  return (
    <div className="flex min-h-screen bg-canvas-inset selection:bg-accent-muted">
      {/* Skip to Content Link - 鏃犻殰纰嶆敮鎸?*/}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent-fg focus:text-on-primary focus:rounded-md focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar only */}
      <aside
        className={cn(
          "app-sidebar fixed inset-y-0 left-0 z-50 bg-surface-container-lowest dark:bg-surface-container flex flex-col shrink-0",
          "lg:relative"
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

        {/* 浼樺寲锛氬鑸尯鍩熸坊鍔燗RIA鏍囩 */}
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
                  // 淇棣栭〉 active 鍒ゆ柇锛屾敮鎸?HashRouter 鐨勮矾寰勬牸寮?
                  const isActive = item.to === "/"
                    ? location.pathname === "/" || location.pathname === ""
                    : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

                  return (
                    <div key={item.to} role="listitem">
                      <SidebarItem
                        icon={item.icon}
                        label={item.label}
                        to={item.to}
                        active={isActive}
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
        {/* Header - Stitch Design: No-Line 瑙勫垯 */}
        <header
          className="h-16 bg-surface-container-lowest dark:bg-surface-container flex items-center justify-between gap-4 px-4 md:px-6"
          role="banner"
        >
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-border-default bg-surface-container-low px-3 py-2 text-left text-sm text-fg-muted transition-colors hover:border-accent-fg/40 hover:text-fg-default focus-visible:ring-2 focus-visible:ring-accent-fg focus-visible:ring-offset-2"
            aria-label="Search pages"
          >
            <Search size={17} aria-hidden="true" />
            <span className="truncate">Search pages…</span>
            <kbd className="ms-auto hidden rounded border border-border-default px-1.5 py-0.5 text-[10px] text-fg-subtle sm:inline">鈱楰</kbd>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={cycleMode}
              className="rounded-lg bg-surface-container-low p-2 text-fg-muted transition-colors hover:bg-surface-container-high hover:text-fg-default focus-visible:ring-2 focus-visible:ring-accent-fg focus-visible:ring-offset-2"
              aria-label={mode === 'system' ? 'Switch to light mode' : mode === 'dark' ? 'Switch to system theme' : 'Switch to dark mode'}
              title={mode === 'system' ? 'Theme: system' : mode === 'dark' ? 'Theme: dark' : 'Theme: light'}
            >
              {mode === 'system' ? <Monitor size={18} aria-hidden="true" /> : isDark ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
            </button>

            <Link
              to="/settings"
              className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-accent-fg focus-visible:ring-offset-2"
              aria-label="Open settings"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted text-xs font-semibold text-accent-fg">AD</span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-semibold text-fg-default">Admin</span>
                <span className="block text-[11px] text-fg-subtle">Operator</span>
              </span>
            </Link>
          </div>
        </header>

        {/* Page Content - 浼樺寲锛氭坊鍔燗RIA鏍囩鍜?Skip Link 鐩爣 */}
        <div
          id="main-content"
          className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar md:p-6 md:space-y-6"
          role="main"
          aria-label="Page content"
          tabIndex={-1}
        >
          <Outlet />
        </div>
      </main>

      {isSearchOpen && (
        <div className="fixed inset-0 z-[130] flex items-start justify-center bg-black/40 p-4 pt-20" onClick={() => setSearchOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Page search"
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border-default bg-surface-container-lowest shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border-default px-4 py-3">
              <Search size={18} className="text-fg-subtle" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Escape' && setSearchOpen(false)}
                placeholder="Search pages…"
                className="w-full bg-transparent text-sm text-fg-default outline-none placeholder:text-fg-subtle"
                aria-label="Search pages"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="rounded p-1 text-fg-subtle hover:text-fg-default">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {navSections.flatMap((section) => section.items)
                .filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg-default hover:bg-surface-container-low"
                    >
                      <Icon size={16} className="text-fg-muted" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation: 4 primary destinations + More */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {[
          { to: '/', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/campaigns', label: 'Campaigns', icon: Zap },
          { to: '/offers', label: 'Offers', icon: Gift },
          { to: '/audit', label: 'Clicks', icon: MousePointerClick },
        ].map((item) => {
          const Icon = item.icon;
          const active = item.to === '/' ? location.pathname === '/' : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn('mobile-nav-item', active && 'active')}
              title={item.label}
              onMouseEnter={() => preloadPage(item.to)}
              onTouchStart={() => preloadPage(item.to)}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={cn('mobile-nav-item', isMoreOpen && 'active')}
          onClick={() => setMoreOpen(true)}
          title="More"
          aria-label="More navigation"
          aria-expanded={isMoreOpen}
        >
          <MoreHorizontal size={20} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      {isMoreOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40" onClick={() => setMoreOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl border-t border-border-default bg-surface-container-lowest p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-fg-default">All pages</p>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close navigation" className="rounded p-1 text-fg-subtle hover:text-fg-default">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {navSections.map((section) => (
              <div key={section.title} className="mb-4">
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">{section.title}</p>
                <div className="grid grid-cols-2 gap-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-fg-default hover:bg-surface-container-low"
                      >
                        <Icon size={16} className="text-fg-muted" aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
