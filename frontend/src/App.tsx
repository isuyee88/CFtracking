/**
 * File: App.tsx
 * Purpose: 应用主入口，配置路由
 * Input/Output: 渲染整个应用，包含所有页面路由
 * Logic: 使用 HashRouter 适配静态部署环境，使用嵌套路由
 */

import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CampaignManagement } from './pages/CampaignManagement';
import { CampaignDetail } from './pages/CampaignDetail';
import { RuleManagement } from './pages/RuleManagement';
import { PlatformManagement } from './pages/PlatformManagement';
import { Landings } from './pages/Landings';
import { Offers } from './pages/Offers';
import { TrafficSources } from './pages/TrafficSources';
import { AffiliateNetworks } from './pages/AffiliateNetworks';
import { Reports } from './pages/Reports';
import { ClicksLog } from './pages/ClicksLog';
import { ConversionsLog } from './pages/ConversionsLog';
import { Settings } from './pages/Settings';
import { Trends } from './pages/Trends';
import { Blacklist } from './pages/Blacklist';
import { Whitelist } from './pages/Whitelist';
import { TargetPage } from './pages/Target';
import { HelpCenter } from './pages/HelpCenter';

export default function App() {
  return (
    <Router>
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
    </Router>
  );
}