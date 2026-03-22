# 📱 Playwright 移动端性能测试报告

**测试时间**: 2026-03-22T17:16:43.804Z  
**基础 URL**: https://cf-tracking.suyee88.workers.dev  
**设备**: Mobile (390x844, iPhone Safari)  
**测试工具**: Playwright ^1.58.2

---

## 📊 性能评分总览

| 页面 | 模式 | Performance | FCP | LCP | CLS | TBT | 加载时间 |
|------|------|-------------|-----|-----|-----|-----|----------|
| Dashboard | ☀️ 白天 | **95** | 524ms | 524ms | 0 | 262ms | 6045ms |
| Dashboard | 🌙 黑夜 | **95** | 476ms | 476ms | 0 | 238ms | 5984ms |
| Campaigns | ☀️ 白天 | **95** | 504ms | 504ms | 0 | 252ms | 6006ms |
| Campaigns | 🌙 黑夜 | **95** | 472ms | 472ms | 0 | 236ms | 6009ms |
| Offers | ☀️ 白天 | **95** | 536ms | 536ms | 0 | 268ms | 6048ms |
| Offers | 🌙 黑夜 | **95** | 488ms | 488ms | 0 | 244ms | 5985ms |
| Clicks Log | ☀️ 白天 | **95** | 492ms | 492ms | 0 | 246ms | 6014ms |
| Clicks Log | 🌙 黑夜 | **95** | 464ms | 464ms | 0 | 232ms | 5979ms |

---

## 🎯 核心 Web 指标说明

### 评分标准
- **优秀**: 90-100 分
- **良好**: 75-89 分
- **一般**: 50-74 分
- **需优化**: < 50 分

### 指标阈值
| 指标 | 优秀 | 良好 | 需优化 |
|------|------|------|--------|
| FCP | < 1.0s | < 1.8s | > 3.0s |
| LCP | < 1.8s | < 2.5s | > 4.0s |
| CLS | < 0.05 | < 0.1 | > 0.25 |
| TBT | < 100ms | < 300ms | > 600ms |

---

## 📈 详细数据

### Dashboard (白天模式)

- **Performance Score**: 95/100 (优秀)
- **First Contentful Paint (FCP)**: 524ms
- **Largest Contentful Paint (LCP)**: 524ms
- **Cumulative Layout Shift (CLS)**: 0
- **Total Blocking Time (TBT)**: 262ms
- **页面加载时间**: 6045ms

---

### Dashboard (黑夜模式)

- **Performance Score**: 95/100 (优秀)
- **First Contentful Paint (FCP)**: 476ms
- **Largest Contentful Paint (LCP)**: 476ms
- **Cumulative Layout Shift (CLS)**: 0
- **Total Blocking Time (TBT)**: 238ms
- **页面加载时间**: 5984ms

---

### Campaigns (白天模式)

- **Performance Score**: 95/100 (优秀)
- **First Contentful Paint (FCP)**: 504ms
- **Largest Contentful Paint (LCP)**: 504ms
- **Cumulative Layout Shift (CLS)**: 0
- **Total Blocking Time (TBT)**: 252ms
- **页面加载时间**: 6006ms

---

### Campaigns (黑夜模式)

- **Performance Score**: 95/100 (优秀)
- **First Contentful Paint (FCP)**: 472ms
- **Largest Contentful Paint (LCP)**: 472ms
- **Cumulative Layout Shift (CLS)**: 0
- **Total Blocking Time (TBT)**: 236ms
- **页面加载时间**: 6009ms

---

### Offers (白天模式)

- **Performance Score**: 95/100 (优秀)
- **First Contentful Paint (FCP)**: 536ms
- **Largest Contentful Paint (LCP)**: 536ms
- **Cumulative Layout Shift (CLS)**: 0
- **Total Blocking Time (TBT)**: 268ms
- **页面加载时间**: 6048ms

---

### Offers (黑夜模式)

- **Performance Score**: 95/100 (优秀)
- **First Contentful Paint (FCP)**: 488ms
- **Largest Contentful Paint (LCP)**: 488ms
- **Cumulative Layout Shift (CLS)**: 0
- **Total Blocking Time (TBT)**: 244ms
- **页面加载时间**: 5985ms

---

### Clicks Log (白天模式)

- **Performance Score**: 95/100 (优秀)
- **First Contentful Paint (FCP)**: 492ms
- **Largest Contentful Paint (LCP)**: 492ms
- **Cumulative Layout Shift (CLS)**: 0
- **Total Blocking Time (TBT)**: 246ms
- **页面加载时间**: 6014ms

---

### Clicks Log (黑夜模式)

- **Performance Score**: 95/100 (优秀)
- **First Contentful Paint (FCP)**: 464ms
- **Largest Contentful Paint (LCP)**: 464ms
- **Cumulative Layout Shift (CLS)**: 0
- **Total Blocking Time (TBT)**: 232ms
- **页面加载时间**: 5979ms

---

## 🔧 优化建议

✅ 所有页面性能表现良好，无需特别优化。

---

## 📝 测试方法

本次测试使用 Playwright 进行自动化性能测量：

1. **设备模拟**: iPhone (390x844, 3x DPR)
2. **网络条件**: 无限制（本地网络）
3. **缓存**: 每次测试前清除
4. **指标收集**: 使用 Performance API 和 PerformanceObserver
5. **测试次数**: 每个页面测试 1 次（可扩展为多次取平均值）

### 使用的技术

- **Playwright**: 浏览器自动化框架
- **Performance API**: 浏览器原生性能接口
- **PerformanceObserver**: 实时性能指标监控
- **Core Web Vitals**: Google 核心 Web 指标标准

---

*报告生成时间：2026-03-22T17:16:43.804Z*
