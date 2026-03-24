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
  Upload
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
  const [flows, setFlows] = useState<FlowNode[]>(initialFlows.length > 0 ? initialFlows : [
    { id: 'flow-1', type: 'landing', name: 'Landing Page A', weight: 50 },
    { id: 'flow-2', type: 'landing', name: 'Landing Page B', weight: 50 },
  ]);
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
  const handleAddNode = (type: FlowNode['type'], item?: { id: string; name: string }) => {
    const newNode: FlowNode = {
      // 使用唯一的 flow ID，而不是 item.id（item.id 是 offer/landing 的 ID）
      id: `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      // 如果是从 item 添加，使用 item.name 作为初始名称，但用户可以编辑
      name: item?.name || (type === 'landing' ? 'New Landing Page' : type === 'offer' ? 'New Offer' : 'New Node'),
      weight: 50,
      // 保存关联的 offer/landing ID，用于后续 API 调用
      config: item ? { itemId: item.id } : {},
    };
    setFlows([...flows, newNode]);
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
      <div className="flex items-center justify-between p-4 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center">
            <GitBranch size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-primary">Flow Designer</h2>
            <p className="text-xs text-on-surface-variant">Design traffic distribution for campaign</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="flex">
        {/* Left Sidebar - Tools */}
        <div className="w-72 border-r border-outline-variant/10 p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Add Nodes (Empty)
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => handleAddNode('landing')}
                className="w-full flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm hover:bg-blue-100 transition-colors"
              >
                <Layers size={16} />
                + Landing Page
              </button>
              <button
                onClick={() => handleAddNode('offer')}
                className="w-full flex items-center gap-3 px-3 py-2 bg-green-50 border border-green-200 text-green-700 text-sm hover:bg-green-100 transition-colors"
              >
                <Target size={16} />
                + Offer
              </button>
              <button
                onClick={() => handleAddNode('condition')}
                className="w-full flex items-center gap-3 px-3 py-2 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm hover:bg-yellow-100 transition-colors"
              >
                <GitBranch size={16} />
                + Condition
              </button>
            </div>
          </div>

          <div className="border-t border-outline-variant/10 pt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Select Landing Page
            </h3>
            <input
              type="text"
              placeholder="Search landing pages..."
              value={landingSearch}
              onChange={(e) => setLandingSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-outline-variant bg-surface rounded mb-2"
            />
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {landings
                .filter(lp => lp.name.toLowerCase().includes(landingSearch.toLowerCase()))
                .map(lp => (
                  <div
                    key={lp.id}
                    className="px-2 py-1.5 text-xs text-on-surface bg-surface-container rounded cursor-pointer hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-200 transition-colors"
                    onClick={() => handleAddNode('landing', { id: lp.id, name: lp.name })}
                  >
                    <div className="font-medium">{lp.name}</div>
                    {lp.url && <div className="text-[10px] text-on-surface-variant truncate">{lp.url}</div>}
                  </div>
                ))}
              {landings.filter(lp => lp.name.toLowerCase().includes(landingSearch.toLowerCase())).length === 0 && (
                <div className="text-xs text-on-surface-variant text-center py-2">No landing pages found</div>
              )}
            </div>
          </div>

          <div className="border-t border-outline-variant/10 pt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Select Offer
            </h3>
            <input
              type="text"
              placeholder="Search offers..."
              value={offerSearch}
              onChange={(e) => setOfferSearch(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-outline-variant bg-surface rounded mb-2"
            />
            <div className="flex gap-2 mb-2">
              <select
                value={offerNetworkFilter}
                onChange={(e) => setOfferNetworkFilter(e.target.value)}
                className="flex-1 px-2 py-1 text-xs border border-outline-variant bg-surface rounded"
              >
                <option value="">All Networks</option>
                {[...new Set(offers.map(o => o.network).filter(Boolean))].map(network => (
                  <option key={network} value={network}>{network}</option>
                ))}
              </select>
              <select
                value={offerPayoutTypeFilter}
                onChange={(e) => setOfferPayoutTypeFilter(e.target.value)}
                className="flex-1 px-2 py-1 text-xs border border-outline-variant bg-surface rounded"
              >
                <option value="">All Types</option>
                <option value="fixed">Fixed</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {offers
                .filter(o => {
                  const matchesSearch = o.name.toLowerCase().includes(offerSearch.toLowerCase());
                  const matchesNetwork = !offerNetworkFilter || o.network === offerNetworkFilter;
                  const matchesPayoutType = !offerPayoutTypeFilter || o.payoutType === offerPayoutTypeFilter;
                  return matchesSearch && matchesNetwork && matchesPayoutType;
                })
                .map(offer => (
                  <div
                    key={offer.id}
                    className="px-2 py-1.5 text-xs text-on-surface bg-surface-container rounded cursor-pointer hover:bg-green-50 hover:text-green-700 border border-transparent hover:border-green-200 transition-colors"
                    onClick={() => handleAddNode('offer', { id: offer.id, name: offer.name })}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{offer.name}</span>
                      {offer.payout !== undefined && (
                        <span className="text-green-600 font-bold">${offer.payout}</span>
                      )}
                    </div>
                    <div className="flex gap-2 text-[10px] text-on-surface-variant">
                      {offer.network && <span>{offer.network}</span>}
                      {offer.payoutType && <span>• {offer.payoutType}</span>}
                    </div>
                  </div>
                ))}
              {offers.filter(o => {
                const matchesSearch = o.name.toLowerCase().includes(offerSearch.toLowerCase());
                const matchesNetwork = !offerNetworkFilter || o.network === offerNetworkFilter;
                const matchesPayoutType = !offerPayoutTypeFilter || o.payoutType === offerPayoutTypeFilter;
                return matchesSearch && matchesNetwork && matchesPayoutType;
              }).length === 0 && (
                <div className="text-xs text-on-surface-variant text-center py-2">No offers found</div>
              )}
            </div>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 p-6">
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
                  "flex items-center gap-4 p-4 border-2 rounded-sm transition-all",
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
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{flow.name}</span>
                    <span className="text-[10px] uppercase px-2 py-0.5 bg-white/50 rounded">
                      {flow.type}
                    </span>
                  </div>
                </div>

                {/* Weight Control */}
                <div className="flex items-center gap-2">
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

        {/* Right Sidebar - Properties */}
        <div className="w-72 border-l border-outline-variant/10 p-4">
          {isEditing && selectedNode ? (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
                Edit Node
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-outline-variant bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">
                    Type
                  </label>
                  <select
                    value={editForm.type || 'landing'}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value as FlowNode['type'] })}
                    className="w-full px-3 py-2 text-sm border border-outline-variant bg-surface"
                  >
                    <option value="landing">Landing Page</option>
                    <option value="offer">Offer</option>
                    <option value="condition">Condition</option>
                    <option value="action">Action</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">
                    Weight
                  </label>
                  <input
                    type="number"
                    value={editForm.weight || 0}
                    onChange={(e) => setEditForm({ ...editForm, weight: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-outline-variant bg-surface"
                    min="0"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-3 py-2 border border-outline-variant text-on-surface text-xs font-bold uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 px-3 py-2 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
                Flow Statistics
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-surface-container rounded-sm">
                  <div className="text-[10px] text-on-surface-variant uppercase">Total Nodes</div>
                  <div className="text-2xl font-bold text-primary">{flows.length}</div>
                </div>
                <div className="p-3 bg-surface-container rounded-sm">
                  <div className="text-[10px] text-on-surface-variant uppercase">Landing Pages</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {flows.filter(f => f.type === 'landing').length}
                  </div>
                </div>
                <div className="p-3 bg-surface-container rounded-sm">
                  <div className="text-[10px] text-on-surface-variant uppercase">Offers</div>
                  <div className="text-2xl font-bold text-green-600">
                    {flows.filter(f => f.type === 'offer').length}
                  </div>
                </div>
                <div className="p-3 bg-surface-container rounded-sm">
                  <div className="text-[10px] text-on-surface-variant uppercase">Conditions</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {flows.filter(f => f.type === 'condition').length}
                  </div>
                </div>
              </div>

              {totalWeight !== 100 && (
                <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-warning">Weight Warning</div>
                      <div className="text-[10px] text-on-surface-variant">
                        Total weight is {totalWeight}%. Recommended: 100%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlowDesigner;
