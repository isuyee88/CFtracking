# 移动端性能优化与可用性改善 Spec

## Why

根据详细的桌面端 vs 移动端对比测试，发现以下问题需要优化：
1. Table 横向滚动无视觉提示，用户可能不知道可以滚动查看完整内容
2. Trends 页面 4 个图表在移动端需要大量滚动，体验不佳
3. 部分可点击区域小于 44px，不符合无障碍标准
4. 移动端 FCP 较慢（1896ms），需要进一步优化

## What Changes

- **新增**: Table 横向滚动渐变阴影提示
- **新增**: 移动端图表 Tab 切换功能（简化 Trends 页面）
- **新增**: 智能 Tooltip（移动端使用底部弹窗）
- **优化**: 所有按钮和可点击区域 ≥44px
- **优化**: 移动端表格字体大小（最小 14px）
- **优化**: 性能优化（图片懒加载、代码分割优化）

## Impact

- **Affected specs**: 无（纯优化改进）
- **Affected code**: 
  - `frontend/src/index.css` - 滚动提示样式、点击区域样式
  - `frontend/src/pages/Trends.tsx` - 移动端图表简化
  - `frontend/src/components/` - 新增智能 Tooltip 组件
  - `frontend/vite.config.ts` - 代码分割优化

## ADDED Requirements

### Requirement: Table 横向滚动提示
系统 SHALL 为所有需要横向滚动的表格添加视觉提示

#### Scenario: 用户查看移动端表格
- **WHEN** 表格宽度超过容器宽度
- **THEN** 右侧显示渐变阴影提示用户可以滚动
- **AND** 滚动到最右侧时阴影淡出

### Requirement: 移动端图表简化
系统 SHALL 在移动端提供图表 Tab 切换功能

#### Scenario: 用户在移动端查看 Trends 页面
- **WHEN** 屏幕宽度 < 768px
- **THEN** 显示图表切换 Tab
- **AND** 一次只显示一个图表
- **AND** 减少 75% 的滚动距离

### Requirement: 最小点击区域
系统 SHALL 确保所有可点击元素 ≥44px

#### Scenario: 用户点击按钮
- **WHEN** 按钮/链接/图标按钮在移动端显示
- **THEN** 最小尺寸为 44x44px
- **AND** 有足够的 padding

## MODIFIED Requirements

### Requirement: 表格字体大小
移动端表格字体大小从 12-14px 修改为最小 14px

**Reason**: 提高可读性，符合无障碍标准

### Requirement: 性能指标
移动端 FCP 目标从 1896ms 优化到 1200ms 以内

**Reason**: 提升用户体验，符合最佳实践

## REMOVED Requirements

无

---

**优先级**: P1（高优先级问题）  
**预计工期**: 3-4 周  
**实施阶段**: Phase 1 (P1 问题) → Phase 2 (P2 问题)
