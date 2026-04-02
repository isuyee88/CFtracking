---
name: "cloudflare-docs"
description: "Query Cloudflare developer documentation for Workers, D1, KV, R2, and edge computing. Invoke when user needs Cloudflare configuration, troubleshooting, or best practices."
---

# Cloudflare Documentation Skill

This skill helps you query and retrieve information from Cloudflare's official developer documentation at https://developers.cloudflare.com.

## When to Use This Skill

Invoke this skill when:
- User asks about Cloudflare Workers development
- User needs help with Cloudflare D1 database
- User wants to configure Cloudflare KV storage
- User needs information about Cloudflare R2 storage
- User asks about Cloudflare Pages, CDN, or edge computing
- User encounters Cloudflare-specific errors or issues
- User needs Cloudflare best practices or optimization tips

## How to Use

### Method 1: Using Context7 (Preferred)

1. Use `mcp_context7_resolve-library-id` to find Cloudflare documentation
   - Library name: "cloudflare" or "cloudflare-workers"
   - Query: specific topic (e.g., "D1 database queries", "KV namespace")

2. Use `mcp_context7_query-docs` to retrieve relevant documentation
   - Pass the resolved library ID
   - Provide specific query about the feature or issue

### Method 2: Using Web Search

When Context7 doesn't have the information:
1. Use `WebSearch` with query format: "site:developers.cloudflare.com [topic]"
2. Use `WebFetch` to retrieve specific documentation pages

### Method 3: Direct URL Access

For known documentation URLs:
- Use `WebFetch` with URL: `https://developers.cloudflare.com/[product]/[topic]/`

## Common Documentation Paths

- Workers: `https://developers.cloudflare.com/workers/`
- D1 Database: `https://developers.cloudflare.com/d1/`
- KV Storage: `https://developers.cloudflare.com/kv/`
- R2 Storage: `https://developers.cloudflare.com/r2/`
- Pages: `https://developers.cloudflare.com/pages/`
- CDN: `https://developers.cloudflare.com/cache/`

## Examples

### Example 1: Query D1 Database Documentation
```
User: "How do I use D1 database in Workers?"

Steps:
1. Resolve library ID for "cloudflare-workers"
2. Query docs: "D1 database connection and query examples"
3. Return code examples and best practices
```

### Example 2: Troubleshoot KV Issue
```
User: "My KV namespace is not found"

Steps:
1. Search: "site:developers.cloudflare.com KV namespace binding"
2. Fetch relevant documentation
3. Provide troubleshooting steps
```

## Best Practices

1. **Always check Context7 first** - It has curated, high-quality documentation
2. **Use specific queries** - "D1 prepared statements" vs "D1"
3. **Include code examples** - Cloudflare docs have excellent examples
4. **Check version compatibility** - Some features may be in beta
5. **Reference official docs** - Always cite the source URL

## Integration with Cloudflare MCP

If Cloudflare MCP tools are available, prefer them for:
- Real-time resource status
- Direct API operations
- Configuration validation

## Notes

- Cloudflare updates documentation frequently
- Some features are platform-specific (free vs paid tiers)
- Always verify current limits and pricing
- Check for breaking changes in Workers runtime
