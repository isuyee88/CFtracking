# PWA 开发预防规则

## 核心原则

1. **SPA 应用必须排除所有 .html 文件缓存**
   - React/Vue 等 SPA 应用使用 HashRouter 或 BrowserRouter 处理路由
   - Service Worker 的 `navigateFallback` 会 fallback 所有导航到 index.html
   - 如果缓存了其他 .html 文件（如 stats.html），会导致 404 错误

2. **禁止在项目中添加可能生成非必要文件的插件**
   - 如 vite visualizer、bundle analyzer 等
   - 这些插件生成的文件不在 public 目录，部署时不存在

## PWA 配置检查清单

### ✅ 必须配置
```javascript
navigateFallbackDenylist: [
  /^\/api\//,           // API 请求不缓存
  /^\/auth\//,          // 认证请求不缓存
  /\.html$/,            // HTML 文件不缓存
  /\?/,                 // 带查询参数的请求不缓存
]
```

### ❌ 禁止配置
- `navigateFallbackAllowlist` 包含具体的 .html 文件
- 使用生成额外 .html 文件的插件（未移除）

## 错误诊断

### bad-precaching-response 错误

**症状：**
```
bad-precaching-response :: [{url: "https://domain.com/stats.html", status: 404}]
```

**原因：**
1. PWA Service Worker 尝试缓存不存在的文件
2. 可能是 vite visualizer 或类似插件生成了 stats.html

**解决方案：**
1. 移除生成额外文件的插件
2. 在 `navigateFallbackDenylist` 中添加 `/\.html$/`
3. 清除浏览器缓存并重新注册 Service Worker

## 知识图谱记录

相关错误模式已记录到知识图谱：
- Entity: "PWA Stats.html 404 Error"
- Entity: "Vite PWA Configuration"
