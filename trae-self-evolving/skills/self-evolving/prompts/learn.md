# Self-Evolving System - Learn Action
# File: trae-self-evolving/skills/self-evolving/prompts/learn.md
# Description: Prompt for learning from user interactions

## Purpose
This module handles the learning mechanism of the self-evolving system.
It captures feedback, patterns, and preferences from user interactions.

## Learning Types

### 1. Error Learning
When a command fails or AI makes a mistake:

```
When detected:
1. Record the error context (what was attempted, what failed)
2. Extract the error pattern
3. Find/confirm the correct solution
4. Store in knowledge graph as ErrorPattern entity
5. Link to related Skill entity
```

### 2. Preference Learning
When user expresses a preference:

```
When detected:
1. Identify the preference type (coding style, tool choice, format)
2. Extract key-value pair
3. Store in knowledge graph as UserPreference entity
4. Link to relevant context (language, project type, etc.)
```

### 3. Best Practice Learning
When user confirms a good approach:

```
When detected:
1. Document the successful approach
2. Extract reusable patterns
3. Store as OptimizationRule entity
4. Link to relevant Skill entities
```

## Knowledge Graph Operations

### Create Entity
```javascript
{
  operation: "create_entity",
  entityType: "ErrorPattern | UserPreference | OptimizationRule",
  properties: {
    // Entity-specific properties
  }
}
```

### Create Relationship
```javascript
{
  operation: "create_relationship",
  from: "entity_id",
  relationship: "RELATIONSHIP_TYPE",
  to: "entity_id"
}
```

## Example Learning Scenarios

### Scenario 1: User Corrects AI
```
User: "不要用 npm，用 pnpm"
AI Action:
1. Create UserPreference {key: "package_manager", value: "pnpm"}
2. Link to context {language: "javascript", project_type: "general"}
```

### Scenario 2: Error Resolution
```
User: "那个命令报错了，应该用 --force 参数"
AI Action:
1. Create ErrorPattern {error_type: "permission_denied", solution: "add --force"}
2. Link to command context
3. Update related skill with new knowledge
```

### Scenario 3: Success Confirmation
```
User: "这个方法很好，以后都用这种方式"
AI Action:
1. Create OptimizationRule {rule_type: "best_practice", action: "use_this_method"}
2. Link to relevant skill
3. Increase skill priority score
```

## Quality Checks
- [ ] Validate entity properties before storage
- [ ] Check for duplicate patterns before creating new
- [ ] Ensure relationship direction is correct
- [ ] Verify confidence scores are reasonable
- [ ] Log all learning events for review
