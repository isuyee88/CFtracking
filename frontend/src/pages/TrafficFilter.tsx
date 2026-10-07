/**
 * @fileoverview Traffic Filter 管理页面
 * @description ISP/IP/ASN/国家 流量过滤规则统一管理界面
 * 包含 ASN 黑白灰名单 / ISP 白名单 / 国家过滤 / 统计仪表板
 */
import React, { useState, useEffect, useCallback } from 'react';
import { simulateFlow, type FlowSimulationInput, type FlowSimulationResult } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch {}
  return headers;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = getAuthHeaders();
  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      throw new Error('Unauthorized');
    }
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  const payload = await response.json();
  return payload.data !== undefined ? payload.data : payload;
}

interface ASNEntry {
  id?: number;
  asn: number;
  asName?: string;
  category: 'blacklist' | 'greylist' | 'whitelist';
  type: string;
  riskScore?: number;
  reason?: string;
  enabled: boolean;
  createdAt?: string;
}

interface ISPEntry {
  id?: number;
  namePattern: string;
  type: string;
  country?: string;
  priority?: number;
  enabled: boolean;
  createdAt?: string;
}

interface CountryEntry {
  id?: number;
  countryCode: string;
  countryName?: string;
  action: 'allow' | 'block' | 'challenge';
  enabled: boolean;
  createdAt?: string;
}

interface StatsData {
  totalAsnRules?: number;
  totalIspRules?: number;
  totalCountryRules?: number;
  blockedToday?: number;
  blockedCount?: number;
  cacheHitRate?: number;
  [key: string]: unknown;
}

const TYPE_OPTIONS = [
  { label: 'Bot', value: 'bot' },
  { label: 'Data Center', value: 'datacenter' },
  { label: 'VPN', value: 'vpn' },
  { label: 'Proxy', value: 'proxy' },
  { label: 'Hosting', value: 'hosting' },
  { label: 'ISP', value: 'isp' },
  { label: 'Mobile', value: 'mobile' },
  { label: 'Business', value: 'business' },
  { label: 'Education', value: 'education' },
  { label: 'Government', value: 'government' },
];

const ISP_TYPE_OPTIONS = [
  { label: 'ISP', value: 'isp' },
  { label: 'Mobile', value: 'mobile' },
  { label: 'Business', value: 'business' },
  { label: 'Education', value: 'education' },
  { label: 'Government', value: 'government' },
];

const COUNTRY_ACTIONS = [
  { label: 'Allow', value: 'allow', color: '#22c55e' },
  { label: 'Block', value: 'block', color: '#ef4444' },
  { label: 'Challenge', value: 'challenge', color: '#f59e0b' },
];

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-fg-muted">
      <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

type TabKey = 'asn' | 'isp' | 'country' | 'stats' | 'simulation';

export default function TrafficFilter() {
  const [activeTab, setActiveTab] = useState<TabKey>('asn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-fg-default">Traffic Filter</h1>
          <p className="text-sm text-fg-muted">ISP, ASN, and country-based traffic filtering rules</p>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-error gap-4">
          <p className="text-lg">{error}</p>
          <button onClick={() => { setError(null); setActiveTab(activeTab); }} className="px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-fg-default">Traffic Filter</h1>
        <p className="text-sm text-fg-muted mt-1">ISP, ASN, and country-based traffic filtering rules</p>
      </div>

      <div className="flex gap-1 border-b border-border-default">
        {[
          { key: 'asn' as TabKey, label: 'ASN Rules' },
          { key: 'isp' as TabKey, label: 'ISP Whitelist' },
          { key: 'country' as TabKey, label: 'Countries' },
          { key: 'stats' as TabKey, label: 'Stats' },
          { key: 'simulation' as TabKey, label: 'Flow Simulation' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-fg-muted hover:text-fg-default'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'asn' && <ASNTab />}
      {activeTab === 'isp' && <ISPTab />}
      {activeTab === 'country' && <CountryTab />}
      {activeTab === 'stats' && <StatsTab />}
      {activeTab === 'simulation' && <SimulationTab />}
    </div>
  );
}

const DEFAULT_SIMULATION_CONTEXT = JSON.stringify({
  visitor: {
    ip: '203.0.113.10',
    country: 'US',
    deviceType: 'desktop',
    os: 'Windows',
    browser: 'Chrome',
    userAgent: 'QA Agent',
  },
  visit: {
    clickId: 'clk-simulation',
    timestamp: 1791374400000,
    hourOfDay: 12,
    dayOfWeek: 3,
    visitsCount: 1,
    firstVisit: true,
    returning: false,
  },
}, null, 2);

const DEFAULT_SIMULATION_SCHEMAS = JSON.stringify([], null, 2);

function SimulationTab() {
  const [contextJson, setContextJson] = useState(DEFAULT_SIMULATION_CONTEXT);
  const [schemasJson, setSchemasJson] = useState(DEFAULT_SIMULATION_SCHEMAS);
  const [rotation, setRotation] = useState<'position' | 'weight'>('position');
  const [riskScore, setRiskScore] = useState('');
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<FlowSimulationResult | null>(null);

  const runSimulation = async () => {
    setSimulationError(null);
    setSimulationResult(null);

    if (!contextJson.trim() || !schemasJson.trim()) {
      setSimulationError('Simulation context and schemas are required.');
      return;
    }

    try {
      const context = JSON.parse(contextJson) as Record<string, unknown>;
      const schemas = JSON.parse(schemasJson);
      if (!context || typeof context !== 'object' || Array.isArray(context)) {
        throw new Error('Context JSON must be an object.');
      }
      if (!Array.isArray(schemas)) {
        throw new Error('Schemas JSON must be an array.');
      }

      const input: FlowSimulationInput = {
        context,
        schemas,
        rotation,
        riskScore: riskScore.trim() ? Number(riskScore) : null,
      };

      if (input.riskScore !== null && !Number.isFinite(input.riskScore)) {
        throw new Error('Risk score must be a finite number.');
      }

      setSimulationLoading(true);
      setSimulationResult(await simulateFlow(input));
    } catch (err) {
      setSimulationError(err instanceof Error ? err.message : 'Failed to run simulation.');
    } finally {
      setSimulationLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-fg-default">Flow Simulation</h2>
        <p className="text-sm text-fg-muted mt-1">
          Evaluate a request without visitor binding, persistence, or tracking side effects. Unknown signals stay unknown.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-4 space-y-3">
          <label className="block text-xs font-medium text-fg-muted uppercase tracking-wider" htmlFor="simulation-context">
            Simulation Context JSON
          </label>
          <textarea
            id="simulation-context"
            value={contextJson}
            onChange={(event) => setContextJson(event.target.value)}
            rows={18}
            className="w-full min-h-[280px] px-3 py-2 bg-surface-elevated border border-border-default rounded-sm text-xs font-mono text-fg-default focus:border-primary focus:outline-none"
            spellCheck={false}
          />
        </div>

        <div className="card p-4 space-y-3">
          <label className="block text-xs font-medium text-fg-muted uppercase tracking-wider" htmlFor="simulation-schemas">
            Flow Schemas JSON
          </label>
          <textarea
            id="simulation-schemas"
            value={schemasJson}
            onChange={(event) => setSchemasJson(event.target.value)}
            rows={18}
            className="w-full min-h-[280px] px-3 py-2 bg-surface-elevated border border-border-default rounded-sm text-xs font-mono text-fg-default focus:border-primary focus:outline-none"
            spellCheck={false}
          />
        </div>
      </div>

      <div className="card p-4 flex flex-wrap items-end gap-4">
        <label className="space-y-1">
          <span className="block text-xs font-medium text-fg-muted uppercase tracking-wider">Rotation</span>
          <select
            value={rotation}
            onChange={(event) => setRotation(event.target.value as 'position' | 'weight')}
            className="px-3 py-2 bg-surface-elevated border border-border-default rounded-sm text-sm text-fg-default focus:border-primary focus:outline-none"
          >
            <option value="position">Position</option>
            <option value="weight">Weight</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-fg-muted uppercase tracking-wider">Trusted Risk Score</span>
          <input
            type="number"
            min="0"
            max="100"
            value={riskScore}
            onChange={(event) => setRiskScore(event.target.value)}
            placeholder="unknown"
            className="w-36 px-3 py-2 bg-surface-elevated border border-border-default rounded-sm text-sm text-fg-default focus:border-primary focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={runSimulation}
          disabled={simulationLoading}
          className="px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-sm disabled:opacity-50"
        >
          {simulationLoading ? 'Running...' : 'Run Simulation'}
        </button>
      </div>

      {simulationError && (
        <div className="card p-4 border border-red-500/40 text-red-300 text-sm" role="alert">
          {simulationError}
        </div>
      )}

      {simulationResult && (
        <div className="card p-4 space-y-4" data-testid="flow-simulation-result">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">Decision</span>
            <span className="px-2 py-1 rounded-sm bg-primary/10 text-primary font-mono text-sm">{simulationResult.decision}</span>
            <span className="text-sm text-fg-muted">Flow: {simulationResult.flowId || 'none'}</span>
            <span className="text-sm text-fg-muted">Reason: {simulationResult.reason}</span>
            <span className="text-sm text-fg-muted">Risk: {simulationResult.riskScore ?? 'unknown'}</span>
            <span className="text-sm text-fg-muted">Latency: {simulationResult.latencyMs}ms</span>
          </div>
          <div>
            <h3 className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-2">Trace</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default text-left">
                    <th className="px-3 py-2 text-xs text-fg-muted">Flow</th>
                    <th className="px-3 py-2 text-xs text-fg-muted">Type</th>
                    <th className="px-3 py-2 text-xs text-fg-muted">Matched</th>
                    <th className="px-3 py-2 text-xs text-fg-muted">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {simulationResult.trace.map((item) => (
                    <tr key={`${item.flowId}-${item.flowType}`} className="border-b border-border-default/50">
                      <td className="px-3 py-2 font-mono text-primary">{item.flowId}</td>
                      <td className="px-3 py-2 text-fg-muted">{item.flowType}</td>
                      <td className="px-3 py-2 text-fg-muted">{item.matched ? 'yes' : 'no'}</td>
                      <td className="px-3 py-2 text-fg-muted">{item.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <details>
            <summary className="cursor-pointer text-xs font-medium text-fg-muted uppercase tracking-wider">Raw result</summary>
            <pre className="mt-2 overflow-x-auto rounded-sm bg-surface-elevated p-3 text-xs text-fg-default">{JSON.stringify(simulationResult, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

function ASNTab() {
  const [data, setData] = useState<ASNEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<'blacklist' | 'greylist' | 'whitelist'>('blacklist');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<Partial<ASNEntry>>({
    asn: undefined,
    asName: '',
    category: 'blacklist',
    type: 'datacenter',
    riskScore: 80,
    reason: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await handleResponse(await authFetch(`/api/traffic-filter/asn?category=${category}`));
      setData(Array.isArray(result) ? result : result.list || []);
    } catch (err: any) {
      console.error('Failed to fetch ASN list:', err);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!form.asn) return;
    try {
      setSaving(true);
      await handleResponse(await authFetch('/api/traffic-filter/asn', {
        method: 'POST',
        body: JSON.stringify(form),
      }));
      setShowModal(false);
      setForm({ asn: undefined, asName: '', category: 'blacklist', type: 'datacenter', riskScore: 80, reason: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (asn: number) => {
    if (!confirm(`Delete AS${asn}?`)) return;
    try {
      await handleResponse(await authFetch(`/api/traffic-filter/asn/${asn}`, { method: 'DELETE' }));
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggle = async (entry: ASNEntry) => {
    try {
      await handleResponse(await authFetch(`/api/traffic-filter/asn/${entry.asn}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !entry.enabled }),
      }));
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const catClass = (c: string) => ({
    blacklist: 'text-red-400 bg-red-400/10',
    greylist: 'text-amber-400 bg-amber-400/10',
    whitelist: 'text-green-400 bg-green-400/10',
  }[c] || 'text-fg-muted bg-surface-elevated');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['blacklist', 'greylist', 'whitelist'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm uppercase tracking-wider transition-colors ${
                category === c ? 'bg-primary text-on-primary' : 'bg-surface-elevated text-fg-muted hover:text-fg-default'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)} className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-sm">
          + Add ASN
        </button>
      </div>

      {loading ? <Spinner /> : data.length === 0 ? <EmptyState message="No ASN rules configured" /> : (
        <div className="card overflow-hidden" style={{ contain: 'layout style paint' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-left">
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">ASN</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Name</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Category</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Type</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Risk</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Reason</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Status</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry, i) => (
                  <tr key={i} className="border-b border-border-default/50 hover:bg-surface-elevated/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-primary">AS{entry.asn}</td>
                    <td className="px-4 py-2.5 text-fg-default">{entry.asName || '-'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${catClass(entry.category)}`}>
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-fg-muted uppercase text-xs">{entry.type}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (entry.riskScore || 0) >= 80 ? 'bg-red-500' : (entry.riskScore || 0) >= 50 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${entry.riskScore || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-fg-muted">{entry.riskScore || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-fg-muted text-xs max-w-[200px] truncate">{entry.reason || '-'}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => handleToggle(entry)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          entry.enabled ? 'text-green-400 bg-green-400/10' : 'text-fg-muted bg-surface-elevated'
                        }`}
                      >
                        {entry.enabled ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleDelete(entry.asn)} className="text-red-400 hover:text-red-300 text-xs font-medium">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Add ASN Rule</h3>
              <button onClick={() => setShowModal(false)} className="text-fg-muted hover:text-fg-default">&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">ASN Number *</label>
                <input type="number" value={form.asn || ''} onChange={(e) => setForm({ ...form, asn: parseInt(e.target.value) || undefined })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border-default rounded-sm text-sm text-fg-default focus:border-primary focus:outline-none" placeholder="e.g. 4134" />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">Organization Name</label>
                <input type="text" value={form.asName || ''} onChange={(e) => setForm({ ...form, asName: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border-default rounded-sm text-sm text-fg-default focus:border-primary focus:outline-none" placeholder="e.g. China Telecom" />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ASNEntry['category'] })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border-default rounded-sm text-sm text-fg-default focus:border-primary focus:outline-none">
                  <option value="blacklist">Blacklist</option>
                  <option value="greylist">Greylist</option>
                  <option value="whitelist">Whitelist</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border-default rounded-sm text-sm text-fg-default focus:border-primary focus:outline-none">
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">Risk Score ({form.riskScore || 0})</label>
                <input type="range" min="0" max="100" value={form.riskScore || 0} onChange={(e) => setForm({ ...form, riskScore: parseInt(e.target.value) })}
                  className="w-full accent-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">Reason</label>
                <input type="text" value={form.reason || ''} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border-default rounded-sm text-sm text-fg-default focus:border-primary focus:outline-none" placeholder="Why this ASN is listed" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-medium text-fg-muted hover:text-fg-default">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !form.asn} className="px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-sm disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ISPTab() {
  const [data, setData] = useState<ISPEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<ISPEntry>>({
    namePattern: '',
    type: 'isp',
    country: '',
    priority: 50,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await handleResponse(await authFetch('/api/traffic-filter/isp'));
      setData(Array.isArray(result) ? result : result.list || []);
    } catch (err: any) {
      console.error('Failed to fetch ISP list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!form.namePattern) return;
    try {
      setSaving(true);
      await handleResponse(await authFetch('/api/traffic-filter/isp', {
        method: 'POST',
        body: JSON.stringify(form),
      }));
      setShowModal(false);
      setForm({ namePattern: '', type: 'isp', country: '', priority: 50 });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this ISP rule?')) return;
    try {
      await handleResponse(await authFetch(`/api/traffic-filter/isp/${id}`, { method: 'DELETE' }));
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggle = async (entry: ISPEntry) => {
    try {
      await handleResponse(await authFetch(`/api/traffic-filter/isp/${entry.id}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !entry.enabled }),
      }));
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-sm">
          + Add ISP
        </button>
      </div>

      {loading ? <Spinner /> : data.length === 0 ? <EmptyState message="No ISP whitelist rules configured" /> : (
        <div className="card overflow-hidden" style={{ contain: 'layout style paint' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-left">
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Pattern</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Type</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Country</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Priority</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Status</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry, i) => (
                  <tr key={i} className="border-b border-border-default/50 hover:bg-surface-elevated/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-fg-default">{entry.namePattern}</td>
                    <td className="px-4 py-2.5 text-fg-muted uppercase text-xs">{entry.type}</td>
                    <td className="px-4 py-2.5 text-fg-muted">{entry.country || 'Any'}</td>
                    <td className="px-4 py-2.5 text-fg-muted">{entry.priority || 50}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => handleToggle(entry)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          entry.enabled ? 'text-green-400 bg-green-400/10' : 'text-fg-muted bg-surface-elevated'
                        }`}
                      >
                        {entry.enabled ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleDelete(entry.id!)} className="text-red-400 hover:text-red-300 text-xs font-medium">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Add ISP Whitelist</h3>
              <button onClick={() => setShowModal(false)} className="text-fg-muted hover:text-fg-default">&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">Name Pattern *</label>
                <input type="text" value={form.namePattern || ''} onChange={(e) => setForm({ ...form, namePattern: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border-default rounded-sm text-sm text-fg-default focus:border-primary focus:outline-none" placeholder="e.g. China Telecom" />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border-default rounded-sm text-sm text-fg-default focus:border-primary focus:outline-none">
                  {ISP_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">Country (2-letter code)</label>
                <input type="text" value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase().slice(0, 2) })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border-default rounded-sm text-sm text-fg-default focus:border-primary focus:outline-none" placeholder="e.g. US, CN" />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">Priority ({form.priority || 0})</label>
                <input type="range" min="0" max="100" value={form.priority || 0} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                  className="w-full accent-primary" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-medium text-fg-muted hover:text-fg-default">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !form.namePattern} className="px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-sm disabled:opacity-50">
                {saving ? 'Saving...' : 'Add ISP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CountryTab() {
  const [data, setData] = useState<CountryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Partial<CountryEntry>>({
    countryCode: '',
    action: 'block',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await handleResponse(await authFetch('/api/traffic-filter/country'));
      setData(Array.isArray(result) ? result : result.list || []);
    } catch (err: any) {
      console.error('Failed to fetch country filter list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!form.countryCode || form.countryCode.length !== 2) return;
    try {
      setSaving(true);
      await handleResponse(await authFetch('/api/traffic-filter/country', {
        method: 'POST',
        body: JSON.stringify(form),
      }));
      setShowModal(false);
      setForm({ countryCode: '', action: 'block' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete filter for ${code}?`)) return;
    try {
      await handleResponse(await authFetch(`/api/traffic-filter/country/${code}`, { method: 'DELETE' }));
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggle = async (entry: CountryEntry) => {
    try {
      await handleResponse(await authFetch(`/api/traffic-filter/country/${entry.countryCode}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: !entry.enabled }),
      }));
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const actionClass = (a: string) => ({
    allow: 'text-green-400 bg-green-400/10',
    block: 'text-red-400 bg-red-400/10',
    challenge: 'text-amber-400 bg-amber-400/10',
  }[a] || 'text-fg-muted bg-surface-elevated');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-sm">
          + Add Country
        </button>
      </div>

      {loading ? <Spinner /> : data.length === 0 ? <EmptyState message="No country filter rules configured" /> : (
        <div className="card overflow-hidden" style={{ contain: 'layout style paint' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default text-left">
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Country</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Code</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Action</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs">Status</th>
                  <th className="px-4 py-3 font-medium text-fg-muted uppercase tracking-wider text-xs w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry, i) => (
                  <tr key={i} className="border-b border-border-default/50 hover:bg-surface-elevated/50 transition-colors">
                    <td className="px-4 py-2.5 text-fg-default">{entry.countryName || entry.countryCode}</td>
                    <td className="px-4 py-2.5 font-mono text-fg-muted">{entry.countryCode}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${actionClass(entry.action)}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => handleToggle(entry)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          entry.enabled ? 'text-green-400 bg-green-400/10' : 'text-fg-muted bg-surface-elevated'
                        }`}
                      >
                        {entry.enabled ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleDelete(entry.countryCode)} className="text-red-400 hover:text-red-300 text-xs font-medium">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Add Country Filter</h3>
              <button onClick={() => setShowModal(false)} className="text-fg-muted hover:text-fg-default">&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">Country Code * (ISO 2-letter)</label>
                <input type="text" value={form.countryCode || ''} onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase().slice(0, 2) })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border-default rounded-sm text-sm text-fg-default focus:border-primary focus:outline-none" placeholder="e.g. CN, US, RU" maxLength={2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">Action</label>
                <div className="flex gap-2">
                  {COUNTRY_ACTIONS.map((a) => (
                    <button key={a.value} onClick={() => setForm({ ...form, action: a.value as CountryEntry['action'] })}
                      className={`px-4 py-2 rounded-sm text-xs font-medium uppercase transition-colors ${
                        form.action === a.value ? 'text-white' : 'text-fg-muted bg-surface-elevated hover:text-fg-default'
                      }`}
                      style={form.action === a.value ? { backgroundColor: a.color } : undefined}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-medium text-fg-muted hover:text-fg-default">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !form.countryCode || form.countryCode.length !== 2} className="px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-sm disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Filter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const result = await handleResponse(await authFetch('/api/traffic-filter/stats'));
      setStats(result);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) return <Spinner />;

  const cards = [
    { label: 'ASN Rules', value: stats?.totalAsnRules ?? '-', color: 'primary', icon: '📋' },
    { label: 'ISP Whitelist', value: stats?.totalIspRules ?? '-', color: 'green', icon: '✅' },
    { label: 'Country Filters', value: stats?.totalCountryRules ?? '-', color: 'amber', icon: '🌍' },
    { label: 'Blocked Today', value: stats?.blockedToday ?? stats?.blockedCount ?? '-', color: 'red', icon: '🚫' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">{card.label}</span>
              <span className="text-lg">{card.icon}</span>
            </div>
            <div className="text-3xl font-display font-bold text-fg-default">{card.value}</div>
          </div>
        ))}
      </div>

      {stats && Object.keys(stats).length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-4">All Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(stats).filter(([_, v]) => v !== undefined && v !== null && typeof v !== 'object').map(([key, value]) => (
              <div key={key} className="space-y-1">
                <span className="text-xs text-fg-muted block">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                <span className="text-sm font-mono text-fg-default">
                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-3">Filtering Architecture</h3>
        <div className="space-y-2 text-sm text-fg-muted">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>Layer 1: ISP Keyword Blacklist (70+ keywords, highest priority - immediate block)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span>Layer 2: ISP Name Whitelist (25+ global carriers - immediate allow)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Layer 3: ASN Black/Grey/White List (17+ built-in rules)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Layer 4: 3rd Party IP Detection APIs (ip-api.com, proxycheck.io, IPHub.info)</span>
          </div>
        </div>
      </div>
    </div>
  );
}