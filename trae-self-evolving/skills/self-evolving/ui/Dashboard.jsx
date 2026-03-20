/**
 * Self-Evolving System - Dashboard Component
 * File: trae-self-evolving/skills/self-evolving/ui/Dashboard.jsx
 *
 * Description:
 * Main dashboard component for visualizing skill states,
 * evolution history, and system health.
 */

import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [skills, setSkills] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [evolutionLog, setEvolutionLog] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    totalSkills: 0,
    activeSkills: 0,
    conflicts: 0,
    learning: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const mockSkills = [
      { id: 'skill-1', name: 'cloudflare-expert', status: 'active', priority: 85, success_rate: 0.95 },
      { id: 'skill-2', name: 'agent-team-agile', status: 'active', priority: 72, success_rate: 0.88 },
      { id: 'skill-3', name: 'browser-test', status: 'conflict', priority: 65, success_rate: 0.72 },
      { id: 'skill-4', name: 'self-evolving', status: 'active', priority: 90, success_rate: 0.98 }
    ];
    setSkills(mockSkills);

    const mockConflicts = [
      { id: 'conflict-1', skill_a: 'cloudflare-expert', skill_b: 'browser-test', type: 'file_access', severity: 'high' }
    ];
    setConflicts(mockConflicts);

    const mockLog = [
      { id: 'log-1', action: 'priority_updated', skill: 'cloudflare-expert', timestamp: '2026-03-18T14:30:00Z' },
      { id: 'log-2', action: 'conflict_resolved', skill: 'browser-test', timestamp: '2026-03-18T14:25:00Z' },
      { id: 'log-3', action: 'pattern_learned', skill: 'self-evolving', timestamp: '2026-03-18T14:20:00Z' }
    ];
    setEvolutionLog(mockLog);

    setSystemHealth({
      totalSkills: mockSkills.length,
      activeSkills: mockSkills.filter(s => s.status === 'active').length,
      conflicts: mockConflicts.length,
      learning: 3
    });
  };

  const getPriorityColor = (priority) => {
    if (priority >= 80) return 'bg-green-500';
    if (priority >= 60) return 'bg-yellow-500';
    if (priority >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      conflict: 'bg-red-100 text-red-800',
      disabled: 'bg-gray-100 text-gray-500'
    };
    return styles[status] || styles.inactive;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Self-Evolving System Dashboard</h1>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Skills</div>
            <div className="text-2xl font-bold text-gray-900">{systemHealth.totalSkills}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Active Skills</div>
            <div className="text-2xl font-bold text-green-600">{systemHealth.activeSkills}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Conflicts</div>
            <div className="text-2xl font-bold text-red-600">{systemHealth.conflicts}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Learning</div>
            <div className="text-2xl font-bold text-blue-600">{systemHealth.learning}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Skill List</h2>
            <div className="space-y-3">
              {skills.map(skill => (
                <div key={skill.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(skill.priority)}`} />
                    <div>
                      <div className="font-medium text-gray-900">{skill.name}</div>
                      <div className="text-sm text-gray-500">Success: {(skill.success_rate * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(skill.status)}`}>
                      {skill.status}
                    </span>
                    <span className="text-sm font-medium">{skill.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Evolution History</h2>
            <div className="space-y-3">
              {evolutionLog.map(log => (
                <div key={log.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{log.action}</div>
                    <div className="text-xs text-gray-500">{log.skill}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-4">Active Conflicts</h2>
            <div className="space-y-2">
              {conflicts.map(conflict => (
                <div key={conflict.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">{conflict.skill_a}</span>
                    <span className="mx-2 text-gray-400">↔</span>
                    <span className="font-medium text-gray-900">{conflict.skill_b}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{conflict.type}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      conflict.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {conflict.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
