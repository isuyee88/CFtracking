/**
 * File: App.tsx
 * Purpose: 应用主入口，配置路由
 * Input/Output: 渲染整个应用，包含所有页面路由
 * Logic: 使用 HashRouter 适配静态部署环境，使用 React.lazy 实现代码分割
 * SSR: 接收 initialData 并传递给需要的页面组件
 */

import React, { Suspense, lazy, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CloudSyncProvider } from './contexts/CloudSyncContext';

// SSR 初始数据 Context
interface InitialDataContextValue {
  data: any;
  isSSR: boolean;
}

const InitialDataContext = createContext<InitialDataContextValue>({
  data: null,
  isSSR: false,
});

export const useInitialData = () => useContext(InitialDataContext);

interface AppProps {
  initialData?: any;
}

// 路由级代码分割 - 懒加载页面组件
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

// 楠ㄦ灦灞忕粍浠?- 鏀瑰杽鎰熺煡鎬ц兘
const PageSkeleton = () => (
  <div style={{
    padding: '20px',
    background: '#fafafa',
    minHeight: '100vh'
  }}>
    {/* 椤堕儴鎸囨爣鍗＄墖楠ㄦ灦 */}
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
    
    {/* 鍥捐〃鍖哄煙楠ㄦ灦 */}
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
    
    {/* 琛ㄦ牸鍖哄煙楠ㄦ灦 */}
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
    
    {/* 楠ㄦ灦灞忓姩鐢绘牱寮?*/}
    <style>{`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  </div>
);

export default function App({ initialData }: AppProps) {
  const isSSR = initialData && initialData.dataSource !== 'DEFAULT';
  
  return (
    <InitialDataContext.Provider value={{ data: initialData, isSSR }}>
      <Router>
        <CloudSyncProvider>
          <Suspense fallback={<PageSkeleton />}>
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
        </CloudSyncProvider>
      </Router>
    </InitialDataContext.Provider>
  );
}

