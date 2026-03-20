/**
 * Self-Evolving System - Rollback Action
 * File: trae-self-evolving/skills/self-evolving/actions/rollback.js
 *
 * Description:
 * This module handles version management and rollback operations.
 * It creates snapshots, tracks versions, and enables rollback
 * to previous states when needed.
 */

const { loadData, saveData, generateEntityId } = require('./learn');
const fs = require('fs');
const path = require('path');

const VERSIONS_DIR = path.join(__dirname, '..', '..', 'data', 'versions');
const SNAPSHOT_PREFIX = 'snapshot-';
const VERSION_RETENTION_DAYS = {
  AUTO_SNAPSHOT: 7,
  MANUAL_SNAPSHOT: 30,
  RELEASE: Infinity
};

function ensureVersionsDir() {
  if (!fs.existsSync(VERSIONS_DIR)) {
    fs.mkdirSync(VERSIONS_DIR, { recursive: true });
  }
}

function createSnapshot(skillId, reason = 'manual') {
  const data = loadData();
  const skill = data.entities.find(e => e.type === 'Skill' && e.id === skillId);

  if (!skill) {
    return { success: false, error: 'Skill not found' };
  }

  ensureVersionsDir();

  const versionId = `v${skill.version}-${Date.now()}`;
  const snapshot = {
    version_id: versionId,
    skill_id: skillId,
    skill_name: skill.name,
    version: skill.version,
    snapshot: {
      config: skill.config || {},
      rules: skill.rules || [],
      relationships: skill.relationships || [],
      metadata: {
        priority: skill.priority,
        status: skill.status,
        success_count: skill.success_count,
        failure_count: skill.failure_count
      }
    },
    created_at: new Date().toISOString(),
    created_by: reason,
    reason
  };

  const snapshotPath = path.join(VERSIONS_DIR, `${SNAPSHOT_PREFIX}${versionId}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

  if (!skill.versions) {
    skill.versions = [];
  }
  skill.versions.push({
    version_id: versionId,
    created_at: snapshot.created_at,
    reason
  });

  saveData(data);

  return {
    success: true,
    version_id: versionId,
    snapshot_path: snapshotPath,
    message: `Snapshot created for skill ${skill.name}`
  };
}

function rollbackToVersion(skillId, versionId) {
  const data = loadData();
  const skill = data.entities.find(e => e.type === 'Skill' && e.id === skillId);

  if (!skill) {
    return { success: false, error: 'Skill not found' };
  }

  ensureVersionsDir();

  const snapshotPath = path.join(VERSIONS_DIR, `${SNAPSHOT_PREFIX}${versionId}.json`);

  if (!fs.existsSync(snapshotPath)) {
    return { success: false, error: 'Version snapshot not found' };
  }

  const currentSnapshot = {
    version_id: `current-backup-${Date.now()}`,
    skill_id: skillId,
    skill_name: skill.name,
    version: skill.version,
    snapshot: {
      config: skill.config || {},
      rules: skill.rules || [],
      relationships: skill.relationships || [],
      metadata: {
        priority: skill.priority,
        status: skill.status,
        success_count: skill.success_count,
        failure_count: skill.failure_count
      }
    },
    created_at: new Date().toISOString(),
    created_by: 'rollback_backup'
  };

  const backupPath = path.join(VERSIONS_DIR, `${SNAPSHOT_PREFIX}${currentSnapshot.version_id}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(currentSnapshot, null, 2));

  const targetSnapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));

  skill.config = targetSnapshot.snapshot.config;
  skill.rules = targetSnapshot.snapshot.rules;
  skill.relationships = targetSnapshot.snapshot.relationships;
  skill.priority = targetSnapshot.snapshot.metadata.priority;
  skill.status = targetSnapshot.snapshot.metadata.status;
  skill.success_count = targetSnapshot.snapshot.metadata.success_count;
  skill.failure_count = targetSnapshot.snapshot.metadata.failure_count;
  skill.updated_at = new Date().toISOString();

  const evolutionLog = {
    id: generateEntityId('EvolutionLog'),
    type: 'EvolutionLog',
    skill_id: skillId,
    action: 'rollback',
    from_version: skill.version,
    to_version: targetSnapshot.version,
    backup_version: currentSnapshot.version_id,
    timestamp: new Date().toISOString()
  };
  data.entities.push(evolutionLog);

  saveData(data);

  return {
    success: true,
    skill_id: skillId,
    from_version: skill.version,
    to_version: targetSnapshot.version,
    backup_version: currentSnapshot.version_id,
    message: `Rolled back skill ${skill.name} to version ${targetSnapshot.version}`
  };
}

function getVersionHistory(skillId) {
  const data = loadData();
  const skill = data.entities.find(e => e.type === 'Skill' && e.id === skillId);

  if (!skill) {
    return { success: false, error: 'Skill not found' };
  }

  const versions = skill.versions || [];
  const history = versions.map(v => {
    const snapshotPath = path.join(VERSIONS_DIR, `${SNAPSHOT_PREFIX}${v.version_id}.json`);
    const exists = fs.existsSync(snapshotPath);
    return {
      version_id: v.version_id,
      created_at: v.created_at,
      reason: v.reason,
      snapshot_exists: exists
    };
  });

  return {
    success: true,
    skill_id: skillId,
    skill_name: skill.name,
    current_version: skill.version,
    version_count: history.length,
    history: history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  };
}

function listAvailableVersions() {
  ensureVersionsDir();

  const files = fs.readdirSync(VERSIONS_DIR)
    .filter(f => f.startsWith(SNAPSHOT_PREFIX) && f.endsWith('.json'));

  return {
    success: true,
    version_count: files.length,
    versions: files.map(f => {
      const content = JSON.parse(fs.readFileSync(path.join(VERSIONS_DIR, f), 'utf-8'));
      return {
        version_id: content.version_id,
        skill_id: content.skill_id,
        skill_name: content.skill_name,
        version: content.version,
        created_at: content.created_at,
        reason: content.reason
      };
    })
  };
}

function cleanupOldVersions() {
  ensureVersionsDir();

  const files = fs.readdirSync(VERSIONS_DIR)
    .filter(f => f.startsWith(SNAPSHOT_PREFIX) && f.endsWith('.json'));

  const now = Date.now();
  let cleanedCount = 0;

  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(VERSIONS_DIR, file), 'utf-8'));
    const createdAt = new Date(content.created_at).getTime();
    const daysOld = (now - createdAt) / (1000 * 60 * 60 * 24);

    let shouldDelete = false;

    if (content.reason === 'auto' && daysOld > VERSION_RETENTION_DAYS.AUTO_SNAPSHOT) {
      shouldDelete = true;
    } else if (content.reason === 'manual' && daysOld > VERSION_RETENTION_DAYS.MANUAL_SNAPSHOT) {
      shouldDelete = true;
    }

    if (shouldDelete) {
      fs.unlinkSync(path.join(VERSIONS_DIR, file));
      cleanedCount++;
    }
  }

  return {
    success: true,
    cleaned_count: cleanedCount,
    message: `Cleaned up ${cleanedCount} old versions`
  };
}

function autoSnapshot(skillId, trigger) {
  const thresholds = {
    continuous_failures: 3,
    performance_drop_percent: 30
  };

  const data = loadData();
  const skill = data.entities.find(e => e.type === 'Skill' && e.id === skillId);

  if (!skill) {
    return { success: false, error: 'Skill not found' };
  }

  let shouldSnapshot = false;
  let reason = '';

  if (trigger === 'continuous_failures' && (skill.failure_count || 0) >= thresholds.continuous_failures) {
    shouldSnapshot = true;
    reason = 'auto-continuous-failure';
  }

  if (shouldSnapshot) {
    return createSnapshot(skillId, reason);
  }

  return {
    success: true,
    snapshot_created: false,
    message: 'Auto-snapshot conditions not met'
  };
}

if (require.main === module) {
  console.log('=== Rollback System Test ===\n');

  const versions = listAvailableVersions();
  console.log('Available versions:', JSON.stringify(versions, null, 2));
}

module.exports = {
  createSnapshot,
  rollbackToVersion,
  getVersionHistory,
  listAvailableVersions,
  cleanupOldVersions,
  autoSnapshot
};
