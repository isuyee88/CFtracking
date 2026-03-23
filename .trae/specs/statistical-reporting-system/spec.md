# CFTracking 统计报表系统 Spec

## Why
用户需要生成和导出详细的统计报表，用于分析流量质量、转化效果和ROI。需要支持多维度数据聚合和多种导出格式。

## What Changes
- 后端：新增报表生成API，支持多维度聚合
- 前端：新增Reports页面，支持报表配置和预览
- 支持CSV/Excel导出
- 支持定时报表邮件发送

## Impact
- Affected code:
  - src/services/analytics/analytics.routes.ts
  - frontend/src/pages/Reports.tsx
  - frontend/src/components/ReportBuilder.tsx

## 功能模块

### 1. 报表类型
| 类型 | 说明 | 维度 |
|------|------|------|
| 流量报表 | 流量来源分析 | 时间、国家、设备、浏览器、ISP |
| 转化报表 | 转化漏斗分析 | 时间、Offer、Flow、SubID |
| 财务报表 | 收支明细 | 时间、Campaign、Offer |
| ROI报表 | 投资回报分析 | 时间、流量源、Campaign |

### 2. 数据聚合
- 按小时/天/周/月聚合
- 支持自定义维度组合
- 支持排序和筛选

### 3. 导出格式
- CSV (UTF-8编码)
- Excel (.xlsx)

## Technical Notes

### API Endpoints
```
GET /api/analytics/reports/{type}
  - type: traffic | conversion | financial | roi
  - params: startDate, endDate, dimensions, groupBy, sort, limit

POST /api/analytics/reports/export
  - body: { type, format, dateRange, dimensions }
  - response: 文件流
```

### 数据源策略
- < 3个月数据: 从AE读取
- > 3个月数据: 从D1读取
