/**
 * @fileoverview Flow Designer Component
 * @description Visual flow designer for campaign traffic distribution
 * @module components/FlowDesigner
 * @input campaignId, flows, onSave
 * @output Flow configuration
 */

import React, { useState, useCallback } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface FlowNode {
  id: string;
  type: 'landing' | 'offer' | 'condition' | 'action';
  name: string;
  weight: number;
  config?: Record<string, any>;
}

interface FlowConnection {
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

// Mock data for available landing pages and offers
const AVAILABLE_LANDINGS = [
  { id: 'lp1', name: 'Landing Page A - Product Demo', url: 'https://example.com/lp-a' },
  { id: 'lp2', name: 'Landing Page B - Lead Form', url: 'https://example.com/lp-b' },
  { id: 'lp3', name: 'Landing Page C - VSL', url: 'https://example.com/lp-c' },
];

const AVAILABLE_OFFERS = [
  { id: 'offer1', name: 'Weight Loss Supplement', payout: 45 },
  { id: 'offer2', name: 'MMO Course', payout: 97 },
  { id: 'offer3', name: 'Dating Premium', payout: 25 },
];

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
  
  const [connections, setConnections] = useState<FlowConnection[]>(initialConnections);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<FlowNode>>({});

  // Calculate total weight
  const totalWeight = flows.reduce((sum, f) => sum + f.weight, 0);

  // Add new flow node
  const handleAddNode = (type: FlowNode['type']) => {
    const newNode: FlowNode = {
      id: `flow-${Date.now()}`,
      type,
      name: type === 'landing' ? 'New Landing Page' : type === 'offer' ? 'New Offer' : 'New Node',
      weight: 50,
    };
    setFlows([...flows, newNode]);
  };

  // Delete flow node
  const handleDeleteNode = (id: string) => {
    setFlows(flows.filter(f => f.id !== id));
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
      setFlows(flows.map(f => f.id === selectedNode ? { ...f, ...editForm } as FlowNode : f));
      setIsEditing(false);
      setSelectedNode(null);
    }
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
        <div className="w-64 border-r border-outline-variant/10 p-4 space-y-4">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Add Nodes
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => handleAddNode('landing')}
                className="w-full flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm hover:bg-blue-100 transition-colors"
              >
                <Layers size={16} />
                Landing Page
              </button>
              <button
                onClick={() => handleAddNode('offer')}
                className="w-full flex items-center gap-3 px-3 py-2 bg-green-50 border border-green-200 text-green-700 text-sm hover:bg-green-100 transition-colors"
              >
                <Target size={16} />
                Offer
              </button>
              <button
                onClick={() => handleAddNode('condition')}
                className="w-full flex items-center gap-3 px-3 py-2 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm hover:bg-yellow-100 transition-colors"
              >
                <GitBranch size={16} />
                Condition
              </button>
            </div>
          </div>

          <div className="border-t border-outline-variant/10 pt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Available Landings
            </h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {AVAILABLE_LANDINGS.map(lp => (
                <div 
                  key={lp.id}
                  className="px-2 py-1.5 text-xs text-on-surface bg-surface-container rounded cursor-pointer hover:bg-surface-container-high"
                  onClick={() => handleAddNode('landing')}
                >
                  {lp.name}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-outline-variant/10 pt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Available Offers
            </h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {AVAILABLE_OFFERS.map(offer => (
                <div 
                  key={offer.id}
                  className="px-2 py-1.5 text-xs text-on-surface bg-surface-container rounded cursor-pointer hover:bg-surface-container-high"
                  onClick={() => handleAddNode('offer')}
                >
                  {offer.name} (${offer.payout})
                </div>
              ))}
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
            {flows.map((flow, index) => (
              <div
                key={flow.id}
                className={cn(
                  "flex items-center gap-4 p-4 border-2 rounded-sm transition-all",
                  getNodeColor(flow.type),
                  selectedNode === flow.id ? 'ring-2 ring-primary' : ''
                )}
              >
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
