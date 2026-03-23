# Sprint 3: 前端Dashboard集成任务

## 任务列表

- [x] Task 3.1: 创建 useAnalytics Hook
  - 实现数据获取逻辑，自动调用 /api/analytics/dashboard
  - 处理数据源状态显示
  - 依赖: analytics.routes.ts 已完成

- [x] Task 3.2: 更新 Dashboard 页面组件
  - 集成 useAnalytics Hook
  - 显示数据来源指示器
  - 依赖: Task 3.1

- [x] Task 3.3: 优化 DateRangePicker 组件
  - 确保"Last 3 Months"选项可用
  - 测试与API的集成
  - 依赖: Sprint 1 已完成

- [x] Task 3.4: 添加数据源指示器组件
  - 创建 DataSourceBadge 组件
  - 显示 AE(实时) 或 D1(归档) 状态
  - 依赖: Task 3.1

- [ ] Task 3.5: 测试和验证
  - 验证Dashboard正确显示数据
  - 验证数据源切换逻辑
  - 依赖: Task 3.2, 3.3, 3.4

## 任务依赖关系
```
Task 3.1 (useAnalytics Hook)
    ↓
Task 3.2 (Dashboard页面) ─┬─→ Task 3.4 (数据源指示器)
    ↑                    │
    └────────────────────┘
           ↑
Task 3.3 (DateRangePicker)
           ↓
Task 3.5 (测试验证)
```

## 验收标准
- [x] Dashboard页面能正确显示统计数据
- [x] 数据源指示器正确显示AE或D1
- [x] DateRangePicker的"Last 3 Months"选项正常工作
- [ ] 90天内数据从AE读取，90天外数据从D1读取
