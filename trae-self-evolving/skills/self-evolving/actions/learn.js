/**
 * Self-Evolving System - Learn Action
 * File: trae-self-evolving/skills/self-evolving/actions/learn.js
 *
 * Description:
 * This module handles learning from user feedback and interactions.
 * It captures error patterns, user preferences, and best practices
 * and stores them in the Knowledge Graph Memory.
 *
 * Input:
 * - feedback: User feedback data
 * - context: Current interaction context
 *
 * Output:
 * - learned: Whether learning was successful
 * - entity_id: ID of created/updated entity
 * - confidence: Confidence score of the learning
 */

const fs = require('fs');
const path = require('path');

const LEARNED_DATA_FILE = path.join(__dirname, '../../..', 'data', 'learned.json');
const ENTITY_INDEX_FILE = path.join(__dirname, '../../..', 'data', 'entity-index.json');

function ensureDataDir() {
  const dataDir = path.dirname(LEARNED_DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadData() {
  ensureDataDir();
  if (!fs.existsSync(LEARNED_DATA_FILE)) {
    return { entities: [], relationships: [] };
  }
  return JSON.parse(fs.readFileSync(LEARNED_DATA_FILE, 'utf-8'));
}

function saveData(data) {
  ensureDataDir();
  fs.writeFileSync(LEARNED_DATA_FILE, JSON.stringify(data, null, 2));
}

function generateEntityId(type) {
  return `${type.toLowerCase().replace('_', '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function learnFromFeedback(feedback, context) {
  const data = loadData();
  let result = { success: false, entity_id: null, confidence: 0 };

  switch (feedback.type) {
    case 'error_correction':
      result = learnErrorPattern(feedback, context, data);
      break;
    case 'preference':
      result = learnPreference(feedback, context, data);
      break;
    case 'best_practice':
      result = learnBestPractice(feedback, context, data);
      break;
    case 'skill_feedback':
      result = learnSkillFeedback(feedback, context, data);
      break;
    default:
      result = { success: false, error: 'Unknown feedback type' };
  }

  saveData(data);
  return result;
}

function learnErrorPattern(feedback, context, data) {
  const entity = {
    id: generateEntityId('ErrorPattern'),
    type: 'ErrorPattern',
    error_type: feedback.error_type || 'unknown',
    error_message: feedback.error_message,
    solution: feedback.solution,
    occurrences: 1,
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    resolved: feedback.resolved || false,
    context: {
      skill: context.skill || null,
      command: context.command || null,
      project: context.project || null
    }
  };

  data.entities.push(entity);

  data.relationships.push({
    id: generateEntityId('Relationship'),
    from: entity.id,
    type: 'CORRECTED_BY',
    to: context.skill || 'unknown-skill',
    timestamp: new Date().toISOString()
  });

  return {
    success: true,
    entity_id: entity.id,
    confidence: 0.9,
    message: `Learned error pattern: ${entity.error_type}`
  };
}

function learnPreference(feedback, context, data) {
  const entity = {
    id: generateEntityId('UserPreference'),
    type: 'UserPreference',
    key: feedback.key,
    value: feedback.value,
    confidence: feedback.confidence || 0.8,
    source: feedback.source || 'user_explicit',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    context: {
      language: context.language || null,
      project_type: context.project_type || null,
      domain: context.domain || null
    }
  };

  const existingIdx = data.entities.findIndex(
    e => e.type === 'UserPreference' && e.key === feedback.key
  );

  if (existingIdx >= 0) {
    data.entities[existingIdx].value = feedback.value;
    data.entities[existingIdx].updated_at = new Date().toISOString();
    data.entities[existingIdx].confidence = Math.min(1, feedback.confidence + 0.1);
    return {
      success: true,
      entity_id: data.entities[existingIdx].id,
      confidence: data.entities[existingIdx].confidence,
      message: `Updated preference: ${feedback.key} = ${feedback.value}`
    };
  }

  data.entities.push(entity);
  return {
    success: true,
    entity_id: entity.id,
    confidence: entity.confidence,
    message: `Learned preference: ${feedback.key} = ${feedback.value}`
  };
}

function learnBestPractice(feedback, context, data) {
  const entity = {
    id: generateEntityId('OptimizationRule'),
    type: 'OptimizationRule',
    rule_type: feedback.rule_type || 'best_practice',
    condition: feedback.condition,
    action: feedback.action,
    effectiveness: feedback.effectiveness || 0.8,
    applies_to: feedback.applies_to || [],
    created_at: new Date().toISOString(),
    times_applied: 0,
    times_succeeded: 0
  };

  data.entities.push(entity);

  if (context.skill) {
    data.relationships.push({
      id: generateEntityId('Relationship'),
      from: context.skill,
      type: 'IMPROVED_BY',
      to: entity.id,
      timestamp: new Date().toISOString()
    });
  }

  return {
    success: true,
    entity_id: entity.id,
    confidence: entity.effectiveness,
    message: `Learned optimization rule: ${feedback.rule_type}`
  };
}

function learnSkillFeedback(feedback, context, data) {
  const skillId = feedback.skill_id || context.skill;

  let skill = data.entities.find(e => e.type === 'Skill' && e.id === skillId);

  if (!skill) {
    skill = {
      id: skillId,
      type: 'Skill',
      name: feedback.skill_name || skillId,
      version: '1.0.0',
      category: feedback.category || 'general',
      priority: 50,
      status: 'active',
      success_count: 0,
      failure_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.entities.push(skill);
  }

  if (feedback.success) {
    skill.success_count = (skill.success_count || 0) + 1;
  } else {
    skill.failure_count = (skill.failure_count || 0) + 1;
  }

  skill.success_rate = skill.success_count / (skill.success_count + skill.failure_count);
  skill.updated_at = new Date().toISOString();

  if (feedback.priority !== undefined) {
    skill.priority = feedback.priority;
  }

  return {
    success: true,
    entity_id: skill.id,
    confidence: skill.success_rate,
    message: `Updated skill feedback: ${skill.name} (success: ${skill.success_rate})`
  };
}

function getLearnedEntities(type) {
  const data = loadData();
  if (!type) {
    return data.entities;
  }
  return data.entities.filter(e => e.type === type);
}

function getRelationships(entityId) {
  const data = loadData();
  return data.relationships.filter(
    r => r.from === entityId || r.to === entityId
  );
}

if (require.main === module) {
  const testFeedback = {
    type: 'preference',
    key: 'package_manager',
    value: 'pnpm',
    confidence: 0.95
  };

  const result = learnFromFeedback(testFeedback, { project_type: 'cloudflare' });
  console.log('Learning result:', result);
}

module.exports = {
  learnFromFeedback,
  getLearnedEntities,
  getRelationships,
  loadData,
  saveData
};
