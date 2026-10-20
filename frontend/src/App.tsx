/**
 * @fileoverview React 搴旂敤涓诲叆鍙ｏ紝閰嶇疆璺敱
 * @description 娓叉煋鏁翠釜搴旂敤锛屽寘鍚墍鏈夐〉闈㈣矾鐢?
 * @module App
 *
 * 浣跨敤 BrowserRouter 閫傞厤鍔ㄦ€侀儴缃茬幆澧冿紝浣跨敤 React.lazy 瀹炵幇浠ｇ爜鍒嗗壊
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTheme } from './context/ThemeContext';
import { lightTheme, darkTheme } from './theme';

// 璺敱绾у埆浠ｇ爜鍒嗗壊 - 鎳掑姞杞介〉闈㈢粍浠?
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CampaignManagement = lazy(() => import('./pages/CampaignManagement'));
const CampaignDetail = lazy(() => import('./pages/CampaignDetail'));
const RuleManagement = lazy(() => import('./pages/RuleManagement'));
const PlatformManagement = lazy(() => import('./pages/PlatformManagement'));
const Landings = lazy(() => import('./pages/Landings'));
const Offers = lazy(() => import('./pages/Offers'));
const TrafficSources = lazy(() => import('./pages/TrafficSources'));
const AffiliateNetworks = lazy(() => import('./pages/AffiliateNetworks'));
const Reports = lazy(() => import('./pages/Reports'));
const ClicksLog = lazy(() => import('./pages/ClicksLog'));
const ConversionsLog = lazy(() => import('./pages/ConversionsLog'));
const Settings = lazy(() => import('./pages/Settings'));
const Trends = lazy(() => import('./pages/Trends'));
const Blacklist = lazy(() => import('./pages/Blacklist'));
const Whitelist = lazy(() => import('./pages/Whitelist'));
const TargetPage = lazy(() => import('./pages/Target'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));



export default function App() {
  const { isDark } = useTheme();
  const antdConfig = isDark
    ? { ...darkTheme, algorithm: antdTheme.darkAlgorithm }
    : lightTheme;

  return (
    <ConfigProvider theme={antdConfig}>
      <Router>
        <ErrorBoundary>
          <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center text-sm text-fg-muted">
              鍔犺浇涓€?
            </div>
          }>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="campaigns" element={<CampaignManagement />} />
                <Route path="campaigns/:id" element={<CampaignDetail />} />
                <Route path="rules" element={<RuleManagement />} />
                <Route path="platforms" element={<PlatformManagement />} />
                <Route path="landings" element={<Landings />} />
                <Route path="l" element={<Landings />} />
                <Route path="offers" element={<Offers />} />
                <Route path="traffic-sources" element={<TrafficSources />} />
                <Route path="affiliate-networks" element={<AffiliateNetworks />} />
                <Route path="trends" element={<Trends />} />
                <Route path="reports" element={<Reports />} />
                <Route path="audit" element={<ClicksLog />} />
                <Route path="conversions" element={<ConversionsLog />} />
                <Route path="blacklist" element={<Blacklist />} />
                <Route path="whitelist" element={<Whitelist />} />
                <Route path="target" element={<TargetPage />} />
                <Route path="settings" element={<Settings />} />
                <Route path="help" element={<HelpCenter />} />
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Router>
    </ConfigProvider>
  );
}
