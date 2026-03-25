/**
 * @fileoverview SSR 应用主入口
 * @description SSR 版本的 App 组件，渲染前端所有页面
 * 输入：initialData - SSR 注入的初始数据
 * 输出：渲染的 React 组件
 * 逻辑交互：
 *   - SSR 期间渲染静态 HTML
 *   - 客户端 hydration 后恢复交互
 *   - 使用 SSE 接收实时更新
 */

 
import React, { Suspense, lazy } from 'react'
import { StaticRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@frontend/components/Layout'
 
// 路由级代码分割 - 懒加载页面组件
const Dashboard = lazy(() => import('@frontend/pages/Dashboard'))
const CampaignManagement = lazy(() => import('@frontend/pages/CampaignManagement'))
const CampaignDetail = lazy(() => import('@frontend/pages/CampaignDetail'))
const RuleManagement = lazy(() => import('@frontend/pages/RuleManagement'))
const PlatformManagement = lazy(() => import('@frontend/pages/PlatformManagement'))
const Landings = lazy(() => import('@frontend/pages/Landings'))
const Offers = lazy(() => import('@frontend/pages/Offers'))
const TrafficSources = lazy(() => import('@frontend/pages/TrafficSources'))
const AffiliateNetworks = lazy(() => import('@frontend/pages/AffiliateNetworks'))
const Reports = lazy(() => import('@frontend/pages/Reports'))
const ClicksLog = lazy(() => import('@frontend/pages/ClicksLog'))
const ConversionsLog = lazy(() => import('@frontend/pages/ConversionsLog'))
const Settings = lazy(() => import('@frontend/pages/Settings'))
const Trends = lazy(() => import('@frontend/pages/Trends'))
const Blacklist = lazy(() => import('@frontend/pages/Blacklist'))
const Whitelist = lazy(() => import('@frontend/pages/Whitelist'))
const TargetPage = lazy(() => import('@frontend/pages/Target'))
const HelpCenter = lazy(() => import('@frontend/pages/HelpCenter'))
 
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
)
 
interface AppProps {
  initialData?: any
    location?: string
}
 
/**
 * 主应用组件
 * 渲染前端所有页面，支持 SSR
 */
const App: React.FC<AppProps> = ({ initialData, location = '/' }) => {
  return (
    <StaticRouter location={location}>
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
    </StaticRouter>
  )
}
 
export default App
