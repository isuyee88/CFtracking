# Knowledge Graph Schema for Self-Evolving System
# File: trae-self-evolving/skills/self-evolving/schema.md
# Description: Defines the knowledge graph structure for skill evolution

## Entity Types

### Skill
Represents a skill or capability in the system.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique skill identifier |
| name | string | Skill name |
| version | string | Current version |
| category | string | Skill category |
| priority | number | Priority score (0-100) |
| status | string | active/inactive/conflict |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |
| success_count | number | Number of successful uses |
| failure_count | number | Number of failures |

### UserPreference
Represents user preferences learned over time.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Preference identifier |
| key | string | Preference key |
| value | string | Preference value |
| confidence | number | Confidence score |
| source | string | How preference was learned |
| updated_at | timestamp | Last update time |

### ErrorPattern
Represents error patterns and their solutions.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Pattern identifier |
| error_type | string | Type of error |
| error_message | string | Error message pattern |
| solution | string | Resolved solution |
| occurrences | number | Number of occurrences |
| last_seen | timestamp | Last occurrence |
| resolved | boolean | Whether resolved |

### OptimizationRule
Represents optimization rules discovered over time.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Rule identifier |
| rule_type | string | Type of optimization |
| condition | string | Trigger condition |
| action | string | Optimization action |
| effectiveness | number | Effectiveness score |
| applies_to | string[] | Skills this applies to |

### EvolutionLog
Represents the history of skill evolution.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Log entry identifier |
| skill_id | string | Related skill |
| action | string | Action taken |
| before_state | object | State before change |
| after_state | object | State after change |
| reason | string | Reason for change |
| triggered_by | string | What triggered this |
| timestamp | timestamp | When it happened |

### ConflictRecord
Represents conflicts between skills.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Conflict identifier |
| skill_a | string | First skill involved |
| skill_b | string | Second skill involved |
| conflict_type | string | Type of conflict |
| severity | string | minor/moderate/severe |
| resolution | string | How it was resolved |
| status | string | detected/resolved/pending |
| timestamp | timestamp | When detected |

## Relationship Types

| Relationship | Description |
|--------------|-------------|
| USES | A skill uses a preference |
| CORRECTED_BY | An error was corrected by applying a pattern |
| IMPROVED_BY | A skill was improved by a rule |
| CAUSES | An error pattern causes an evolution log |
| CONFLICTS_WITH | Two skills conflict with each other |
| TRIGGERS | An evolution log triggers an optimization |
| DEPENDS_ON | A skill depends on another skill |
| EVOLVED_FROM | A skill was evolved from a previous version |

## Example Graph Queries

### Find all skills that need optimization
```cypher
MATCH (s:Skill)-[:HAS_LOW_PRIORITY]->()
WHERE s.success_count < s.failure_count
RETURN s
```

### Find conflicts involving a skill
```cypher
MATCH (a:Skill {name: 'cloudflare-expert'})-[:CONFLICTS_WITH]->(b:Skill)
RETURN a, b
```

### Get evolution timeline for a skill
```cypher
MATCH (s:Skill {id: 'skill-123'})-[:EVOLVED_FROM*]->(old:Skill)
RETURN old ORDER BY old.updated_at DESC
```

### Find related optimizations for an error
```cypher
MATCH (e:ErrorPattern)-[:CAUSES]->(l:EvolutionLog)-[:TRIGGERS]->(o:OptimizationRule)
WHERE e.id = 'error-456'
RETURN o
```
