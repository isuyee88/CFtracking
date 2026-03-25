# 🚀 SSR 性能测试演示

## 测试方法

由于当前项目使用 HashRouter，直接迁移到 SSR 需要较大改动。我们采用**对比测试**的方式：

### 方案：创建 SSR 演示页面

创建一个简单的 SSR 页面，部署后与 SPA 页面进行对比测试。

---

## 快速开始

### 1. 启动本地 SSR 测试服务器

```bash
cd ssr-test-project
npm install
npm run dev
```

访问：http://localhost:5173 (Vite 开发服务器，会自动处理 SSR)

**注意**：使用 Cloudflare Vite 插件时，开发模式使用 Vite 的开发服务器，它会模拟 SSR 行为。

### 2. 对比测试

使用 Lighthouse 测试两个页面：

| 页面 | URL | 模式 |
|------|-----|------|
| SPA 页面 | http://localhost:5173/#/ | 客户端渲染 |
| SSR 页面 | http://localhost:8787 | 服务器渲染 |

### 3. 观察差异

**SPA 页面**：
- 首屏空白，等待 JS 下载
- FCP 较慢
- 需要 JavaScript 才能显示内容

**SSR 页面**：
- 首屏立即显示 HTML 内容
- FCP 更快
- 后台下载 JS 水合

---

## 预期结果

### 实测结果

#### SSR 性能（实测数据 - 2026-03-25）

| 指标 | 实测值 | 得分 | 评级 |
|------|--------|------|------|
| **FCP** | 0.7s | 0.97 | 🟢 优秀 |
| **LCP** | 0.9s | 0.97 | 🟢 优秀 |
| **Speed Index** | 0.7s | 1.00 | 🟢 优秀 |

**性能提升**: 相比 SPA 预期提升 **2-4 倍** ⚡

详细测试报告：[TEST_RESULTS.md](./TEST_RESULTS.md)

---

## 测试步骤

### 1. 安装依赖

```bash
cd ssr-test-project
npm install
```

### 2. 启动 SSR 服务器

```bash
npm run dev
```

### 3. 使用 Lighthouse 测试

1. 打开 Chrome DevTools (F12)
2. 切换到 Lighthouse 面板
3. 测试 http://localhost:8787
4. 记录指标

### 4. 对比分析

比较 SPA 和 SSR 的性能差异。

---

## 文件说明

```
ssr-test-project/
├── src/
│   └── worker.ts       # SSR Worker（处理页面渲染）
├── vite.config.ts      # Vite 配置
├── package.json        # 依赖
└── wrangler.toml      # Cloudflare 配置
```

---

## 技术原理

### SSR 工作流程

```
1. 用户请求页面
   ↓
2. Worker 处理请求
   ↓
3. 读取或生成 HTML（服务器渲染）
   ↓
4. 返回完整 HTML ✅ 首屏立即显示
   ↓
5. 浏览器渲染 HTML
   ↓
6. 后台下载 JavaScript
   ↓
7. React 水合（绑定事件）
   ↓
8. 页面可交互 ✅
```

### 对比 SPA

```
1. 用户请求页面
   ↓
2. 返回空 HTML
   ↓
3. 下载 JavaScript (大量)
   ❌ 首屏空白
   ↓
4. 执行 JavaScript
   ↓
5. React 渲染 DOM
   ↓
6. 页面显示 ✅
   ↓
7. 发起 API 请求
   ↓
8. 更新 UI
   ↓
9. 页面可交互
```

---

## 下一步

1. ✅ 测试 SSR 演示页面
2. 📊 对比性能数据
3. 💡 决定是否全面迁移
