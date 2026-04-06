/**
 * File: App.tsx
 * Purpose: application entry and route registration
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { InitialDataContext } from './contexts/InitialDataContext';
import Dashboard from './pages/Dashboard';
import { getRawBootstrapData } from './services/bootstrap';

interface AppProps {
  initialData?: unknown;
}

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

const routePreloaders = [
  loadCampaignManagement,
  loadCampaignDetail,
  loadRuleManagement,
  loadPlatformManagement,
  loadLandings,
  loadOffers,
  loadTrafficSources,
  loadAffiliateNetworks,
  loadDomains,
  loadReports,
  loadClicksLog,
  loadConversionsLog,
  loadSettings,
  loadTrends,
  loadBlacklist,
  loadWhitelist,
  loadTarget,
  loadHelpCenter,
];

export default function App({ initialData }: AppProps) {
  function RoutedContent() {
    const location = useLocation();
    const routeInitialData = getRawBootstrapData() ?? initialData;

    return (
      <InitialDataContext.Provider
        value={{
          data: routeInitialData,
        }}
      >
        <Routes>
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
            <Route path="audit" element={renderPage(<ClicksLog />)} />
            <Route path="conversions" element={renderPage(<ConversionsLog />)} />
            <Route path="blacklist" element={renderPage(<Blacklist />)} />
            <Route path="whitelist" element={renderPage(<Whitelist />)} />
            <Route path="target" element={renderPage(<TargetPage />)} />
            <Route path="settings" element={renderPage(<Settings />)} />
            <Route path="help" element={renderPage(<HelpCenter />)} />
          </Route>
        </Routes>
      </InitialDataContext.Provider>
    );
  }

  useEffect(() => {
    const preload = () => {
      routePreloaders.forEach((loadPage) => {
        void loadPage();
      });
    };

    if (typeof window === 'undefined') {
      return;
    }

    if (window.requestIdleCallback) {
      const idleId = window.requestIdleCallback(() => preload(), { timeout: 1500 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timer = window.setTimeout(preload, 600);
    return () => window.clearTimeout(timer);
  }, []);

  const renderPage = (element: React.ReactNode) => <Suspense fallback={null}>{element}</Suspense>;

  return (
    <Router>
      <RoutedContent />
    </Router>
  );
}
