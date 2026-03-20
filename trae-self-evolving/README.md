# Trae Self-Evolving System
# File: trae-self-evolving/README.md

## Overview

A self-improving skill system for Trae IDE that learns from interactions, optimizes based on feedback, and evolves to better serve the user. Inspired by self-improving-agent but designed specifically for Trae's MCP and Skill architecture.

## Features

- [x] **Global Skill Architecture** - Skills work across all projects
- [x] **Auto-Learning Mechanism** - Learns from errors, preferences, and best practices
- [x] **Priority Sorting Algorithm** - Dynamic priority based on usage patterns
- [x] **Conflict Detection** - Detects and resolves skill conflicts
- [x] **Version Management** - Snapshot and rollback capabilities
- [x] **Visual Management UI** - Dashboard for monitoring and control

## Architecture

```
trae-self-evolving/
├── skills/
│   └── self-evolving/
│       ├── skill.yaml           # Skill definition
│       ├── schema.md            # Knowledge graph schema
│       ├── prompts/
│       │   ├── learn.md         # Learning mechanism
│       │   ├── optimize.md      # Optimization logic
│       │   ├── resolve.md       # Conflict resolution
│       │   └── rollback.md      # Version management
│       ├── actions/
│       │   ├── learn.js         # Learning implementation
│       │   ├── optimize.js      # Optimization implementation
│       │   ├── resolve.js       # Conflict resolution
│       │   └── rollback.js      # Rollback implementation
│       └── ui/
│           ├── Dashboard.jsx    # Main dashboard
│           ├── SkillManagement.jsx
│           └── index.jsx        # UI entry point
└── docs/
    ├── INSTALL.md               # Installation guide
    └── USAGE.md                 # Usage guide
```

## Quick Start

### 1. Install Knowledge Graph Memory MCP

```json
{
  "mcpServers": {
    "knowledge-graph-memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_BACKEND": "knowledge-graph"
      }
    }
  }
}
```

### 2. Configure Trae IDE

Add the following to your Trae MCP configuration:

```json
{
  "mcpServers": {
    "self-evolving": {
      "command": "node",
      "args": ["./skills/self-evolving/actions/learn.js"]
    }
  }
}
```

## Core Modules

### Learn Module (`learn.js`)
Handles learning from:
- Error corrections
- User preferences
- Best practices
- Skill feedback

### Optimize Module (`optimize.js`)
Priority scoring algorithm:
```
Priority Score = BasePriority × UsageWeight × RecencyWeight × QualityWeight
```

### Resolve Module (`resolve.js`)
Detects conflicts:
- File access conflicts
- Configuration overrides
- Execution order conflicts

### Rollback Module (`rollback.js`)
Version management:
- Snapshot creation
- Rollback to previous versions
- Version history tracking

## Knowledge Graph Schema

### Entities
- `Skill` - Represents a skill capability
- `UserPreference` - User preferences
- `ErrorPattern` - Error patterns and solutions
- `OptimizationRule` - Optimization rules
- `EvolutionLog` - Evolution history
- `ConflictRecord` - Conflict records

### Relationships
- `USES` - Skill uses a preference
- `CORRECTED_BY` - Error corrected by pattern
- `IMPROVED_BY` - Skill improved by rule
- `CONFLICTS_WITH` - Skill conflicts

## Configuration

### Priority Categories
| Category | Score | Action |
|----------|-------|--------|
| Critical | 80-100 | Always pre-load |
| High | 60-79 | Pre-load on match |
| Medium | 40-59 | Load on demand |
| Low | 20-39 | Manual trigger |
| Experimental | 0-19 | Disabled |

### Auto-Optimization Triggers
| Trigger | Threshold |
|---------|-----------|
| Continuous failures | >= 3 |
| Performance drop | > 30% |

## License

MIT
