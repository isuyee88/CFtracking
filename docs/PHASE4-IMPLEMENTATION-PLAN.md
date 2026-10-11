# Phase 4 实施计划：智能渲染引擎与性能优化

**日期**: 2026-10-11  
**目标**: 实现高性能边缘渲染系统  
**预计时间**: 6-8 小时（1 个工作日）

---

## 🎯 Phase 4 目标

将当前的实时 SSR 渲染升级为**智能缓存系统**，实现：
- 边缘 CDN 缓存（命中率 > 90%）
- KV 预渲染缓存
- 自动预渲染热门页面
- 性能监控

**性能目标**:
- SSR 渲染时间: < 200ms
- 首次内容绘制 (FCP): < 1s
- 最大内容绘制 (LCP): < 1.5s
- 缓存命中率: > 95%

---

## 📋 任务分解

### Task 4.1: Cloudflare Cache API 集成（2 小时）

**目标**: 实现边缘 CDN 缓存

**实现**:
```typescript
// src/routes/public-landing.routes.ts

async function handleCachedLandingPage(request: Request, env: Env) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);
  
  // 1. 检查 CDN 缓存
  let response = await cache.match(cacheKey);
  if (response) {
    return new Response(response.body, {
      ...response,
      headers: {
        ...Object.fromEntries(response.headers),
        'X-Cache': 'HIT',
        'X-Cache-Layer': 'CDN'
      }
    });
  }
  
  // 2. 未命中，渲染页面
  response = await renderLandingPage(request, env);
  
  // 3. 写入缓存（5 分钟 TTL）
  const cacheResponse = new Response(response.body, {
    ...response,
    headers: {
      ...Object.fromEntries(response.headers),
      'Cache-Control': 'public, max-age=300',
      'X-Cache': 'MISS'
    }
  });
  
  ctx.waitUntil(cache.put(cacheKey, cacheResponse.clone()));
  
  return cacheResponse;
}
```

**验收**:
- [ ] 首次访问 X-Cache: MISS
- [ ] 再次访问 X-Cache: HIT
- [ ] 5 分钟后缓存失效

---

### Task 4.2: KV 预渲染缓存（2 小时）

**目标**: 实现 KV 存储的预渲染 HTML

**KV Namespace**:
```toml
# wrangler.toml
[[kv_namespaces]]
binding = "LANDING_PAGE_CACHE"
id = "<KV_ID>"
```

**实现**:
```typescript
// src/services/landing-page-cache.service.ts

export class LandingPageCacheService {
  constructor(private kv: KVNamespace, private db: D1Database) {}
  
  async get(slug: string): Promise<string | null> {
    return await this.kv.get(`lp:${slug}`);
  }
  
  async set(slug: string, html: string, ttl = 3600): Promise<void> {
    await this.kv.put(`lp:${slug}`, html, { expirationTtl: ttl });
  }
  
  async invalidate(slug: string): Promise<void> {
    await this.kv.delete(`lp:${slug}`);
  }
  
  async preRender(slug: string): Promise<void> {
    const lp = await getLandingPageBySlug(slug, this.db);
    if (!lp) return;
    
    const html = await renderBettingComparisonTemplate(lp.content, {...});
    await this.set(slug, html);
  }
}
```

**验收**:
- [ ] KV 缓存命中返回预渲染 HTML
- [ ] Landing Page 更新时自动清除缓存
- [ ] 预渲染功能正常

---

### Task 4.3: 自动预渲染 Cron（1 小时）

**目标**: 每小时预渲染热门页面

**Cron 配置**:
```toml
# wrangler.toml
[triggers]
crons = ["0 * * * *"]  # 每小时
```

**实现**:
```typescript
// src/index.ts

export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    if (event.cron === '0 * * * *') {
      // 获取所有公开的 Landing Pages
      const pages = await new LandingPageRepository(env.DB).findPublic(20);
      
      const cacheService = new LandingPageCacheService(
        env.LANDING_PAGE_CACHE,
        env.DB
      );
      
      // 批量预渲染
      for (const page of pages) {
        if (page.slug) {
          await cacheService.preRender(page.slug);
        }
      }
      
      console.log(`Pre-rendered ${pages.length} landing pages`);
    }
  }
}
```

**验收**:
- [ ] Cron 任务正确触发
- [ ] 所有公开页面预渲染
- [ ] 日志输出正确

---

### Task 4.4: 性能监控（2 小时）

**目标**: 记录和分析性能指标

**实现**:
```typescript
// src/services/performance-monitor.service.ts

export class PerformanceMonitor {
  async recordRender(metrics: {
    slug: string;
    cacheLayer: 'CDN' | 'KV' | 'SSR';
    renderTime: number;
    success: boolean;
  }) {
    await this.db.prepare(`
      INSERT INTO landing_page_render_metrics 
      (slug, cache_layer, render_time, success, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      metrics.slug,
      metrics.cacheLayer,
      metrics.renderTime,
      metrics.success ? 1 : 0
    ).run();
  }
  
  async getCacheHitRate(slug: string, days = 7): Promise<number> {
    const result = await this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN cache_layer IN ('CDN', 'KV') THEN 1 ELSE 0 END) as hits
      FROM landing_page_render_metrics
      WHERE slug = ?
        AND created_at >= DATE('now', '-${days} days')
    `).bind(slug).first();
    
    return (result.hits / result.total) * 100;
  }
}
```

**数据库迁移**:
```sql
-- 079_landing_page_performance.sql
CREATE TABLE landing_page_render_metrics (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  cache_layer TEXT NOT NULL,
  render_time INTEGER NOT NULL,
  success INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_render_metrics_slug ON landing_page_render_metrics(slug);
CREATE INDEX idx_render_metrics_date ON landing_page_render_metrics(created_at);
```

**验收**:
- [ ] 性能数据正确记录
- [ ] 缓存命中率统计准确
- [ ] 慢渲染告警触发

---

## 🔧 技术架构

### 三层缓存流程

```
请求 → CDN 缓存检查
         ↓ 未命中
      KV 缓存检查
         ↓ 未命中
      实时 SSR 渲染
         ↓
      写入 KV 缓存
         ↓
      写入 CDN 缓存
         ↓
      返回响应
```

### 缓存 TTL 策略

| 层级 | TTL | 命中率目标 |
|------|-----|-----------|
| CDN | 5 分钟 | 90% |
| KV | 1 小时 | 5% |
| SSR | 实时 | 5% |

---

## ✅ 验收标准

### 功能验收
- [ ] CDN 缓存正常工作
- [ ] KV 预渲染正常
- [ ] Cron 任务执行
- [ ] 性能监控记录

### 性能验收
- [ ] 缓存命中返回 < 50ms
- [ ] SSR 渲染 < 200ms
- [ ] 整体命中率 > 95%

### 代码验收
- [ ] TypeScript 编译通过
- [ ] 单元测试覆盖核心逻辑
- [ ] 文档完整

---

## 📊 实施时间表

| 任务 | 预计时间 | 累计 |
|------|---------|------|
| Task 4.1: CDN 缓存 | 2h | 2h |
| Task 4.2: KV 预渲染 | 2h | 4h |
| Task 4.3: Cron 预渲染 | 1h | 5h |
| Task 4.4: 性能监控 | 2h | 7h |
| 测试验证 | 1h | 8h |

**总计**: 8 小时

---

## 🚀 立即开始

### Step 1: 创建 KV Namespace
```bash
wrangler kv:namespace create LANDING_PAGE_CACHE
```

### Step 2: 更新 wrangler.toml
添加 KV 绑定和 Cron 配置

### Step 3: 实现缓存逻辑
从 Task 4.1 开始

---

**准备好开始 Phase 4 Task 4.1！** 🚀
