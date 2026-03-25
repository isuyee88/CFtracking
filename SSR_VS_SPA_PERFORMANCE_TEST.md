# SSR vs SPA 性能对比测试方案

## 📊 测试目标

验证 Cloudflare Vite 插件的 SSR (服务器端渲染) 相比传统 SPA (客户端渲染) 的性能提升，验证是否达到 **3-5 倍** 的性能提升。

## 🎯 测试指标

### 核心 Web Vitals 指标

| 指标 | 全称 | 说明 | 优秀标准 |
|------|------|------|----------|
| **TTFB** | Time to First Byte | 首字节时间 | < 800ms |
| **FCP** | First Contentful Paint | 首次内容绘制 | < 1.8s |
| **LCP** | Largest Contentful Paint | 最大内容绘制 | < 2.5s |
| **TTI** | Time to Interactive | 可交互时间 | < 3.8s |
| **TBT** | Total Blocking Time | 总阻塞时间 | < 200ms |
| **CLS** | Cumulative Layout Shift | 累积布局偏移 | < 0.1 |
| **SI** | Speed Index | 速度指数 | < 3.4s |

## 🔧 测试环境搭建

### 方案 A：使用 Cloudflare Vite 插件创建 SSR 项目

```bash
# 1. 创建 SSR 测试项目 (TanStack Start)
npm create cloudflare@latest ssr-test -- --template=tanstack-start
cd ssr-test
npm install

# 2. 本地开发模式 (SSR)
npm run dev
# 访问：http://localhost:5173

# 3. 生产构建 + 预览
npm run build
npm run preview
# 访问：http://localhost:4173
```

### 方案 B：传统 SPA 项目 (对比组)

```bash
# 1. 创建 SPA 测试项目
npm create vite@latest spa-test -- --template react
cd spa-test
npm install

# 2. 本地开发模式
npm run dev
# 访问：http://localhost:5173

# 3. 生产构建 + 预览
npm run build
npm run preview
# 访问：http://localhost:4173
```

## 📝 测试页面设计

### 测试页面内容
创建一个包含以下元素的测试页面：

```tsx
// 模拟真实应用场景
- 导航栏 (Logo + 5 个菜单项)
- Hero 区域 (标题 + 描述 + CTA 按钮)
- 特性列表 (6 个卡片，每个包含图标、标题、描述)
- 数据表格 (20 行数据，每行 5 列)
- 图表区域 (使用 Recharts 渲染折线图)
- 页脚 (链接列表)
```

### 数据加载策略

**SSR 模式：**
```typescript
// 服务器端预加载数据
export async function loader() {
  const features = await db.query('SELECT * FROM features LIMIT 6');
  const tableData = await db.query('SELECT * FROM data LIMIT 20');
  
  return {
    features: JSON.stringify(features),
    tableData: JSON.stringify(tableData),
  };
}
```

**SPA 模式：**
```typescript
// 客户端加载数据
useEffect(() => {
  async function loadData() {
    const features = await fetch('/api/features').then(r => r.json());
    const tableData = await fetch('/api/data').then(r => r.json());
    setData({ features, tableData });
  }
  loadData();
}, []);
```

## 🚀 测试步骤

### 步骤 1：本地开发环境测试

#### 1.1 SSR 开发模式
```bash
cd ssr-test
npm run dev
# 记录启动时间、HMR 响应时间
```

#### 1.2 SPA 开发模式
```bash
cd spa-test
npm run dev
# 记录启动时间、HMR 响应时间
```

### 步骤 2：生产构建测试

#### 2.1 SSR 生产构建
```bash
cd ssr-test
npm run build
# 记录构建时间、输出文件大小
```

#### 2.2 SPA 生产构建
```bash
cd spa-test
npm run build
# 记录构建时间、输出文件大小
```

### 步骤 3：性能测试 (Lighthouse)

#### 3.1 使用 Lighthouse CLI
```bash
# 安装 Lighthouse
npm install -g lighthouse

# 测试 SSR 项目 (生产预览)
lighthouse http://localhost:4173 \
  --output=json \
  --output-path=./ssr-report.json \
  --chrome-flags="--headless"

# 测试 SPA 项目
lighthouse http://localhost:4173 \
  --output=json \
  --output-path=./spa-report.json \
  --chrome-flags="--headless"
```

#### 3.2 使用 Chrome DevTools
1. 打开 Chrome DevTools (F12)
2. 切换到 **Lighthouse** 面板
3. 选择测试类别：Performance, SEO, Best Practices, PWA
4. 点击 **Analyze page load**
5. 导出报告

### 步骤 4：网络性能分析

#### 4.1 使用 WebPageTest
```bash
# 访问 https://www.webpagetest.org/
# 输入 URL 进行测试
# 选择测试地点：Asia (Singapore)
# 选择浏览器：Chrome
# 选择网络：Cable (5/1 Mbps)
```

#### 4.2 使用 Chrome DevTools Network 面板
1. 打开 **Network** 面板
2. 禁用缓存
3. 选择 **Slow 3G** 网络节流
4. 刷新页面
5. 截图保存 waterfall 图表

### 步骤 5：详细性能分析

#### 5.1 Performance 面板录制
1. 打开 **Performance** 面板
2. 点击录制按钮
3. 刷新页面
4. 停止录制
5. 分析：
   - FPS (帧率)
   - CPU 使用率
   - DOM 节点数量
   - 事件耗时

#### 5.2 Coverage 面板
1. 打开 **Coverage** 面板 (Ctrl+Shift+P → Coverage)
2. 点击录制
3. 刷新页面
4. 分析未使用代码比例

## 📈 预期结果

### 理论性能对比

| 指标 | SSR 预期 | SPA 预期 | 提升倍数 |
|------|----------|----------|----------|
| TTFB | 200-400ms | 800-1500ms | 2-4 倍 |
| FCP | 0.8-1.2s | 2.5-4.0s | 2-3 倍 |
| LCP | 1.2-1.8s | 3.5-5.5s | 2-3 倍 |
| TTI | 1.5-2.5s | 4.0-7.0s | 2-3 倍 |
| TBT | 50-150ms | 300-600ms | 2-4 倍 |
| SI | 1.5-2.5s | 4.0-6.5s | 2-3 倍 |

### 性能提升原因分析

**SSR 优势：**
1. ✅ **首屏内容服务器生成** - 无需等待 JS 下载执行
2. ✅ **流式传输** - 分块发送 HTML，提前渲染
3. ✅ **数据预加载** - 服务器端完成数据查询
4. ✅ **更小的初始 JS 包** - 不需要立即执行所有代码

**SPA 劣势：**
1. ❌ **白屏时间长** - 需要下载并执行 JS 才能渲染
2. ❌ **水合延迟** - 需要等待 React 初始化
3. ❌ **多次请求** - HTML → JS → API → 渲染
4. ❌ **SEO 不友好** - 搜索引擎无法执行 JS

## 📊 测试报告模板

```markdown
# 性能测试报告

## 测试信息
- 测试时间：2026-03-25
- 测试工具：Lighthouse 12.0
- 测试环境：本地开发 (MacBook Pro M1)
- 网络条件：无节流 / Slow 3G

## SSR 项目结果

### Lighthouse 评分
- Performance: **95/100** ⭐
- Accessibility: 100/100
- Best Practices: 100/100
- SEO: 100/100
- PWA: 90/100

### Core Web Vitals
- TTFB: **320ms** ✅
- FCP: **0.9s** ✅
- LCP: **1.4s** ✅
- TTI: **1.8s** ✅
- TBT: **80ms** ✅
- CLS: **0.02** ✅
- SI: **1.9s** ✅

### 构建信息
- 构建时间：8.5s
- JS 包大小：145 KB (gzip)
- CSS 包大小：32 KB (gzip)
- HTML 大小：28 KB

## SPA 项目结果

### Lighthouse 评分
- Performance: **65/100**
- Accessibility: 100/100
- Best Practices: 100/100
- SEO: 85/100
- PWA: 90/100

### Core Web Vitals
- TTFB: **1.2s**
- FCP: **3.1s**
- LCP: **4.8s**
- TTI: **5.6s**
- TBT: **450ms**
- CLS: **0.05**
- SI: **5.2s**

### 构建信息
- 构建时间：6.2s
- JS 包大小：198 KB (gzip)
- CSS 包大小：32 KB (gzip)
- HTML 大小：2 KB

## 性能对比

| 指标 | SSR | SPA | 提升倍数 |
|------|-----|-----|----------|
| TTFB | 320ms | 1200ms | **3.75 倍** ✅ |
| FCP | 0.9s | 3.1s | **3.44 倍** ✅ |
| LCP | 1.4s | 4.8s | **3.43 倍** ✅ |
| TTI | 1.8s | 5.6s | **3.11 倍** ✅ |
| TBT | 80ms | 450ms | **5.63 倍** ✅ |
| SI | 1.9s | 5.2s | **2.74 倍** ✅ |

## 结论

✅ **SSR 相比 SPA 性能提升 2.7-5.6 倍，平均提升 3.5 倍**
✅ **达到预期的 3-5 倍性能提升目标**
✅ **所有 Core Web Vitals 指标均达到优秀标准**

## 建议

1. ✅ 推荐在生产环境使用 SSR 架构
2. ✅ 对于内容型页面优先使用 SSR
3. ⚠️ 对于后台管理系统可以使用 SPA (SEO 不重要)
4. ✅ 结合使用：SSR + 客户端水合 + 流式传输
```

## 🔬 进阶测试：流式 SSR

### 测试流式渲染性能

```typescript
// 使用 React 18 的 Suspense + Streaming
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <AsyncComponent />
    </Suspense>
  );
}

async function AsyncComponent() {
  const data = await fetchData(); // 异步数据加载
  return <div>{data}</div>;
}
```

### 预期效果
- **首屏时间进一步降低 30-50%**
- **用户感知性能提升明显**
- **支持渐进式水合**

## 📦 自动化测试脚本

```bash
#!/bin/bash

# 性能测试自动化脚本

echo "🚀 开始 SSR vs SPA 性能对比测试..."

# 1. 构建项目
echo "📦 构建 SSR 项目..."
cd ssr-test && npm run build && cd ..

echo "📦 构建 SPA 项目..."
cd spa-test && npm run build && cd ..

# 2. 启动预览服务器
echo "🌐 启动 SSR 预览服务器..."
cd ssr-test && npm run preview &
SSR_PID=$!
cd ..

echo "🌐 启动 SPA 预览服务器..."
cd spa-test && npm run preview &
SPA_PID=$!
cd ..

# 等待服务器启动
sleep 5

# 3. 运行 Lighthouse 测试
echo "📊 运行 SSR Lighthouse 测试..."
lighthouse http://localhost:4173 \
  --output=json \
  --output-path=./ssr-lighthouse.json \
  --chrome-flags="--headless"

echo "📊 运行 SPA Lighthouse 测试..."
lighthouse http://localhost:5174 \
  --output=json \
  --output-path=./spa-lighthouse.json \
  --chrome-flags="--headless"

# 4. 生成报告
echo "📈 生成对比报告..."
node generate-report.js

# 5. 清理
echo "🧹 清理..."
kill $SSR_PID
kill $SPA_PID

echo "✅ 测试完成！"
```

## 🎯 下一步行动

1. 创建测试项目
2. 运行性能测试
3. 生成对比报告
4. 验证 3-5 倍提升假设
5. 根据结果决定是否迁移到 SSR 架构
