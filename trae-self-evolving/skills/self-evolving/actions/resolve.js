/**
 * Self-Evolving System - Resolve Action
 * File: trae-self-evolving/skills/self-evolving/actions/resolve.js
 *
 * Description:
 * This module handles conflict detection and resolution between skills.
 * It implements various resolution strategies including priority-based,
 * sequential execution, merge resolution, and user decision.
 */

const { loadData, saveData, generateEntityId } = require('./learn');

const CONFLICT_TYPES = {
  FILE_ACCESS: 'file_access',
  CONFIG_OVERRIDE: 'config_override',
  EXECUTION_ORDER: 'execution_order',
  RESOURCE: 'resource'
};

const SEVERITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

function detectConflicts() {
  const data = loadData();
  const skills = data.entities.filter(e => e.type === 'Skill');
  const conflicts = [];

  for (let i = 0; i < skills.length; i++) {
    for (let j = i + 1; j < skills.length; j++) {
      const skillA = skills[i];
      const skillB = skills[j];

      const detectedConflicts = checkPairConflicts(skillA, skillB);
      conflicts.push(...detectedConflicts);
    }
  }

  return {
    success: true,
    conflict_count: conflicts.length,
    conflicts
  };
}

function checkPairConflicts(skillA, skillB) {
  const conflicts = [];

  if (skillA.file_access && skillB.file_access) {
    const overlappingFiles = findFileOverlap(skillA.file_access, skillB.file_access);
    if (overlappingFiles.length > 0) {
      conflicts.push({
        id: generateEntityId('Conflict'),
        type: CONFLICT_TYPES.FILE_ACCESS,
        skill_a: skillA.id,
        skill_b: skillB.id,
        severity: SEVERITY.HIGH,
        details: { overlapping_files: overlappingFiles },
        status: 'detected',
        detected_at: new Date().toISOString()
      });
    }
  }

  if (skillA.config_keys && skillB.config_keys) {
    const overlappingKeys = skillA.config_keys.filter(
      key => skillB.config_keys.includes(key)
    );
    if (overlappingKeys.length > 0) {
      conflicts.push({
        id: generateEntityId('Conflict'),
        type: CONFLICT_TYPES.CONFIG_OVERRIDE,
        skill_a: skillA.id,
        skill_b: skillB.id,
        severity: SEVERITY.MEDIUM,
        details: { overlapping_keys: overlappingKeys },
        status: 'detected',
        detected_at: new Date().toISOString()
      });
    }
  }

  if (skillA.depends_on?.includes(skillB.id) && skillB.depends_on?.includes(skillA.id)) {
    conflicts.push({
      id: generateEntityId('Conflict'),
      type: CONFLICT_TYPES.EXECUTION_ORDER,
      skill_a: skillA.id,
      skill_b: skillB.id,
      severity: SEVERITY.HIGH,
      details: { circular_dependency: true },
      status: 'detected',
      detected_at: new Date().toISOString()
    });
  }

  return conflicts;
}

function findFileOverlap(accessA, accessB) {
  const filesA = new Set(accessA.map(a => a.file));
  const filesB = new Set(accessB.map(a => a.file));

  const overlap = [];
  filesA.forEach(file => {
    if (filesB.has(file)) {
      overlap.push(file);
    }
  });

  return overlap;
}

function resolveConflict(conflictId, strategy) {
  const data = loadData();
  const conflict = data.entities.find(
    e => e.type === 'Conflict' && e.id === conflictId
  );

  if (!conflict) {
    return { success: false, error: 'Conflict not found' };
  }

  let resolution = null;

  switch (strategy) {
    case 'priority_based':
      resolution = resolveByPriority(conflict, data);
      break;

    case 'sequential':
      resolution = resolveBySequential(conflict, data);
      break;

    case 'merge':
      resolution = resolveByMerge(conflict, data);
      break;

    case 'user_decision':
      conflict.status = 'pending_user';
      resolution = { strategy: 'user_decision', message: 'Waiting for user decision' };
      break;

    default:
      return { success: false, error: 'Unknown resolution strategy' };
  }

  conflict.resolution = resolution;
  conflict.resolved_at = new Date().toISOString();
  conflict.status = 'resolved';

  saveData(data);

  return {
    success: true,
    conflict_id: conflictId,
    resolution
  };
}

function resolveByPriority(conflict, data) {
  const skillA = data.entities.find(e => e.type === 'Skill' && e.id === conflict.skill_a);
  const skillB = data.entities.find(e => e.type === 'Skill' && e.id === conflict.skill_b);

  const priorityA = skillA?.priority || 50;
  const priorityB = skillB?.priority || 50;

  const winner = priorityA >= priorityB ? skillA : skillB;
  const loser = priorityA >= priorityB ? skillB : skillA;

  return {
    strategy: 'priority_based',
    winner: winner?.id,
    loser: loser?.id,
    explanation: `${winner?.name} wins due to higher priority (${winner?.priority} vs ${loser?.priority})`,
    execution_order: [winner?.id, loser?.id]
  };
}

function resolveBySequential(conflict, data) {
  const skillA = data.entities.find(e => e.type === 'Skill' && e.id === conflict.skill_a);
  const skillB = data.entities.find(e => e.type === 'Skill' && e.id === conflict.skill_b);

  return {
    strategy: 'sequential',
    execution_order: [skillA?.id, skillB?.id],
    delay_ms: 100,
    explanation: 'Skills will execute sequentially to avoid conflicts'
  };
}

function resolveByMerge(conflict, data) {
  return {
    strategy: 'merge',
    explanation: 'Merge configuration and file access patterns',
    requires_review: true,
    merge_type: conflict.type === CONFLICT_TYPES.CONFIG_OVERRIDE ? 'deep_merge' : 'sequential'
  };
}

function getActiveConflicts() {
  const data = loadData();
  return data.entities.filter(
    e => e.type === 'Conflict' && e.status !== 'resolved'
  );
}

function preventConflict(newSkill) {
  const data = loadData();
  const activeSkills = data.entities.filter(
    e => e.type === 'Skill' && e.status === 'active'
  );

  const potentialConflicts = [];

  for (const existingSkill of activeSkills) {
    const conflicts = checkPairConflicts(newSkill, existingSkill);
    if (conflicts.length > 0) {
      potentialConflicts.push(...conflicts);
    }
  }

  if (potentialConflicts.length > 0) {
    return {
      success: true,
      has_conflicts: true,
      conflicts: potentialConflicts,
      message: 'Potential conflicts detected with existing skills'
    };
  }

  return {
    success: true,
    has_conflicts: false,
    message: 'No conflicts detected'
  };
}

if (require.main === module) {
  console.log('=== Conflict Detection Test ===\n');

  const result = detectConflicts();
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  CONFLICT_TYPES,
  SEVERITY,
  detectConflicts,
  resolveConflict,
  getActiveConflicts,
  preventConflict
};
