# Installation Guide
# File: trae-self-evolving/docs/INSTALL.md

## Prerequisites

- Node.js >= 16.0.0
- Trae IDE (latest version)
- npm or pnpm

## Step 1: Install Knowledge Graph Memory MCP

### Option A: Via Trae IDE MCP Marketplace
1. Open Trae IDE
2. Go to Settings → MCP Servers
3. Search for "Memory"
4. Select "Knowledge Graph Memory"
5. Install and restart

### Option B: Manual Installation
Add to your MCP configuration:

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

## Step 2: Install Self-Evolving System

### Clone/Copy Files
```bash
# Copy to your Trae skills directory
cp -r trae-self-evolving ~/.trae/skills/
```

### Or Add as MCP Server
```json
{
  "mcpServers": {
    "self-evolving-learn": {
      "command": "node",
      "args": ["PATH/TO/trae-self-evolving/skills/self-evolving/actions/learn.js"]
    },
    "self-evolving-optimize": {
      "command": "node",
      "args": ["PATH/TO/trae-self-evolving/skills/self-evolving/actions/optimize.js"]
    },
    "self-evolving-resolve": {
      "command": "node",
      "args": ["PATH/TO/trae-self-evolving/skills/self-evolving/actions/resolve.js"]
    },
    "self-evolving-rollback": {
      "command": "node",
      "args": ["PATH/TO/trae-self-evolving/skills/self-evolving/actions/rollback.js"]
    }
  }
}
```

## Step 3: Initialize Data Storage

```bash
# Create data directory
mkdir -p ~/.trae/self-evolving/data

# Run initialization
node PATH/TO/trae-self-evolving/skills/self-evolving/actions/learn.js
```

## Step 4: Verify Installation

```bash
# Test learn module
node PATH/TO/trae-self-evolving/skills/self-evolving/actions/learn.js

# Test optimize module
node PATH/TO/trae-self-evolving/skills/self-evolving/actions/optimize.js

# Test resolve module
node PATH/TO/trae-self-evolving/skills/self-evolving/actions/resolve.js
```

## Step 5: Open Dashboard

1. Open Trae IDE
2. Navigate to the self-evolving skills directory
3. Open `ui/index.jsx` in preview mode
4. Or integrate with your existing React application

## Troubleshooting

### MCP Connection Failed
- Verify Node.js is installed: `node --version`
- Check MCP configuration syntax
- Restart Trae IDE

### Data Not Persisting
- Check write permissions to data directory
- Verify disk space
- Check logs for errors

### Dashboard Not Loading
- Ensure React is installed
- Check browser console for errors
- Verify all UI components are present

## Next Steps

See [USAGE.md](USAGE.md) for usage instructions.
