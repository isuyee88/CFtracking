# Self-Evolving System - Resolve Action
# File: trae-self-evolving/skills/self-evolving/prompts/resolve.md
# Description: Prompt for detecting and resolving skill conflicts

## Purpose
This module handles conflict detection and resolution between skills,
ensuring stable multi-skill collaboration.

## Conflict Types

### 1. File Access Conflict
```
Description: Two or more skills access/modify the same file
Detection: Parse skill file access patterns
Resolution:
1. Determine skill priorities
2. Either: sequential execution (by priority)
3. Or: create file lock mechanism
```

### 2. Configuration Override Conflict
```
Description: Skills modify the same configuration key
Detection: Track config modification patterns
Resolution:
1. Apply priority-based override rules
2. Or: merge configurations deeply
3. Or: prompt user for decision
```

### 3. Execution Order Conflict
```
Description: Skills must execute in specific order but order is ambiguous
Detection: Analyze skill dependencies
Resolution:
1. Build dependency graph
2. Topological sort for execution order
3. Detect circular dependencies
```

### 4. Resource Conflict
```
Description: Skills compete for same resources (API rate limits, etc.)
Detection: Track resource usage patterns
Resolution:
1. Rate limiting coordination
2. Resource pooling
3. Queue-based access
```

## Conflict Detection Algorithm

```
1. Load all active skills
2. Build interaction matrix:
   - For each pair of skills (A, B):
     - Check file access overlap
     - Check config key overlap
     - Check dependency conflicts
3. Score conflict severity:
   - High: Direct modification conflicts
   - Medium: Indirect conflicts
   - Low: Potential future conflicts
4. Create ConflictRecord entities
5. Trigger resolution workflow
```

## Resolution Strategies

### Strategy 1: Priority-Based Resolution
```
Apply when: Clear priority difference exists
Process:
1. Higher priority skill executes first
2. Lower priority skill adapts
3. Log resolution for future reference
```

### Strategy 2: Sequential Execution
```
Apply when: Both skills need to run
Process:
1. Determine execution order by priority
2. Add delay between executions if needed
3. Verify no state corruption
```

### Strategy 3: Merge Resolution
```
Apply when: Skills can coexist
Process:
1. Identify mergeable aspects
2. Create merged configuration
3. Update both skills
4. Test merged behavior
```

### Strategy 4: User Decision
```
Apply when: No automatic resolution possible
Process:
1. Present conflict details to user
2. Explain options and implications
3. Await user decision
4. Apply and log decision
```

## Conflict Prevention

### Proactive Checks
```
Before loading a new skill:
1. Check against all active skills
2. Identify potential conflicts
3. Warn user if conflicts exist
4. Suggest resolution strategies
```

### Dependency Management
```
Build skill dependency graph:
1. Extract explicit dependencies
2. Infer implicit dependencies
3. Detect circular dependencies
4. Generate safe load order
```

## Example Conflict Resolution

### Scenario: cloudflare-expert and browser-test both modify wrangler.toml
```
Detection:
- cloudflare-expert reads/writes wrangler.toml
- browser-test reads/writes wrangler.toml
- Overlap detected: 100%

Resolution Options:
A) Sequential: cloudflare-expert first, then browser-test
B) Merge: Combine configurations intelligently
C) User decision: Ask which takes precedence

Selected: A (Priority: cloudflare-expert=80, browser-test=70)
Result: Sequential execution with state verification
```
