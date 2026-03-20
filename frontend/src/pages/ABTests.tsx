/**
 * @fileoverview A/B Tests Page
 * @description A/B testing management for landing pages and offers
 * @module pages/ABTests
 */

import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Plus, 
  Play, 
  Pause, 
  Trophy,
  TrendingUp,
  Users,
  Target,
  Calendar,
  MoreHorizontal,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ABTest {
  id: string;
  name: string;
  campaignName: string;
  type: 'landing' | 'offer';
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: number;
  totalClicks: number;
  totalConversions: number;
  winner?: string;
  startDate?: string;
  endDate?: string;
  updatedAt: string;
}

export const ABTests: React.FC = () => {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'running' | 'completed'>('all');

  useEffect(() => {
    // Mock data for demo
    setTests([
      {
        id: 'ab1',
        name: 'Landing Page Headline Test',
        campaignName: 'Weight Loss Campaign',
        type: 'landing',
        status: 'running',
        variants: 3,
        totalClicks: 15420,
        totalConversions: 486,
        winner: 'Variant B',
        startDate: '2024-01-10',
        updatedAt: '2024-01-15T10:30:00Z'
      },
      {
        id: 'ab2',
        name: 'Offer Price Point Test',
        campaignName: 'MMO Course Campaign',
        type: 'offer',
        status: 'completed',
        variants: 2,
        totalClicks: 8930,
        totalConversions: 312,
        winner: 'Variant A ($97)',
        startDate: '2024-01-05',
        endDate: '2024-01-12',
        updatedAt: '2024-01-12T15:45:00Z'
      },
      {
        id: 'ab3',
        name: 'CTA Button Color Test',
        campaignName: 'Dating App Campaign',
        type: 'landing',
        status: 'paused',
        variants: 4,
        totalClicks: 5430,
        totalConversions: 189,
        startDate: '2024-01-08',
        updatedAt: '2024-01-14T09:15:00Z'
      }
    ]);
    setLoading(false);
  }, []);

  const filteredTests = tests.filter(test => {
    if (filter === 'all') return true;
    return test.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-success/10 text-success';
      case 'paused': return 'bg-warning/10 text-warning';
      case 'completed': return 'bg-info/10 text-info';
      default: return 'bg-surface-container text-on-surface-variant';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'landing' ? <Target size={16} /> : <Trophy size={16} />;
  };

  return (
    <div className="min-h-screen bg-surface p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-secondary-container rounded-sm flex items-center justify-center">
            <FlaskConical size={20} className="text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-primary">A/B Tests</h1>
            <p className="text-sm text-on-surface-variant">Optimize your campaigns with A/B testing</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Tests</div>
          <div className="text-3xl font-bold text-primary">{tests.length}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Running</div>
          <div className="text-3xl font-bold text-success">{tests.filter(t => t.status === 'running').length}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Completed</div>
          <div className="text-3xl font-bold text-info">{tests.filter(t => t.status === 'completed').length}</div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Winners Found</div>
          <div className="text-3xl font-bold text-secondary">{tests.filter(t => t.winner).length}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-surface-container-lowest p-4 whisper-shadow mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'running', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                filter === f
                  ? "bg-primary text-on-primary"
                  : "border border-outline-variant text-on-surface hover:bg-surface-container"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-sm">
          <Plus size={18} />
          Create A/B Test
        </button>
      </div>

      {/* Tests List */}
      <div className="bg-surface-container-lowest whisper-shadow">
        {loading ? (
          <div className="p-8 text-center text-on-surface-variant">Loading...</div>
        ) : filteredTests.length === 0 ? (
          <div className="p-12 text-center">
            <FlaskConical size={48} className="mx-auto text-on-surface-variant/30 mb-4" />
            <h3 className="text-lg font-bold text-primary mb-2">No A/B Tests</h3>
            <p className="text-sm text-on-surface-variant">Create your first A/B test to optimize conversions</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {filteredTests.map((test) => (
              <div key={test.id} className="p-4 hover:bg-surface-container/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-sm flex items-center justify-center",
                      test.type === 'landing' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                    )}>
                      {getTypeIcon(test.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-on-surface">{test.name}</h3>
                      <p className="text-sm text-on-surface-variant">{test.campaignName}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {test.variants} variants
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp size={12} />
                          {test.totalClicks.toLocaleString()} clicks
                        </span>
                        <span className="flex items-center gap-1">
                          <Target size={12} />
                          {test.totalConversions.toLocaleString()} conv.
                        </span>
                        {test.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {test.startDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm",
                      getStatusColor(test.status)
                    )}>
                      {test.status}
                    </span>
                    {test.winner && (
                      <div className="flex items-center gap-1 text-success">
                        <Trophy size={14} />
                        <span className="text-xs font-bold">{test.winner}</span>
                      </div>
                    )}
                    <button className="p-2 hover:bg-surface-container rounded-sm transition-colors">
                      <MoreHorizontal size={16} className="text-on-surface-variant" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ABTests;
