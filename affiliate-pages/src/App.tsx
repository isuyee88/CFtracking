/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Offers } from './pages/Offers';
import { Performance } from './pages/Performance';
import { AffiliateNetworks } from './pages/AffiliateNetworks';
import { Payouts } from './pages/Payouts';
import { Settings } from './pages/Settings';
import { Campaigns } from './pages/Campaigns';
import { Landings } from './pages/Landings';
import { Reports } from './pages/Reports';
import { Leaderboard } from './pages/Leaderboard';
import { Notifications } from './pages/Notifications';
import { HelpCenter } from './pages/HelpCenter';
import { TrafficSources } from './pages/TrafficSources';
import { ClicksLog } from './pages/ClicksLog';
import { ConversionsLog } from './pages/ConversionsLog';
import { Onboarding } from './pages/Onboarding';
import { Compliance } from './pages/Compliance';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/links" element={<Offers />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/referrals" element={<AffiliateNetworks />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/assets" element={<Landings />} />
          <Route path="/integrations" element={<TrafficSources />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/payouts" element={<Payouts />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/audit" element={<ClicksLog />} />
          <Route path="/conversions" element={<ConversionsLog />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}
