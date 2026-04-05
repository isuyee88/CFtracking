import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  GitBranch,
  Globe,
  KeyRound,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Save,
  Settings2,
  Shield,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DateRangePickerComponent, getDateRange, type DateRangeValue } from '@/components/DateRangePicker';
import {
  addLandingPageToFlow,
  addOfferToFlow,
  createFlow,
  deleteFlow,
  fetchCampaign,
  fetchCampaignStats,
  fetchConversions,
  fetchFlows,
  fetchLandings,
  fetchOffers,
  fetchTrackingScript,
  fetchTrafficSources,
  fetchTrendsReport,
  regenerateCampaignToken,
  updateCampaign,
  updateFlow,
} from '../services/api';
import { useToast } from '../components/Toast';
import { FlowDesigner, type FlowConnection, type FlowNode } from '../components/FlowDesigner';
import CampaignRoutingWorkbench from '../components/CampaignRoutingWorkbench';
import {
  ChartWrapper,
  LazyArea,
  LazyAreaChart,
  LazyCartesianGrid,
  LazyLegend,
  LazyResponsiveContainer,
  LazyTooltip,
  LazyXAxis,
  LazyYAxis,
} from '../components/ChartWrapper';
import type { ParameterTemplate, TrafficSource } from '../types/trafficSource';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type CampaignTab = 'general' | 'routing' | 'tracking' | 'parameters' | 'postback' | 'notes';
type CampaignStatusApi = 'active' | 'paused' | 'deleted';
type FlowTypeApi = 'regular' | 'forced' | 'default';
type FlowStatusApi = 'active' | 'paused' | 'deleted';
type FlowNodeKind = 'landing' | 'offer';

interface BackendCampaign {
  id: string;
  displayId?: string;
  name: string;
  alias: string;
  domain: string;
  group: string | null;
  trafficSource: string | null;
  flowRotation: string;
  costModel: string;
  costValue?: number;
  currency?: string;
  trafficLoss: number;
  uniquenessMethod?: string;
  uniquenessParameter?: string | null;
  uniquenessTTL: number;
  visitorBinding: string;
  apiToken?: string | null;
  status: CampaignStatusApi;
  createdAt: string;
  updatedAt: string;
  parameters?: Record<string, unknown>;
}

interface BackendFlow {
  id: string;
  name: string;
  type?: FlowTypeApi;
  status?: FlowStatusApi;
  weight?: number;
  actionType?: string;
  actionConfig?: {
    landingPageId?: string;
    offerId?: string;
    redirectUrl?: string;
  };
  filters?: unknown[];
}

interface CampaignStats {
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  profit: number;
  roi: number;
  epc?: number;
  cpa?: number;
  cr: number;
}

interface DestinationItem {
  id: string;
  name: string;
  url?: string;
  group?: string | null;
  payout?: number;
  network?: string | null;
}

interface RecentConversion {
  conversionId: string;
  timestamp: string;
  offerName: string;
  status: string;
  revenue: number;
  payout: number;
}

interface Draft {
  name: string;
  alias: string;
  domain: string;
  group: string;
  status: CampaignStatusApi;
  trafficSourceId: string;
  flowRotation: string;
  trafficLoss: number;
  costModel: string;
  costValue: number;
  currency: string;
  uniquenessMethod: string;
  uniquenessParameter: string;
  uniquenessTTL: number;
  visitorBinding: string;
  postbackUrl: string;
  postbackStatuses: string;
  sendRevenue: boolean;
  sendCampaignToken: boolean;
  notes: string;
  parameterTokens: string;
}

interface ReadinessCheck {
  id: string;
  label: string;
  description: string;
  state: 'ok' | 'warning' | 'error';
}

const TABS = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'routing', label: 'Routing', icon: GitBranch },
  { id: 'tracking', label: 'Tracking', icon: Code2 },
  { id: 'parameters', label: 'Parameters', icon: Filter },
  { id: 'postback', label: 'Postback', icon: LinkIcon },
  { id: 'notes', label: 'Notes', icon: FileText },
] as const;

const FLOW_TYPE_OPTIONS: Array<{ value: FlowTypeApi; label: string }> = [
  { value: 'regular', label: 'Regular Flow' },
  { value: 'forced', label: 'Forced Flow' },
  { value: 'default', label: 'Default Flow' },
];

const FLOW_STATUS_OPTIONS: Array<{ value: FlowStatusApi; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'deleted', label: 'Deleted' },
];

function parseSourceParameters(parameters?: TrafficSource['parameters']): ParameterTemplate[] {
  if (!parameters) {
    return [];
  }

  if (Array.isArray(parameters)) {
    return parameters;
  }

  if (typeof parameters === 'string') {
    try {
      const parsed = JSON.parse(parameters);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function formatCurrency(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function formatDateLabel(value?: string) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function buildCampaignUrl(domain: string, alias: string) {
  return `${domain.startsWith('http') ? domain : `https://${domain}`}/${alias}`;
}

function toDraft(campaign: BackendCampaign): Draft {
  const parameters = campaign.parameters && typeof campaign.parameters === 'object' ? campaign.parameters : {};
  const postback =
    parameters.postback && typeof parameters.postback === 'object'
      ? (parameters.postback as Record<string, unknown>)
      : {};

  return {
    name: campaign.name,
    alias: campaign.alias,
    domain: campaign.domain,
    group: campaign.group || 'Default',
    status: campaign.status,
    trafficSourceId: campaign.trafficSource || '',
    flowRotation: campaign.flowRotation || 'position',
    trafficLoss: Number(campaign.trafficLoss || 0),
    costModel: campaign.costModel || 'cpc',
    costValue: Number(campaign.costValue || 0),
    currency: campaign.currency || 'USD',
    uniquenessMethod: campaign.uniquenessMethod || 'none',
    uniquenessParameter: campaign.uniquenessParameter || '',
    uniquenessTTL: Number(campaign.uniquenessTTL || 86400),
    visitorBinding: campaign.visitorBinding || 'none',
    postbackUrl: typeof postback.url === 'string' ? postback.url : '',
    postbackStatuses: Array.isArray(postback.statuses)
      ? postback.statuses.map(String).join(', ')
      : 'sale',
    sendRevenue: postback.sendRevenue !== false,
    sendCampaignToken: Boolean(postback.sendCampaignToken),
    notes: typeof parameters.notes === 'string' ? parameters.notes : '',
    parameterTokens: Array.isArray(parameters.parameterTokens)
      ? JSON.stringify(parameters.parameterTokens, null, 2)
      : '[]',
  };
}

function toFlowNode(flow: BackendFlow): FlowNode {
  const nodeType: FlowNodeKind = flow.actionType === 'show_landing' ? 'landing' : 'offer';
  const itemId = nodeType === 'landing' ? flow.actionConfig?.landingPageId : flow.actionConfig?.offerId;

  return {
    id: String(flow.id),
    type: nodeType,
    name: String(flow.name || 'Unnamed flow'),
    weight: Number(flow.weight || 0),
    config: {
      itemId: itemId || '',
      flowType: flow.type || 'regular',
      flowStatus: flow.status || 'active',
      filtersCount: Array.isArray(flow.filters) ? flow.filters.length : 0,
      redirectUrl: flow.actionConfig?.redirectUrl || '',
    },
  };
}

function buildFallbackTrackingScript(id: string, alias: string, domain: string) {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;

  return `<script>
window.KTracking = {
  reportConversion: (payout, status) =>
    fetch('${baseUrl}/api/tracking/script/conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: '${id}',
        clickId: new URLSearchParams(location.search).get('clickid'),
        payout: payout || 0,
        status: status || 'sale'
      })
    })
};
</script>
<!-- Campaign alias: ${alias} -->`;
}

function buildFallbackKClientSnippet(id: string, domain: string) {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;

  return `<script>
fetch('${baseUrl}/api/tracking/kclient/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    campaignId: '${id}',
    url: location.href,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    visitorId: localStorage.getItem('visitor_id') || '',
    timestamp: new Date().toISOString()
  })
}).then((response) => response.json()).then((result) => {
  if (result?.action === 'redirect' && result?.url) {
    location.href = result.url;
  }
});
</script>`;
}

function isFlowType(value: unknown): value is FlowTypeApi {
  return value === 'regular' || value === 'forced' || value === 'default';
}

function isFlowStatus(value: unknown): value is FlowStatusApi {
  return value === 'active' || value === 'paused' || value === 'deleted';
}

function parseParameterTokens(input: string) {
  const parsed = JSON.parse(input || '[]');
  if (!Array.isArray(parsed)) {
    throw new Error('Parameter tokens must be a JSON array.');
  }

  return parsed;
}

function buildReadinessChecks(draft: Draft, flows: FlowNode[], hasApiToken: boolean): ReadinessCheck[] {
  const regularFlows = flows.filter((flow) => flow.config?.flowType === 'regular');
  const defaultFlows = flows.filter((flow) => flow.config?.flowType === 'default');
  const forcedFlows = flows.filter((flow) => flow.config?.flowType === 'forced');
  const regularWeight = regularFlows.reduce((sum, flow) => sum + Number(flow.weight || 0), 0);

  return [
    {
      id: 'general',
      label: 'General settings',
      description: draft.name && draft.alias && draft.domain ? 'Campaign identity is complete.' : 'Name, alias, and domain are required.',
      state: draft.name && draft.alias && draft.domain ? 'ok' : 'error',
    },
    {
      id: 'traffic-source',
      label: 'Traffic source binding',
      description: draft.trafficSourceId ? 'Traffic source is connected.' : 'Traffic source is not assigned yet.',
      state: draft.trafficSourceId ? 'ok' : 'warning',
    },
    {
      id: 'regular-flows',
      label: 'Regular routing',
      description:
        regularFlows.length > 0
          ? `Regular flows total ${regularWeight}% weight.`
          : 'At least one regular flow should be present.',
      state: regularFlows.length > 0 ? (regularWeight === 100 ? 'ok' : 'warning') : 'error',
    },
    {
      id: 'default-flow',
      label: 'Default fallback',
      description:
        defaultFlows.length === 1
          ? 'Fallback flow is defined.'
          : defaultFlows.length === 0
            ? 'No default flow configured.'
            : 'Only one default flow should exist.',
      state: defaultFlows.length === 1 ? 'ok' : defaultFlows.length === 0 ? 'warning' : 'error',
    },
    {
      id: 'forced-flow',
      label: 'Forced routing',
      description:
        forcedFlows.length > 0
          ? `${forcedFlows.length} forced flow(s) configured.`
          : 'No forced flow configured. Add one only when you need hard overrides.',
      state: forcedFlows.length > 0 ? 'ok' : 'warning',
    },
    {
      id: 'uniqueness',
      label: 'Uniqueness strategy',
      description:
        draft.uniquenessMethod !== 'parameter' || draft.uniquenessParameter
          ? `${draft.uniquenessMethod} / TTL ${draft.uniquenessTTL}s`
          : 'Parameter-based uniqueness needs a parameter key.',
      state: draft.uniquenessMethod !== 'parameter' || draft.uniquenessParameter ? 'ok' : 'error',
    },
    {
      id: 'token',
      label: 'API token',
      description: hasApiToken ? 'Token is available for integrations.' : 'Rotate token before connecting external systems.',
      state: hasApiToken ? 'ok' : 'warning',
    },
  ];
}

function getCheckClasses(state: ReadinessCheck['state']) {
  if (state === 'ok') {
    return 'border-secondary/20 bg-secondary-container/20 text-secondary';
  }

  if (state === 'error') {
    return 'border-error/20 bg-error/10 text-error';
  }

  return 'border-warning/20 bg-warning/10 text-warning';
}

function getDestinationName(flow: FlowNode, landings: DestinationItem[], offers: DestinationItem[]) {
  const itemId = String(flow.config?.itemId || '');
  if (!itemId) {
    return 'Unbound destination';
  }

  if (flow.type === 'landing') {
    return landings.find((item) => item.id === itemId)?.name || itemId;
  }

  return offers.find((item) => item.id === itemId)?.name || itemId;
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<CampaignTab>('general');
  const [campaign, setCampaign] = useState<BackendCampaign | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [flows, setFlows] = useState<FlowNode[]>([]);
  const [connections] = useState<FlowConnection[]>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [landings, setLandings] = useState<DestinationItem[]>([]);
  const [offers, setOffers] = useState<DestinationItem[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [chartData, setChartData] = useState<Array<Record<string, unknown>>>([]);
  const [recentConversions, setRecentConversions] = useState<RecentConversion[]>([]);
  const [trackingScript, setTrackingScript] = useState('');
  const [kclientScript, setKclientScript] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routingSaving, setRoutingSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDateRange('last7days'));

  const campaignKey = campaign?.displayId || campaign?.id || id || '';

  const setField = useCallback(<K extends keyof Draft>(field: K, value: Draft[K]) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }, []);

  const loadBaseData = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [campaignData, flowsData, sourcesData, landingsData, offersData] = await Promise.all([
        fetchCampaign(id),
        fetchFlows(id).catch(() => []),
        fetchTrafficSources(false).catch(() => []),
        fetchLandings(false).catch(() => []),
        fetchOffers(false).catch(() => []),
      ]);

      if (!campaignData?.id) {
        setError('Campaign not found');
        return;
      }

      setCampaign(campaignData as BackendCampaign);
      setDraft(toDraft(campaignData as BackendCampaign));
      setFlows(Array.isArray(flowsData) ? (flowsData as BackendFlow[]).map(toFlowNode) : []);
      setTrafficSources(Array.isArray(sourcesData) ? (sourcesData as TrafficSource[]) : []);
      setLandings(
        Array.isArray(landingsData)
          ? landingsData.map((item: any) => ({
              id: String(item.id),
              name: String(item.name || item.id),
              url: typeof item.url === 'string' ? item.url : undefined,
              group: typeof item.group === 'string' ? item.group : null,
            }))
          : []
      );
      setOffers(
        Array.isArray(offersData)
          ? offersData.map((item: any) => ({
              id: String(item.id),
              name: String(item.name || item.id),
              payout: Number(item.payout || 0),
              network: typeof item.network === 'string' ? item.network : null,
            }))
          : []
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    if (!campaignKey) {
      return;
    }

    const loadScripts = async () => {
      try {
        const [trackingResult, kclientResult] = await Promise.all([
          fetchTrackingScript(campaignKey, 'tracking').catch(() => null),
          fetchTrackingScript(campaignKey, 'kclient').catch(() => null),
        ]);

        setTrackingScript(typeof trackingResult?.code === 'string' ? trackingResult.code : '');
        setKclientScript(typeof kclientResult?.code === 'string' ? kclientResult.code : '');
      } catch {
        setTrackingScript('');
        setKclientScript('');
      }
    };

    void loadScripts();
  }, [campaignKey]);

  useEffect(() => {
    if (!campaignKey) {
      return;
    }

    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);

        const [statsData, trendsData, conversionsData] = await Promise.all([
          fetchCampaignStats(campaignKey, {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          }).catch(() => null),
          fetchTrendsReport({
            campaignId: campaignKey,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            interval: 'day',
          }).catch(() => null),
          fetchConversions({
            campaignId: campaignKey,
            pageSize: 6,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          }).catch(() => null),
        ]);

        setStats(statsData as CampaignStats | null);
        setChartData(
          Array.isArray(trendsData?.data)
            ? trendsData.data.map((item) => ({
                name: item.date,
                clicks: item.clicks,
                conversions: item.conversions,
                revenue: item.revenue,
                cost: item.cost,
                profit: item.profit,
              }))
            : []
        );
        setRecentConversions(Array.isArray(conversionsData?.list) ? (conversionsData.list as RecentConversion[]) : []);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    void loadAnalytics();
  }, [campaignKey, dateRange.endDate, dateRange.startDate]);

  const selectedSource = useMemo(
    () => trafficSources.find((source) => source.id === draft?.trafficSourceId),
    [draft?.trafficSourceId, trafficSources]
  );

  const macros = useMemo(
    () => parseSourceParameters(selectedSource?.parameters),
    [selectedSource?.parameters]
  );

  const campaignUrl = useMemo(
    () => (draft ? buildCampaignUrl(draft.domain, draft.alias) : ''),
    [draft]
  );

  const readinessChecks = useMemo(
    () => (draft ? buildReadinessChecks(draft, flows, Boolean(campaign?.apiToken)) : []),
    [campaign?.apiToken, draft, flows]
  );

  const readinessSummary = useMemo(() => {
    const ok = readinessChecks.filter((item) => item.state === 'ok').length;
    return `${ok}/${readinessChecks.length}`;
  }, [readinessChecks]);

  const performanceCards = useMemo(
    () => [
      { label: 'Clicks', value: Number(stats?.clicks || 0).toLocaleString() },
      { label: 'Unique', value: Number(stats?.uniqueClicks || 0).toLocaleString() },
      { label: 'Conv.', value: Number(stats?.conversions || 0).toLocaleString() },
      { label: 'Revenue', value: formatCurrency(Number(stats?.revenue || 0), campaign?.currency || 'USD') },
      { label: 'Cost', value: formatCurrency(Number(stats?.cost || 0), campaign?.currency || 'USD') },
      { label: 'Profit', value: formatCurrency(Number(stats?.profit || 0), campaign?.currency || 'USD') },
      { label: 'ROI', value: formatPercent(Number(stats?.roi || 0)) },
      { label: 'CR', value: formatPercent(Number(stats?.cr || 0)) },
    ],
    [campaign?.currency, stats]
  );

  const flowSummary = useMemo(() => {
    const regular = flows.filter((flow) => flow.config?.flowType === 'regular');
    const forced = flows.filter((flow) => flow.config?.flowType === 'forced');
    const fallback = flows.filter((flow) => flow.config?.flowType === 'default');

    return {
      regular,
      forced,
      fallback,
      totalWeight: regular.reduce((sum, flow) => sum + Number(flow.weight || 0), 0),
    };
  }, [flows]);

  const parsedTokens = useMemo(() => {
    if (!draft) {
      return [];
    }

    try {
      return parseParameterTokens(draft.parameterTokens);
    } catch {
      return [];
    }
  }, [draft]);

  const visibleTrackingScript = useMemo(() => {
    if (!campaign || !draft) {
      return '';
    }

    return trackingScript || buildFallbackTrackingScript(campaignKey, draft.alias, draft.domain);
  }, [campaign, campaignKey, draft, trackingScript]);

  const visibleKclientScript = useMemo(() => {
    if (!campaign || !draft) {
      return '';
    }

    return kclientScript || buildFallbackKClientSnippet(campaignKey, draft.domain);
  }, [campaign, campaignKey, draft, kclientScript]);

  const copyText = useCallback(
    async (value: string, label: string) => {
      try {
        await navigator.clipboard.writeText(value);
        toast.success(`${label} copied`, value);
      } catch (err) {
        toast.error('Copy failed', err instanceof Error ? err.message : 'Clipboard access failed');
      }
    },
    [toast]
  );

  const saveDraft = useCallback(async () => {
    if (!campaign || !draft) {
      return;
    }

    if (!draft.name.trim() || !draft.alias.trim() || !draft.domain.trim()) {
      toast.error('Save failed', 'Name, alias, and domain are required.');
      return;
    }

    if (draft.uniquenessMethod === 'parameter' && !draft.uniquenessParameter.trim()) {
      toast.error('Save failed', 'Parameter-based uniqueness requires a parameter key.');
      return;
    }

    try {
      setSaving(true);

      const parameterTokens = parseParameterTokens(draft.parameterTokens);
      const updated = await updateCampaign(campaign.displayId || campaign.id, {
        name: draft.name,
        alias: draft.alias,
        domain: draft.domain,
        group: draft.group,
        trafficSource: draft.trafficSourceId || null,
        flowRotation: draft.flowRotation,
        costModel: draft.costModel,
        costValue: draft.costValue,
        currency: draft.currency,
        trafficLoss: draft.trafficLoss,
        uniquenessMethod: draft.uniquenessMethod,
        uniquenessParameter: draft.uniquenessMethod === 'parameter' ? draft.uniquenessParameter : null,
        uniquenessTTL: draft.uniquenessTTL,
        visitorBinding: draft.visitorBinding,
        status: draft.status,
        parameters: {
          ...(campaign.parameters && typeof campaign.parameters === 'object' ? campaign.parameters : {}),
          notes: draft.notes,
          postback: {
            url: draft.postbackUrl,
            statuses: draft.postbackStatuses
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
            sendRevenue: draft.sendRevenue,
            sendCampaignToken: draft.sendCampaignToken,
          },
          parameterTokens,
        },
      });

      setCampaign(updated as BackendCampaign);
      setDraft(toDraft(updated as BackendCampaign));
      toast.success('Campaign saved', 'General, parameters, and postback settings were updated.');
    } catch (err) {
      toast.error('Save failed', err instanceof Error ? err.message : 'Unable to save campaign');
    } finally {
      setSaving(false);
    }
  }, [campaign, draft, toast]);

  const rotateToken = useCallback(async () => {
    if (!campaign) {
      return;
    }

    try {
      const result = await regenerateCampaignToken(campaign.displayId || campaign.id);
      const apiToken = typeof result?.apiToken === 'string' ? result.apiToken : '';
      setCampaign((current) => (current ? { ...current, apiToken } : current));
      toast.success('Token regenerated', 'Campaign API token has been rotated.');
    } catch (err) {
      toast.error('Token rotation failed', err instanceof Error ? err.message : 'Unable to rotate token');
    }
  }, [campaign, toast]);

  const refreshRoutingFlows = useCallback(async () => {
    if (!campaignKey) {
      return;
    }

    const refreshed = (await fetchFlows(campaignKey).catch(() => [])) as BackendFlow[];
    setFlows(Array.isArray(refreshed) ? refreshed.map(toFlowNode) : []);
  }, [campaignKey]);

  const saveFlows = useCallback(
    async (nextFlows: FlowNode[]) => {
      if (!campaignKey) {
        return;
      }

      const unsupported = nextFlows.filter((flow) => flow.type !== 'landing' && flow.type !== 'offer');
      if (unsupported.length > 0) {
        toast.error('Routing save failed', 'Only landing and offer nodes are supported in campaign routing.');
        return;
      }

      try {
        setRoutingSaving(true);

        const existing = (await fetchFlows(campaignKey).catch(() => [])) as BackendFlow[];

        for (const flow of nextFlows) {
          const existingFlow = existing.find((item) => String(item.id) === flow.id || item.name === flow.name);
          const flowType = isFlowType(flow.config?.flowType) ? flow.config?.flowType : existingFlow?.type || 'regular';
          const flowStatus = isFlowStatus(flow.config?.flowStatus) ? flow.config?.flowStatus : existingFlow?.status || 'active';
          const itemId = String(flow.config?.itemId || '');
          const actionType = flow.type === 'landing' ? 'show_landing' : 'show_offer';
          const actionConfig =
            flow.type === 'landing'
              ? { type: 'show_landing', landingPageId: itemId }
              : { type: 'show_offer', offerId: itemId };

          const payload = {
            campaignId: campaignKey,
            name: flow.name,
            type: flowType,
            weight: flow.weight,
            status: flowStatus,
            actionType,
            actionConfig,
            filters: Array.isArray(existingFlow?.filters) ? existingFlow.filters : [],
          };

          let flowId = '';
          if (existingFlow) {
            await updateFlow(String(existingFlow.id), payload);
            flowId = String(existingFlow.id);
          } else {
            const created = await createFlow(payload);
            flowId = String(created.id);
          }

          if (flow.type === 'offer' && itemId) {
            await addOfferToFlow(flowId, itemId, flow.weight);
          }

          if (flow.type === 'landing' && itemId) {
            await addLandingPageToFlow(flowId, itemId, flow.weight);
          }
        }

        const nextNames = new Set(nextFlows.map((flow) => flow.name));
        for (const flow of existing.filter((item) => !nextNames.has(String(item.name)))) {
          await deleteFlow(String(flow.id));
        }

        await refreshRoutingFlows();
        toast.success('Routing saved', 'Regular, forced, and default flow policies were updated.');
      } catch (err) {
        toast.error('Routing save failed', err instanceof Error ? err.message : 'Unable to save routing');
      } finally {
        setRoutingSaving(false);
      }
    },
    [campaignKey, refreshRoutingFlows, toast]
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 size={40} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !campaign || !draft) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="text-6xl text-on-surface-variant/20">404</div>
        <h2 className="text-2xl font-display font-bold text-primary">Campaign Not Found</h2>
        <p className="text-on-surface-variant">{error || 'The campaign could not be loaded.'}</p>
        <button
          onClick={() => navigate('/campaigns')}
          className="flex items-center gap-2 rounded-sm border border-outline-variant px-6 py-3 text-xs font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={18} />
          Back to Campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <button
            onClick={() => navigate('/campaigns')}
            className="inline-flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
          >
            <ArrowLeft size={18} />
            Back to Campaigns
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-display font-bold text-primary">{draft.name}</h1>
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-sm px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
                draft.status === 'active'
                  ? 'bg-secondary-container/50 text-secondary'
                  : draft.status === 'paused'
                    ? 'bg-warning/10 text-warning'
                    : 'bg-error/10 text-error'
              )}
            >
              <Shield size={12} />
              {draft.status}
            </span>
            <span className="text-xs font-mono text-on-surface-variant">{campaign.displayId || campaign.id}</span>
          </div>
          <p className="text-sm text-on-surface-variant">
            {draft.domain} / {draft.alias} / {draft.group}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => void copyText(campaignUrl, 'Tracking URL')}
            className="flex items-center gap-2 border border-outline-variant px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-container"
          >
            <Copy size={16} />
            Copy URL
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2 border border-outline-variant px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container"
          >
            <BarChart3 size={16} />
            Reports
          </button>
          <button
            onClick={() => navigate('/trends')}
            className="flex items-center gap-2 border border-outline-variant px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container"
          >
            <Activity size={16} />
            Trends
          </button>
          <button
            onClick={() => void saveDraft()}
            disabled={saving}
            className="btn-create flex items-center gap-2 rounded-sm px-6 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Campaign
          </button>
        </div>
      </div>

      <div className="rounded-sm bg-surface-container-lowest p-4 whisper-shadow">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Tracking URL
            </div>
            <div className="mt-2 break-all font-mono text-sm text-primary">{campaignUrl}</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickStat label="Flow Rotation" value={draft.flowRotation} />
            <QuickStat label="Traffic Loss" value={`${draft.trafficLoss}%`} />
            <QuickStat label="Visitor Binding" value={draft.visitorBinding} />
            <QuickStat label="Readiness" value={readinessSummary} />
          </div>
        </div>
      </div>

      <div className="border-b border-outline-variant/20">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-5 py-4 text-[10px] font-bold uppercase tracking-widest transition-all',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-primary'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr),minmax(340px,1fr)]">
            <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary">General Configuration</h3>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Align the campaign identity, cost model, status, and publishing surface before routing traffic.
                  </p>
                </div>
                <Settings2 size={18} className="text-on-surface-variant" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Campaign Name">
                  <input value={draft.name} onChange={(event) => setField('name', event.target.value)} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
                </Field>
                <Field label="Alias">
                  <input value={draft.alias} onChange={(event) => setField('alias', event.target.value)} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
                </Field>
                <Field label="Domain">
                  <input value={draft.domain} onChange={(event) => setField('domain', event.target.value)} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
                </Field>
                <Field label="Group">
                  <input value={draft.group} onChange={(event) => setField('group', event.target.value)} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
                </Field>
                <Field label="Status">
                  <select value={draft.status} onChange={(event) => setField('status', event.target.value as CampaignStatusApi)} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary">
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="deleted">Deleted</option>
                  </select>
                </Field>
                <Field label="Traffic Source">
                  <select value={draft.trafficSourceId} onChange={(event) => setField('trafficSourceId', event.target.value)} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary">
                    <option value="">Select traffic source</option>
                    {trafficSources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Cost Model">
                  <select value={draft.costModel} onChange={(event) => setField('costModel', event.target.value)} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary">
                    <option value="cpc">CPC</option>
                    <option value="cpm">CPM</option>
                    <option value="cpa">CPA</option>
                    <option value="cps">CPS</option>
                    <option value="revshare">Revshare</option>
                  </select>
                </Field>
                <Field label="Cost Value">
                  <input type="number" min="0" step="0.01" value={draft.costValue} onChange={(event) => setField('costValue', Number(event.target.value))} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
                </Field>
                <Field label="Currency">
                  <input value={draft.currency} onChange={(event) => setField('currency', event.target.value.toUpperCase())} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
                </Field>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Launch Readiness</h3>
                  <div className="text-sm font-bold text-on-surface">{readinessSummary}</div>
                </div>
                <div className="mt-4 space-y-3">
                  {readinessChecks.map((check) => (
                    <div key={check.id} className={cn('rounded-sm border p-4', getCheckClasses(check.state))}>
                      <div className="flex items-start gap-3">
                        {check.state === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        <div>
                          <div className="text-sm font-semibold">{check.label}</div>
                          <div className="mt-1 text-xs opacity-90">{check.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-primary">Operational Snapshot</h3>
                <div className="space-y-4 text-sm">
                  <InfoRow label="Traffic Source" value={selectedSource?.name || 'Direct / not assigned'} />
                  <InfoRow label="Created" value={formatDateLabel(campaign.createdAt)} />
                  <InfoRow label="Updated" value={formatDateLabel(campaign.updatedAt)} />
                  <InfoRow label="Linked Destinations" value={`${flows.length} flows`} />
                  <InfoRow label="API Token" value={campaign.apiToken ? 'Ready' : 'Missing'} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Performance Overview</h3>
                <p className="mt-2 text-sm text-on-surface-variant">Campaign-level trend and conversion movement for the selected date range.</p>
              </div>
              <DateRangePickerComponent value={dateRange} onChange={(value) => value && setDateRange(value)} showTime={false} />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
              {performanceCards.map((card) => (
                <QuickMetricCard key={card.label} label={card.label} value={card.value} />
              ))}
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr),minmax(340px,1fr)]">
              <div className="rounded-sm bg-surface-container p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm font-semibold text-on-surface">Trend</div>
                  {analyticsLoading && <RefreshCw size={14} className="animate-spin text-on-surface-variant" />}
                </div>
                {chartData.length > 0 ? (
                  <ChartWrapper height={320}>
                    <Suspense fallback={<div className="flex h-full items-center justify-center">Loading chart...</div>}>
                      <LazyResponsiveContainer width="100%" height={300}>
                        <LazyAreaChart data={chartData}>
                          <defs>
                            <linearGradient id="campaignRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <LazyCartesianGrid strokeDasharray="3 3" stroke="hsl(var(--outline-variant))" />
                          <LazyXAxis dataKey="name" stroke="hsl(var(--on-surface-variant))" fontSize={12} />
                          <LazyYAxis stroke="hsl(var(--on-surface-variant))" fontSize={12} />
                          <LazyTooltip />
                          <LazyLegend />
                          <LazyArea type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" fillOpacity={0} strokeWidth={2} />
                          <LazyArea type="monotone" dataKey="revenue" stroke="hsl(var(--secondary))" fillOpacity={1} fill="url(#campaignRevenue)" strokeWidth={2} />
                        </LazyAreaChart>
                      </LazyResponsiveContainer>
                    </Suspense>
                  </ChartWrapper>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-sm text-on-surface-variant">
                    No trend data returned for this range.
                  </div>
                )}
              </div>
              <div className="rounded-sm bg-surface-container p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm font-semibold text-on-surface">Recent Conversions</div>
                  <button onClick={() => navigate('/conversions')} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary">
                    <ExternalLink size={12} />
                    Open Log
                  </button>
                </div>
                <div className="space-y-3">
                  {recentConversions.length === 0 ? (
                    <div className="rounded-sm border border-outline-variant/20 bg-surface px-4 py-5 text-sm text-on-surface-variant">
                      No recent conversions for this range.
                    </div>
                  ) : (
                    recentConversions.map((conversion) => (
                      <div key={conversion.conversionId} className="rounded-sm border border-outline-variant/10 bg-surface px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-on-surface">{conversion.offerName || 'Offer'}</div>
                            <div className="mt-1 text-xs text-on-surface-variant">{formatDateLabel(conversion.timestamp)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-primary">{formatCurrency(Number(conversion.revenue || 0), draft.currency)}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-widest text-on-surface-variant">{conversion.status}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'routing' && (
        <div className="space-y-6">
          <div className="rounded-sm border border-warning/30 bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 text-warning" />
              <div>
                <h3 className="mb-2 text-sm font-bold text-warning">Keitaro-style routing policy</h3>
                <p className="text-sm text-on-surface-variant">
                  Use regular flows for the main distribution, forced flows for hard overrides, and exactly one default flow for fallback behavior.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <QuickMetricCard label="Regular Flows" value={String(flowSummary.regular.length)} />
            <QuickMetricCard label="Forced Flows" value={String(flowSummary.forced.length)} />
            <QuickMetricCard label="Default Flows" value={String(flowSummary.fallback.length)} />
            <QuickMetricCard label="Regular Weight" value={`${flowSummary.totalWeight}%`} />
          </div>

          <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Routing Policies</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Assign each flow to regular, forced, or default behavior, and keep its execution status aligned with launch needs.
                </p>
              </div>
              <button onClick={() => void saveFlows(flows)} disabled={routingSaving} className="inline-flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary disabled:opacity-60">
                {routingSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Routing
              </button>
            </div>
            <div className="space-y-3">
              {flows.length === 0 ? (
                <div className="rounded-sm border border-outline-variant/20 bg-surface px-4 py-5 text-sm text-on-surface-variant">
                  No flows configured yet. Add destinations below to start orchestration.
                </div>
              ) : (
                flows.map((flow) => (
                  <div key={flow.id} className="grid gap-3 rounded-sm border border-outline-variant/10 bg-surface p-4 lg:grid-cols-[minmax(0,1.4fr)_180px_180px]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-on-surface">{flow.name}</span>
                        <span className="rounded-sm bg-surface-container px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          {flow.type}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-on-surface-variant">
                        Destination: {getDestinationName(flow, landings, offers)} · Weight {flow.weight}% · Filters {Number(flow.config?.filtersCount || 0)}
                      </div>
                    </div>
                    <select value={isFlowType(flow.config?.flowType) ? flow.config?.flowType : 'regular'} onChange={(event) => setFlows((current) => current.map((item) => item.id === flow.id ? { ...item, config: { ...item.config, flowType: event.target.value as FlowTypeApi } } : item))} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary">
                      {FLOW_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select value={isFlowStatus(flow.config?.flowStatus) ? flow.config?.flowStatus : 'active'} onChange={(event) => setFlows((current) => current.map((item) => item.id === flow.id ? { ...item, config: { ...item.config, flowStatus: event.target.value as FlowStatusApi } } : item))} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary">
                      {FLOW_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>
          </div>

          <CampaignRoutingWorkbench
            campaignId={campaignKey}
            flows={flows}
            landings={landings.map((item) => ({ id: item.id, name: item.name }))}
            offers={offers.map((item) => ({ id: item.id, name: item.name }))}
            onRefreshFlows={refreshRoutingFlows}
          />

          <FlowDesigner
            campaignId={campaignKey}
            initialFlows={flows}
            initialConnections={connections}
            onSave={(nextFlows) => {
              void saveFlows(nextFlows);
            }}
            onCancel={() => setActiveTab('general')}
          />
        </div>
      )}

      {activeTab === 'tracking' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Tracking Endpoint</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Campaign URL, API token, and raw integration snippet for partner or site deployment.
                </p>
              </div>
              <button onClick={() => void rotateToken()} className="inline-flex items-center gap-2 rounded-sm border border-outline-variant px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary hover:bg-surface">
                <KeyRound size={14} />
                Rotate
              </button>
            </div>

            <div className="space-y-4">
              <SnippetCard label="Campaign URL" value={campaignUrl} onCopy={() => void copyText(campaignUrl, 'Campaign URL')} />
              <SnippetCard label="API Token" value={campaign.apiToken || 'Not available'} onCopy={() => campaign.apiToken && void copyText(campaign.apiToken, 'API Token')} />
              <SnippetCard label="Tracking Script" value={visibleTrackingScript} multiline onCopy={() => void copyText(visibleTrackingScript, 'Tracking script')} />
            </div>
          </div>

          <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Macros & Remote Snippet</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Traffic-source macros and the KClient loader for remote pages.
                </p>
              </div>
              <Globe size={18} className="text-on-surface-variant" />
            </div>
            <div className="space-y-3">
              {macros.length === 0 ? (
                <div className="rounded-sm bg-surface-container p-4 text-sm text-on-surface-variant">
                  No traffic source parameters are configured yet.
                </div>
              ) : (
                macros.map((parameter) => (
                  <div key={`${parameter.alias}-${parameter.paramName}`} className="rounded-sm bg-surface-container p-4">
                    <div className="text-sm font-semibold text-on-surface">{parameter.alias}</div>
                    <div className="mt-1 text-xs text-on-surface-variant">
                      {parameter.paramName} → {parameter.macro}
                    </div>
                  </div>
                ))
              )}
              <SnippetCard label="KClient Snippet" value={visibleKclientScript} multiline onCopy={() => void copyText(visibleKclientScript, 'KClient snippet')} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'parameters' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Traffic & Uniqueness</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Flow Rotation">
                <select value={draft.flowRotation} onChange={(event) => setField('flowRotation', event.target.value)} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary">
                  <option value="position">Position</option>
                  <option value="weight">Weight</option>
                </select>
              </Field>
              <Field label="Traffic Loss %">
                <input type="number" min="0" max="100" value={draft.trafficLoss} onChange={(event) => setField('trafficLoss', Number(event.target.value))} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
              </Field>
              <Field label="Visitor Binding">
                <select value={draft.visitorBinding} onChange={(event) => setField('visitorBinding', event.target.value)} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary">
                  <option value="none">None</option>
                  <option value="cookie">Cookie</option>
                  <option value="ip">IP</option>
                </select>
              </Field>
              <Field label="Uniqueness Method">
                <select value={draft.uniquenessMethod} onChange={(event) => setField('uniquenessMethod', event.target.value)} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary">
                  <option value="none">None</option>
                  <option value="ip">IP</option>
                  <option value="ip_ua">IP + UA</option>
                  <option value="cookie">Cookie</option>
                  <option value="parameter">Parameter</option>
                </select>
              </Field>
              <Field label="Uniqueness TTL">
                <input type="number" min="0" value={draft.uniquenessTTL} onChange={(event) => setField('uniquenessTTL', Number(event.target.value))} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
              </Field>
              {draft.uniquenessMethod === 'parameter' && (
                <Field label="Uniqueness Parameter" className="md:col-span-2">
                  <input value={draft.uniquenessParameter} onChange={(event) => setField('uniquenessParameter', event.target.value)} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
                </Field>
              )}
            </div>
            <div className="rounded-sm bg-surface-container p-4 text-sm text-on-surface-variant">
              Current strategy: <span className="font-semibold text-on-surface">{draft.uniquenessMethod}</span> / TTL {draft.uniquenessTTL}s / binding {draft.visitorBinding}
            </div>
            <button onClick={() => void saveDraft()} disabled={saving} className="modal-btn-primary inline-flex items-center gap-2 rounded-sm px-5 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Parameters
            </button>
          </div>

          <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Parameter Tokens</h3>
            <textarea rows={12} value={draft.parameterTokens} onChange={(event) => setField('parameterTokens', event.target.value)} className="w-full resize-none border border-outline-variant bg-surface px-4 py-3 font-mono text-xs outline-none focus:border-primary" />
            <div className="rounded-sm bg-surface-container p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Parsed Preview</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {parsedTokens.length === 0 ? (
                  <span className="text-sm text-on-surface-variant">No token mappings parsed.</span>
                ) : (
                  parsedTokens.map((token: any, index: number) => (
                    <span key={`${token.name || 'token'}-${index}`} className="rounded-sm bg-surface px-3 py-2 text-xs text-on-surface">
                      {token.name || 'token'} → {token.token || '-'}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'postback' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary">S2S Postback</h3>
            <Field label="Postback URL">
              <input value={draft.postbackUrl} onChange={(event) => setField('postbackUrl', event.target.value)} placeholder="https://partner.example.com/postback" className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
            </Field>
            <Field label="Statuses">
              <input value={draft.postbackStatuses} onChange={(event) => setField('postbackStatuses', event.target.value)} placeholder="sale, lead" className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
            </Field>
            <label className="flex items-center gap-3 rounded-sm bg-surface-container p-4">
              <input type="checkbox" checked={draft.sendRevenue} onChange={(event) => setField('sendRevenue', event.target.checked)} />
              <span className="text-sm text-on-surface-variant">Send revenue value</span>
            </label>
            <label className="flex items-center gap-3 rounded-sm bg-surface-container p-4">
              <input type="checkbox" checked={draft.sendCampaignToken} onChange={(event) => setField('sendCampaignToken', event.target.checked)} />
              <span className="text-sm text-on-surface-variant">Attach campaign API token</span>
            </label>
            <button onClick={() => void saveDraft()} disabled={saving} className="modal-btn-primary inline-flex items-center gap-2 rounded-sm px-5 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Postback
            </button>
          </div>

          <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-primary">Suggested Template</h3>
            <pre className="overflow-x-auto rounded-sm bg-surface p-4 text-xs text-on-surface-variant whitespace-pre-wrap">{`GET ${draft.postbackUrl || 'https://partner.example.com/postback'}?status={status}&payout={payout}&clickid={clickid}${draft.sendCampaignToken ? `&token=${campaign.apiToken || ''}` : ''}`}</pre>
            <div className="mt-4 rounded-sm bg-secondary-container/20 p-4 text-sm text-on-surface-variant">
              Keep postback statuses aligned with your affiliate network definitions and your default flow fallback plan.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr),minmax(320px,1fr)]">
          <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Campaign Notes</h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                Document QA checkpoints, domain ownership, launch gates, and handoff details.
              </p>
            </div>
            <textarea rows={14} value={draft.notes} onChange={(event) => setField('notes', event.target.value)} className="w-full resize-none border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" placeholder="Document domain ownership, QA checkpoints, fallback behavior, and launch notes..." />
            <button onClick={() => void saveDraft()} disabled={saving} className="modal-btn-primary inline-flex items-center gap-2 rounded-sm px-5 py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Notes
            </button>
          </div>

          <div className="space-y-6">
            <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-primary">Routing Digest</h3>
              <div className="space-y-3 text-sm">
                <InfoRow label="Regular" value={`${flowSummary.regular.length} flows`} />
                <InfoRow label="Forced" value={`${flowSummary.forced.length} flows`} />
                <InfoRow label="Default" value={`${flowSummary.fallback.length} flows`} />
                <InfoRow label="Traffic Loss" value={`${draft.trafficLoss}%`} />
              </div>
            </div>
            <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-primary">Publishing Reminders</h3>
              <ul className="space-y-3 text-sm text-on-surface-variant">
                <li>Confirm forced flows only for real override scenarios.</li>
                <li>Ensure a single default flow exists for fallback continuity.</li>
                <li>Rotate token before external API integrations go live.</li>
                <li>Keep uniqueness method aligned with traffic source macros.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </label>
      {children}
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm bg-surface-container px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="mt-1 text-sm text-on-surface">{value}</div>
    </div>
  );
}

function QuickMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm bg-surface-container-lowest p-4 whisper-shadow">
      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="mt-2 text-2xl font-display font-bold text-primary">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="text-right text-on-surface">{value}</div>
    </div>
  );
}

function SnippetCard({
  label,
  value,
  onCopy,
  multiline = false,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-sm bg-surface-container p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</div>
        {onCopy && (
          <button onClick={onCopy} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            <Copy size={12} />
            Copy
          </button>
        )}
      </div>
      {multiline ? (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-on-surface-variant">{value}</pre>
      ) : (
        <div className="mt-2 break-all font-mono text-sm text-on-surface">{value}</div>
      )}
    </div>
  );
}
