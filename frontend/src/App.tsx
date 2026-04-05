/**
 * File: App.tsx
 * Purpose: application entry and route registration
 */

import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { InitialDataContext } from './contexts/InitialDataContext';

interface AppProps {
  initialData?: unknown;
}

const Dashboard = lazy(() => import('./pages/Dashboard'));
const CampaignManagement = lazy(() => import('./pages/CampaignManagement'));
const CampaignDetail = lazy(() => import('./pages/CampaignDetail'));
const RuleManagement = lazy(() => import('./pages/RuleManagement'));
const PlatformManagement = lazy(() => import('./pages/PlatformManagement'));
const Landings = lazy(() => import('./pages/Landings'));
const Offers = lazy(() => import('./pages/Offers'));
const TrafficSources = lazy(() => import('./pages/TrafficSources'));
const AffiliateNetworks = lazy(() => import('./pages/AffiliateNetworks'));
const Domains = lazy(() => import('./pages/Domains'));
const Reports = lazy(() => import('./pages/Reports'));
const ClicksLog = lazy(() => import('./pages/ClicksLog'));
const ConversionsLog = lazy(() => import('./pages/ConversionsLog'));
const Settings = lazy(() => import('./pages/Settings'));
const Trends = lazy(() => import('./pages/Trends'));
const Blacklist = lazy(() => import('./pages/Blacklist'));
const Whitelist = lazy(() => import('./pages/Whitelist'));
const TargetPage = lazy(() => import('./pages/Target'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));

const shimmerStyle = {
  background:
    'linear-gradient(90deg, rgba(226,232,240,0.75) 25%, rgba(241,245,249,0.95) 50%, rgba(226,232,240,0.75) 75%)',
  backgroundSize: '200% 100%',
  animation: 'app-skeleton-shimmer 1.25s linear infinite',
  borderRadius: '12px',
} satisfies React.CSSProperties;

function PageSkeleton() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        padding: '24px',
      }}
    >
      <div style={{ ...shimmerStyle, height: '24px', width: '180px', marginBottom: '20px' }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {[1, 2, 3, 4].map((item) => (
          <div key={item} style={{ background: '#fff', borderRadius: '16px', padding: '16px' }}>
            <div style={{ ...shimmerStyle, height: '10px', width: '50%', marginBottom: '12px' }} />
            <div style={{ ...shimmerStyle, height: '28px', width: '40%' }} />
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ ...shimmerStyle, height: '12px', width: '140px', marginBottom: '16px' }} />
        <div style={{ ...shimmerStyle, height: '220px', width: '100%' }} />
      </div>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '16px' }}>
        <div style={{ ...shimmerStyle, height: '12px', width: '120px', marginBottom: '16px' }} />
        {[1, 2, 3].map((item) => (
          <div key={item} style={{ display: 'flex', gap: '12px', marginBottom: item === 3 ? 0 : '12px' }}>
            <div style={{ ...shimmerStyle, height: '12px', width: '22%' }} />
            <div style={{ ...shimmerStyle, height: '12px', width: '34%' }} />
            <div style={{ ...shimmerStyle, height: '12px', width: '18%' }} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes app-skeleton-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

export default function App({ initialData }: AppProps) {
  const renderPage = (element: React.ReactNode) => <Suspense fallback={<PageSkeleton />}>{element}</Suspense>;

  return (
    <InitialDataContext.Provider value={{ data: initialData }}>
      <Router>
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
      </Router>
    </InitialDataContext.Provider>
  );
}
