/**
 * Self-Evolving System - Optimize Action
 * File: trae-self-evolving/skills/self-evolving/actions/optimize.js
 *
 * Description:
 * This module handles skill optimization based on usage patterns,
 * performance metrics, and success rates. It implements the priority
 * scoring algorithm and determines optimization actions.
 *
 * Algorithm:
 * Priority Score = BasePriority × UsageWeight × RecencyWeight × QualityWeight
 */

const { loadData, saveData } = require('./learn');

const MAX_USAGE_DAYS = 30;
const CRITICAL_THRESHOLD = 80;
const HIGH_THRESHOLD = 60;
const MEDIUM_THRESHOLD = 40;
const LOW_THRESHOLD = 20;

function calculatePriorityScore(skill) {
  const basePriority = skill.priority || 50;

  const totalUsages = (skill.success_count || 0) + (skill.failure_count || 0);
  const usageWeight = Math.log(1 + totalUsages) / Math.log(1 + 100);

  const daysSinceLastUse = skill.last_used
    ? (Date.now() - new Date(skill.last_used).getTime()) / (1000 * 60 * 60 * 24)
    : MAX_USAGE_DAYS;
  const recencyWeight = 1 / (1 + daysSinceLastUse);

  const successRate = skill.success_rate || 0.5;
  const avgQualityScore = skill.avg_quality_score || 0.7;
  const qualityWeight = successRate * avgQualityScore;

  const priorityScore = basePriority * usageWeight * recencyWeight * qualityWeight;

  return {
    score: Math.min(100, Math.max(0, priorityScore)),
    breakdown: {
      basePriority,
      usageWeight,
      recencyWeight,
      qualityWeight
    }
  };
}

function getPriorityCategory(score) {
  if (score >= CRITICAL_THRESHOLD) return 'critical';
  if (score >= HIGH_THRESHOLD) return 'high';
  if (score >= MEDIUM_THRESHOLD) return 'medium';
  if (score >= LOW_THRESHOLD) return 'low';
  return 'experimental';
}

function analyzeSkillPerformance(skillId) {
  const data = loadData();
  const skill = data.entities.find(e => e.type === 'Skill' && e.id === skillId);

  if (!skill) {
    return { success: false, error: 'Skill not found' };
  }

  const priorityResult = calculatePriorityScore(skill);
  const category = getPriorityCategory(priorityResult.score);

  const recommendations = [];

  if (skill.success_rate < 0.7) {
    recommendations.push({
      type: 'success_rate',
      message: 'Success rate is below 70%, consider reviewing skill logic',
      priority: 'high'
    });
  }

  if (skill.failure_count > skill.success_count * 2) {
    recommendations.push({
      type: 'high_failure',
      message: 'Failure count is significantly higher than success count',
      priority: 'critical'
    });
  }

  const daysSinceUpdate = (Date.now() - new Date(skill.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate > 30) {
    recommendations.push({
      type: 'stale',
      message: 'Skill has not been updated in over 30 days',
      priority: 'medium'
    });
  }

  return {
    success: true,
    skill_id: skillId,
    skill_name: skill.name,
    priority_score: priorityResult.score,
    category,
    breakdown: priorityResult.breakdown,
    recommendations
  };
}

function optimizeSkill(skillId, optimizationType) {
  const data = loadData();
  const skill = data.entities.find(e => e.type === 'Skill' && e.id === skillId);

  if (!skill) {
    return { success: false, error: 'Skill not found' };
  }

  let optimizationApplied = null;

  switch (optimizationType) {
    case 'priority_boost':
      skill.priority = Math.min(100, (skill.priority || 50) + 10);
      optimizationApplied = { type: 'priority_boost', new_priority: skill.priority };
      break;

    case 'priority_reduce':
      skill.priority = Math.max(0, (skill.priority || 50) - 10);
      optimizationApplied = { type: 'priority_reduce', new_priority: skill.priority };
      break;

    case 'reset_counts':
      skill.success_count = 0;
      skill.failure_count = 0;
      skill.success_rate = 0.5;
      optimizationApplied = { type: 'reset_counts' };
      break;

    case 'enable':
      skill.status = 'active';
      optimizationApplied = { type: 'enable' };
      break;

    case 'disable':
      skill.status = 'disabled';
      optimizationApplied = { type: 'disable' };
      break;

    default:
      return { success: false, error: 'Unknown optimization type' };
  }

  skill.updated_at = new Date().toISOString();

  const evolutionLog = {
    id: `evolution-${Date.now()}`,
    type: 'EvolutionLog',
    skill_id: skillId,
    action: 'optimize',
    optimization_type: optimizationType,
    before_state: { priority: skill.priority },
    after_state: optimizationApplied,
    timestamp: new Date().toISOString()
  };
  data.entities.push(evolutionLog);

  saveData(data);

  return {
    success: true,
    optimization_applied: optimizationApplied,
    new_priority_score: calculatePriorityScore(skill).score,
    evolution_log_id: evolutionLog.id
  };
}

function getOptimizationCandidates() {
  const data = loadData();
  const skills = data.entities.filter(e => e.type === 'Skill');

  return skills
    .map(skill => {
      const priorityResult = calculatePriorityScore(skill);
      return {
        skill_id: skill.id,
        skill_name: skill.name,
        current_priority: skill.priority,
        calculated_priority: priorityResult.score,
        category: getPriorityCategory(priorityResult.score),
        success_rate: skill.success_rate || 0,
        needs_optimization: priorityResult.score < MEDIUM_THRESHOLD
      };
    })
    .sort((a, b) => a.calculated_priority - b.calculated_priority);
}

function autoOptimize() {
  const candidates = getOptimizationCandidates();
  const results = [];

  for (const candidate of candidates) {
    if (candidate.needs_optimization) {
      const result = optimizeSkill(candidate.skill_id, 'priority_boost');
      results.push(result);
    }
  }

  return {
    success: true,
    optimized_count: results.length,
    results
  };
}

if (require.main === module) {
  console.log('=== Skill Optimization Test ===\n');

  const candidates = getOptimizationCandidates();
  console.log('Optimization Candidates:');
  console.log(JSON.stringify(candidates, null, 2));
}

module.exports = {
  calculatePriorityScore,
  getPriorityCategory,
  analyzeSkillPerformance,
  optimizeSkill,
  getOptimizationCandidates,
  autoOptimize
};
