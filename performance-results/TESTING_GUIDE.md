# 📋 SPA 性能测试手动操作指南

## 🎯 测试目标

测试当前 SPA 项目（http://localhost:5173）的性能基线，为后续 SSR 对比做准备。

## 📦 准备工作

### 1. 确保开发服务器已启动

```bash
cd frontend
npm run dev
```

✅ 应该看到：`Local: http://localhost:5173/`

### 2. 打开 Chrome 浏览器

访问：http://localhost:5173

### 3. 打开 Chrome DevTools

按 **F12** 或 **Ctrl+Shift+I**

---

## 🧪 测试步骤

### 测试页面 1: 首页

**URL**: http://localhost:5173/#/

#### 步骤：

1. **打开新标签页** (Ctrl+T)
2. **访问首页**: http://localhost:5173/#/
3. **打开 DevTools** (F12)
4. **切换到 Lighthouse 面板**
5. **配置测试选项**:
   - ✅ Performance
   - ⬜ Accessibility
   - ⬜ Best Practices
   - ⬜ SEO
   - ⬜ PWA
   - 设备：Desktop
6. **点击 "Analyze page load"**
7. **等待测试完成** (约 30-60 秒)
8. **截图保存报告**
9. **导出数据**:
   - 点击 "Download" 按钮
   - 选择 JSON 格式
   - 保存到：`performance-results/spa-home.json`

#### 记录关键指标：

```
性能评分：___/100

TTFB: _____ ms
FCP: _____ ms
LCP: _____ ms
TTI: _____ ms
TBT: _____ ms
CLS: _____
SI: _____ ms
```

---

### 测试页面 2: 设置页面

**URL**: http://localhost:5173/#/settings

#### 步骤：

1. **访问设置页**: http://localhost:5173/#/settings
2. **重复上述测试步骤**
3. **保存数据到**: `performance-results/spa-settings.json`

#### 记录关键指标：

```
性能评分：___/100

TTFB: _____ ms
FCP: _____ ms
LCP: _____ ms
TTI: _____ ms
TBT: _____ ms
CLS: _____
SI: _____ ms
```

---

### 测试页面 3: 数据看板

**URL**: http://localhost:5173/#/?s=eyJyYW5nZSI6eyJpbnRlcnZhbCI6Imxhc3Q3ZGF5cyJ9fQ==

#### 步骤：

1. **访问数据看板**: 点击上方 URL
2. **重复上述测试步骤**
3. **保存数据到**: `performance-results/spa-dashboard.json`

#### 记录关键指标：

```
性能评分：___/100

TTFB: _____ ms
FCP: _____ ms
LCP: _____ ms
TTI: _____ ms
TBT: _____ ms
CLS: _____
SI: _____ ms
```

---

## 📊 填充测试报告

打开文件：`performance-results/spa-baseline-template.md`

将测试数据填入对应表格：

### 示例：

```markdown
### 首页 (/#/)

**Lighthouse Performance Score**: 85/100

| 指标 | 数值 | 评级 |
|------|------|------|
| TTFB | 120ms | 🟢 优秀 |
| FCP | 1.2s | 🟢 优秀 |
| LCP | 2.1s | 🟢 优秀 |
| TTI | 3.5s | 🟡 需改进 |
| TBT | 180ms | 🟢 优秀 |
| CLS | 0.05 | 🟢 优秀 |
| SI | 2.8s | 🟢 优秀 |
```

### 评级标准：

- 🟢 优秀：达到优秀标准
- 🟡 需改进：未达到优秀标准
- 🔴 差：需要立即优化

---

## 📸 截图保存

为每个页面保存以下截图：

1. **Lighthouse 报告截图**
2. **Performance 面板截图** (可选)
3. **Network 面板 Waterfall 截图** (可选)

保存位置：`performance-results/screenshots/`

---

## 🎯 完成检查清单

- [ ] 首页性能测试完成
- [ ] 设置页面性能测试完成
- [ ] 数据看板性能测试完成
- [ ] 所有 JSON 数据已保存
- [ ] 测试报告已填充数据
- [ ] 关键指标已记录
- [ ] 截图已保存

---

## 💡 提示

### 提高测试准确性：

1. **关闭其他标签页** - 避免资源竞争
2. **禁用浏览器扩展** - 减少干扰
3. **使用无痕模式** - 避免缓存影响
4. **多次测试取平均值** - 建议测试 3 次

### 测试失败处理：

- **超时**: 增加 Lighthouse 超时时间
- **白屏**: 检查开发服务器是否正常运行
- **错误**: 查看 Console 是否有报错

---

## 📚 下一步

完成 SPA 基线测试后：

1. ✅ 对比 SSR 性能数据
2. 📊 分析性能差异
3. 💡 决定是否迁移到 SSR

---

**测试人**: ___________  
**测试日期**: ___________  
**审核人**: ___________
