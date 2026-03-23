# CFTracking 系统设计与开发规范

## Why

当前CFTracking需要进行实际系统设计与开发阶段。基于Keitaro文档分析的对标参考，需要在Cloudflare Workers平台上构建一个现代化、高性能、用户友好的广告追踪系统。重点解决免费账户的存储限制、跨平台性能问题以及交互体验优化。

## What Changes

### 架构层面
- 采用Cloudflare Durable Objects (DO)替代KV存储方案，解决免费账户写入限制
- 前端采用React + TypeScript实现响应式设计，兼顾桌面和移动端
- 实施代码分割、资源压缩、懒加载等性能优化策略

### 交互层面
- 实现人体工学导向的交互设计，减少操作步骤
- 采用现代化无感交互，如双击自动复制URL
- 消除不必要的确认弹窗，使用实时反馈替代

### 数据层面
- DO用于结构化数据存储和事务处理
- D1用于持久化关系型数据
- R2用于文件存储
- KV仅作为缓存层

## Impact

- **Affected specs**: 继承keitaro-documentation-crawl的对标参考
- **Affected code**: 全新系统，从前端到后端完整实现
- **Affected infrastructure**: Cloudflare Workers、D1、DO、R2、KV

## ADDED Requirements

### Requirement: DO数据存储架构
系统 SHALL 使用Durable Objects (DO)作为主要数据存储方案，以克服KV免费账户的写入限制。

#### Scenario: DO存储初始化
- **GIVEN** 系统启动需要存储用户配置
- **WHEN** 用户创建或更新配置数据
- **THEN** 数据通过DO Actor进行持久化存储

#### Scenario: 多用户数据隔离
- **GIVEN** 系统服务多个用户
- **WHEN** 用户访问自己的数据
- **THEN** DO实例确保数据严格隔离，每个用户访问各自的DO Actor

### Requirement: 跨平台性能优化
系统 SHALL 同时优化移动端和桌面端的加载性能和运行性能。

#### Scenario: 移动端首屏加载
- **GIVEN** 用户在移动网络环境访问系统
- **WHEN** 页面首次加载
- **THEN** 首屏加载时间不超过3秒，LCP小于2.5秒

#### Scenario: 桌面端流畅运行
- **GIVEN** 用户在桌面端进行批量操作
- **WHEN** 同时处理多条数据
- **THEN** UI保持流畅响应，无卡顿

### Requirement: 人体工学交互设计
系统 SHALL 通过人体工学设计减少用户操作步骤，提升使用效率。

#### Scenario: 批量操作优化
- **GIVEN** 用户需要同时操作多个Campaign
- **WHEN** 用户选择多个项目后执行操作
- **THEN** 系统直接执行，无需逐个确认

#### Scenario: 上下文操作
- **GIVEN** 用户在查看列表时需要快速编辑
- **WHEN** 用户双击某一项
- **THEN** 直接进入编辑模式，无需先进入详情页

### Requirement: 现代化无感交互
系统 SHALL 采用现代化的无感交互方式，减少用户操作负担。

#### Scenario: 双击URL自动复制
- **GIVEN** 用户需要复制Campaign追踪URL
- **WHEN** 用户双击URL文本
- **THEN** 系统自动复制到剪贴板，并显示简洁的勾选图标提示（2秒后消失），无需弹窗确认

#### Scenario: 实时保存反馈
- **GIVEN** 用户编辑表单内容
- **WHEN** 字段值发生变化
- **THEN** 系统自动保存，显示内联的成功提示（勾选图标），无阻塞性弹窗

#### Scenario: 滑动手势支持
- **GIVEN** 用户在移动端操作
- **WHEN** 用户在列表项上左滑
- **THEN** 显示快速操作按钮（如编辑、删除）

### Requirement: 响应式页面布局
系统 SHALL 采用响应式设计，确保桌面和移动设备上的良好体验。

#### Scenario: 移动端导航
- **GIVEN** 用户在移动设备上访问系统
- **WHEN** 用户点击汉堡菜单
- **THEN** 侧边栏以滑出抽屉形式展现，占据80%屏幕宽度

#### Scenario: 表格滚动适配
- **GIVEN** 用户在移动端查看数据表格
- **WHEN** 表格列较多时
- **THEN** 表格支持水平滚动，关键列固定显示

## MODIFIED Requirements

### Requirement: 数据存储策略调整
**原文**: 原方案建议使用KV存储点击和转化数据
**修改为**: 使用Durable Objects (DO)作为主存储，KV仅作缓存层，D1用于关系型数据持久化

**Reason**: KV免费账户存在写入限制（每天1000次），不适合作为主要数据存储
**Migration**: 保持接口抽象，后续可根据需要切换存储实现

### Requirement: 性能基准提升
**原文**: 基础性能要求
**修改为**:
- 移动端首屏加载 ≤ 3秒
- 桌面端交互响应 ≤ 100ms
- LCP ≤ 2.5秒
- FID ≤ 100ms
- CLS ≤ 0.1

## REMOVED Requirements

### Requirement: KV主存储方案
**Reason**: KV免费账户写入限制（每天1000次）无法满足广告追踪系统的高写入需求
**Migration**: 迁移至DO作为主存储，KV仅用于缓存

## 技术约束

- **前端**: React 18 + TypeScript + TailwindCSS
- **后端**: Cloudflare Workers + Durable Objects
- **数据库**: Cloudflare D1 (SQLite)
- **文件存储**: Cloudflare R2
- **缓存**: Cloudflare KV (仅用于缓存)
- **部署**: Cloudflare Pages + Workers

## 验收标准

### AC-1: DO存储正常工作
- **Given** 用户创建Campaign配置
- **When** 保存配置
- **Then** 数据通过DO持久化，可跨会话访问
- **Verification**: 单元测试 + 手动验证

### AC-2: 移动端性能达标
- **Given** 使用Lighthouse移动端测试
- **When** 测量性能指标
- **Then** Performance Score ≥ 90
- **Verification**: Lighthouse CI

### AC-3: 双击复制功能正常
- **Given** 用户双击URL文本
- **When** 复制操作
- **Then** 内容成功复制到剪贴板，显示勾选图标提示
- **Verification**: 手动测试 + 自动化E2E测试

### AC-4: 响应式布局正常
- **Given** 在不同屏幕尺寸下访问
- **When** 页面渲染
- **Then** 布局自适应，关键功能正常可用
- **Verification**: 浏览器开发者工具多设备模拟

### AC-5: 人体工学操作流畅
- **Given** 用户进行批量操作
- **When** 选择多个项目并执行操作
- **Then** 无确认弹窗，直接执行并显示结果
- **Verification**: 手动测试

## 未解决问题

- [ ] DO的定价模型对成本的影响评估
- [ ] D1与DO之间的数据同步策略
- [ ] 离线场景下的数据处理方案
- [ ] 大规模数据查询性能优化方案
