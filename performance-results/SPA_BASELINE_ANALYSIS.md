# 📊 SPA 性能测试初步结果与分析

## 📋 测试概述

**测试时间**: 2026-03-24  
**测试工具**: Playwright + Performance API  
**测试页面**: 
- 首页 (`/#/`)
- 设置页面 (`/#/settings`)

**测试 URL**: http://localhost:5173

---

## ⚠️ 测试结果

### 遇到的问题

Performance API 未能正确收集性能指标，原因分析：

1. **HashRouter 路由问题**
   - 当前项目使用 `HashRouter` (`/#/` 格式)
   - Performance API 的 `navigation` 条目在 hash 路由下无法正确工作
   - TTFB、FCP、LCP 等指标返回 null

2. **页面加载时间**
   - 首页：29.8 秒
   - 设置页面：18.7 秒
   - ⚠️ **加载时间过长**，可能存在资源加载问题

3. **PerformanceObserver 限制**
   - Long Tasks API 在某些环境下不可用
   - Layout Shift 需要更长的观察时间

---

## 🔍 问题分析

### HashRouter vs BrowserRouter

**当前问题**：
```javascript
// HashRouter - Performance API 无法测量
http://localhost:5173/#/settings
                                      ↓
                              这是客户端路由，不是真实页面加载
```

**SSR 需要 BrowserRouter**：
```javascript
// BrowserRouter - Performance API 可以正常测量
http://localhost:5173/settings
            ↓
    真实页面加载，可以测量 TTFB、FCP、LCP
```

### 为什么 SSR 测试失败？

SSR 服务器 (`http://localhost:5174`) 未启动，因为：
1. 还没有创建 SSR 测试项目
2. 需要先评估 SPA 基线性能
3. 再决定是否创建 SSR 版本

---

## 💡 建议方案

### 方案 A：使用 Lighthouse（推荐）

**原因**：
- ✅ Lighthouse 内置支持 SPA 和 HashRouter
- ✅ 自动处理虚拟导航的性能测量
- ✅ 提供完整的 Web Vitals 指标
- ✅ 生成可视化报告

**操作步骤**：

1. **手动测试**（推荐快速验证）
   ```
   1. 打开 Chrome DevTools (F12)
   2. 切换到 Lighthouse 面板
   3. 选择 Performance
   4. 点击 "Analyze page load"
   5. 等待测试完成
   6. 记录数据
   ```

2. **自动化测试**（推荐持续集成）
   ```bash
   # 使用 Lighthouse CI
   npm install -g @lhci/cli
   lhci autorun
   ```

### 方案 B：迁移到 BrowserRouter + 重新测试

**步骤**：
1. 将 React Router 从 HashRouter 改为 BrowserRouter
2. 配置 Cloudflare Workers 处理所有路由
3. 重新运行 Playwright 测试

**优点**：
- ✅ 更接近 SSR 架构
- ✅ Performance API 可以正常工作
- ✅ 为 SSR 迁移做准备

**缺点**：
- ⚠️ 需要修改路由配置
- ⚠️ 需要服务器端配合

### 方案 C：直接创建 SSR 测试项目（最快对比）

**步骤**：
1. 使用 Cloudflare Vite 插件创建 SSR 项目
2. 迁移 1-2 个简单页面
3. 并排对比 SPA vs SSR

**优点**：
- ✅ 直接对比真实性能差异
- ✅ 无需修改现有项目
- ✅ 可以快速验证 SSR 效果

---

## 🎯 下一步行动

### 立即执行（推荐）

**使用 Lighthouse 手动测试 SPA 基线**

1. 打开 Chrome，访问 http://localhost:5173
2. 按 F12 打开 DevTools
3. 切换到 Lighthouse 面板
4. 测试以下页面：
   - 首页 (`/#/`)
   - 设置页面 (`/#/settings`)
5. 记录关键指标：
   - Performance Score
   - FCP
   - LCP
   - TTI
   - TBT
   - CLS

预计用时：**10-15 分钟**

### 中期计划

**创建 SSR 测试项目**

1. 使用 Cloudflare Vite 插件创建新项目
2. 迁移首页到 SSR
3. 运行相同的 Lighthouse 测试
4. 对比性能数据

预计用时：**1-2 小时**

### 长期计划

**根据测试结果决定**

- **如果 SSR 性能提升 > 2 倍**：考虑全面迁移
- **如果 SSR 性能提升 < 2 倍**：保持现状 + 优化

---

## 📚 参考资料

- [Lighthouse 文档](https://developer.chrome.com/docs/lighthouse/overview/)
- [Cloudflare Vite 插件](https://developers.cloudflare.com/workers/vite-plugin/)
- [React Router 迁移指南](https://reactrouter.com/en/main/upgrading/v5)
- [Core Web Vitals](https://web.dev/vitals/)

---

## 📝 附录：测试脚本

如果未来需要自动化测试，可以使用以下配置：

```javascript
// 使用 Lighthouse CI
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:5173/#/',
        'http://localhost:5173/#/settings',
      ],
      startServerCommand: 'npm run dev',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'metrics:first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'metrics:largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
      },
    },
  },
};
```

---

**报告状态**: 初步分析完成  
**下一步**: 使用 Lighthouse 手动测试  
**最后更新**: 2026-03-24
