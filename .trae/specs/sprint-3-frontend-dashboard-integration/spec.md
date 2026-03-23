# CFTracking Sprint 3: 前端Dashboard集成 Spec

## Why
Sprint 1和Sprint 2已完成核心后端架构（DO唯一性检查、AE/D1数据源切换），现在需要完成前端Dashboard集成，使UI能够正确显示数据源状态并利用新的API功能。

## What Changes
- 更新前端Dashboard组件以支持数据源状态显示
- 集成新的analytics API（支持AE/D1自动切换）
- 优化时间范围选择组件的UX
- 添加数据源指示器，让用户清楚知道数据来源

## Impact
- Affected specs: cftracking-development-plan.md
- Affected code:
  - frontend/src/pages/Dashboard.tsx
  - frontend/src/components/DateRangePicker.tsx
  - frontend/src/hooks/useAnalytics.ts

## ADDED Requirements

### Requirement: 数据源状态显示
系统SHALL在Dashboard显示当前数据的数据来源（AE或D1）。

#### Scenario: 近期数据查看
- **WHEN** 用户查看最近90天内的数据
- **THEN** 显示"数据来源: Analytics Engine (实时)"
- **AND** 显示数据最后更新时间

#### Scenario: 历史数据查看
- **WHEN** 用户查看90天前的数据
- **THEN** 显示"数据来源: D1数据库 (归档)"
- **AND** 显示"数据为每日汇总，更新可能有延迟"

### Requirement: 时间范围选择优化
时间范围选择器SHALL支持"最近3个月"选项。

#### Scenario: 选择最近3个月
- **WHEN** 用户选择"最近3个月"
- **THEN** 自动从AE读取数据（因为<90天）
- **AND** 显示正确的日期范围

## MODIFIED Requirements

### Requirement: DateRangePicker组件
修改现有的DateRangePicker组件，添加"Last 3 Months"选项。

## REMOVED Requirements
无

## Technical Notes

### API响应格式
```typescript
interface DashboardResponse {
  metrics: DashboardMetric[];
  chartData: ChartDataPoint[];
  entityStats: Record<string, EntityStatItem[]>;
  dataSource: 'AE' | 'D1' | 'MIXED';
  queryTime: string;
  range: string;
}
```

### 数据源判断逻辑
- AE_FREE_TIER_DAYS = 90
- determineDataSource(startDate, endDate):
  - 如果查询范围超过90天前 → D1
  - 否则 → AE
