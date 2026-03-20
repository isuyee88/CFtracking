# Self-Evolving System - Optimize Action
# File: trae-self-evolving/skills/self-evolving/prompts/optimize.md
# Description: Prompt for optimizing skill behavior based on usage patterns

## Purpose
This module handles skill optimization by analyzing usage patterns,
performance metrics, and success rates to improve skill effectiveness.

## Optimization Triggers

### 1. Usage-Based Optimization
```
Trigger: Skill used > 10 times
Analysis:
- Calculate success rate
- Identify common failure patterns
- Adjust priority based on effectiveness
```

### 2. Performance Optimization
```
Trigger: Execution time > threshold
Analysis:
- Profile skill execution
- Identify bottlenecks
- Generate optimization recommendations
```

### 3. Conflict-Based Optimization
```
Trigger: Skill conflicts detected
Analysis:
- Map conflict relationships
- Determine resolution strategy
- Adjust load order
```

## Priority Score Algorithm

```
Priority Score = BasePriority × UsageWeight × RecencyWeight × QualityWeight

Where:
- UsageWeight = log(1 + total_usages) / log(1 + max_usages)
- RecencyWeight = 1 / (1 + days_since_last_use)
- QualityWeight = success_rate × avg_quality_score
```

### Priority Categories

| Category | Score Range | Action |
|----------|-------------|--------|
| Critical | 80-100 | Always pre-load |
| High | 60-79 | Pre-load on project match |
| Medium | 40-59 | Load on demand |
| Low | 20-39 | Manual trigger only |
| Experimental | 0-19 | Disabled by default |

## Optimization Actions

### 1. Priority Adjustment
```
When to adjust:
- Success rate changes by > 10%
- Usage pattern changes significantly
- User explicitly reprioritizes

How to adjust:
1. Calculate new priority score
2. Create EvolutionLog entry
3. Update skill entity
4. Notify if significant change
```

### 2. Skill Merging
```
When to merge:
- Two skills have > 80% overlap
- Skills are always used together
- One skill is a subset of another

How to merge:
1. Identify dominant skill
2. Map all relationships
3. Transfer non-duplicate knowledge
4. Archive merged skill
5. Create EvolutionLog
```

### 3. Skill Splitting
```
When to split:
- Skill has two distinct use cases
- Skill is too complex (> 500 lines)
- Parts are used independently

How to split:
1. Identify distinct capabilities
2. Create new skill entities
3. Map shared knowledge
4. Update all relationships
5. Create EvolutionLog entries
```

## Quality Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Success Rate | > 90% | 70-90% | < 70% |
| Avg Execution Time | < 1s | 1-5s | > 5s |
| Conflict Frequency | 0-1/month | 2-5/month | > 5/month |
| User Satisfaction | > 4/5 | 3-4/5 | < 3/5 |

## Optimization Schedule
- **Real-time**: Immediate on critical failures
- **Hourly**: Usage pattern analysis
- **Daily**: Priority recalculation
- **Weekly**: Deep performance review
