import React, { useMemo, useState } from 'react';
import { Shield, Radar, Bot, Globe2, Upload, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  fetchAntiFraudBotList,
  fetchAntiFraudGeoProfile,
  importAntiFraudArchive,
  simulateAntiFraudDetection,
  type AntiFraudArchiveImportResult,
  type AntiFraudBotListResult,
  type AntiFraudDetectionResult,
  type AntiFraudGeoProfileResult,
} from '../services/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const simulateTemplate = JSON.stringify(
  {
    campaignId: 'cmp_demo_001',
    eventType: 'click',
    ip: '203.0.113.10',
    country: 'US',
    city: 'Los Angeles',
    url: 'https://example.com/track',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    referrer: 'https://traffic-source.example',
  },
  null,
  2
);

const archiveTemplate = JSON.stringify(
  [
    {
      ip: '198.51.100.18',
      reason: 'manual',
      severity: 'high',
      notes: 'Imported from historical anti-fraud sheet',
    },
  ],
  null,
  2
);

export function AntiFraudWorkbench() {
  const [simulateInput, setSimulateInput] = useState(simulateTemplate);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulateError, setSimulateError] = useState<string | null>(null);
  const [simulateResult, setSimulateResult] = useState<AntiFraudDetectionResult | null>(null);

  const [botLoading, setBotLoading] = useState(false);
  const [botLimit, setBotLimit] = useState(50);
  const [botResult, setBotResult] = useState<AntiFraudBotListResult | null>(null);
  const [botError, setBotError] = useState<string | null>(null);

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoTop, setGeoTop] = useState(20);
  const [geoMinEvents, setGeoMinEvents] = useState(5);
  const [geoResult, setGeoResult] = useState<AntiFraudGeoProfileResult | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [archiveType, setArchiveType] = useState<'ip-blacklist' | 'bot-rules'>('ip-blacklist');
  const [archiveFormat, setArchiveFormat] = useState<'json' | 'csv'>('json');
  const [archivePayload, setArchivePayload] = useState(archiveTemplate);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveResult, setArchiveResult] = useState<AntiFraudArchiveImportResult | null>(null);

  const simulationStatusClass = useMemo(() => {
    switch (simulateResult?.status) {
      case 'blocked':
        return 'bg-red-500/15 text-red-600 dark:text-red-300';
      case 'fraudulent':
        return 'bg-orange-500/15 text-orange-600 dark:text-orange-300';
      case 'suspicious':
        return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300';
      case 'clean':
        return 'bg-green-500/15 text-green-700 dark:text-green-300';
      default:
        return 'bg-surface-container text-fg-muted';
    }
  }, [simulateResult?.status]);

  const handleSimulate = async () => {
    setSimulateLoading(true);
    setSimulateError(null);
    try {
      const payload = JSON.parse(simulateInput) as Record<string, unknown>;
      if (!payload.campaignId || typeof payload.campaignId !== 'string') {
        throw new Error('`campaignId` is required and must be a string.');
      }

      const result = await simulateAntiFraudDetection(payload);
      setSimulateResult(result);
    } catch (err) {
      setSimulateError(err instanceof Error ? err.message : 'Failed to simulate anti-fraud event.');
    } finally {
      setSimulateLoading(false);
    }
  };

  const handleLoadBotList = async () => {
    setBotLoading(true);
    setBotError(null);
    try {
      setBotResult(await fetchAntiFraudBotList({ limit: botLimit }));
    } catch (err) {
      setBotError(err instanceof Error ? err.message : 'Failed to load bot list.');
    } finally {
      setBotLoading(false);
    }
  };

  const handleLoadGeoProfile = async () => {
    setGeoLoading(true);
    setGeoError(null);
    try {
      setGeoResult(
        await fetchAntiFraudGeoProfile({
          top: geoTop,
          minEvents: geoMinEvents,
        })
      );
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : 'Failed to load geo profile.');
    } finally {
      setGeoLoading(false);
    }
  };

  const handleImportArchive = async () => {
    setArchiveLoading(true);
    setArchiveError(null);
    try {
      const result = await importAntiFraudArchive({
        type: archiveType,
        format: archiveFormat,
        payload: archivePayload,
        createdBy: 'anti-fraud-workbench',
      });
      setArchiveResult(result);
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Failed to import archive payload.');
    } finally {
      setArchiveLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl bg-surface p-6 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-muted">
            <Shield size={18} className="text-accent-fg" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-fg-default">Anti Fraud Workbench</h1>
            <p className="text-sm text-fg-muted">
              D1 反作弊增强入口：模拟检测、Bot 清单、Geo 风险画像、归档导入。
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl bg-surface p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex items-center gap-2">
          <Radar size={18} className="text-fg-muted" />
          <h2 className="text-lg font-semibold text-fg-default">Simulate Fraud Detection</h2>
        </div>
        <textarea
          value={simulateInput}
          onChange={(event) => setSimulateInput(event.target.value)}
          className="h-52 w-full rounded-xl border border-border bg-surface-container p-3 font-mono text-xs text-fg-default outline-none focus:ring-2 focus:ring-accent-fg/30"
        />
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSimulate}
            disabled={simulateLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-fg px-4 py-2 text-sm font-medium text-on-primary transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {simulateLoading && <Loader2 size={16} className="animate-spin" />}
            Run Simulation
          </button>
          {simulateError && <span className="text-sm text-red-600 dark:text-red-300">{simulateError}</span>}
        </div>
        {simulateResult && (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-surface-container p-3">
              <div className="text-xs text-fg-muted">Score</div>
              <div className="mt-1 text-lg font-semibold text-fg-default">{simulateResult.score}</div>
            </div>
            <div className="rounded-lg bg-surface-container p-3">
              <div className="text-xs text-fg-muted">Status</div>
              <div className={cn('mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold', simulationStatusClass)}>
                {simulateResult.status}
              </div>
            </div>
            <div className="rounded-lg bg-surface-container p-3">
              <div className="text-xs text-fg-muted">Action</div>
              <div className="mt-1 text-sm font-semibold text-fg-default">{simulateResult.action}</div>
            </div>
            <div className="rounded-lg bg-surface-container p-3">
              <div className="text-xs text-fg-muted">Challenge</div>
              <div className="mt-1 text-sm font-semibold text-fg-default">
                {simulateResult.challengeRequired ? 'Required' : 'No'}
              </div>
            </div>
            <div className="rounded-lg bg-surface-container p-3 md:col-span-4">
              <div className="text-xs text-fg-muted">Reasons</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {simulateResult.reasons.length === 0 && (
                  <span className="text-sm text-fg-muted">No risk reasons.</span>
                )}
                {simulateResult.reasons.map((reason) => (
                  <span key={reason} className="rounded-md bg-surface-container-high px-2 py-0.5 text-xs text-fg-default">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl bg-surface p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-fg-muted" />
              <h2 className="text-lg font-semibold text-fg-default">Bot List</h2>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={500}
                value={botLimit}
                onChange={(event) => setBotLimit(Math.max(1, Math.min(500, Number(event.target.value || 1))))}
                className="w-20 rounded-md border border-border bg-surface-container px-2 py-1 text-sm text-fg-default outline-none"
              />
              <button
                type="button"
                onClick={handleLoadBotList}
                disabled={botLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-fg px-3 py-2 text-sm font-medium text-on-primary transition hover:opacity-90 disabled:opacity-60"
              >
                {botLoading && <Loader2 size={14} className="animate-spin" />}
                Load
              </button>
            </div>
          </div>
          {botError && <div className="mb-3 text-sm text-red-600 dark:text-red-300">{botError}</div>}
          {botResult && (
            <>
              <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-surface-container p-2 text-fg-default">
                  Total Hits: <strong>{botResult.summary.totalHits}</strong>
                </div>
                <div className="rounded-lg bg-surface-container p-2 text-fg-default">
                  Blocked: <strong>{botResult.summary.blockedHits}</strong>
                </div>
              </div>
              <div className="max-h-72 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface-container-low">
                    <tr>
                      <th className="px-2 py-2">IP</th>
                      <th className="px-2 py-2">Category</th>
                      <th className="px-2 py-2">Hits</th>
                      <th className="px-2 py-2">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {botResult.list.map((item) => (
                      <tr key={`${item.ip}-${item.userAgent}`} className="border-t border-border">
                        <td className="px-2 py-2 text-fg-default">{item.ip}</td>
                        <td className="px-2 py-2 text-fg-muted">{item.category}</td>
                        <td className="px-2 py-2 text-fg-muted">{item.hits}</td>
                        <td className="px-2 py-2 text-fg-muted">{item.averageScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl bg-surface p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe2 size={18} className="text-fg-muted" />
              <h2 className="text-lg font-semibold text-fg-default">Geo Profile</h2>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={200}
                value={geoTop}
                onChange={(event) => setGeoTop(Math.max(1, Math.min(200, Number(event.target.value || 1))))}
                className="w-16 rounded-md border border-border bg-surface-container px-2 py-1 text-sm text-fg-default outline-none"
                title="Top"
              />
              <input
                type="number"
                min={1}
                max={1000}
                value={geoMinEvents}
                onChange={(event) => setGeoMinEvents(Math.max(1, Number(event.target.value || 1)))}
                className="w-16 rounded-md border border-border bg-surface-container px-2 py-1 text-sm text-fg-default outline-none"
                title="Min events"
              />
              <button
                type="button"
                onClick={handleLoadGeoProfile}
                disabled={geoLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-accent-fg px-3 py-2 text-sm font-medium text-on-primary transition hover:opacity-90 disabled:opacity-60"
              >
                {geoLoading && <Loader2 size={14} className="animate-spin" />}
                Load
              </button>
            </div>
          </div>
          {geoError && <div className="mb-3 text-sm text-red-600 dark:text-red-300">{geoError}</div>}
          {geoResult && (
            <div className="max-h-72 overflow-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-container-low">
                  <tr>
                    <th className="px-2 py-2">Country</th>
                    <th className="px-2 py-2">Risk Rate</th>
                    <th className="px-2 py-2">Avg Score</th>
                    <th className="px-2 py-2">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {geoResult.list.map((item) => (
                    <tr key={item.country} className="border-t border-border">
                      <td className="px-2 py-2 text-fg-default">{item.country}</td>
                      <td className="px-2 py-2 text-fg-muted">{(item.riskRate * 100).toFixed(1)}%</td>
                      <td className="px-2 py-2 text-fg-muted">{item.avgScore}</td>
                      <td className="px-2 py-2 text-fg-muted">{item.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl bg-surface p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
        <div className="mb-4 flex items-center gap-2">
          <Upload size={18} className="text-fg-muted" />
          <h2 className="text-lg font-semibold text-fg-default">Archive Import</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={archiveType}
            onChange={(event) => setArchiveType(event.target.value as 'ip-blacklist' | 'bot-rules')}
            className="rounded-lg border border-border bg-surface-container px-3 py-2 text-sm text-fg-default outline-none"
          >
            <option value="ip-blacklist">ip-blacklist</option>
            <option value="bot-rules">bot-rules</option>
          </select>
          <select
            value={archiveFormat}
            onChange={(event) => setArchiveFormat(event.target.value as 'json' | 'csv')}
            className="rounded-lg border border-border bg-surface-container px-3 py-2 text-sm text-fg-default outline-none"
          >
            <option value="json">json</option>
            <option value="csv">csv</option>
          </select>
          <button
            type="button"
            onClick={handleImportArchive}
            disabled={archiveLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-fg px-4 py-2 text-sm font-medium text-on-primary transition hover:opacity-90 disabled:opacity-60"
          >
            {archiveLoading && <Loader2 size={14} className="animate-spin" />}
            Import
          </button>
        </div>
        <textarea
          value={archivePayload}
          onChange={(event) => setArchivePayload(event.target.value)}
          className="mt-3 h-40 w-full rounded-xl border border-border bg-surface-container p-3 font-mono text-xs text-fg-default outline-none focus:ring-2 focus:ring-accent-fg/30"
        />
        {archiveError && <div className="mt-3 text-sm text-red-600 dark:text-red-300">{archiveError}</div>}
        {archiveResult && (
          <div className="mt-3 rounded-lg bg-surface-container p-3 text-sm text-fg-default">
            <div>
              Total: <strong>{archiveResult.total}</strong> | Imported: <strong>{archiveResult.imported}</strong> |
              Skipped: <strong>{archiveResult.skipped}</strong> | Failed: <strong>{archiveResult.failed}</strong>
            </div>
            {archiveResult.errors.length > 0 && (
              <div className="mt-2 text-xs text-fg-muted">
                First error: row {archiveResult.errors[0]?.row} - {archiveResult.errors[0]?.reason}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default AntiFraudWorkbench;
