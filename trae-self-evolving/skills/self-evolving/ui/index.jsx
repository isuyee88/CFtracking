/**
 * Self-Evolving System - Main Entry Point
 * File: trae-self-evolving/skills/self-evolving/ui/index.jsx
 *
 * Description:
 * Main React component that combines all UI parts for the
 * self-evolving skill management interface.
 */

import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import SkillManagement from './SkillManagement';

const SelfEvolvingUI = () => {
  const [view, setView] = useState('dashboard');
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const mockSkills = [
        {
          id: 'skill-1',
          name: 'cloudflare-expert',
          status: 'active',
          priority: 85,
          success_rate: 0.95,
          success_count: 156,
          failure_count: 8
        },
        {
          id: 'skill-2',
          name: 'agent-team-agile',
          status: 'active',
          priority: 72,
          success_rate: 0.88,
          success_count: 89,
          failure_count: 12
        },
        {
          id: 'skill-3',
          name: 'browser-test',
          status: 'conflict',
          priority: 65,
          success_rate: 0.72,
          success_count: 45,
          failure_count: 17
        }
      ];
      setSkills(mockSkills);
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
    setLoading(false);
  };

  const handleSkillUpdate = (skillId, updates) => {
    setSkills(skills.map(skill =>
      skill.id === skillId ? { ...skill, ...updates } : skill
    ));
  };

  const handleOptimize = (skillId) => {
    console.log('Optimizing skill:', skillId);
    alert(`Optimization triggered for skill ${skillId}`);
  };

  const handleResolve = (skillId) => {
    console.log('Resolving conflicts for skill:', skillId);
    alert(`Conflict resolution triggered for skill ${skillId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading self-evolving system...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex space-x-4">
            <button
              onClick={() => setView('dashboard')}
              className={`px-4 py-2 rounded-lg transition ${
                view === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setView('skills')}
              className={`px-4 py-2 rounded-lg transition ${
                view === 'skills'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Skill Management
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {view === 'dashboard' && <Dashboard />}
        {view === 'skills' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Skill Management</h2>
            {skills.map(skill => (
              <SkillManagement
                key={skill.id}
                skill={skill}
                onUpdate={handleSkillUpdate}
                onOptimize={handleOptimize}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SelfEvolvingUI;
