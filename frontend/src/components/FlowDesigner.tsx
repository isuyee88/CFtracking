/**
 * @fileoverview Flow Designer Component
 * @description Visual flow designer for campaign traffic distribution
 * @module components/FlowDesigner
 * @input campaignId, flows, onSave
 * @output Flow configuration
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  ArrowRight,
  GitBranch,
  Layers,
  Target,
  Settings,
  GripVertical,
  Percent,
  AlertCircle,
  Download,
  Upload,
  Search,
  ChevronDown,
  Check
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { fetchLandings, fetchOffers, createFlow, updateFlow, addLandingPageToFlow, addOfferToFlow } from '../services/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
export interface FlowNode {
  id: string;
  type: 'landing' | 'offer' | 'condition' | 'action';
  name: string;
  weight: number;
  config?: Record<string, any>;
}

export interface FlowConnection {
  id: string;
  from: string;
  to: string;
  condition?: string;
}

interface FlowDesignerProps {
  campaignId: string;
  initialFlows?: FlowNode[];
  initialConnections?: FlowConnection[];
  onSave?: (flows: FlowNode[], connections: FlowConnection[]) => void;
  onCancel?: () => void;
}

export const FlowDesigner: React.FC<FlowDesignerProps> = ({
  campaignId,
  initialFlows = [],
  initialConnections = [],
  onSave,
  onCancel,
}) => {
  const [flows, setFlows] = useState<FlowNode[]>([]);
  const [landings, setLandings] = useState<{id: string; name: string; url?: string; group?: string}[]>([]);
  const [offers, setOffers] = useState<{id: string; name: string; payout?: number; network?: string; payoutType?: string; group?: string}[]>([]);

  const [connections, setConnections] = useState<FlowConnection[]>(initialConnections);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<FlowNode>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [landingSearch, setLandingSearch] = useState('');
  const [offerSearch, setOfferSearch] = useState('');
  const [offerNetworkFilter, setOfferNetworkFilter] = useState('');
  const [offerPayoutTypeFilter, setOfferPayoutTypeFilter] = useState('');
  const [pickerType, setPickerType] = useState<'landing' | 'offer'>('landing');
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSelection, setPickerSelection] = useState<{ id: string; name: string } | null>(null);
  const [pickerWeight, setPickerWeight] = useState(50);

  // 同步 initialFlows 变化到 flows 状态
  useEffect(() => {
    if (initialFlows && initialFlows.length > 0) {
      console.log('[FlowDesigner] Syncing initialFlows:', initialFlows);
      setFlows(initialFlows);
    } else {
      // 如果没有初始 flows，使用默认示例
      setFlows([
        { id: 'flow-1', type: 'landing', name: 'Landing Page A', weight: 50 },
        { id: 'flow-2', type: 'landing', name: 'Landing Page B', weight: 50 },
      ]);
    }
  }, [initialFlows]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [landingsData, offersData] = await Promise.all([
          fetchLandings(false),
          fetchOffers(false),
        ]);
        if (Array.isArray(landingsData)) {
          setLandings(landingsData.map((lp: any) => ({ 
            id: lp.id, 
            name: lp.name, 
            url: lp.url,
            group: lp.group 
          })));
        }
        if (Array.isArray(offersData)) {
          setOffers(offersData.map((o: any) => ({ 
            id: o.id, 
            name: o.name, 
            payout: o.payout,
            network: o.network,
            payoutType: o.payoutType,
            group: o.group
          })));
        }
      } catch (err) {
        console.error('Failed to load landings/offers:', err);
      }
    };
    loadData();
  }, []);

  // Calculate total weight
  const totalWeight = flows.reduce((sum, f) => sum + f.weight, 0);

  // Add new flow node
  const handleAddNode = (type: FlowNode['type'], item?: { id: string; name: string }, weight = 50) => {
    const newNode: FlowNode = {
      // 使用唯一的 flow ID，而不是 item.id（item.id 是 offer/landing 的 ID）
      id: `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      // 如果是从 item 添加，使用 item.name 作为初始名称，但用户可以编辑
      name: item?.name || (type === 'landing' ? 'New Landing Page' : type === 'offer' ? 'New Offer' : 'New Node'),
      weight,
      // 保存关联的 offer/landing ID，用于后续 API 调用
      config: item ? { itemId: item.id } : {},
    };
    setFlows([...flows, newNode]);
  };

  const pickerItems = (pickerType === 'landing' ? landings : offers).filter((item) => {
    const query = pickerQuery.trim().toLowerCase();
    if (!query) return true;
    return item.name.toLowerCase().includes(query);
  });

  const handlePick = (item: { id: string; name: string }) => {
    setPickerSelection(item);
    setPickerQuery(item.name);
    setPickerOpen(false);
  };

  const handleAddPicked = () => {
    if (!pickerSelection) return;
    handleAddNode(pickerType, pickerSelection, pickerWeight);
    setPickerSelection(null);
    setPickerQuery('');
    setPickerWeight(50);
  };

  // Delete flow node
  const handleDeleteNode = (id: string) => {
    console.log('[FlowDesigner] Deleting node:', id);
    console.log('[FlowDesigner] Flows before delete:', flows);
    const newFlows = flows.filter(f => f.id !== id);
    console.log('[FlowDesigner] Flows after delete:', newFlows);
    setFlows(newFlows);
    setConnections(connections.filter(c => c.from !== id && c.to !== id));
    if (selectedNode === id) setSelectedNode(null);
  };

  // Update node weight
  const handleWeightChange = (id: string, weight: number) => {
    setFlows(flows.map(f => f.id === id ? { ...f, weight } : f));
  };

  // Start editing node
  const handleEditNode = (node: FlowNode) => {
    setSelectedNode(node.id);
    setEditForm({ ...node });
    setIsEditing(true);
  };

  // Save edited node
  const handleSaveEdit = () => {
    if (selectedNode && editForm.name) {
      setFlows(flows.map(f => {
        if (selectedNodes.has(f.id)) {
          return { ...f, ...editForm } as FlowNode;
        }
        return f;
      }));
      setIsEditing(false);
      setSelectedNode(null);
      setSelectedNodes(new Set());
    }
  };

  // Toggle node selection for batch operations
  const handleToggleSelection = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedNodes(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };

  // Select all nodes
  const handleSelectAll = () => {
    if (selectedNodes.size === flows.length) {
      setSelectedNodes(new Set());
    } else {
      setSelectedNodes(new Set(flows.map(f => f.id)));
    }
  };

  // Batch delete selected nodes
  const handleBatchDelete = () => {
    if (selectedNodes.size > 0) {
      if (confirm(`Are you sure you want to delete ${selectedNodes.size} nodes?`)) {
        const nodesToDelete = Array.from(selectedNodes);
        setFlows(flows.filter(f => !selectedNodes.has(f.id)));
        setConnections(connections.filter(c => !nodesToDelete.includes(c.from) && !nodesToDelete.includes(c.to)));
        setSelectedNodes(new Set());
        if (selectedNode && selectedNodes.has(selectedNode)) {
          setSelectedNode(null);
        }
      }
    }
  };

  // Batch edit selected nodes
  const handleBatchEdit = () => {
    if (selectedNodes.size > 0) {
      // For simplicity, we'll edit the first selected node and apply changes to all
      const firstSelected = Array.from(selectedNodes)[0];
      const node = flows.find(f => f.id === firstSelected);
      if (node) {
        setSelectedNode(firstSelected);
        setEditForm({ ...node });
        setIsEditing(true);
      }
    }
  };

  // Export flow configuration as JSON
  const handleExportFlow = () => {
    const flowConfig = {
      flows,
      connections,
      metadata: {
        campaignId,
        exportDate: new Date().toISOString(),
        totalNodes: flows.length,
        totalConnections: connections.length
      }
    };

    const jsonString = JSON.stringify(flowConfig, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flow-config-${campaignId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import flow configuration from JSON
  const handleImportFlow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const flowConfig = JSON.parse(jsonString);

        if (flowConfig.flows && Array.isArray(flowConfig.flows)) {
          setFlows(flowConfig.flows);
          setConnections(flowConfig.connections || []);
          setSelectedNodes(new Set());
          setSelectedNode(null);
          alert('Flow configuration imported successfully!');
        } else {
          alert('Invalid flow configuration file');
        }
      } catch (error) {
        alert('Error parsing flow configuration file');
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Get percentage for weight
  const getPercentage = (weight: number) => {
    return totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0;
  };

  // Get node color based on type
  const getNodeColor = (type: FlowNode['type']) => {
    switch (type) {
      case 'landing': return 'bg-blue-100 border-blue-300 text-blue-700';
      case 'offer': return 'bg-green-100 border-green-300 text-green-700';
      case 'condition': return 'bg-yellow-100 border-yellow-300 text-yellow-700';
      case 'action': return 'bg-purple-100 border-purple-300 text-purple-700';
      default: return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  // Get node icon based on type
  const getNodeIcon = (type: FlowNode['type']) => {
    switch (type) {
      case 'landing': return <Layers size={16} />;
      case 'offer': return <Target size={16} />;
      case 'condition': return <GitBranch size={16} />;
      case 'action': return <ArrowRight size={16} />;
      default: return <Settings size={16} />;
    }
  };

  return (
    <div className="bg-surface-container-lowest whisper-shadow">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-outline-variant/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
            <GitBranch size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-primary">Flow Designer</h2>
            <p className="text-xs text-on-surface-variant">Design traffic distribution for campaign</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Import/Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportFlow}
              className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
              title="Export Flow"
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={triggerFileInput}
              className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
              title="Import Flow"
            >
              <Upload size={14} />
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFlow}
              className="hidden"
            />
          </div>
          
          {selectedNodes.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchEdit}
                className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
                title="Batch Edit"
              >
                <Edit3 size={14} />
                Edit
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1 px-3 py-1.5 border border-error/20 text-error text-xs font-bold uppercase tracking-widest hover:bg-error/5 transition-colors"
                title="Batch Delete"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-widest hover:bg-surface-container transition-colors"
          >
            <X size={16} />
            Cancel
          </button>
          <button
            onClick={() => onSave?.(flows, connections)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            <Save size={16} />
            Save Flow
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Builder - one searchable picker instead of long raw lists */}
        <aside className="w-full border-b border-outline-variant/10 lg:w-80 lg:border-b-0 lg:border-r">
          <div className="space-y-4 p-4 lg:sticky lg:top-0">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-fg-default">Add traffic node</h3>
              <p className="text-xs text-fg-muted">Choose a landing page or offer, then set its share.</p>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-container p-1" role="tablist" aria-label="Node type">
              <button
                type="button"
                role="tab"
                aria-selected={pickerType === 'landing'}
                onClick={() => { setPickerType('landing'); setPickerSelection(null); setPickerQuery(''); }}
                className={cn('flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors', pickerType === 'landing' ? 'bg-surface text-primary shadow-sm' : 'text-fg-muted hover:text-fg-default')}
              >
                <Layers size={14} /> Landing
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pickerType === 'offer'}
                onClick={() => { setPickerType('offer'); setPickerSelection(null); setPickerQuery(''); }}
                className={cn('flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors', pickerType === 'offer' ? 'bg-surface text-primary shadow-sm' : 'text-fg-muted hover:text-fg-default')}
              >
                <Target size={14} /> Offer
              </button>
            </div>

            <div className="relative">
              <label htmlFor="flow-node-picker" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                {pickerType === 'landing' ? 'Landing page' : 'Offer'}
              </label>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
                <input
                  id="flow-node-picker"
                  role="combobox"
                  aria-expanded={pickerOpen}
                  aria-controls="flow-node-picker-list"
                  value={pickerQuery}
                  onChange={(event) => { setPickerQuery(event.target.value); setPickerSelection(null); setPickerOpen(true); }}
                  onFocus={() => setPickerOpen(true)}
                  placeholder={pickerType === 'landing' ? 'Search landing pages…' : 'Search offers…'}
                  className="h-9 w-full rounded-md border border-border-default bg-surface ps-8 pe-8 text-sm text-fg-default outline-none focus:border-accent-fg focus:ring-2 focus:ring-accent-fg/20"
                />
                <ChevronDown size={14} className={cn('pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle transition-transform', pickerOpen && 'rotate-180')} />
              </div>

              {pickerOpen && (
                <div id="flow-node-picker-list" role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border-default bg-surface-container-lowest p-1 shadow-xl">
                  {pickerItems.slice(0, 30).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={pickerSelection?.id === item.id}
                      onClick={() => handlePick(item)}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs hover:bg-surface-container"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-fg-default">{item.name}</span>
                        <span className="block truncate text-[10px] text-fg-muted">
                          {pickerType === 'landing' ? ((item as { url?: string }).url || 'No URL') : [(item as { network?: string }).network, (item as { payout?: number }).payout !== undefined ? '$' + (item as { payout?: number }).payout : ''].filter(Boolean).join(' · ') || 'No network'}
                        </span>
                      </span>
                      {pickerSelection?.id === item.id && <Check size={14} className="shrink-0 text-primary" />}
                    </button>
                  ))}
                  {pickerItems.length === 0 && <p className="px-2.5 py-6 text-center text-xs text-fg-muted">No {pickerType === 'landing' ? 'landing pages' : 'offers'} found</p>}
                </div>
              )}
            </div>

            {pickerSelection && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-accent-fg/20 bg-accent-fg/5 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-fg-default">{pickerSelection.name}</p>
                  <p className="text-[10px] uppercase tracking-wide text-fg-subtle">{pickerType}</p>
                </div>
                <button type="button" onClick={() => { setPickerSelection(null); setPickerQuery(''); }} aria-label="Clear selection" className="rounded p-1 text-fg-muted hover:bg-surface-container">
                  <X size={14} />
                </button>
              </div>
            )}

            <div>
              <label htmlFor="flow-node-weight" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">Traffic share</label>
              <div className="flex items-center gap-2">
                <input
                  id="flow-node-weight"
                  type="number"
                  min={0}
                  max={100}
                  value={pickerWeight}
                  onChange={(event) => setPickerWeight(Math.max(0, Math.min(100, Number(event.target.value) || 0)))}
                  className="h-9 w-24 rounded-md border border-border-default bg-surface px-3 text-sm text-fg-default outline-none focus:border-accent-fg"
                />
                <span className="text-sm text-fg-muted">%</span>
                <div className="ms-auto flex gap-1">
                  {[25, 50, 100].map((value) => (
                    <button key={value} type="button" onClick={() => setPickerWeight(value)} className={cn('rounded px-2 py-1 text-[10px] font-medium', pickerWeight === value ? 'bg-primary text-on-primary' : 'bg-surface-container text-fg-muted hover:bg-surface-container-high')}>{value}%</button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddPicked}
              disabled={!pickerSelection}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={16} /> Add to flow
            </button>
            <button
              type="button"
              onClick={() => handleAddNode('condition')}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border-default bg-surface px-3 py-2 text-xs font-medium text-fg-default hover:bg-surface-container"
            >
              <GitBranch size={14} /> Add condition
            </button>

            <div className="grid grid-cols-3 gap-2 border-t border-outline-variant/10 pt-4 text-center">
              <div><div className="text-lg font-bold text-primary">{flows.filter(f => f.type === 'landing').length}</div><div className="text-[10px] uppercase text-fg-subtle">Landing</div></div>
              <div><div className="text-lg font-bold text-success">{flows.filter(f => f.type === 'offer').length}</div><div className="text-[10px] uppercase text-fg-subtle">Offer</div></div>
              <div><div className="text-lg font-bold text-warning">{flows.filter(f => f.type === 'condition').length}</div><div className="text-[10px] uppercase text-fg-subtle">Condition</div></div>
            </div>

            {totalWeight !== 100 && (
              <div className="rounded-md border border-warning/20 bg-warning/10 p-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning" />
                  <p className="text-[11px] text-fg-muted">Total weight is <strong className="text-fg-default">{totalWeight}%</strong>. Recommended: 100%.</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Canvas */}
        <div className="min-w-0 flex-1 p-4 sm:p-6">
          {/* Weight Distribution Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Traffic Distribution
              </span>
              <span className="text-xs text-on-surface-variant">
                Total: {totalWeight} ({flows.length} nodes)
              </span>
            </div>
            <div className="h-8 flex rounded-sm overflow-hidden">
              {flows.map((flow, index) => (
                <div
                  key={flow.id}
                  className={cn(
                    "h-full flex items-center justify-center text-xs font-bold text-white transition-all",
                    flow.type === 'landing' ? 'bg-blue-500' :
                    flow.type === 'offer' ? 'bg-green-500' :
                    flow.type === 'condition' ? 'bg-yellow-500' : 'bg-purple-500'
                  )}
                  style={{ width: `${getPercentage(flow.weight)}%` }}
                  title={`${flow.name}: ${flow.weight} (${getPercentage(flow.weight)}%)`}
                >
                  {getPercentage(flow.weight) > 10 && `${getPercentage(flow.weight)}%`}
                </div>
              ))}
            </div>
          </div>

          {/* Flow Nodes */}
          <div className="space-y-3">
            {/* Select All Header */}
            {flows.length > 0 && (
              <div className="flex items-center gap-4 p-3 border border-outline-variant/20 rounded-sm bg-surface-container">
                <input
                  type="checkbox"
                  checked={selectedNodes.size === flows.length && flows.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm font-bold text-on-surface-variant">Select All</span>
                <span className="text-xs text-on-surface-variant ml-auto">
                  {selectedNodes.size} of {flows.length} selected
                </span>
              </div>
            )}
            
            {flows.map((flow, index) => (
              <div
                key={flow.id}
                className={cn(
                  "flex flex-col gap-3 p-4 border-2 rounded-sm transition-all sm:flex-row sm:items-center",
                  getNodeColor(flow.type),
                  selectedNode === flow.id ? 'ring-2 ring-primary' : '',
                  selectedNodes.has(flow.id) ? 'bg-opacity-80' : ''
                )}
              >
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedNodes.has(flow.id)}
                  onChange={(e) => handleToggleSelection(flow.id, e)}
                  className="w-4 h-4 text-primary"
                />

                {/* Drag Handle */}
                <div className="cursor-move text-current/50">
                  <GripVertical size={16} />
                </div>

                {/* Node Icon */}
                <div className="w-8 h-8 bg-white/50 rounded-sm flex items-center justify-center">
                  {getNodeIcon(flow.type)}
                </div>

                {/* Node Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-sm">{flow.name}</span>
                    <span className="shrink-0 text-[10px] uppercase px-2 py-0.5 bg-white/50 rounded">
                      {flow.type}
                    </span>
                  </div>
                </div>

                {/* Weight Control */}
                <div className="flex items-center gap-2 sm:ms-auto">
                  <Percent size={14} className="text-current/50" />
                  <input
                    type="number"
                    value={flow.weight}
                    onChange={(e) => handleWeightChange(flow.id, parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1 text-sm border border-current/20 bg-white/50 rounded"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm font-bold">
                    ({getPercentage(flow.weight)}%)
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditNode(flow)}
                    className="p-1.5 hover:bg-white/30 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteNode(flow.id)}
                    className="p-1.5 hover:bg-white/30 rounded transition-colors text-error"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {flows.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant">
              <GitBranch size={48} className="mx-auto mb-4 opacity-30" />
              <p>No flow nodes yet. Add nodes from the sidebar to start designing.</p>
            </div>
          )}
        </div>

      {isEditing && selectedNode && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={() => setIsEditing(false)}>
          <div className="w-full max-w-md rounded-t-2xl border border-border-default bg-surface-container-lowest p-5 shadow-2xl sm:rounded-xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-fg-default">Edit node</h3>
                <p className="text-xs text-fg-muted">Update the label, type or traffic share.</p>
              </div>
              <button type="button" onClick={() => setIsEditing(false)} aria-label="Close editor" className="rounded p-1 text-fg-muted hover:bg-surface-container"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-default">Name</label>
                <input type="text" value={editForm.name || ''} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} className="h-9 w-full rounded-md border border-border-default bg-surface px-3 text-sm text-fg-default outline-none focus:border-accent-fg" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-default">Type</label>
                <select value={editForm.type || 'landing'} onChange={(event) => setEditForm({ ...editForm, type: event.target.value as FlowNode['type'] })} className="h-9 w-full rounded-md border border-border-default bg-surface px-3 text-sm text-fg-default outline-none focus:border-accent-fg">
                  <option value="landing">Landing Page</option>
                  <option value="offer">Offer</option>
                  <option value="condition">Condition</option>
                  <option value="action">Action</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-default">Traffic share</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} value={editForm.weight || 0} onChange={(event) => setEditForm({ ...editForm, weight: parseInt(event.target.value) || 0 })} className="h-9 w-28 rounded-md border border-border-default bg-surface px-3 text-sm text-fg-default outline-none focus:border-accent-fg" />
                  <span className="text-sm text-fg-muted">%</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border-default pt-3">
                <button type="button" onClick={() => setIsEditing(false)} className="rounded-md border border-border-default px-4 py-2 text-xs font-medium text-fg-default hover:bg-surface-container">Cancel</button>
                <button type="button" onClick={handleSaveEdit} className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:opacity-90">Save node</button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default FlowDesigner;
