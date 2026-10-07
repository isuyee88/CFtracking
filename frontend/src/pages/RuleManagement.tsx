/**
 * File: RuleManagement.tsx
 * Purpose: 规则管理页面，创建和管理自动化规则
 * Input/Output: 展示规则列表，支持 CRUD 操作
 * Logic: 从边缘 bootstrap 读取规则数据，提供创建、编辑、删除、启用/禁用功能
 * 前后端交互: 首屏读取 bootstrap，对规则变更仍保留写接口
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  X,
  Search,
  RefreshCw,
  AlertCircle,
  Play,
  Pause,
  History,
  Save,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  fetchRules, createRule, updateRule, deleteRule, enableRule, disableRule,
  fetchRuleConflicts,
  runRuleTestBench,
  fetchGlobalAutoruleScopeConfig,
  saveGlobalAutoruleScopeConfig,
  fetchTrafficSourceAutoruleScopeConfigs,
  batchApplyTrafficSourceAutoruleScopeConfig,
  fetchTrafficSources,
  type Rule,
  type CreateRuleDTO,
  type UpdateRuleDTO,
  type RuleConflictReport,
  type RuleTestBenchResult,
  type AutoruleScopeConfig,
  type AutoruleScopeMode,
  type RuleExpressionNode,
  type RuleConditionPayload,
} from '../services/api';
import { loadBootstrapForLocation, readBootstrapPage } from '../services/bootstrap';
import { FIELD_MAX_LENGTH } from '../constants/fieldConstraints';
import { clampInput, truncateLabel } from '../utils/text';
import type { TrafficSource } from '../types/trafficSource';
import { RULE_BUILDER_FIELD_OPTIONS, formatGovernanceActionLabel, formatMatchedRuleReasonLabel, getConditionFieldMeta } from '../constants/governance-ui';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function renderLengthCounter(value: string | undefined, maxLength: number) {
  return (
    <p className="mt-1 text-right text-[11px] text-fg-muted/80">
      {(value || '').length}/{maxLength}
    </p>
  );
}

type BuilderOperator =
  | 'eq'
  | 'ne'
  | 'contains'
  | 'not_contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'exists';

type BuilderGroupMode = 'all' | 'any' | 'not';

type BuilderNode = BuilderGroupNode | BuilderConditionNode;

interface BuilderGroupNode {
  id: string;
  kind: 'group';
  mode: BuilderGroupMode;
  children: BuilderNode[];
}

interface BuilderConditionNode {
  id: string;
  kind: 'condition';
  conditionType: 'comparison' | 'repeat_window';
  field: string;
  operator: BuilderOperator;
  value: string;
  repeatSubject?: 'visitor' | 'ip' | 'either';
  repeatCount?: string;
  repeatCampaigns?: string;
  repeatHours?: string;
}

interface BuilderActionState {
  type: 'allow' | 'block' | 'challenge' | 'redirect';
  redirectUrl: string;
}

interface RuleFormState {
  name: string;
  description: string;
  type: 'campaign' | 'platform' | 'flow';
  priority: number;
  enabled: boolean;
  conditionTree: BuilderGroupNode;
  actionState: BuilderActionState;
  preserveOriginalConditions?: RuleConditionPayload;
  preserveOriginalActions?: Rule['actions'];
  hasAdvancedConditions: boolean;
  hasAdvancedActions: boolean;
  conditionsDirty: boolean;
  actionsDirty: boolean;
}

const RULE_OPERATOR_OPTIONS: Array<{ value: BuilderOperator; label: string }> = [
  { value: 'eq', label: 'Equals' },
  { value: 'ne', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not contains' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'exists', label: 'Exists' },
];

const GROUP_MODE_OPTIONS: Array<{ value: BuilderGroupMode; label: string }> = [
  { value: 'all', label: 'AND' },
  { value: 'any', label: 'OR' },
  { value: 'not', label: 'NOT' },
];

function createBuilderId() {
  return `builder_${Math.random().toString(36).slice(2, 10)}`;
}

function createConditionNode(): BuilderConditionNode {
  return {
    id: createBuilderId(),
    kind: 'condition',
    conditionType: 'comparison',
    field: 'country',
    operator: 'eq',
    value: '',
  };
}

function createRepeatWindowNode(): BuilderConditionNode {
  return {
    id: createBuilderId(),
    kind: 'condition',
    conditionType: 'repeat_window',
    field: '',
    operator: 'gte',
    value: '',
    repeatSubject: 'visitor',
    repeatCount: '20',
    repeatCampaigns: '3',
    repeatHours: '24',
  };
}

function createGroupNode(mode: BuilderGroupMode = 'all'): BuilderGroupNode {
  return {
    id: createBuilderId(),
    kind: 'group',
    mode,
    children: [createConditionNode()],
  };
}

function parsePrimitiveValue(value: string, operator: BuilderOperator): string | number | boolean | null {
  if (operator === 'contains' || operator === 'not_contains' || operator === 'exists') {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && trimmed !== '') {
    return numeric;
  }
  return trimmed;
}

function serializeBuilderNode(node: BuilderNode): RuleExpressionNode {
  if (node.kind === 'condition') {
    if (node.conditionType === 'repeat_window') {
      return {
        fn: 'repeat_window_exceeded',
        args: [
          node.repeatSubject || 'visitor',
          node.repeatCount || '20',
          node.repeatCampaigns || '3',
          node.repeatHours || '24',
        ],
      };
    }

    if (node.operator === 'exists') {
      return { exists: [node.field] };
    }
    const parsedValue = parsePrimitiveValue(node.value, node.operator);
    switch (node.operator) {
      case 'eq':
        return { eq: [node.field, parsedValue] };
      case 'ne':
        return { ne: [node.field, parsedValue] };
      case 'contains':
        return { contains: [node.field, String(parsedValue)] };
      case 'not_contains':
        return { not_contains: [node.field, String(parsedValue)] };
      case 'gt':
        return { gt: [node.field, parsedValue as string | number] };
      case 'gte':
        return { gte: [node.field, parsedValue as string | number] };
      case 'lt':
        return { lt: [node.field, parsedValue as string | number] };
      case 'lte':
        return { lte: [node.field, parsedValue as string | number] };
      default:
        return { eq: [node.field, parsedValue] };
    }
  }

  if (node.mode === 'not') {
    return { not: serializeBuilderNode(node.children[0] || createConditionNode()) };
  }

  const serializedChildren = node.children.map((child) => serializeBuilderNode(child));
  return node.mode === 'any' ? { any: serializedChildren } : { all: serializedChildren };
}

function deserializeRuleConditions(payload: RuleConditionPayload | undefined): BuilderGroupNode {
  if (Array.isArray(payload) && payload.length > 0) {
    return {
      id: createBuilderId(),
      kind: 'group',
      mode: 'all',
      children: payload.map((condition) => ({
        id: createBuilderId(),
        kind: 'condition',
        conditionType: 'comparison',
        field: condition.metric,
        operator:
          condition.operator === '=='
            ? 'eq'
            : condition.operator === '!='
              ? 'ne'
              : condition.operator === '>'
                ? 'gt'
                : condition.operator === '>='
                  ? 'gte'
                  : condition.operator === '<'
                    ? 'lt'
                    : condition.operator === '<='
                      ? 'lte'
                      : condition.operator === 'contains'
                        ? 'contains'
                        : 'eq',
        value: String(condition.value ?? ''),
      })),
    };
  }

  const parseNode = (node: RuleExpressionNode | undefined): BuilderNode => {
    if (!node || typeof node !== 'object') {
      return createConditionNode();
    }
    if ('all' in node && Array.isArray(node.all)) {
      return {
        id: createBuilderId(),
        kind: 'group',
        mode: 'all',
        children: node.all.map((child) => parseNode(child)),
      };
    }
    if ('any' in node && Array.isArray(node.any)) {
      return {
        id: createBuilderId(),
        kind: 'group',
        mode: 'any',
        children: node.any.map((child) => parseNode(child)),
      };
    }
    if ('not' in node && node.not) {
      return {
        id: createBuilderId(),
        kind: 'group',
        mode: 'not',
        children: [parseNode(node.not)],
      };
    }
    if ('eq' in node) {
      return { id: createBuilderId(), kind: 'condition', conditionType: 'comparison', field: node.eq[0], operator: 'eq', value: String(node.eq[1] ?? '') };
    }
    if ('ne' in node) {
      return { id: createBuilderId(), kind: 'condition', conditionType: 'comparison', field: node.ne[0], operator: 'ne', value: String(node.ne[1] ?? '') };
    }
    if ('contains' in node) {
      return { id: createBuilderId(), kind: 'condition', conditionType: 'comparison', field: node.contains[0], operator: 'contains', value: String(node.contains[1] ?? '') };
    }
    if ('not_contains' in node) {
      return { id: createBuilderId(), kind: 'condition', conditionType: 'comparison', field: node.not_contains[0], operator: 'not_contains', value: String(node.not_contains[1] ?? '') };
    }
    if ('gt' in node) {
      return { id: createBuilderId(), kind: 'condition', conditionType: 'comparison', field: node.gt[0], operator: 'gt', value: String(node.gt[1] ?? '') };
    }
    if ('gte' in node) {
      return { id: createBuilderId(), kind: 'condition', conditionType: 'comparison', field: node.gte[0], operator: 'gte', value: String(node.gte[1] ?? '') };
    }
    if ('lt' in node) {
      return { id: createBuilderId(), kind: 'condition', conditionType: 'comparison', field: node.lt[0], operator: 'lt', value: String(node.lt[1] ?? '') };
    }
    if ('lte' in node) {
      return { id: createBuilderId(), kind: 'condition', conditionType: 'comparison', field: node.lte[0], operator: 'lte', value: String(node.lte[1] ?? '') };
    }
    if ('exists' in node) {
      return { id: createBuilderId(), kind: 'condition', conditionType: 'comparison', field: node.exists[0], operator: 'exists', value: '' };
    }
    if ('fn' in node && node.fn === 'repeat_window_exceeded') {
      return {
        id: createBuilderId(),
        kind: 'condition',
        conditionType: 'repeat_window',
        field: '',
        operator: 'gte',
        value: '',
        repeatSubject: (node.args?.[0] as 'visitor' | 'ip' | 'either') || 'visitor',
        repeatCount: node.args?.[1] || '20',
        repeatCampaigns: node.args?.[2] || '3',
        repeatHours: node.args?.[3] || '24',
      };
    }
    return createConditionNode();
  };

  const parsedRoot = parseNode(Array.isArray(payload) ? undefined : payload);
  if (parsedRoot.kind === 'group') {
    return parsedRoot;
  }

  return {
    id: createBuilderId(),
    kind: 'group',
    mode: 'all',
    children: [parsedRoot],
  };
}

function deserializeRuleAction(actions: Rule['actions'] | undefined): BuilderActionState {
  const primaryAction = Array.isArray(actions) && actions.length > 0 ? actions[0] : null;
  const type = String(primaryAction?.type || 'allow') as BuilderActionState['type'];
  const parameters = (primaryAction?.parameters || {}) as Record<string, unknown>;
  return {
    type: ['allow', 'block', 'challenge', 'redirect'].includes(type) ? type : 'allow',
    redirectUrl:
      typeof parameters.redirectUrl === 'string'
        ? parameters.redirectUrl
        : typeof parameters.url === 'string'
          ? parameters.url
          : '',
  };
}

function serializeRuleActions(actionState: BuilderActionState): Rule['actions'] {
  if (actionState.type === 'redirect') {
    return [
      {
        type: 'redirect',
        platform: 'all',
        parameters: {
          redirectUrl: actionState.redirectUrl.trim(),
        },
      },
    ];
  }

  return [
    {
      type: actionState.type,
      platform: 'all',
      parameters: {},
    },
  ];
}

function normalizeGroupNode(node: BuilderGroupNode): BuilderGroupNode {
  if (node.mode === 'not') {
    return {
      ...node,
      children: [node.children[0] || createConditionNode()],
    };
  }

  return {
    ...node,
    children: node.children.length > 0 ? node.children : [createConditionNode()],
  };
}

function updateBuilderTreeNode(
  node: BuilderNode,
  targetId: string,
  updater: (node: BuilderNode) => BuilderNode
): BuilderNode {
  if (node.id === targetId) {
    const updated = updater(node);
    return updated.kind === 'group' ? normalizeGroupNode(updated) : updated;
  }

  if (node.kind === 'condition') {
    return node;
  }

  return normalizeGroupNode({
    ...node,
    children: node.children.map((child) => updateBuilderTreeNode(child, targetId, updater)),
  });
}

function addBuilderChild(tree: BuilderGroupNode, groupId: string, child: BuilderNode): BuilderGroupNode {
  return updateBuilderTreeNode(tree, groupId, (node) => {
    if (node.kind !== 'group') {
      return node;
    }

    const nextChildren = node.mode === 'not' ? [child] : [...node.children, child];
    return {
      ...node,
      children: nextChildren,
    };
  }) as BuilderGroupNode;
}

function removeBuilderNode(tree: BuilderGroupNode, targetId: string): BuilderGroupNode {
  const pruneNode = (node: BuilderNode, isRoot = false): BuilderNode | null => {
    if (!isRoot && node.id === targetId) {
      return null;
    }

    if (node.kind === 'condition') {
      return node;
    }

    const nextChildren = node.children
      .map((child) => pruneNode(child))
      .filter((child): child is BuilderNode => Boolean(child));

    return normalizeGroupNode({
      ...node,
      children: nextChildren,
    });
  };

  return (pruneNode(tree, true) as BuilderGroupNode) || createGroupNode();
}

function supportsVisualConditionPayload(payload: RuleConditionPayload | undefined): boolean {
  if (!payload) {
    return true;
  }

  if (Array.isArray(payload)) {
    return payload.every((condition) =>
      ['==', '!=', '>', '>=', '<', '<=', 'contains'].includes(String(condition.operator || ''))
    );
  }

  const walk = (node: RuleExpressionNode): boolean => {
    if ('all' in node) {
      return Array.isArray(node.all) && node.all.every((child) => walk(child));
    }
    if ('any' in node) {
      return Array.isArray(node.any) && node.any.every((child) => walk(child));
    }
    if ('not' in node) {
      return Boolean(node.not) && walk(node.not);
    }

    return (
      'eq' in node ||
      'ne' in node ||
      'contains' in node ||
      'not_contains' in node ||
      'gt' in node ||
      'gte' in node ||
      'lt' in node ||
      'lte' in node ||
      'exists' in node ||
      ('fn' in node && node.fn === 'repeat_window_exceeded')
    );
  };

  return walk(payload);
}

function supportsVisualActions(actions: Rule['actions'] | undefined): boolean {
  if (!Array.isArray(actions) || actions.length === 0) {
    return true;
  }

  const primaryAction = actions[0];
  return ['allow', 'block', 'challenge', 'redirect'].includes(String(primaryAction.type || ''));
}

function createDefaultRuleFormState(): RuleFormState {
  return {
    name: '',
    description: '',
    type: 'campaign',
    priority: 1,
    enabled: true,
    conditionTree: createGroupNode(),
    actionState: {
      type: 'allow',
      redirectUrl: '',
    },
    preserveOriginalConditions: undefined,
    preserveOriginalActions: undefined,
    hasAdvancedConditions: false,
    hasAdvancedActions: false,
    conditionsDirty: false,
    actionsDirty: false,
  };
}

function createRuleFormStateFromRule(rule: Rule): RuleFormState {
  const hasAdvancedConditions = !supportsVisualConditionPayload(rule.conditions);
  const hasAdvancedActions = !supportsVisualActions(rule.actions);

  return {
    name: rule.name,
    description: rule.description || '',
    type: rule.type,
    priority: rule.priority,
    enabled: rule.enabled,
    conditionTree: deserializeRuleConditions(rule.conditions),
    actionState: deserializeRuleAction(rule.actions),
    preserveOriginalConditions: hasAdvancedConditions ? rule.conditions : undefined,
    preserveOriginalActions: hasAdvancedActions ? rule.actions : undefined,
    hasAdvancedConditions,
    hasAdvancedActions,
    conditionsDirty: false,
    actionsDirty: false,
  };
}

function SectionCard({
  title,
  description,
  open = true,
  onToggle,
  actions,
  children,
}: {
  title: string;
  description: string;
  open?: boolean;
  onToggle?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const canToggle = typeof onToggle === 'function';

  return (
    <section className="rounded-lg border border-border-default bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-fg-default">{title}</h2>
            {canToggle ? (
              <button
                type="button"
                onClick={onToggle}
                className="inline-flex items-center gap-1 rounded border border-border-default px-2 py-1 text-[11px] font-medium text-fg-muted hover:bg-surface-container hover:text-fg-default"
                aria-expanded={open}
              >
                {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {open ? 'Collapse' : 'Expand'}
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-fg-muted">{description}</p>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {open ? <div className="border-t border-border-default p-4 pt-0">{children}</div> : null}
    </section>
  );
}

export const RuleManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentQuery = searchParams.toString();
  const bootstrap = readBootstrapPage<{ rules?: Rule[]; meta?: { total?: number } }>('rules');
  const hasBootstrap = Boolean(bootstrap);
  const [rules, setRules] = useState<Rule[]>(Array.isArray(bootstrap?.data?.rules) ? bootstrap.data.rules : []);
  const [loading, setLoading] = useState(!hasBootstrap);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'campaign' | 'platform' | 'flow'>(
    (bootstrap?.scope?.type as 'all' | 'campaign' | 'platform' | 'flow') || 'all'
  );
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'paused' | 'deleted'>(
    (bootstrap?.scope?.status as 'all' | 'active' | 'paused' | 'deleted') || 'all'
  );
  const [total, setTotal] = useState(Number(bootstrap?.data?.meta?.total || 0));
  const [saving, setSaving] = useState(false);
  const [conflictReport, setConflictReport] = useState<RuleConflictReport | null>(null);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [globalScopeConfig, setGlobalScopeConfig] = useState<AutoruleScopeConfig | null>(null);
  const [globalScopeMode, setGlobalScopeMode] = useState<AutoruleScopeMode>('inherit');
  const [globalScopeEnabled, setGlobalScopeEnabled] = useState(true);
  const [globalScopeBindings, setGlobalScopeBindings] = useState<Array<{ ruleId: string; priority: number }>>([]);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [trafficSourceConfigs, setTrafficSourceConfigs] = useState<AutoruleScopeConfig[]>([]);
  const [selectedTrafficSourceIds, setSelectedTrafficSourceIds] = useState<string[]>([]);
  const [batchScopeMode, setBatchScopeMode] = useState<AutoruleScopeMode>('inherit');
  const [batchScopeEnabled, setBatchScopeEnabled] = useState(true);
  const [batchScopeBindings, setBatchScopeBindings] = useState<Array<{ ruleId: string; priority: number }>>([]);
  const [scopeSaving, setScopeSaving] = useState(false);
  const [testBenchInput, setTestBenchInput] = useState<string>(
    '{\n  "roi": -0.25,\n  "clicks": 120,\n  "conversions": 1,\n  "country": "US"\n}'
  );
  const [testBenchRunning, setTestBenchRunning] = useState(false);
  const [testBenchResult, setTestBenchResult] = useState<RuleTestBenchResult | null>(null);
  const [testBenchError, setTestBenchError] = useState<string | null>(null);
  const [showDeletedRules, setShowDeletedRules] = useState(
    (bootstrap?.scope?.status as 'all' | 'active' | 'paused' | 'deleted' | undefined) === 'deleted'
  );
  const [showConflictDetection, setShowConflictDetection] = useState(false);
  const [showTestBench, setShowTestBench] = useState(false);
  const skipInitialBootstrapLoadRef = useRef(Boolean(bootstrap?.data?.rules));

  const [formData, setFormData] = useState<RuleFormState>(() => createDefaultRuleFormState());
  const winningRuleResult = useMemo(() => {
    if (!testBenchResult?.winner) {
      return null;
    }

    return testBenchResult.ruleResults.find((result) => result.ruleId === testBenchResult.winner?.ruleId) || null;
  }, [testBenchResult]);

  const updateFormField = (field: 'name' | 'description', value: string) => {
    const maxLength = field === 'name' ? FIELD_MAX_LENGTH.RULE_NAME : FIELD_MAX_LENGTH.RULE_DESCRIPTION;
    setFormData((prev) => ({ ...prev, [field]: clampInput(value, maxLength) }));
  };

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const nextUrl = new URL(window.location.href);
      if (selectedType === 'all') {
        nextUrl.searchParams.delete('type');
      } else {
        nextUrl.searchParams.set('type', selectedType);
      }
      if (selectedStatus === 'all') {
        nextUrl.searchParams.delete('status');
      } else {
        nextUrl.searchParams.set('status', selectedStatus);
      }

      const nextQuery = nextUrl.searchParams.toString();
      if (nextQuery !== currentQuery) {
        setSearchParams(nextUrl.searchParams, { replace: true });
        return;
      }

      const bundle = await loadBootstrapForLocation({ url: nextUrl, force: true }).catch(() => null);
      if (bundle?.page === 'rules') {
        setRules(Array.isArray(bundle.data?.rules) ? bundle.data.rules as Rule[] : []);
        setTotal(Number(bundle.data?.meta?.total || 0));
        return;
      }

      const result = await fetchRules({
        type: selectedType === 'all' ? undefined : selectedType,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
      });
      setRules(result.list);
      setTotal(result.meta.total);
    } catch (err) {
      console.error('Failed to load rules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, [currentQuery, selectedStatus, selectedType, setSearchParams]);

  const loadConflictReport = useCallback(async () => {
    setConflictLoading(true);
    try {
      const report = await fetchRuleConflicts();
      setConflictReport(report);
    } catch (err) {
      console.error('Failed to load rule conflict report:', err);
      setConflictReport(null);
    } finally {
      setConflictLoading(false);
    }
  }, []);

  const loadScopeAssignments = useCallback(async () => {
    try {
      const [globalConfig, scopeConfigs, sourceList] = await Promise.all([
        fetchGlobalAutoruleScopeConfig().catch(() => null),
        fetchTrafficSourceAutoruleScopeConfigs().catch(() => []),
        fetchTrafficSources(false).catch(() => []),
      ]);

      setGlobalScopeConfig(globalConfig);
      setGlobalScopeMode(globalConfig?.mode || 'inherit');
      setGlobalScopeEnabled(globalConfig?.enabled !== false);
      setGlobalScopeBindings(
        Array.isArray(globalConfig?.bindings)
          ? globalConfig.bindings.map((binding) => ({
              ruleId: binding.ruleId,
              priority: Number(binding.priority || 0),
            }))
          : []
      );
      setTrafficSourceConfigs(Array.isArray(scopeConfigs) ? scopeConfigs : []);
      setTrafficSources(Array.isArray(sourceList) ? sourceList : []);
    } catch (err) {
      console.error('Failed to load autorule scope assignments:', err);
    }
  }, []);

  useEffect(() => {
    if (skipInitialBootstrapLoadRef.current) {
      skipInitialBootstrapLoadRef.current = false;
      return;
    }

    loadRules();
  }, [loadRules]);

  useEffect(() => {
    void loadConflictReport();
  }, [loadConflictReport, rules.length]);

  useEffect(() => {
    void loadScopeAssignments();
  }, [loadScopeAssignments]);

  const filteredRules = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return rules.filter((rule) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        rule.name.toLowerCase().includes(normalizedSearch) ||
        String(rule.description || '').toLowerCase().includes(normalizedSearch);
      const matchesType = selectedType === 'all' || rule.type === selectedType;
      const matchesStatus = selectedStatus === 'all' ? true : rule.status === selectedStatus;
      const passesDeletedVisibility =
        selectedStatus === 'deleted' || showDeletedRules ? true : rule.status !== 'deleted';

      return matchesSearch && matchesType && matchesStatus && passesDeletedVisibility;
    });
  }, [rules, searchTerm, selectedType, selectedStatus, showDeletedRules]);

  const activeRuleCount = useMemo(() => rules.filter((rule) => rule.status === 'active').length, [rules]);
  const pausedRuleCount = useMemo(() => rules.filter((rule) => rule.status === 'paused').length, [rules]);
  const deletedRuleCount = useMemo(() => rules.filter((rule) => rule.status === 'deleted').length, [rules]);
  const activeRules = useMemo(
    () => rules.filter((rule) => rule.enabled && rule.status === 'active'),
    [rules]
  );
  const trafficSourceConfigMap = useMemo(
    () => new Map(trafficSourceConfigs.map((config) => [config.scopeId, config])),
    [trafficSourceConfigs]
  );

  const handleCreate = () => {
    setIsEditMode(false);
    setSelectedRule(null);
    setFormData(createDefaultRuleFormState());
    setIsModalOpen(true);
  };

  const handleEdit = (rule: Rule) => {
    setIsEditMode(true);
    setSelectedRule(rule);
    setFormData(createRuleFormStateFromRule(rule));
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await deleteRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      setTotal(prev => prev - 1);
      await loadConflictReport();
    } catch (err) {
      console.error('Failed to delete rule:', err);
      alert('Failed to delete rule');
    }
  };

  const handleToggleStatus = async (rule: Rule) => {
    try {
      const updated = rule.enabled ? await disableRule(rule.id) : await enableRule(rule.id);
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
      await loadConflictReport();
    } catch (err) {
      console.error('Failed to toggle rule status:', err);
      alert('Failed to toggle rule status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.actionState.type === 'redirect' && !formData.actionState.redirectUrl.trim()) {
      alert('Redirect URL is required when the action is redirect.');
      return;
    }

    setSaving(true);

    try {
      const conditions =
        formData.hasAdvancedConditions && !formData.conditionsDirty && formData.preserveOriginalConditions
          ? formData.preserveOriginalConditions
          : serializeBuilderNode(formData.conditionTree);
      const actions =
        formData.hasAdvancedActions && !formData.actionsDirty && formData.preserveOriginalActions
          ? formData.preserveOriginalActions
          : serializeRuleActions(formData.actionState);

      if (isEditMode && selectedRule) {
        const updateData: UpdateRuleDTO = {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          enabled: formData.enabled,
          conditions,
          actions,
        };
        const updated = await updateRule(selectedRule.id, updateData);
        setRules(prev => prev.map(r => r.id === selectedRule.id ? updated : r));
      } else {
        const createData: CreateRuleDTO = {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          enabled: formData.enabled,
          conditions,
          actions,
        };
        const created = await createRule(createData);
        setRules(prev => [created, ...prev]);
        setTotal(prev => prev + 1);
      }

      setIsModalOpen(false);
      setFormData(createDefaultRuleFormState());
      await loadConflictReport();
    } catch (err) {
      console.error('Failed to save rule:', err);
      alert(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleRunTestBench = async () => {
    setTestBenchRunning(true);
    setTestBenchError(null);
    try {
      const parsed = JSON.parse(testBenchInput);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setTestBenchError('Test context must be a JSON object.');
        return;
      }

      const result = await runRuleTestBench({
        context: parsed as Record<string, unknown>,
      });
      setTestBenchResult(result);
    } catch (err) {
      setTestBenchError(err instanceof Error ? err.message : 'Failed to run test bench');
    } finally {
      setTestBenchRunning(false);
    }
  };

  const saveGlobalScope = async () => {
    setScopeSaving(true);
    try {
      const config = await saveGlobalAutoruleScopeConfig({
        mode: globalScopeMode,
        enabled: globalScopeEnabled,
        bindings: globalScopeBindings.filter((binding) => binding.ruleId),
      });
      setGlobalScopeConfig(config);
      await loadScopeAssignments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save global scope config');
    } finally {
      setScopeSaving(false);
    }
  };

  const saveBatchTrafficSourceScope = async () => {
    if (selectedTrafficSourceIds.length === 0) {
      alert('Select at least one traffic source');
      return;
    }

    setScopeSaving(true);
    try {
      await batchApplyTrafficSourceAutoruleScopeConfig(selectedTrafficSourceIds, {
        mode: batchScopeMode,
        enabled: batchScopeEnabled,
        bindings: batchScopeBindings.filter((binding) => binding.ruleId),
      });
      await loadScopeAssignments();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to apply traffic source config');
    } finally {
      setScopeSaving(false);
    }
  };

  const updateConditionTree = (updater: (current: BuilderGroupNode) => BuilderGroupNode) => {
    setFormData((current) => ({
      ...current,
      conditionTree: updater(current.conditionTree),
      conditionsDirty: true,
      preserveOriginalConditions: undefined,
      hasAdvancedConditions: false,
    }));
  };

  const updateActionState = (updater: (current: BuilderActionState) => BuilderActionState) => {
    setFormData((current) => ({
      ...current,
      actionState: updater(current.actionState),
      actionsDirty: true,
      preserveOriginalActions: undefined,
      hasAdvancedActions: false,
    }));
  };

  const ruleConditionPreview = useMemo(
    () => JSON.stringify(serializeBuilderNode(formData.conditionTree), null, 2),
    [formData.conditionTree]
  );
  const ruleActionPreview = useMemo(
    () => JSON.stringify(serializeRuleActions(formData.actionState), null, 2),
    [formData.actionState]
  );

  const renderBuilderNode = (node: BuilderNode, depth = 0): React.ReactNode => {
    if (node.kind === 'condition') {
      if (node.conditionType === 'repeat_window') {
        return (
          <div
            key={node.id}
            className={cn(
              'grid gap-3 rounded-lg border border-border-default bg-surface-container p-3',
              depth > 0 ? 'ml-4' : ''
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-fg-muted">Repeat Window</div>
                <div className="text-xs text-fg-muted">Detect repeated visits within a configurable hour window.</div>
              </div>
              <button
                type="button"
                onClick={() => updateConditionTree((current) => removeBuilderNode(current, node.id))}
                className="rounded border border-border-default text-fg-muted hover:border-danger hover:text-danger"
                title="Remove condition"
              >
                <Trash2 size={16} className="mx-auto" />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <select
                value={node.repeatSubject || 'visitor'}
                onChange={(event) =>
                  updateConditionTree((current) =>
                    updateBuilderTreeNode(current, node.id, (target) =>
                      target.kind === 'condition'
                        ? { ...target, repeatSubject: event.target.value as 'visitor' | 'ip' | 'either' }
                        : target
                    ) as BuilderGroupNode
                  )
                }
                className="rounded border border-border-default bg-surface px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg"
              >
                <option value="visitor">By Visitor</option>
                <option value="ip">By IP</option>
                <option value="either">Visitor or IP</option>
              </select>
              <input
                type="number"
                min="1"
                value={node.repeatCount || '20'}
                onChange={(event) =>
                  updateConditionTree((current) =>
                    updateBuilderTreeNode(current, node.id, (target) =>
                      target.kind === 'condition' ? { ...target, repeatCount: event.target.value } : target
                    ) as BuilderGroupNode
                  )
                }
                placeholder="Min visits"
                className="rounded border border-border-default bg-surface px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg"
              />
              <input
                type="number"
                min="1"
                value={node.repeatCampaigns || '3'}
                onChange={(event) =>
                  updateConditionTree((current) =>
                    updateBuilderTreeNode(current, node.id, (target) =>
                      target.kind === 'condition' ? { ...target, repeatCampaigns: event.target.value } : target
                    ) as BuilderGroupNode
                  )
                }
                placeholder="Min campaigns"
                className="rounded border border-border-default bg-surface px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg"
              />
              <input
                type="number"
                min="1"
                value={node.repeatHours || '24'}
                onChange={(event) =>
                  updateConditionTree((current) =>
                    updateBuilderTreeNode(current, node.id, (target) =>
                      target.kind === 'condition' ? { ...target, repeatHours: event.target.value } : target
                    ) as BuilderGroupNode
                  )
                }
                placeholder="Window hours"
                className="rounded border border-border-default bg-surface px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg"
              />
            </div>
          </div>
        );
      }

      return (
        <div
          key={node.id}
          className={cn(
            'grid gap-3 rounded-lg border border-border-default bg-surface-container p-3',
            depth > 0 ? 'ml-4' : ''
          )}
        >
          {(() => {
            const fieldMeta = getConditionFieldMeta(node.field);
            const placeholder = fieldMeta.placeholder || 'Value';

            return (
              <>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),minmax(0,1fr),minmax(0,1fr),40px]">
            <select
              value={node.field}
              onChange={(event) =>
                updateConditionTree((current) =>
                  updateBuilderTreeNode(current, node.id, (target) =>
                    target.kind === 'condition' ? { ...target, field: event.target.value } : target
                  ) as BuilderGroupNode
                )
              }
              className="rounded border border-border-default bg-surface px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg"
            >
              {RULE_BUILDER_FIELD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={node.operator}
              onChange={(event) =>
                updateConditionTree((current) =>
                  updateBuilderTreeNode(current, node.id, (target) => {
                    if (target.kind !== 'condition') {
                      return target;
                    }

                    return {
                      ...target,
                      operator: event.target.value as BuilderOperator,
                      value: event.target.value === 'exists' ? '' : target.value,
                    };
                  }) as BuilderGroupNode
                )
              }
              className="rounded border border-border-default bg-surface px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg"
            >
              {RULE_OPERATOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {node.operator === 'exists' ? (
              <div className="flex items-center rounded border border-dashed border-border-default px-3 py-2 text-sm text-fg-muted">
                No value needed
              </div>
            ) : (
                <input
                  type="text"
                  value={node.value}
                onChange={(event) =>
                  updateConditionTree((current) =>
                    updateBuilderTreeNode(current, node.id, (target) =>
                      target.kind === 'condition' ? { ...target, value: event.target.value } : target
                    ) as BuilderGroupNode
                  )
                }
                placeholder={placeholder}
                className="rounded border border-border-default bg-surface px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg"
              />
            )}
            <button
              type="button"
              onClick={() => updateConditionTree((current) => removeBuilderNode(current, node.id))}
              className="rounded border border-border-default text-fg-muted hover:border-danger hover:text-danger"
              title="Remove condition"
            >
              <Trash2 size={16} className="mx-auto" />
            </button>
          </div>
          {fieldMeta.helpText ? <p className="text-[11px] text-fg-muted">{fieldMeta.helpText}</p> : null}
              </>
            );
          })()}
        </div>
      );
    }

    return (
      <div
        key={node.id}
        className={cn(
          'space-y-3 rounded-lg border border-border-default bg-surface p-3',
          depth > 0 ? 'ml-4 border-dashed' : ''
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-muted">Group</span>
            <select
              value={node.mode}
              onChange={(event) =>
                updateConditionTree((current) =>
                  updateBuilderTreeNode(current, node.id, (target) =>
                    target.kind === 'group'
                      ? normalizeGroupNode({
                          ...target,
                          mode: event.target.value as BuilderGroupMode,
                        })
                      : target
                  ) as BuilderGroupNode
                )
              }
              className="rounded border border-border-default bg-surface-container px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg"
            >
              {GROUP_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="rounded-full bg-surface-container px-2 py-1 text-[11px] text-fg-muted">
              {node.mode === 'not' ? '1 child' : `${node.children.length} conditions`}
            </span>
          </div>
          {depth > 0 ? (
            <button
              type="button"
              onClick={() => updateConditionTree((current) => removeBuilderNode(current, node.id))}
              className="rounded border border-border-default px-3 py-1.5 text-xs text-fg-muted hover:border-danger hover:text-danger"
            >
              Remove Group
            </button>
          ) : null}
        </div>

        <div className="space-y-3">
          {node.children.map((child) => renderBuilderNode(child, depth + 1))}
        </div>

        {node.mode === 'not' ? (
          <div className="rounded border border-dashed border-border-default px-3 py-2 text-xs text-fg-muted">
            NOT groups evaluate only the first child. Change the mode if you need multiple branches.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateConditionTree((current) => addBuilderChild(current, node.id, createConditionNode()))}
              className="inline-flex items-center gap-2 rounded border border-border-default px-3 py-2 text-xs hover:bg-surface-container"
            >
              <Plus size={14} />
              Add Condition
            </button>
            <button
              type="button"
              onClick={() => updateConditionTree((current) => addBuilderChild(current, node.id, createGroupNode('all')))}
              className="inline-flex items-center gap-2 rounded border border-border-default px-3 py-2 text-xs hover:bg-surface-container"
            >
              <Plus size={14} />
              Add Group
            </button>
            <button
              type="button"
              onClick={() => updateConditionTree((current) => addBuilderChild(current, node.id, createRepeatWindowNode()))}
              className="inline-flex items-center gap-2 rounded border border-border-default px-3 py-2 text-xs hover:bg-surface-container"
            >
              <Plus size={14} />
              Add Repeat Window
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-accent-fg" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-danger">
        <AlertCircle size={48} className="mb-4" />
        <p className="text-lg font-medium">{error}</p>
        <button 
          onClick={loadRules}
          className="mt-4 px-4 py-2 bg-surface border border-border-default rounded-md text-fg-default hover:bg-surface-container transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-fg-default">Autorules</h1>
          <p className="text-sm text-fg-muted">
            Automate traffic governance and campaign optimization with reusable rules, scoped rollout, and repeat-window controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadRules}
            className="p-2 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-all"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={handleCreate} 
            className="flex items-center gap-2 px-4 py-2 bg-accent-fg text-white text-sm font-medium hover:bg-accent-fg/90 transition-all rounded"
          >
            <Plus size={18} />
            Create Rule
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4 rounded-lg border border-border-default bg-surface p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded border border-border-default bg-surface-container p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-muted">Active</div>
            <div className="mt-2 text-2xl font-display font-bold text-fg-default">{activeRuleCount}</div>
          </div>
          <div className="rounded border border-border-default bg-surface-container p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-muted">Paused</div>
            <div className="mt-2 text-2xl font-display font-bold text-fg-default">{pausedRuleCount}</div>
          </div>
          <div className="rounded border border-border-default bg-surface-container p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-muted">Deleted</div>
            <div className="mt-2 text-2xl font-display font-bold text-fg-default">{deletedRuleCount}</div>
          </div>
          <div className="rounded border border-border-default bg-surface-container p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-muted">Visible Now</div>
            <div className="mt-2 text-2xl font-display font-bold text-fg-default">{filteredRules.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr),160px,160px,auto,auto]">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={16} />
            <input 
              type="text" 
              placeholder="Search rules, descriptions, or signals..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg transition-all"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
            className="px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
          >
            <option value="all">All Types</option>
            <option value="campaign">Campaign</option>
            <option value="platform">Platform</option>
            <option value="flow">Flow</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
            className="px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="deleted">Deleted</option>
          </select>
          <button
            type="button"
            onClick={() => setShowDeletedRules((current) => !current)}
            className="inline-flex items-center justify-center gap-2 rounded border border-border-default px-3 py-2 text-sm text-fg-default hover:bg-surface-container"
          >
            {showDeletedRules ? <EyeOff size={16} /> : <Eye size={16} />}
            {showDeletedRules ? 'Hide Deleted' : 'Show Deleted'}
          </button>
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <span>{total} total</span>
            <div className="h-6 w-px bg-border-default" />
            <span>{filteredRules.length} visible</span>
          </div>
        </div>

        <div className="rounded border border-border-default bg-surface-container px-3 py-3 text-xs text-fg-muted">
          Deleted rules are deprioritized by default so active governance stays on the first screen. Switch them back on when auditing history.
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="bg-surface rounded-lg border border-border-default p-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-fg-default">Scope Assignment / Global</h3>
            <p className="mt-1 text-xs text-fg-muted">Global config is used only when campaign and traffic source do not override it.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={globalScopeMode}
              onChange={(e) => setGlobalScopeMode(e.target.value as AutoruleScopeMode)}
              className="px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
            >
              <option value="inherit">Inherit</option>
              <option value="off">Off</option>
              <option value="rules">Rules</option>
              <option value="whitelist_gate">Whitelist gate</option>
            </select>
            <label className="flex items-center gap-2 rounded border border-border-default px-3 py-2 text-sm">
              <input type="checkbox" checked={globalScopeEnabled} onChange={(e) => setGlobalScopeEnabled(e.target.checked)} />
              Enabled
            </label>
          </div>
          {globalScopeMode === 'rules' && (
            <div className="space-y-3">
              {globalScopeBindings.map((binding, index) => (
                <div key={`global-binding-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr),110px,40px]">
                  <select
                    value={binding.ruleId}
                    onChange={(e) =>
                      setGlobalScopeBindings((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, ruleId: e.target.value } : item
                        )
                      )
                    }
                    className="px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                  >
                    <option value="">Select rule</option>
                    {activeRules.map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={binding.priority}
                    onChange={(e) =>
                      setGlobalScopeBindings((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, priority: Number(e.target.value) } : item
                        )
                      )
                    }
                    className="px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                  />
                  <button
                    onClick={() => setGlobalScopeBindings((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="border border-border-default hover:border-danger hover:text-danger"
                  >
                    <X size={16} className="mx-auto" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setGlobalScopeBindings((current) => [...current, { ruleId: '', priority: current.length }])}
                className="inline-flex items-center gap-2 px-3 py-2 border border-border-default rounded hover:bg-surface-container"
              >
                <Plus size={14} />
                Add binding
              </button>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span>{globalScopeConfig?.updatedAt ? `Updated ${new Date(globalScopeConfig.updatedAt).toLocaleString()}` : 'No explicit global config yet'}</span>
            <button
              onClick={() => void saveGlobalScope()}
              disabled={scopeSaving}
              className="inline-flex items-center gap-2 px-3 py-2 bg-accent-fg text-white rounded hover:bg-accent-fg/90 disabled:opacity-60"
            >
              {scopeSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Save Global
            </button>
          </div>
        </div>

        <div className="bg-surface rounded-lg border border-border-default p-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-fg-default">Traffic Source Batch Apply</h3>
            <p className="mt-1 text-xs text-fg-muted">Batch-apply one governance mode and binding set to multiple traffic sources.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={batchScopeMode}
              onChange={(e) => setBatchScopeMode(e.target.value as AutoruleScopeMode)}
              className="px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
            >
              <option value="inherit">Inherit</option>
              <option value="off">Off</option>
              <option value="rules">Rules</option>
              <option value="whitelist_gate">Whitelist gate</option>
            </select>
            <label className="flex items-center gap-2 rounded border border-border-default px-3 py-2 text-sm">
              <input type="checkbox" checked={batchScopeEnabled} onChange={(e) => setBatchScopeEnabled(e.target.checked)} />
              Enabled
            </label>
          </div>
          {batchScopeMode === 'rules' && (
            <div className="space-y-3">
              {batchScopeBindings.map((binding, index) => (
                <div key={`batch-binding-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr),110px,40px]">
                  <select
                    value={binding.ruleId}
                    onChange={(e) =>
                      setBatchScopeBindings((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, ruleId: e.target.value } : item
                        )
                      )
                    }
                    className="px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                  >
                    <option value="">Select rule</option>
                    {activeRules.map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={binding.priority}
                    onChange={(e) =>
                      setBatchScopeBindings((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, priority: Number(e.target.value) } : item
                        )
                      )
                    }
                    className="px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                  />
                  <button
                    onClick={() => setBatchScopeBindings((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="border border-border-default hover:border-danger hover:text-danger"
                  >
                    <X size={16} className="mx-auto" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setBatchScopeBindings((current) => [...current, { ruleId: '', priority: current.length }])}
                className="inline-flex items-center gap-2 px-3 py-2 border border-border-default rounded hover:bg-surface-container"
              >
                <Plus size={14} />
                Add binding
              </button>
            </div>
          )}
          <div className="max-h-48 overflow-auto rounded border border-border-default">
            {trafficSources.map((source) => {
              const config = trafficSourceConfigMap.get(source.id);
              const checked = selectedTrafficSourceIds.includes(source.id);
              return (
                <label key={source.id} className="flex items-center justify-between gap-3 border-b border-border-default px-3 py-2 text-sm last:border-b-0">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelectedTrafficSourceIds((current) =>
                          e.target.checked ? [...current, source.id] : current.filter((id) => id !== source.id)
                        )
                      }
                    />
                    <span>{source.name}</span>
                  </span>
                  <span className="text-xs text-fg-muted">{config?.enabled ? config.mode : 'inherit global'}</span>
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs text-fg-muted">
            <span>{selectedTrafficSourceIds.length} selected</span>
            <button
              onClick={() => void saveBatchTrafficSourceScope()}
              disabled={scopeSaving}
              className="inline-flex items-center gap-2 px-3 py-2 bg-accent-fg text-white rounded hover:bg-accent-fg/90 disabled:opacity-60"
            >
              {scopeSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Apply to Sources
            </button>
          </div>
        </div>
      </div>

      {/* Conflict Detection */}
      <SectionCard
        title="Rule Conflict Detection"
        description="Detect duplicate priorities, overlapping conditions, and contradictory actions."
        open={showConflictDetection}
        onToggle={() => setShowConflictDetection((current) => !current)}
        actions={
          <button
            onClick={() => void loadConflictReport()}
            className="px-3 py-1.5 text-xs border border-border-default rounded hover:bg-surface-container"
            disabled={conflictLoading}
          >
            {conflictLoading ? 'Checking...' : 'Recheck'}
          </button>
        }
      >
        {conflictReport ? (
          <>
            <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted">
              <span>Total active rules: {conflictReport.totalRules}</span>
              <span>Conflicts: {conflictReport.conflictCount}</span>
              <span>High severity: {conflictReport.highSeverityCount}</span>
            </div>
            {conflictReport.conflicts.length > 0 ? (
              <div className="space-y-2">
                {conflictReport.conflicts.map((conflict, index) => (
                  <div
                    key={`${conflict.type}-${conflict.priority}-${index}`}
                    className={cn(
                      'rounded border px-3 py-2 text-sm',
                      conflict.severity === 'high'
                        ? 'border-danger/30 bg-danger/10 text-danger'
                        : 'border-warning/30 bg-warning/10 text-warning'
                    )}
                  >
                    <div className="font-medium">
                      [{conflict.type}] priority {conflict.priority}
                    </div>
                    <div className="mt-1 text-xs opacity-90">{conflict.details}</div>
                    <div className="mt-1 text-xs">Rules: {conflict.ruleNames.join(', ')}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                No conflict detected in active rules.
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-fg-muted">Conflict report unavailable.</div>
        )}
      </SectionCard>

      {/* Decision Path Test Bench */}
      <SectionCard
        title="Decision Path Test Bench"
        description="Simulate runtime context to inspect matched rules and winning action path."
        open={showTestBench}
        onToggle={() => setShowTestBench((current) => !current)}
      >
        <textarea
          rows={7}
          value={testBenchInput}
          onChange={(event) => setTestBenchInput(event.target.value)}
          className="w-full rounded border border-border-default bg-surface-container px-3 py-2 text-xs font-mono text-fg-default focus:outline-none focus:border-accent-fg"
          placeholder='{"roi": -0.2, "clicks": 120, "country": "US"}'
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleRunTestBench()}
            disabled={testBenchRunning}
            className="px-3 py-1.5 text-xs bg-accent-fg text-white rounded hover:bg-accent-fg/90 disabled:opacity-50"
          >
            {testBenchRunning ? 'Running...' : 'Run Test Bench'}
          </button>
          {testBenchError ? <span className="text-xs text-danger">{testBenchError}</span> : null}
        </div>

        {testBenchResult ? (
          <div className="space-y-2 rounded border border-border-default p-3 bg-surface-container">
            <div className="text-xs text-fg-muted">Evaluated at: {new Date(testBenchResult.evaluatedAt).toLocaleString()}</div>
            <div className="text-sm">
              Winner:{' '}
              {testBenchResult.winner ? (
                <span className="font-medium text-success">
                  {testBenchResult.winner.ruleName} (P{testBenchResult.winner.priority}) {'->'} {testBenchResult.winner.actionSummary}
                </span>
              ) : (
                <span className="text-warning">No rule matched.</span>
              )}
            </div>
            {winningRuleResult?.reason ? (
              <div className="text-xs text-fg-muted">
                Why it won: {formatMatchedRuleReasonLabel(winningRuleResult.reason)}
              </div>
            ) : null}
            <div className="space-y-1">
              {testBenchResult.ruleResults.map((result) => (
                <div
                  key={result.ruleId}
                  className={cn(
                    'rounded border px-2 py-1 text-xs',
                    result.matched
                      ? 'border-success/30 bg-success/10 text-success'
                      : result.skipped
                        ? 'border-border-default bg-surface text-fg-muted'
                        : 'border-border-default bg-surface-container-low text-fg-default'
                  )}
                >
                  {result.ruleName} (P{result.priority}) - {result.skipped ? formatMatchedRuleReasonLabel(result.reason) : result.matched ? `Matched | ${formatMatchedRuleReasonLabel(result.reason)}` : 'Not matched'}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </SectionCard>

      {/* Rules Table */}
      <div className="bg-surface rounded-lg border border-border-default overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default px-4 py-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-fg-default">Rules Table</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Active governance stays front-and-center, while deleted history remains available on demand.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <span>{filteredRules.length} rows shown</span>
            <div className="h-5 w-px bg-border-default" />
            <span>{deletedRuleCount} deleted in history</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {filteredRules.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-border-default">
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wider">Enabled</th>
                  <th className="px-4 py-3 text-xs font-medium text-fg-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredRules.map((rule) => (
                  <tr key={rule.id} className="group hover:bg-surface-container transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-fg-default" title={rule.name}>
                          {truncateLabel(rule.name, FIELD_MAX_LENGTH.RULE_NAME)}
                        </span>
                        {rule.description && (
                          <span className="max-w-xs truncate text-xs text-fg-muted" title={rule.description}>
                            {truncateLabel(rule.description, FIELD_MAX_LENGTH.RULE_DESCRIPTION)}
                          </span>
                        )}
                        <span className="text-xs text-fg-muted">{new Date(rule.updatedAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded",
                        rule.type === 'campaign' ? "bg-accent-fg/10 text-accent-fg" : 
                        rule.type === 'platform' ? "bg-success/10 text-success" : 
                        "bg-warning/10 text-warning"
                      )}>
                        {rule.type.charAt(0).toUpperCase() + rule.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-fg-default">{rule.priority}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded",
                        rule.status === 'active' ? "bg-success/10 text-success" :
                        rule.status === 'paused' ? "bg-warning/10 text-warning" : 
                        "bg-fg-muted/10 text-fg-muted"
                      )}>
                        {rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(rule)}
                        className={cn(
                          "p-1.5 rounded transition-colors",
                          rule.enabled ? "text-success hover:bg-success/10" : "text-fg-muted hover:bg-surface-container"
                        )}
                        title={rule.enabled ? 'Click to disable' : 'Click to enable'}
                      >
                        {rule.enabled ? <Play size={16} /> : <Pause size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleEdit(rule)} 
                          className="p-1.5 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(rule.id)} 
                          className="p-1.5 text-fg-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
              <History size={48} className="mb-4" />
              <p>No rules found</p>
              <p className="text-sm mt-2">Create your first rule to automate campaign optimization</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="my-8 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border-default bg-surface p-6 shadow-xl sm:my-0">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-fg-default">
                {isEditMode ? 'Edit Rule' : 'Create Rule'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">
                  Rule Name *
                </label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                  placeholder="Enter rule name"
                  maxLength={FIELD_MAX_LENGTH.RULE_NAME}
                  required
                  className="w-full px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                />
                {renderLengthCounter(formData.name, FIELD_MAX_LENGTH.RULE_NAME)}
              </div>

              <div>
                <label className="block text-xs font-medium text-fg-muted mb-1">
                  Description
                </label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={(e) => updateFormField('description', e.target.value)}
                  placeholder="Enter description"
                  maxLength={FIELD_MAX_LENGTH.RULE_DESCRIPTION}
                  className="w-full px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                />
                {renderLengthCounter(formData.description, FIELD_MAX_LENGTH.RULE_DESCRIPTION)}
              </div>
               
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1">
                    Rule Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as typeof formData.type }))}
                    className="w-full px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                  >
                    <option value="campaign">Campaign</option>
                    <option value="platform">Platform</option>
                    <option value="flow">Flow</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-fg-muted mb-1">
                    Priority
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 bg-surface-container border border-border-default text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-1">
                      Rule Conditions
                    </label>
                    <p className="text-xs text-fg-muted">
                      Build nested AND / OR / NOT logic without editing raw JSON.
                    </p>
                  </div>
                  {formData.hasAdvancedConditions ? (
                    <span className="rounded-full bg-warning/10 px-2 py-1 text-[11px] text-warning">
                      Advanced condition preserved until you edit this section
                    </span>
                  ) : null}
                </div>
                {formData.hasAdvancedConditions ? (
                  <div className="rounded border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    This rule includes advanced condition syntax outside the visual builder. If you leave the builder unchanged,
                    the original condition payload will be preserved on save.
                  </div>
                ) : null}
                {renderBuilderNode(formData.conditionTree)}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-1">
                      Rule Action
                    </label>
                    <p className="text-xs text-fg-muted">
                      Choose the primary action that should run when the rule matches.
                    </p>
                  </div>
                  {formData.hasAdvancedActions ? (
                    <span className="rounded-full bg-warning/10 px-2 py-1 text-[11px] text-warning">
                      Advanced action preserved until you edit this section
                    </span>
                  ) : null}
                </div>
                {formData.hasAdvancedActions ? (
                  <div className="rounded border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    This rule uses an action shape not fully modeled by the visual editor. If you keep this section unchanged,
                    the original action payload will be preserved on save.
                  </div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
                  <select
                    value={formData.actionState.type}
                    onChange={(event) =>
                      updateActionState((current) => ({
                        type: event.target.value as BuilderActionState['type'],
                        redirectUrl:
                          event.target.value === 'redirect'
                            ? current.redirectUrl
                            : '',
                      }))
                    }
                    className="w-full rounded border border-border-default bg-surface-container px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                  >
                    <option value="allow">Allow</option>
                    <option value="block">Block</option>
                    <option value="challenge">Challenge</option>
                    <option value="redirect">Redirect</option>
                  </select>
                  {formData.actionState.type === 'redirect' ? (
                    <input
                      type="url"
                      value={formData.actionState.redirectUrl}
                      onChange={(event) =>
                        updateActionState((current) => ({
                          ...current,
                          redirectUrl: event.target.value,
                        }))
                      }
                      placeholder="https://example.com/landing"
                      className="w-full rounded border border-border-default bg-surface-container px-3 py-2 text-sm text-fg-default focus:outline-none focus:border-accent-fg"
                    />
                  ) : (
                    <div className="flex items-center rounded border border-dashed border-border-default px-3 py-2 text-sm text-fg-muted">
                      No extra action parameters
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs font-medium text-fg-muted">Condition Preview</div>
                  <pre className="max-h-40 overflow-auto rounded border border-border-default bg-surface-container px-3 py-2 text-[11px] text-fg-muted">
                    {ruleConditionPreview}
                  </pre>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-fg-muted">Action Preview</div>
                  <pre className="max-h-40 overflow-auto rounded border border-border-default bg-surface-container px-3 py-2 text-[11px] text-fg-muted">
                    {ruleActionPreview}
                  </pre>
                  <div className="mt-2 text-xs text-fg-muted">
                    Governance outcome: {formatGovernanceActionLabel(formData.actionState.type)}
                  </div>
                </div>
              </div>
               
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-4 h-4 rounded border-border-default"
                />
                <label htmlFor="enabled" className="text-sm text-fg-default">Enabled</label>
              </div>
              
              <div className="flex flex-wrap justify-end gap-3 border-t border-border-default pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 text-sm text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-accent-fg text-white text-sm font-medium hover:bg-accent-fg/90 rounded disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : (isEditMode ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RuleManagement;
