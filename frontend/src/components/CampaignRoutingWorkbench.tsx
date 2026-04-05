import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Copy,
  GitBranch,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Shuffle,
  Trash2,
} from 'lucide-react';
import type { FlowNode } from './FlowDesigner';
import { useToast } from './Toast';
import {
  cloneFlow,
  createFlowRule,
  deleteFlowRule,
  equalizeCampaignFlows,
  fetchCampaignFlowStats,
  fetchFlowFilterOperators,
  fetchFlowFilterTargets,
  fetchFlowLogs,
  fetchFlowRules,
  fetchFlowSchema,
  testFlow,
  updateFlowRule,
  type CreateFlowRuleDTO,
  type FlowFilterOperator,
  type FlowLogListResult,
  type FlowRuleActionConfig,
  type FlowRuleDocument,
  type FlowSchemaDocument,
  type FlowStats,
  type FlowTargetOption,
  type FlowValidationResult,
} from '../services/api';

interface DestinationItem {
  id: string;
  name: string;
}

interface RoutingWorkbenchProps {
  campaignId: string;
  flows: FlowNode[];
  landings: DestinationItem[];
  offers: DestinationItem[];
  flowRotation: string;
  trafficLoss: number;
  onRefreshFlows: () => Promise<void> | void;
}

interface RuleFilterDraft {
  id: string;
  name: string;
  target: string;
  operator: FlowFilterOperator;
  value: string;
  enabled: boolean;
}

interface RuleGroupDraft {
  id: string;
  name: string;
  logic: 'AND' | 'OR';
  enabled: boolean;
  filters: RuleFilterDraft[];
  groups: RuleGroupDraft[];
}

interface RuleFormState {
  ruleId?: string;
  flowId: string;
  name: string;
  description: string;
  priority: number;
  status: 'active' | 'paused' | 'deleted';
  rootGroup: RuleGroupDraft;
  actionType: FlowRuleActionConfig['type'];
  actionTargetId: string;
  redirectUrl: string;
  blockReason: string;
  weight: string;
}

interface FlowTestFormState {
  source: string;
  medium: string;
  campaign: string;
  subId: string;
  clickId: string;
  referrer: string;
  visitsCount: number;
  firstVisit: boolean;
  returning: boolean;
}

function createFilterDraft(): RuleFilterDraft {
  return {
    id: `filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    target: 'visit.source',
    operator: 'equals',
    value: '',
    enabled: true,
  };
}

function createGroupDraft(name = ''): RuleGroupDraft {
  return {
    id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    logic: 'AND',
    enabled: true,
    filters: [createFilterDraft()],
    groups: [],
  };
}

function createRuleForm(flowId: string): RuleFormState {
  return {
    flowId,
    name: '',
    description: '',
    priority: 0,
    status: 'active',
    rootGroup: createGroupDraft('Root Group'),
    actionType: 'allow',
    actionTargetId: '',
    redirectUrl: '',
    blockReason: '',
    weight: '',
  };
}

function createDefaultTestForm(): FlowTestFormState {
  return {
    source: '',
    medium: '',
    campaign: '',
    subId: '',
    clickId: '',
    referrer: '',
    visitsCount: 1,
    firstVisit: true,
    returning: false,
  };
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

function summarizeRuleCondition(rule: FlowRuleDocument, targetsMap: Map<string, FlowTargetOption>) {
  const filters = rule.condition.filters || [];
  const parts = filters.map((filter) => {
    const target = targetsMap.get(filter.target)?.label || filter.target;
    const value =
      filter.operator === 'exists' || filter.operator === 'notExists'
        ? ''
        : Array.isArray(filter.value)
          ? filter.value.join(', ')
          : String(filter.value ?? '');

    return `${target} ${filter.operator}${value ? ` ${value}` : ''}`;
  });

  const nestedCount = Array.isArray(rule.condition.groups) ? rule.condition.groups.length : 0;
  const nestedLabel = nestedCount > 0 ? ` + ${nestedCount} nested group${nestedCount > 1 ? 's' : ''}` : '';

  return parts.length > 0 ? `${parts.join(` ${rule.condition.logic} `)}${nestedLabel}` : `No filters${nestedLabel}`;
}

function summarizeRuleAction(rule: FlowRuleDocument, landings: DestinationItem[], offers: DestinationItem[]) {
  const { action } = rule;

  if (action.type === 'showPage') {
    return `Show landing ${landings.find((item) => item.id === action.targetId)?.name || action.targetId || '-'}`;
  }

  if (action.type === 'showOffer') {
    return `Show offer ${offers.find((item) => item.id === action.targetId)?.name || action.targetId || '-'}`;
  }

  if (action.type === 'redirect') {
    return `Redirect to ${action.redirectUrl || '-'}`;
  }

  if (action.type === 'block') {
    return `Block traffic${action.blockReason ? `: ${action.blockReason}` : ''}`;
  }

  return 'Allow flow';
}

function parseFilterValue(raw: string, targetType: FlowTargetOption['type'] | undefined, operator: FlowFilterOperator) {
  if (operator === 'exists' || operator === 'notExists') {
    return undefined;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  if (operator === 'in' || operator === 'notIn' || operator === 'between') {
    const values = trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (targetType === 'number') {
      return values.map((item) => Number(item)).filter((item) => !Number.isNaN(item));
    }

    if (targetType === 'boolean') {
      return values.map((item) => item === 'true');
    }

    return values;
  }

  if (targetType === 'number') {
    const numericValue = Number(trimmed);
    return Number.isNaN(numericValue) ? trimmed : numericValue;
  }

  if (targetType === 'boolean') {
    return trimmed === 'true';
  }

  return trimmed;
}

function toRuleForm(rule: FlowRuleDocument): RuleFormState {
  const mapGroup = (group: FlowRuleDocument['condition']): RuleGroupDraft => ({
    id: group.id,
    name: group.name || '',
    logic: group.logic,
    enabled: group.enabled,
    filters:
      group.filters.length > 0
        ? group.filters.map((filter) => ({
            id: filter.id,
            name: filter.name || '',
            target: filter.target,
            operator: filter.operator,
            value:
              filter.operator === 'exists' || filter.operator === 'notExists'
                ? ''
                : Array.isArray(filter.value)
                  ? filter.value.join(', ')
                  : String(filter.value ?? ''),
            enabled: filter.enabled,
          }))
        : [createFilterDraft()],
    groups: Array.isArray(group.groups) ? group.groups.map(mapGroup) : [],
  });

  return {
    ruleId: rule.id,
    flowId: rule.flowId,
    name: rule.name,
    description: rule.description || '',
    priority: Number(rule.priority || 0),
    status: rule.status,
    rootGroup: mapGroup(rule.condition),
    actionType: rule.action.type,
    actionTargetId: rule.action.targetId || '',
    redirectUrl: rule.action.redirectUrl || '',
    blockReason: rule.action.blockReason || '',
    weight: typeof rule.action.weight === 'number' ? String(rule.action.weight) : '',
  };
}

function buildRulePayload(form: RuleFormState, targetsMap: Map<string, FlowTargetOption>): CreateFlowRuleDTO {
  const mapGroup = (group: RuleGroupDraft): CreateFlowRuleDTO['condition'] => ({
    id: group.id,
    name: group.name.trim() || undefined,
    logic: group.logic,
    enabled: group.enabled,
    filters: group.filters.map((filter) => {
      const target = targetsMap.get(filter.target);
      const value = parseFilterValue(filter.value, target?.type, filter.operator);

      return {
        id: filter.id,
        name: filter.name.trim() || undefined,
        target: filter.target,
        operator: filter.operator,
        value,
        enabled: filter.enabled,
      };
    }),
    groups: group.groups.map(mapGroup),
  });

  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    priority: Number(form.priority || 0),
    condition: {
      ...mapGroup(form.rootGroup),
      name: form.rootGroup.name.trim() || `${form.name.trim() || 'Rule'} conditions`,
    },
    action: {
      type: form.actionType,
      targetId:
        form.actionType === 'showOffer' || form.actionType === 'showPage'
          ? form.actionTargetId || undefined
          : undefined,
      redirectUrl: form.actionType === 'redirect' ? form.redirectUrl.trim() || undefined : undefined,
      blockReason: form.actionType === 'block' ? form.blockReason.trim() || undefined : undefined,
      weight: form.weight.trim() ? Number(form.weight) : undefined,
    },
  };
}

export function CampaignRoutingWorkbench({
  campaignId,
  flows,
  landings,
  offers,
  flowRotation,
  trafficLoss,
  onRefreshFlows,
}: RoutingWorkbenchProps) {
  const toast = useToast();
  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [schema, setSchema] = useState<FlowSchemaDocument | null>(null);
  const [targets, setTargets] = useState<FlowTargetOption[]>([]);
  const [operators, setOperators] = useState<Array<{ value: FlowFilterOperator; label: string; description: string }>>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(() => createRuleForm(''));
  const [editorOpen, setEditorOpen] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [testForm, setTestForm] = useState<FlowTestFormState>(createDefaultTestForm);
  const [testResult, setTestResult] = useState<FlowValidationResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [campaignStats, setCampaignStats] = useState<FlowStats[]>([]);
  const [flowLogs, setFlowLogs] = useState<FlowLogListResult>({ logs: [], total: 0, hasMore: false });
  const [loadingObservability, setLoadingObservability] = useState(false);

  useEffect(() => {
    if (!selectedFlowId && flows.length > 0) {
      setSelectedFlowId(flows[0]!.id);
    }

    if (selectedFlowId && !flows.some((flow) => flow.id === selectedFlowId)) {
      setSelectedFlowId(flows[0]?.id || '');
    }
  }, [flows, selectedFlowId]);

  const selectedFlow = useMemo(
    () => flows.find((flow) => flow.id === selectedFlowId) || null,
    [flows, selectedFlowId]
  );

  const targetsMap = useMemo(() => new Map(targets.map((target) => [target.value, target])), [targets]);

  const refreshSelectedFlow = useCallback(async () => {
    if (!selectedFlowId) {
      setSchema(null);
      return;
    }

    try {
      setLoadingSchema(true);
      const [schemaData, rulesData] = await Promise.all([
        fetchFlowSchema(selectedFlowId),
        fetchFlowRules(selectedFlowId).catch(() => []),
      ]);

      setSchema({
        ...schemaData,
        rules: Array.isArray(rulesData) ? rulesData : schemaData.rules,
      });
    } catch (err) {
      setSchema(null);
      toast.error('Routing schema load failed', err instanceof Error ? err.message : 'Unable to load flow schema');
    } finally {
      setLoadingSchema(false);
    }
  }, [selectedFlowId, toast]);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoadingCatalog(true);
        const [operatorData, targetData] = await Promise.all([
          fetchFlowFilterOperators().catch(() => []),
          fetchFlowFilterTargets().catch(() => []),
        ]);
        setOperators(operatorData);
        setTargets(targetData);
      } finally {
        setLoadingCatalog(false);
      }
    };

    void loadCatalog();
  }, []);

  useEffect(() => {
    void refreshSelectedFlow();
  }, [refreshSelectedFlow]);

  useEffect(() => {
    if (!campaignId || !selectedFlowId) {
      return;
    }

    const loadObservability = async () => {
      try {
        setLoadingObservability(true);
        const [statsData, logsData] = await Promise.all([
          fetchCampaignFlowStats(campaignId).catch(() => []),
          fetchFlowLogs(selectedFlowId, { limit: 8 }).catch(
            () => ({ logs: [], total: 0, hasMore: false }) as FlowLogListResult
          ),
        ]);

        setCampaignStats(Array.isArray(statsData) ? statsData : []);
        setFlowLogs(logsData);
      } finally {
        setLoadingObservability(false);
      }
    };

    void loadObservability();
  }, [campaignId, selectedFlowId]);

  const openCreateRule = useCallback(() => {
    if (!selectedFlowId) {
      return;
    }

    setRuleForm(createRuleForm(selectedFlowId));
    setEditorOpen(true);
  }, [selectedFlowId]);

  const openEditRule = useCallback(
    (rule: FlowRuleDocument) => {
      setRuleForm(toRuleForm(rule));
      setEditorOpen(true);
    },
    []
  );

  const patchGroupById = useCallback(
    (groupId: string, updater: (group: RuleGroupDraft) => RuleGroupDraft) => {
      const updateTree = (group: RuleGroupDraft): RuleGroupDraft => {
        if (group.id === groupId) {
          return updater(group);
        }

        return {
          ...group,
          groups: group.groups.map(updateTree),
        };
      };

      setRuleForm((current) => ({
        ...current,
        rootGroup: updateTree(current.rootGroup),
      }));
    },
    []
  );

  const removeGroupById = useCallback((groupId: string) => {
    const removeFromTree = (group: RuleGroupDraft): RuleGroupDraft => ({
      ...group,
      groups: group.groups
        .filter((child) => child.id !== groupId)
        .map(removeFromTree),
    });

    setRuleForm((current) => ({
      ...current,
      rootGroup: removeFromTree(current.rootGroup),
    }));
  }, []);

  const saveRule = useCallback(async () => {
    if (!selectedFlowId) {
      return;
    }

    if (!ruleForm.name.trim()) {
      toast.error('Rule save failed', 'Rule name is required.');
      return;
    }

    const collectGroups = (group: RuleGroupDraft): RuleGroupDraft[] => [group, ...group.groups.flatMap(collectGroups)];
    const allGroups = collectGroups(ruleForm.rootGroup);
    const allFilters = allGroups.flatMap((group) => group.filters);

    if (allFilters.some((filter) => !filter.target || !filter.operator)) {
      toast.error('Rule save failed', 'Every filter needs a target and operator.');
      return;
    }

    if (
      allFilters.some(
        (filter) =>
          filter.enabled &&
          filter.operator !== 'exists' &&
          filter.operator !== 'notExists' &&
          !filter.value.trim()
      )
    ) {
      toast.error('Rule save failed', 'Every filter needs a value unless the operator is exists / notExists.');
      return;
    }

    if (
      (ruleForm.actionType === 'showPage' || ruleForm.actionType === 'showOffer') &&
      !ruleForm.actionTargetId
    ) {
      toast.error('Rule save failed', 'Choose a landing or offer target for the selected action.');
      return;
    }

    if (ruleForm.actionType === 'redirect' && !ruleForm.redirectUrl.trim()) {
      toast.error('Rule save failed', 'Redirect URL is required.');
      return;
    }

    try {
      setSavingRule(true);
      const payload = buildRulePayload(ruleForm, targetsMap);

      if (ruleForm.ruleId) {
        await updateFlowRule(ruleForm.ruleId, {
          ...payload,
          status: ruleForm.status,
        });
      } else {
        const created = await createFlowRule(selectedFlowId, payload);
        if (ruleForm.status !== 'active') {
          await updateFlowRule(created.id, { status: ruleForm.status });
        }
      }

      await refreshSelectedFlow();
      setEditorOpen(false);
      toast.success('Routing rule saved', 'Flow rule definition has been updated.');
    } catch (err) {
      toast.error('Rule save failed', err instanceof Error ? err.message : 'Unable to save routing rule');
    } finally {
      setSavingRule(false);
    }
  }, [refreshSelectedFlow, ruleForm, selectedFlowId, targetsMap, toast]);

  const changeRuleStatus = useCallback(
    async (rule: FlowRuleDocument, status: 'active' | 'paused') => {
      try {
        setActionLoading(`status-${rule.id}`);
        await updateFlowRule(rule.id, { status });
        await refreshSelectedFlow();
        toast.success('Rule status updated', `${rule.name} is now ${status}.`);
      } catch (err) {
        toast.error('Rule status update failed', err instanceof Error ? err.message : 'Unable to update rule status');
      } finally {
        setActionLoading(null);
      }
    },
    [refreshSelectedFlow, toast]
  );

  const removeRule = useCallback(
    async (rule: FlowRuleDocument) => {
      if (!confirm(`Delete rule "${rule.name}"?`)) {
        return;
      }

      try {
        setActionLoading(`delete-${rule.id}`);
        await deleteFlowRule(rule.id);
        await refreshSelectedFlow();
        toast.success('Rule deleted', `${rule.name} was removed from this flow.`);
      } catch (err) {
        toast.error('Rule delete failed', err instanceof Error ? err.message : 'Unable to delete rule');
      } finally {
        setActionLoading(null);
      }
    },
    [refreshSelectedFlow, toast]
  );

  const runEqualize = useCallback(async () => {
    try {
      setActionLoading('equalize');
      await equalizeCampaignFlows(campaignId);
      await onRefreshFlows();
      toast.success('Regular weights equalized', 'Active non-default flows were redistributed to 100%.');
    } catch (err) {
      toast.error('Equalize failed', err instanceof Error ? err.message : 'Unable to rebalance flow weights');
    } finally {
      setActionLoading(null);
    }
  }, [campaignId, onRefreshFlows, toast]);

  const cloneSelectedFlow = useCallback(async () => {
    if (!selectedFlowId) {
      return;
    }

    try {
      setActionLoading('clone');
      await cloneFlow(selectedFlowId);
      await onRefreshFlows();
      toast.success('Flow cloned', 'A copy of the selected flow is now available in routing.');
    } catch (err) {
      toast.error('Flow clone failed', err instanceof Error ? err.message : 'Unable to clone flow');
    } finally {
      setActionLoading(null);
    }
  }, [onRefreshFlows, selectedFlowId, toast]);

  const runTest = useCallback(async () => {
    if (!selectedFlowId) {
      return;
    }

    try {
      setTesting(true);
      const result = await testFlow(selectedFlowId, {
        source: testForm.source || undefined,
        medium: testForm.medium || undefined,
        campaign: testForm.campaign || undefined,
        subId: testForm.subId || undefined,
        clickId: testForm.clickId || undefined,
        referrer: testForm.referrer || undefined,
        visitsCount: Number(testForm.visitsCount || 1),
        firstVisit: testForm.firstVisit,
        returning: testForm.returning,
      });

      setTestResult(result);
      toast.success('Routing test complete', 'Inspect the matched rule and action below.');
    } catch (err) {
      toast.error('Routing test failed', err instanceof Error ? err.message : 'Unable to execute flow validation');
    } finally {
      setTesting(false);
    }
  }, [selectedFlowId, testForm, toast]);

  const activeRules = useMemo(
    () => (schema?.rules || []).filter((rule) => rule.status === 'active'),
    [schema]
  );

  const selectedDestinationName = useMemo(
    () => (selectedFlow ? getDestinationName(selectedFlow, landings, offers) : '-'),
    [landings, offers, selectedFlow]
  );

  const selectedStats = useMemo(
    () => campaignStats.find((item) => item.flowId === selectedFlowId) || null,
    [campaignStats, selectedFlowId]
  );

  const routingDiagnostics = useMemo(() => {
    const actionCounts = flowLogs.logs.reduce<Record<string, number>>((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    const latestAction =
      Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || (selectedStats?.conversions ? 'showOffer' : 'allow');

    return {
      totalHits: flowLogs.total,
      dominantAction: latestAction,
      averageExecutionMs:
        flowLogs.logs.length > 0
          ? Math.round(flowLogs.logs.reduce((sum, log) => sum + Number(log.executionTimeMs || 0), 0) / flowLogs.logs.length)
          : 0,
      matchedRuleCoverage:
        flowLogs.logs.length > 0
          ? Math.round((flowLogs.logs.filter((log) => Boolean(log.matchedRule)).length / flowLogs.logs.length) * 100)
          : 0,
    };
  }, [flowLogs, selectedStats]);

  const routingExplainability = useMemo(() => {
    const regularFlows = flows.filter((flow) => flow.config?.flowType === 'regular');
    const forcedFlows = flows.filter((flow) => flow.config?.flowType === 'forced');
    const defaultFlows = flows.filter((flow) => flow.config?.flowType === 'default');
    const priorityMap = new Map<number, string[]>();

    activeRules.forEach((rule) => {
      const current = priorityMap.get(rule.priority) || [];
      current.push(rule.name);
      priorityMap.set(rule.priority, current);
    });

    const duplicatePriorities = Array.from(priorityMap.entries()).filter(([, names]) => names.length > 1);

    return {
      regularWeight: regularFlows.reduce((sum, flow) => sum + Number(flow.weight || 0), 0),
      forcedCount: forcedFlows.length,
      defaultCount: defaultFlows.length,
      fallbackTarget:
        defaultFlows[0] ? getDestinationName(defaultFlows[0], landings, offers) : 'No default flow configured',
      duplicatePriorities,
      rotationLabel: flowRotation || 'position',
      trafficLossLabel: trafficLoss > 0 ? `${trafficLoss}% may be dropped before fallback` : 'No traffic loss configured',
      flowNarrative:
        forcedFlows.length > 0
          ? `${forcedFlows.length} forced flow(s) can override regular routing before weighted distribution starts.`
          : 'No forced overrides configured; traffic enters regular weighted routing directly.',
    };
  }, [activeRules, flowRotation, flows, landings, offers, trafficLoss]);

  const testDecisionPath = useMemo(() => {
    if (!testResult) {
      return [];
    }

    const steps: string[] = [];
    steps.push(
      routingExplainability.forcedCount > 0
        ? `${routingExplainability.forcedCount} forced flow override(s) are configured before regular distribution.`
        : 'No forced flow override is configured before regular distribution.'
    );
    steps.push(`Campaign rotation mode is ${routingExplainability.rotationLabel}.`);

    const checkedRules = testResult.ruleResults.map((result, index) => {
      const state = result.matched ? 'matched' : 'missed';
      return `Rule ${index + 1}: ${result.ruleName || 'Unnamed rule'} ${state}.`;
    });

    if (checkedRules.length > 0) {
      steps.push(...checkedRules);
    } else {
      steps.push('No active rules were evaluated for this flow.');
    }

    if (testResult.matchedRule?.ruleName) {
      steps.push(`Winning rule: ${testResult.matchedRule.ruleName}.`);
    } else {
      steps.push(`No rule matched, so fallback action "${testResult.action.type}" was used.`);
    }

    if (routingExplainability.defaultCount > 0) {
      steps.push(`Default fallback target is ${routingExplainability.fallbackTarget}.`);
    } else {
      steps.push('No default flow is configured at campaign level.');
    }

    if (trafficLoss > 0) {
      steps.push(`Traffic loss is set to ${trafficLoss}%, so some traffic may be dropped before fallback continuity applies.`);
    }

    return steps;
  }, [routingExplainability, testResult, trafficLoss]);

  const renderGroupEditor = useCallback(
    (group: RuleGroupDraft, depth = 0): React.ReactNode => {
      const canRemoveGroup = depth > 0;

      return (
        <div key={group.id} className="rounded-sm border border-outline-variant/10 bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              {depth === 0 ? 'Root Group' : `Nested Group ${depth}`}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  patchGroupById(group.id, (current) => ({
                    ...current,
                    filters: [...current.filters, createFilterDraft()],
                  }))
                }
                className="text-xs font-bold uppercase tracking-widest text-primary"
              >
                Add Filter
              </button>
              <button
                onClick={() =>
                  patchGroupById(group.id, (current) => ({
                    ...current,
                    groups: [...current.groups, createGroupDraft('Nested Group')],
                  }))
                }
                className="text-xs font-bold uppercase tracking-widest text-primary"
              >
                Add Group
              </button>
              {canRemoveGroup && (
                <button
                  onClick={() => removeGroupById(group.id)}
                  className="text-xs font-bold uppercase tracking-widest text-error"
                >
                  Remove Group
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Group Name">
              <input
                value={group.name}
                onChange={(event) =>
                  patchGroupById(group.id, (current) => ({ ...current, name: event.target.value }))
                }
                className="w-full border border-outline-variant bg-surface-container px-4 py-3 outline-none focus:border-primary"
              />
            </Field>
            <Field label="Logic">
              <select
                value={group.logic}
                onChange={(event) =>
                  patchGroupById(group.id, (current) => ({
                    ...current,
                    logic: event.target.value as RuleGroupDraft['logic'],
                  }))
                }
                className="w-full border border-outline-variant bg-surface-container px-4 py-3 outline-none focus:border-primary"
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </Field>
            <Field label="Enabled">
              <select
                value={group.enabled ? 'true' : 'false'}
                onChange={(event) =>
                  patchGroupById(group.id, (current) => ({
                    ...current,
                    enabled: event.target.value === 'true',
                  }))
                }
                className="w-full border border-outline-variant bg-surface-container px-4 py-3 outline-none focus:border-primary"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </Field>
            <div className="rounded-sm bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
              {(group.filters.length + group.groups.length).toString()} items
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {group.filters.map((filter, index) => {
              const targetMeta = targetsMap.get(filter.target);
              const needsValue = filter.operator !== 'exists' && filter.operator !== 'notExists';

              return (
                <div key={filter.id} className="rounded-sm border border-outline-variant/10 bg-surface-container p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Filter {index + 1}
                    </div>
                    {group.filters.length > 1 && (
                      <button
                        onClick={() =>
                          patchGroupById(group.id, (current) => ({
                            ...current,
                            filters: current.filters.filter((item) => item.id !== filter.id),
                          }))
                        }
                        className="text-xs font-bold uppercase tracking-widest text-error"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Name">
                      <input
                        value={filter.name}
                        onChange={(event) =>
                          patchGroupById(group.id, (current) => ({
                            ...current,
                            filters: current.filters.map((item) =>
                              item.id === filter.id ? { ...item, name: event.target.value } : item
                            ),
                          }))
                        }
                        className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                      />
                    </Field>
                    <Field label="Target">
                      <select
                        value={filter.target}
                        onChange={(event) =>
                          patchGroupById(group.id, (current) => ({
                            ...current,
                            filters: current.filters.map((item) =>
                              item.id === filter.id ? { ...item, target: event.target.value } : item
                            ),
                          }))
                        }
                        className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                      >
                        {targets.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.category} · {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Operator">
                      <select
                        value={filter.operator}
                        onChange={(event) =>
                          patchGroupById(group.id, (current) => ({
                            ...current,
                            filters: current.filters.map((item) =>
                              item.id === filter.id
                                ? { ...item, operator: event.target.value as FlowFilterOperator }
                                : item
                            ),
                          }))
                        }
                        className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                      >
                        {operators.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Enabled">
                      <select
                        value={filter.enabled ? 'true' : 'false'}
                        onChange={(event) =>
                          patchGroupById(group.id, (current) => ({
                            ...current,
                            filters: current.filters.map((item) =>
                              item.id === filter.id ? { ...item, enabled: event.target.value === 'true' } : item
                            ),
                          }))
                        }
                        className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    </Field>
                    {needsValue && (
                      <Field label={`Value${targetMeta ? ` (${targetMeta.type})` : ''}`} className="md:col-span-2 xl:col-span-4">
                        {targetMeta?.type === 'boolean' ? (
                          <select
                            value={filter.value || 'true'}
                            onChange={(event) =>
                              patchGroupById(group.id, (current) => ({
                                ...current,
                                filters: current.filters.map((item) =>
                                  item.id === filter.id ? { ...item, value: event.target.value } : item
                                ),
                              }))
                            }
                            className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : (
                          <input
                            value={filter.value}
                            onChange={(event) =>
                              patchGroupById(group.id, (current) => ({
                                ...current,
                                filters: current.filters.map((item) =>
                                  item.id === filter.id ? { ...item, value: event.target.value } : item
                                ),
                              }))
                            }
                            placeholder={
                              filter.operator === 'in' || filter.operator === 'notIn' || filter.operator === 'between'
                                ? 'Use comma-separated values'
                                : 'Value'
                            }
                            className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                          />
                        )}
                      </Field>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {group.groups.length > 0 && (
            <div className="mt-4 space-y-4 border-l border-outline-variant/20 pl-4">
              {group.groups.map((childGroup) => renderGroupEditor(childGroup, depth + 1))}
            </div>
          )}
        </div>
      );
    },
    [operators, patchGroupById, removeGroupById, targets, targetsMap]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
      <div className="space-y-6">
        <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Routing Lab</h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                Select a flow to inspect schema, manage rules, and run match tests.
              </p>
            </div>
            {loadingCatalog && <Loader2 size={16} className="animate-spin text-on-surface-variant" />}
          </div>

          <div className="space-y-3">
            {flows.map((flow) => {
              const selected = flow.id === selectedFlowId;
              return (
                <button
                  key={flow.id}
                  onClick={() => {
                    setSelectedFlowId(flow.id);
                    setEditorOpen(false);
                    setTestResult(null);
                  }}
                  className={`w-full rounded-sm border p-4 text-left transition-colors ${
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant/15 bg-surface hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-on-surface">{flow.name}</div>
                    <span className="rounded-sm bg-surface-container px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {flow.config?.flowType || 'regular'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-on-surface-variant">
                    {getDestinationName(flow, landings, offers)} · Weight {flow.weight}% · {flow.config?.flowStatus || 'active'}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedFlow && (
            <div className="mt-4 space-y-3 border-t border-outline-variant/10 pt-4">
              <button
                onClick={() => void refreshSelectedFlow()}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"
              >
                {loadingSchema ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Refresh schema
              </button>
              <div className="grid gap-3">
                <button
                  onClick={() => void runEqualize()}
                  disabled={actionLoading === 'equalize'}
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-outline-variant px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary disabled:opacity-60"
                >
                  {actionLoading === 'equalize' ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
                  Equalize Regular
                </button>
                <button
                  onClick={() => void cloneSelectedFlow()}
                  disabled={actionLoading === 'clone'}
                  className="inline-flex items-center justify-center gap-2 rounded-sm border border-outline-variant px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary disabled:opacity-60"
                >
                  {actionLoading === 'clone' ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                  Clone Selected Flow
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Flow Diagnostics</h3>
          {selectedFlow ? (
            <div className="mt-4 space-y-3 text-sm">
              <DiagnosticRow label="Destination" value={selectedDestinationName} />
              <DiagnosticRow label="Type" value={String(selectedFlow.config?.flowType || 'regular')} />
              <DiagnosticRow label="Status" value={String(selectedFlow.config?.flowStatus || 'active')} />
              <DiagnosticRow label="Weight" value={`${selectedFlow.weight}%`} />
              <DiagnosticRow label="Rules" value={String(schema?.rules.length || 0)} />
              <DiagnosticRow label="Active Rules" value={String(activeRules.length)} />
              <DiagnosticRow label="Default Action" value={schema?.defaultAction.type || 'allow'} />
              <DiagnosticRow label="Clicks" value={selectedStats ? String(selectedStats.clicks) : '-'} />
              <DiagnosticRow label="Conversions" value={selectedStats ? String(selectedStats.conversions) : '-'} />
              <DiagnosticRow label="Revenue" value={selectedStats ? `$${Number(selectedStats.revenue || 0).toFixed(2)}` : '-'} />
              <DiagnosticRow label="CR" value={selectedStats ? `${Number(selectedStats.conversionRate || 0).toFixed(2)}%` : '-'} />
            </div>
          ) : (
            <div className="mt-4 text-sm text-on-surface-variant">No flow selected.</div>
          )}
        </div>

        <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Routing Explainability</h3>
          <div className="mt-4 space-y-3 text-sm">
            <DiagnosticRow label="Rotation" value={routingExplainability.rotationLabel} />
            <DiagnosticRow label="Regular Weight" value={`${routingExplainability.regularWeight}%`} />
            <DiagnosticRow label="Forced Flows" value={String(routingExplainability.forcedCount)} />
            <DiagnosticRow label="Default Flows" value={String(routingExplainability.defaultCount)} />
            <DiagnosticRow label="Fallback Target" value={routingExplainability.fallbackTarget} />
            <DiagnosticRow label="Traffic Loss" value={routingExplainability.trafficLossLabel} />
          </div>
          <div className="mt-4 rounded-sm bg-surface p-4 text-sm text-on-surface-variant">
            {routingExplainability.flowNarrative}
          </div>
          {routingExplainability.duplicatePriorities.length > 0 && (
            <div className="mt-4 rounded-sm border border-warning/30 bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 text-warning" />
                <div className="text-sm text-on-surface-variant">
                  Priority conflicts detected:
                  {' '}
                  {routingExplainability.duplicatePriorities
                    .map(([priority, names]) => `P${priority} -> ${names.join(', ')}`)
                    .join(' | ')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Flow Rule Builder</h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                Build Keitaro-style routing conditions for source, sub IDs, schedule, and visitor attributes.
              </p>
            </div>
            <button
              onClick={openCreateRule}
              disabled={!selectedFlowId}
              className="inline-flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary disabled:opacity-60"
            >
              <Plus size={14} />
              New Rule
            </button>
          </div>

          {!selectedFlowId ? (
            <div className="rounded-sm border border-outline-variant/15 bg-surface px-4 py-5 text-sm text-on-surface-variant">
              Choose a flow from the left column to start.
            </div>
          ) : loadingSchema ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : schema?.rules.length ? (
            <div className="space-y-3">
              {schema.rules.map((rule) => (
                <div key={rule.id} className="rounded-sm border border-outline-variant/10 bg-surface p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-on-surface">{rule.name}</span>
                        <span className="rounded-sm bg-surface-container px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          P{rule.priority}
                        </span>
                        <span
                          className={`rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                            rule.status === 'active'
                              ? 'bg-secondary-container/30 text-secondary'
                              : rule.status === 'paused'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-error/10 text-error'
                          }`}
                        >
                          {rule.status}
                        </span>
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        {rule.description || 'No description yet.'}
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        Match: {summarizeRuleCondition(rule, targetsMap)}
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        Action: {summarizeRuleAction(rule, landings, offers)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openEditRule(rule)}
                        className="rounded-sm border border-outline-variant px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                      >
                        Edit
                      </button>
                      {rule.status === 'active' ? (
                        <button
                          onClick={() => void changeRuleStatus(rule, 'paused')}
                          disabled={actionLoading === `status-${rule.id}`}
                          className="rounded-sm border border-outline-variant px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary disabled:opacity-60"
                        >
                          {actionLoading === `status-${rule.id}` ? '...' : 'Pause'}
                        </button>
                      ) : (
                        <button
                          onClick={() => void changeRuleStatus(rule, 'active')}
                          disabled={actionLoading === `status-${rule.id}`}
                          className="rounded-sm border border-outline-variant px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary disabled:opacity-60"
                        >
                          {actionLoading === `status-${rule.id}` ? '...' : 'Activate'}
                        </button>
                      )}
                      <button
                        onClick={() => void removeRule(rule)}
                        disabled={actionLoading === `delete-${rule.id}`}
                        className="inline-flex items-center gap-1 rounded-sm border border-error/20 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-error disabled:opacity-60"
                      >
                        {actionLoading === `delete-${rule.id}` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-sm border border-outline-variant/15 bg-surface px-4 py-5 text-sm text-on-surface-variant">
              No explicit rules yet. This flow will currently fall back to the default action: {schema?.defaultAction.type || 'allow'}.
            </div>
          )}
        </div>

        {editorOpen && (
          <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
            <div className="mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                {ruleForm.ruleId ? 'Edit Routing Rule' : 'Create Routing Rule'}
              </h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                Use flat AND/OR filters here for practical campaign routing. Nested groups remain visible and testable but are read-only in this pass.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Rule Name">
                <input
                  value={ruleForm.name}
                  onChange={(event) => setRuleForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                />
              </Field>
              <Field label="Priority">
                <input
                  type="number"
                  value={ruleForm.priority}
                  onChange={(event) => setRuleForm((current) => ({ ...current, priority: Number(event.target.value || 0) }))}
                  className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <input
                  value={ruleForm.description}
                  onChange={(event) => setRuleForm((current) => ({ ...current, description: event.target.value }))}
                  className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                />
              </Field>
              <Field label="Status">
                <select
                  value={ruleForm.status}
                  onChange={(event) =>
                    setRuleForm((current) => ({
                      ...current,
                      status: event.target.value as RuleFormState['status'],
                    }))
                  }
                  className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </Field>
            </div>

            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold text-on-surface">Condition Tree</h4>
              {renderGroupEditor(ruleForm.rootGroup)}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Action">
                <select
                  value={ruleForm.actionType}
                  onChange={(event) =>
                    setRuleForm((current) => ({
                      ...current,
                      actionType: event.target.value as RuleFormState['actionType'],
                    }))
                  }
                  className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                >
                  <option value="allow">Allow</option>
                  <option value="block">Block</option>
                  <option value="redirect">Redirect</option>
                  <option value="showPage">Show Landing</option>
                  <option value="showOffer">Show Offer</option>
                </select>
              </Field>
              <Field label="Action Weight">
                <input
                  value={ruleForm.weight}
                  onChange={(event) => setRuleForm((current) => ({ ...current, weight: event.target.value }))}
                  placeholder="Optional"
                  className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                />
              </Field>

              {ruleForm.actionType === 'showPage' && (
                <Field label="Landing Target" className="md:col-span-2">
                  <select
                    value={ruleForm.actionTargetId}
                    onChange={(event) =>
                      setRuleForm((current) => ({ ...current, actionTargetId: event.target.value }))
                    }
                    className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                  >
                    <option value="">Select landing</option>
                    {landings.map((landing) => (
                      <option key={landing.id} value={landing.id}>
                        {landing.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {ruleForm.actionType === 'showOffer' && (
                <Field label="Offer Target" className="md:col-span-2">
                  <select
                    value={ruleForm.actionTargetId}
                    onChange={(event) =>
                      setRuleForm((current) => ({ ...current, actionTargetId: event.target.value }))
                    }
                    className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                  >
                    <option value="">Select offer</option>
                    {offers.map((offer) => (
                      <option key={offer.id} value={offer.id}>
                        {offer.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {ruleForm.actionType === 'redirect' && (
                <Field label="Redirect URL" className="md:col-span-2">
                  <input
                    value={ruleForm.redirectUrl}
                    onChange={(event) =>
                      setRuleForm((current) => ({ ...current, redirectUrl: event.target.value }))
                    }
                    placeholder="https://fallback.example.com"
                    className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                  />
                </Field>
              )}

              {ruleForm.actionType === 'block' && (
                <Field label="Block Reason" className="md:col-span-2">
                  <input
                    value={ruleForm.blockReason}
                    onChange={(event) =>
                      setRuleForm((current) => ({ ...current, blockReason: event.target.value }))
                    }
                    placeholder="Proxy traffic not allowed"
                    className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary"
                  />
                </Field>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => void saveRule()}
                disabled={savingRule}
                className="inline-flex items-center gap-2 rounded-sm border border-outline-variant px-5 py-3 text-xs font-bold uppercase tracking-widest text-primary disabled:opacity-60"
              >
                {savingRule ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Rule
              </button>
              <button
                onClick={() => setEditorOpen(false)}
                className="inline-flex items-center gap-2 rounded-sm border border-outline-variant px-5 py-3 text-xs font-bold uppercase tracking-widest text-on-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Routing Test Bench</h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                Test how the selected flow resolves. Visitor geo, device, and browser come from your current browser request.
              </p>
            </div>
            <button
              onClick={() => void runTest()}
              disabled={!selectedFlowId || testing}
              className="inline-flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary disabled:opacity-60"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <GitBranch size={14} />}
              Run Test
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Source">
              <input value={testForm.source} onChange={(event) => setTestForm((current) => ({ ...current, source: event.target.value }))} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
            </Field>
            <Field label="Medium">
              <input value={testForm.medium} onChange={(event) => setTestForm((current) => ({ ...current, medium: event.target.value }))} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
            </Field>
            <Field label="Campaign">
              <input value={testForm.campaign} onChange={(event) => setTestForm((current) => ({ ...current, campaign: event.target.value }))} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
            </Field>
            <Field label="Sub ID">
              <input value={testForm.subId} onChange={(event) => setTestForm((current) => ({ ...current, subId: event.target.value }))} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
            </Field>
            <Field label="Click ID">
              <input value={testForm.clickId} onChange={(event) => setTestForm((current) => ({ ...current, clickId: event.target.value }))} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
            </Field>
            <Field label="Visits Count">
              <input type="number" min="1" value={testForm.visitsCount} onChange={(event) => setTestForm((current) => ({ ...current, visitsCount: Number(event.target.value || 1) }))} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
            </Field>
            <Field label="Referrer" className="md:col-span-2 xl:col-span-3">
              <input value={testForm.referrer} onChange={(event) => setTestForm((current) => ({ ...current, referrer: event.target.value }))} className="w-full border border-outline-variant bg-surface px-4 py-3 outline-none focus:border-primary" />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 rounded-sm bg-surface px-4 py-3 text-sm text-on-surface-variant">
              <input type="checkbox" checked={testForm.firstVisit} onChange={(event) => setTestForm((current) => ({ ...current, firstVisit: event.target.checked }))} />
              First visit
            </label>
            <label className="flex items-center gap-2 rounded-sm bg-surface px-4 py-3 text-sm text-on-surface-variant">
              <input type="checkbox" checked={testForm.returning} onChange={(event) => setTestForm((current) => ({ ...current, returning: event.target.checked }))} />
              Returning visitor
            </label>
            <button
              onClick={() => {
                setTestForm(createDefaultTestForm());
                setTestResult(null);
              }}
              className="rounded-sm border border-outline-variant px-4 py-3 text-xs font-bold uppercase tracking-widest text-on-surface"
            >
              Reset Test
            </button>
          </div>

          {testResult && (
            <div className="mt-6 space-y-4">
              <div className="rounded-sm border border-outline-variant/10 bg-surface p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-on-surface">
                    Final Action: {testResult.action.type}
                  </span>
                  {testResult.matchedRule?.ruleName && (
                    <span className="rounded-sm bg-secondary-container/30 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-secondary">
                      Matched {testResult.matchedRule.ruleName}
                    </span>
                  )}
                  <span className="text-xs text-on-surface-variant">{testResult.durationMs}ms</span>
                </div>
                <div className="mt-2 text-xs text-on-surface-variant">
                  Validated at {new Date(testResult.validatedAt).toLocaleString()}
                </div>
                {testResult.matchedRule?.matchedFilters?.length ? (
                  <div className="mt-3 text-xs text-on-surface-variant">
                    Matched filters: {testResult.matchedRule.matchedFilters.map((filter) => filter.matchedFilterId).join(', ')}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                {testResult.ruleResults.map((result, index) => (
                  <div key={`${result.ruleId || 'rule'}-${index}`} className="rounded-sm border border-outline-variant/10 bg-surface p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-on-surface">{result.ruleName || 'Unnamed rule'}</span>
                      <span
                        className={`rounded-sm px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          result.matched ? 'bg-secondary-container/30 text-secondary' : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {result.matched ? 'matched' : 'missed'}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-on-surface-variant">
                      Action: {result.action?.type || 'allow'} {result.action?.targetId || result.action?.redirectUrl || ''}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-sm border border-outline-variant/10 bg-surface p-4">
                <h4 className="text-sm font-semibold text-on-surface">Decision Path</h4>
                <div className="mt-3 space-y-2">
                  {testDecisionPath.map((step, index) => (
                    <div key={`${step}-${index}`} className="text-sm text-on-surface-variant">
                      {index + 1}. {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-sm bg-surface-container-lowest p-6 whisper-shadow">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Routing Observability</h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                Recent execution logs and live diagnostics for the currently selected flow.
              </p>
            </div>
            {loadingObservability && <Loader2 size={16} className="animate-spin text-on-surface-variant" />}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Total Hits" value={String(routingDiagnostics.totalHits)} />
            <MetricTile label="Dominant Action" value={routingDiagnostics.dominantAction || '-'} />
            <MetricTile label="Avg Exec" value={`${routingDiagnostics.averageExecutionMs}ms`} />
            <MetricTile label="Rule Coverage" value={`${routingDiagnostics.matchedRuleCoverage}%`} />
          </div>

          <div className="mt-6 space-y-3">
            {flowLogs.logs.length === 0 ? (
              <div className="rounded-sm border border-outline-variant/15 bg-surface px-4 py-5 text-sm text-on-surface-variant">
                No recent execution logs were found for this flow.
              </div>
            ) : (
              flowLogs.logs.map((log) => (
                <div key={log.id} className="rounded-sm border border-outline-variant/10 bg-surface p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-on-surface">{log.action}</span>
                        {log.matchedRule && (
                          <span className="rounded-sm bg-secondary-container/30 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-secondary">
                            {log.matchedRule}
                          </span>
                        )}
                        <span className="rounded-sm bg-surface-container px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          {log.isUnique ? 'unique' : 'repeat'}
                        </span>
                        {log.isBot && (
                          <span className="rounded-sm bg-warning/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-warning">
                            bot
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        {new Date(log.timestamp).toLocaleString()} · {log.ip} · {log.country || 'Unknown country'} · {log.device || 'Unknown device'} · {log.browser || 'Unknown browser'}
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        Target: {log.actionTarget || '-'} · Click ID: {log.clickId || '-'} · Visitor: {log.visitorId || '-'}
                      </div>
                    </div>
                    <div className="text-right text-xs text-on-surface-variant">
                      <div>{log.executionTimeMs}ms</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {schema && schema.rules.some((rule) => Array.isArray(rule.condition.groups) && rule.condition.groups.length > 0) && (
          <div className="rounded-sm border border-warning/30 bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 text-warning" />
              <div className="text-sm text-on-surface-variant">
                Some rules use nested filter groups. They remain visible and testable, but this first editor pass treats nested groups as read-only.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </label>
      {children}
    </div>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="text-right text-on-surface">{value}</div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm bg-surface p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="mt-2 text-xl font-display font-bold text-primary">{value}</div>
    </div>
  );
}

export default CampaignRoutingWorkbench;
