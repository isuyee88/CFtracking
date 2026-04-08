/**
 * File: App.tsx
 * Purpose: application entry and route registration
 */

import React, { Suspense, lazy, useLayoutEffect, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { InitialDataContext } from './contexts/InitialDataContext';
import { getRawBootstrapData } from './services/bootstrap';

interface AppProps {
  initialData?: unknown;
  onReady?: () => void;
}

const loadDashboard = () => import('./pages/Dashboard');
const loadCampaignManagement = () => import('./pages/CampaignManagement');
const loadCampaignDetail = () => import('./pages/CampaignDetail');
const loadRuleManagement = () => import('./pages/RuleManagement');
const loadPlatformManagement = () => import('./pages/PlatformManagement');
const loadLandings = () => import('./pages/Landings');
const loadOffers = () => import('./pages/Offers');
const loadTrafficSources = () => import('./pages/TrafficSources');
const loadAffiliateNetworks = () => import('./pages/AffiliateNetworks');
const loadDomains = () => import('./pages/Domains');
const loadReports = () => import('./pages/Reports');
const loadClicksLog = () => import('./pages/ClicksLog');
const loadConversionsLog = () => import('./pages/ConversionsLog');
const loadSettings = () => import('./pages/Settings');
const loadTrends = () => import('./pages/Trends');
const loadBlacklist = () => import('./pages/Blacklist');
const loadWhitelist = () => import('./pages/Whitelist');
const loadTarget = () => import('./pages/Target');
const loadHelpCenter = () => import('./pages/HelpCenter');
const loadExportedReports = () => import('./pages/ExportedReports');
const loadCustomMetrics = () => import('./pages/CustomMetrics');
const loadTrafficFilter = () => import('./pages/TrafficFilter');
const loadAutoOptimizationCenter = () => import('./pages/AutoOptimizationCenter');
const loadLogin = () => import('./pages/Login');

const Dashboard = lazy(loadDashboard);
const CampaignManagement = lazy(loadCampaignManagement);
const CampaignDetail = lazy(loadCampaignDetail);
const RuleManagement = lazy(loadRuleManagement);
const PlatformManagement = lazy(loadPlatformManagement);
const Landings = lazy(loadLandings);
const Offers = lazy(loadOffers);
const TrafficSources = lazy(loadTrafficSources);
const AffiliateNetworks = lazy(loadAffiliateNetworks);
const Domains = lazy(loadDomains);
const Reports = lazy(loadReports);
const ClicksLog = lazy(loadClicksLog);
const ConversionsLog = lazy(loadConversionsLog);
const Settings = lazy(loadSettings);
const Trends = lazy(loadTrends);
const Blacklist = lazy(loadBlacklist);
const Whitelist = lazy(loadWhitelist);
const TargetPage = lazy(loadTarget);
const HelpCenter = lazy(loadHelpCenter);
const ExportedReports = lazy(loadExportedReports);
const CustomMetrics = lazy(loadCustomMetrics);
const TrafficFilter = lazy(loadTrafficFilter);
const AutoOptimizationCenter = lazy(loadAutoOptimizationCenter);
const LoginPage = lazy(loadLogin);

// 路由预加载映射
const routePreloadMap: Record<string, () => Promise<any>> = {
  '/': loadDashboard,
  '/dashboard': loadDashboard,
  '/campaigns': loadCampaignManagement,
  '/offers': loadOffers,
  '/traffic-sources': loadTrafficSources,
  '/reports': loadReports,
  '/audit': loadClicksLog,
  '/trends': loadTrends,
  '/traffic-filter': loadTrafficFilter,
};

function RouteReadyBoundary({
  children,
  onReady,
}: {
  children: React.ReactNode;
  onReady?: () => void;
}) {
  const hasSignalledRef = useRef(false);

  useLayoutEffect(() => {
    if (!onReady || hasSignalledRef.current) {
      return;
    }

    hasSignalledRef.current = true;
    onReady();
  }, [onReady]);

  return <>{children}</>;
}

function RouteShellFallback() {
  return (
    <div className="space-y-6 px-4 py-6 sm:px-6" aria-hidden="true">
      <div className="rounded-[24px] bg-surface px-6 py-7 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
        <div className="h-3 w-24 rounded-full bg-slate-200/80" />
        <div className="mt-5 h-10 max-w-xl rounded-full bg-slate-200/75" />
        <div className="mt-3 h-4 max-w-2xl rounded-full bg-slate-100" />
        <div className="mt-2 h-4 max-w-xl rounded-full bg-slate-100/90" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[20px] bg-surface px-5 py-5 shadow-[0_14px_36px_rgba(15,23,42,0.04)]">
            <div className="h-3 w-20 rounded-full bg-slate-200/75" />
            <div className="mt-6 h-8 w-28 rounded-full bg-slate-200/85" />
            <div className="mt-4 h-3 w-16 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App({ initialData, onReady }: AppProps) {
  // 预加载常用路由
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
      deviceMemory?: number;
    };

    if (
      nav.connection?.saveData ||
      nav.connection?.effectiveType === 'slow-2g' ||
      nav.connection?.effectiveType === '2g' ||
      nav.connection?.effectiveType === '3g' ||
      (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4)
    ) {
      return;
    }

    // 在空闲时间预加载常用路由
    const preloadRoutes = () => {
      const currentPath = window.location.pathname;
      const nextRouteByPage: Record<string, string[]> = {
        '/': ['/campaigns'],
        '/dashboard': ['/campaigns'],
        '/campaigns': ['/offers'],
        '/offers': ['/reports'],
        '/reports': ['/trends'],
      };
      const routesToPreload = nextRouteByPage[currentPath] || [];

      if (routesToPreload.length === 0) {
        return;
      }
      
      routesToPreload.forEach((route) => {
        if (route !== currentPath && routePreloadMap[route]) {
          if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => {
              routePreloadMap[route]().catch(() => {
              });
            }, { timeout: 2000 });
          } else {
            setTimeout(() => {
              routePreloadMap[route]().catch(() => {});
            }, 1000);
          }
        }
      });
    };

    const timer = setTimeout(preloadRoutes, 2000);
    return () => clearTimeout(timer);
  }, []);

  function RoutedContent() {
    const routeInitialData = getRawBootstrapData() ?? initialData;

    return (
      <InitialDataContext.Provider
        value={{
          data: routeInitialData,
        }}
      >
        <Routes>
          <Route path="/login" element={renderPage(<LoginPage />)} />
          <Route path="/" element={<Layout />}>
            <Route index element={renderPage(<Dashboard />)} />
            <Route path="dashboard" element={renderPage(<Dashboard />)} />
            <Route path="campaigns" element={renderPage(<CampaignManagement />)} />
            <Route path="campaigns/:id" element={renderPage(<CampaignDetail />)} />
            <Route path="rules" element={renderPage(<RuleManagement />)} />
            <Route path="platforms" element={renderPage(<PlatformManagement />)} />
            <Route path="landings" element={renderPage(<Landings />)} />
            <Route path="l" element={renderPage(<Landings />)} />
            <Route path="offers" element={renderPage(<Offers />)} />
            <Route path="traffic-sources" element={renderPage(<TrafficSources />)} />
            <Route path="affiliate-networks" element={renderPage(<AffiliateNetworks />)} />
            <Route path="domains" element={renderPage(<Domains />)} />
            <Route path="trends" element={renderPage(<Trends />)} />
            <Route path="reports" element={renderPage(<Reports />)} />
            <Route path="exported-reports" element={renderPage(<ExportedReports />)} />
            <Route path="custom-metrics" element={renderPage(<CustomMetrics />)} />
            <Route path="traffic-filter" element={renderPage(<TrafficFilter />)} />
            <Route path="audit" element={renderPage(<ClicksLog />)} />
            <Route path="conversions" element={renderPage(<ConversionsLog />)} />
            <Route path="blacklist" element={renderPage(<Blacklist />)} />
            <Route path="whitelist" element={renderPage(<Whitelist />)} />
            <Route path="target" element={renderPage(<TargetPage />)} />
            <Route path="settings" element={renderPage(<Settings />)} />
            <Route path="help" element={renderPage(<HelpCenter />)} />
            <Route path="auto-optimization" element={renderPage(<AutoOptimizationCenter />)} />
          </Route>
        </Routes>
      </InitialDataContext.Provider>
    );
  }

  const renderPage = (element: React.ReactNode, fallback: React.ReactNode = <RouteShellFallback />) => (
    <Suspense fallback={fallback}>
      <RouteReadyBoundary onReady={onReady}>{element}</RouteReadyBoundary>
    </Suspense>
  );

  return (
    <Router>
      <RoutedContent />
    </Router>
  );
}
