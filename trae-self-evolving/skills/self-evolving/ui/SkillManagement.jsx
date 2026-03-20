/**
 * Self-Evolving System - Skill Management Interface
 * File: trae-self-evolving/skills/self-evolving/ui/SkillManagement.jsx
 *
 * Description:
 * Interface for managing individual skills including priority adjustment,
 * conflict resolution, and optimization controls.
 */

import React, { useState } from 'react';

const SkillManagement = ({ skill, onUpdate, onOptimize, onResolve }) => {
  const [priority, setPriority] = useState(skill.priority);
  const [isEditing, setIsEditing] = useState(false);

  const handlePriorityChange = (newPriority) => {
    setPriority(newPriority);
    onUpdate(skill.id, { priority: newPriority });
  };

  const getCategoryBadge = (score) => {
    if (score >= 80) return { label: 'Critical', class: 'bg-purple-100 text-purple-800' };
    if (score >= 60) return { label: 'High', class: 'bg-green-100 text-green-800' };
    if (score >= 40) return { label: 'Medium', class: 'bg-yellow-100 text-yellow-800' };
    if (score >= 20) return { label: 'Low', class: 'bg-orange-100 text-orange-800' };
    return { label: 'Experimental', class: 'bg-gray-100 text-gray-800' };
  };

  const category = getCategoryBadge(skill.priority);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{skill.name}</h3>
          <span className={`px-2 py-1 rounded text-xs ${category.class}`}>
            {category.label}
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{skill.priority}</div>
          <div className="text-sm text-gray-500">Priority Score</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-lg font-semibold text-green-600">{skill.success_count || 0}</div>
          <div className="text-xs text-gray-500">Successes</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-lg font-semibold text-red-600">{skill.failure_count || 0}</div>
          <div className="text-xs text-gray-500">Failures</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="text-lg font-semibold text-blue-600">{(skill.success_rate * 100).toFixed(1)}%</div>
          <div className="text-xs text-gray-500">Success Rate</div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Priority Adjustment
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={priority}
          onChange={(e) => handlePriorityChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0 (Disabled)</span>
          <span>100 (Critical)</span>
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => onOptimize(skill.id)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Optimize
        </button>
        <button
          onClick={() => onResolve(skill.id)}
          className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
        >
          Resolve Conflicts
        </button>
        <button
          onClick={() => onUpdate(skill.id, { status: skill.status === 'active' ? 'disabled' : 'active' })}
          className={`px-4 py-2 rounded-lg transition ${
            skill.status === 'active'
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {skill.status === 'active' ? 'Disable' : 'Enable'}
        </button>
      </div>
    </div>
  );
};

export default SkillManagement;
