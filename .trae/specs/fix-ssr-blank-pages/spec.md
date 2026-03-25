# 修复 SSR 页面空白和数据丢失问题 Spec

## Why

SSR 架构改造后，用户访问 `/dashboard` 和其他页面时显示空白界面或简单占位页面，原有的完整 Dashboard 和数据无法正确加载。需要修复页面加载逻辑，确保用户能看到功能完整的 Dashboard 和各管理页面。

## What Changes

- **修改 SSR Worker 路由逻辑**：让 Assets 优先处理页面请求，Worker 只处理 API
- **移除 SSR 简单占位界面**：不再渲染简单的 0 数据卡片
- **修复 API 数据获取**：确保 Dashboard 能正确调用 API 获取真实数据
- **保留 SSR 能力**：简化 SSR 实现，但不完全移除 SSR 架构

## Impact

- **Affected specs**: cftracking-system-design (SSR 架构部分)
- **Affected code**: 
  - `src/ssr/worker.ts` - Worker 路由逻辑
  - `src/ssr/App.tsx` - SSR 应用入口
  - `wrangler.toml` - Assets 配置
  - `frontend/src/pages/Dashboard.tsx` - Dashboard 组件

## REMOVED Requirements

### Requirement: SSR 渲染 Dashboard 和首页
**Reason**: 
- SSR 渲染的简单界面（显示 0 数据的卡片）没有实际价值
- 原有 SPA Dashboard 功能完整，数据获取正常
- 复杂的 SSR 渲染导致循环依赖和数据获取问题

**Migration**: 
- 访问 `/` 时 302 重定向到 `/dashboard`
- 访问 `/dashboard` 时让 Assets 返回原有 SPA
- Worker 只处理 API 请求和 SSE 推送
- SSR App 使用 React Router Navigate 直接重定向

## Requirements

### Requirement: 页面路由正确加载
The system SHALL correctly route page requests to Assets (SPA) for full functionality.

#### Scenario: 访问首页
- **WHEN** user visits `/`
- **THEN** redirect to `/dashboard` (302)

#### Scenario: 访问 Dashboard
- **WHEN** user visits `/dashboard`
- **THEN** load full Dashboard with Ant Design and real data

#### Scenario: 访问其他页面
- **WHEN** user visits `/campaigns`, `/offers`, `/landings`, etc.
- **THEN** load corresponding SPA pages with full functionality

### Requirement: API 数据获取正常
The system SHALL ensure all API calls return real data from Analytics Engine and D1.

#### Scenario: Dashboard 加载数据
- **WHEN** Dashboard component mounts
- **THEN** call `/api/analytics/dashboard` and display real data

#### Scenario: 其他页面数据
- **WHEN** any page needs data
- **THEN** call corresponding API endpoints and display data

### Requirement: SSR 架构保留但简化
The system SHALL maintain SSR capability but with simplified implementation.

#### Scenario: SSR Worker 职责
- **WHEN** request comes to `/api/*`
- **THEN** Worker handles or forwards to appropriate service
- **AND** when request is for pages, let Assets handle it

#### Scenario: SSE 实时推送
- **WHEN** client connects to `/api/sse/updates`
- **THEN** Worker establishes SSE connection and pushes updates

## Acceptance Criteria

### AC-1: 首页重定向
- **Given**: User visits `/`
- **When**: Browser loads the page
- **Then**: Automatically redirect to `/dashboard` with 302 status
- **Verification**: programmatic

### AC-2: Dashboard 正常加载
- **Given**: User visits `/dashboard`
- **When**: Page loads
- **Then**: Display full Dashboard with Ant Design components and real data
- **Verification**: human-judgement

### AC-3: 数据正确显示
- **Given**: Database has click/conversion data
- **When**: Dashboard loads
- **Then**: Display actual numbers (not hardcoded 0)
- **Verification**: programmatic

### AC-4: 其他页面正常
- **Given**: User visits `/campaigns`, `/offers`, etc.
- **When**: Pages load
- **Then**: Display full SPA pages with data
- **Verification**: human-judgement

### AC-5: API 调用正常
- **Given**: Dashboard or any page needs data
- **When**: Component calls API
- **Then**: API returns correct data
- **Verification**: programmatic
