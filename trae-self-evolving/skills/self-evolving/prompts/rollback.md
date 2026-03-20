# Self-Evolving System - Rollback Action
# File: trae-self-evolving/skills/self-evolving/prompts\rollback.md
# Description: Prompt for version management and rollback mechanisms

## Purpose
This module handles skill version management, snapshots, and rollback
operations to ensure risk control during skill evolution.

## Version Management

### Version Numbering
```
Format: Major.Minor.Patch
- Major: Breaking changes,架构调整
- Minor: New features,向后兼容
- Patch: Bug fixes, small improvements

Example: 1.2.3
- 1: First major version
- 2: Added new features
- 3: Bug fixes
```

### Snapshot Creation
```
Before any change:
1. Create full snapshot of skill state
2. Include: config, rules, relationships
3. Assign snapshot ID with timestamp
4. Store in version history
```

## Rollback Triggers

### Automatic Rollback
| Condition | Threshold | Action |
|-----------|-----------|--------|
| Continuous failures | >= 3 | Immediate rollback |
| Performance drop | > 30% | Warning + auto-rollback |
| Conflict spike | > 50% increase | Gradual rollback |
| User report | - | Immediate rollback |

### Manual Rollback
```
User triggers:
1. List available versions
2. User selects version
3. Confirm rollback
4. Execute rollback
5. Verify functionality
6. Log rollback event
```

## Rollback Process

### Step-by-Step
```
1. PREPARE
   - Create backup of current state
   - Notify user of rollback start
   - Lock skill to prevent modifications

2. EXECUTE
   - Load target version from storage
   - Replace current state
   - Update version reference
   - Recreate relationships

3. VERIFY
   - Run smoke tests
   - Verify critical functionality
   - Check related skills for impacts

4. COMPLETE
   - Unlock skill
   - Update evolution log
   - Notify user of success
```

## Version Storage

### Storage Format
```javascript
{
  version_id: "v1.2.3-20260318-143052",
  skill_id: "self-evolving-skill",
  version: "1.2.3",
  snapshot: {
    config: { ... },
    rules: [ ... ],
    relationships: [ ... ],
    metadata: { ... }
  },
  created_at: "2026-03-18T14:30:52Z",
  created_by: "auto-snapshot",
  reason: "pre-optimization"
}
```

### Retention Policy
| Version Type | Retention |
|--------------|-----------|
| Auto-snapshots | 7 days |
| Manual snapshots | 30 days |
| Release versions | Forever |
| Failed rollback targets | Until confirmed |

## Recovery Scenarios

### Scenario 1: Optimization Failed
```
State: Optimization applied, success rate dropped from 95% to 60%
Trigger: Success rate < 70% for 3 consecutive uses
Action:
1. Create snapshot of current (bad) state
2. Rollback to previous version
3. Log failure details
4. Disable auto-optimization temporarily
```

### Scenario 2: Conflict Introduced
```
State: New skill version introduced conflicts with existing skill
Trigger: Conflict detection > 50% increase
Action:
1. Identify conflicting components
2. Rollback to pre-conflict version
3. Attempt manual resolution
4. Test before re-deploying
```

### Scenario 3: User Unhappy
```
State: User reports skill behavior is worse
Trigger: User explicit request
Action:
1. Show version history
2. User selects preferred version
3. Execute rollback
4. Solicit feedback on desired changes
```

## Rollback Safety

### Checks Before Rollback
- [ ] Verify target version exists
- [ ] Check version compatibility with environment
- [ ] Ensure backup of current state exists
- [ ] Notify affected users/skills
- [ ] Prepare rollback of rollback (just in case)

### Post-Rollback Verification
- [ ] Skill loads correctly
- [ ] Relationships restored
- [ ] No orphaned references
- [ ] Functionality tests pass
- [ ] Performance acceptable
