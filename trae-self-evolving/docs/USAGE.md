# Usage Guide
# File: trae-self-evolving/docs/USAGE.md

## Basic Usage

### Learning from Feedback

#### Error Correction
When AI makes a mistake:
```
"You made an error. The correct approach is to use pnpm instead of npm."
```

The system will:
1. Create an ErrorPattern entity
2. Link it to relevant skill
3. Adjust skill behavior

#### Preference Expression
When you express a preference:
```
"I prefer using pnpm as my package manager."
```

The system will:
1. Create a UserPreference entity
2. Store key-value pair
3. Apply to relevant contexts

### Optimization

#### Manual Optimization
Trigger optimization for a skill:
```
"/optimize cloudflare-expert"
```

#### Auto-Optimization
System automatically optimizes when:
- Success rate drops below 70%
- 3+ consecutive failures
- Performance degrades by 30%+

### Conflict Resolution

#### View Conflicts
```
"/conflicts"
```

#### Resolve Conflict
```
"/resolve cloudflare-expert browser-test priority_based"
```

Available strategies:
- `priority_based` - Higher priority wins
- `sequential` - Run both in order
- `merge` - Merge configurations

### Version Management

#### Create Snapshot
```
"/snapshot cloudflare-expert pre-optimization"
```

#### View History
```
"/history cloudflare-expert"
```

#### Rollback
```
"/rollback cloudflare-expert v1.2.3"
```

## Dashboard Operations

### View Dashboard
1. Open Trae IDE
2. Navigate to Self-Evolving UI
3. View skill states and health

### Adjust Priority
1. Select skill in dashboard
2. Drag priority slider
3. Changes apply immediately

### Resolve Conflicts
1. View conflicts panel
2. Select resolution strategy
3. Confirm action

## API Reference

### Learn Module
```javascript
const { learnFromFeedback } = require('./actions/learn');

learnFromFeedback({
  type: 'error_correction',
  error_type: 'wrong_command',
  solution: 'use pnpm'
}, { skill: 'cloudflare-expert' });
```

### Optimize Module
```javascript
const { analyzeSkillPerformance, optimizeSkill } = require('./actions/optimize');

analyzeSkillPerformance('skill-id');
optimizeSkill('skill-id', 'priority_boost');
```

### Resolve Module
```javascript
const { detectConflicts, resolveConflict } = require('./actions/resolve');

detectConflicts();
resolveConflict('conflict-id', 'priority_based');
```

### Rollback Module
```javascript
const { createSnapshot, rollbackToVersion } = require('./actions/rollback');

createSnapshot('skill-id', 'pre-change');
rollbackToVersion('skill-id', 'v1.2.3');
```

## Best Practices

1. **Regular Review** - Check dashboard weekly
2. **Backup Before Major Changes** - Create snapshot
3. **Monitor Conflicts** - Resolve promptly
4. **Trust the System** - Let it learn and optimize
5. **Manual Intervention** - Only when necessary

## Common Issues

### Skill Not Learning
- Check feedback is specific
- Verify skill is active
- Check data storage permissions

### Optimization Not Working
- Verify usage threshold met
- Check success rate calculation
- Review optimization logs

### Conflict Reoccurring
- Try different resolution strategy
- Manually separate conflicting skills
- Disable one skill temporarily
