# 统计报表系统 任务列表

## 任务列表

- [ ] Task 1: 创建后端报表API
  - 添加 /api/analytics/reports/{type} 端点
  - 实现 traffic | conversion | financial | roi 报表类型
  - 数据源自动切换 (AE/D1)

- [ ] Task 2: 创建导出API
  - 添加 /api/analytics/reports/export 端点
  - 支持 CSV 和 Excel 格式

- [ ] Task 3: 创建 Reports 前端页面
  - 报表类型选择
  - 日期范围配置
  - 维度选择器

- [ ] Task 4: 创建 ReportBuilder 组件
  - 拖拽式报表配置
  - 实时预览

- [ ] Task 5: 集成导出功能
  - CSV导出
  - Excel导出

## 任务依赖关系
```
Task 1 (后端API)
    ↓
Task 2 (导出API)
    ↓
Task 3 (前端页面) ← Task 4 (组件)
    ↓
Task 5 (导出集成)
```

## 验收标准
- [ ] 支持4种报表类型
- [ ] 支持多维度聚合
- [ ] 支持CSV导出
- [ ] 支持Excel导出
- [ ] 数据源自动切换
