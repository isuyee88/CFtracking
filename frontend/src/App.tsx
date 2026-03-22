/**
 * File: App.tsx
 * Purpose: 应用主入口，配置路由
 * Input/Output: 渲染整个应用，包含所有页面路由
 * Logic: 使用 HashRouter 适配静态部署环境，使用 React.lazy 实现代码分割
 */

import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';

// 路由级代码分割 - 懒加载页面组件
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const CampaignManagement = lazy(() => import('./pages/CampaignManagement').then(m => ({ default: m.CampaignManagement })));
const CampaignDetail = lazy(() => import('./pages/CampaignDetail').then(m => ({ default: m.CampaignDetail })));
const RuleManagement = lazy(() => import('./pages/RuleManagement').then(m => ({ default: m.RuleManagement })));
const PlatformManagement = lazy(() => import('./pages/PlatformManagement').then(m => ({ default: m.PlatformManagement })));
const Landings = lazy(() => import('./pages/Landings').then(m => ({ default: m.Landings })));
const Offers = lazy(() => import('./pages/Offers').then(m => ({ default: m.Offers })));
const TrafficSources = lazy(() => import('./pages/TrafficSources').then(m => ({ default: m.TrafficSources })));
const AffiliateNetworks = lazy(() => import('./pages/AffiliateNetworks').then(m => ({ default: m.AffiliateNetworks })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const ClicksLog = lazy(() => import('./pages/ClicksLog').then(m => ({ default: m.ClicksLog })));
const ConversionsLog = lazy(() => import('./pages/ConversionsLog').then(m => ({ default: m.ConversionsLog })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Trends = lazy(() => import('./pages/Trends').then(m => ({ default: m.Trends })));
const Blacklist = lazy(() => import('./pages/Blacklist').then(m => ({ default: m.Blacklist })));
const Whitelist = lazy(() => import('./pages/Whitelist').then(m => ({ default: m.Whitelist })));
const TargetPage = lazy(() => import('./pages/Target').then(m => ({ default: m.TargetPage })));
const HelpCenter = lazy(() => import('./pages/HelpCenter').then(m => ({ default: m.HelpCenter })));

// 骨架屏组件 - 改善感知性能
const PageSkeleton = () => (
  <div style={{
    padding: '20px',
    background: '#fafafa',
    minHeight: '100vh'
  }}>
    {/* 顶部指标卡片骨架 */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {[1, 2, 3, 4, 5, 6, 7].map(i => (
        <div key={i} style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            height: '12px',
            width: '60%',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '4px',
            marginBottom: '12px'
          }} />
          <div style={{
            height: '24px',
            width: '40%',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '4px'
          }} />
        </div>
      ))}
    </div>
    
    {/* 图表区域骨架 */}
    <div style={{
      background: '#fff',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        height: '16px',
        width: '150px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '4px',
        marginBottom: '20px'
      }} />
      <div style={{
        height: '200px',
        background: 'linear-gradient(90deg, #f8f8f8 25%, #f0f0f0 50%, #f8f8f8 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '8px'
      }} />
    </div>
    
    {/* 表格区域骨架 */}
    <div style={{
      background: '#fff',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        height: '16px',
        width: '150px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '4px',
        marginBottom: '16px'
      }} />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          display: 'flex',
          gap: '12px',
          padding: '12px 0',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div style={{
            height: '12px',
            width: '15%',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '4px'
          }} />
          <div style={{
            height: '12px',
            width: '25%',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '4px'
          }} />
          <div style={{
            height: '12px',
            width: '20%',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '4px'
          }} />
          <div style={{
            height: '12px',
            width: '15%',
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '4px'
          }} />
        </div>
      ))}
    </div>
    
    {/* 骨架屏动画样式 */}
    <style>{`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  </div>
);

export default function App() {
  return (
    <Router>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
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
    </Router>
  );
}
