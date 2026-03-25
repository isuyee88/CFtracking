# 修复 SSR 页面渲染问题 Spec

## Why

SSR Worker 的 App.tsx 只是重定向到 `/dashboard`，没有渲染任何实际内容，导致所有页面显示空白。前端有完整的页面组件（Dashboard, Campaigns, Offers, Landings, Traffic Sources, Clicks Log, Conversions Log 等），但 SSR 没有正确渲染这些页面。

## What Changes

- **修复 SSR App.tsx**：渲染前端的所有页面，而不是只重定向
- **修复 SSR Worker 路由**：正确处理所有页面路由，让 SSR 能渲染前端页面
- **保留 SSR 能力**：SSR 应该能渲染前端的完整功能
- **修复 run_worker_first 配置**：根据 Cloudflare 官方文档正确配置

## Impact

- **Affected specs**: cftracking-system-design (SSR 架构部分)
- **Affected code**:
  - `src/ssr/App.tsx` - SSR 应用入口，需要渲染前端所有页面
  - `src/ssr/worker.ts` - Worker 路由逻辑
  - `wrangler.toml` - Assets 配置
  - `frontend/src/App.tsx` - 前端路由配置（参考）

## ADDED Requirements

### Requirement: SSR 渲染前端所有页面
The system SHALL render all frontend pages via SSR for better SEO and initial load performance.

#### Scenario: 访问 Dashboard
- **WHEN** user visits `/dashboard`
- **THEN** SSR renders Dashboard page with real data from API
- **AND** page shows statistics cards, charts, and tables

#### Scenario: 访问 Campaigns
- **WHEN** user visits `/campaigns`
- **THEN** SSR renders Campaign Management page
- **AND** page shows campaign list and management features

#### Scenario: 访问 Offers
- **WHEN** user visits `/offers`
- **THEN** SSR renders Offers Management page
- **AND** page shows offers list and management features

#### Scenario: 访问 Landings
- **WHEN** user visits `/landings`
- **THEN** SSR renders Landings Management page
- **AND** page shows landing pages list and management features

#### Scenario: 访问 Traffic Sources
- **WHEN** user visits `/traffic-sources`
- **THEN** SSR renders Traffic Sources Management page
- **AND** page shows traffic sources list and management features

#### Scenario: 访问 Clicks Log
- **WHEN** user visits `/clicks-log`
- **THEN** SSR renders Clicks Log page
- **AND** page shows click tracking data

#### Scenario: 访问 Conversions Log
- **WHEN** user visits `/conversions-log`
- **THEN** SSR renders Conversions Log page
- **AND** page shows conversion tracking data

### Requirement: SSR App 正确渲染前端路由
The system SHALL use React Router to render all frontend pages in SSR mode.

#### Scenario: SSR App 路由配置
- **WHEN** SSR App initializes
- **THEN** it uses the same routing configuration as frontend App.tsx
- **AND** renders all pages: Dashboard, Campaigns, Offers, Landings, Traffic Sources, Clicks Log, Conversions Log, Reports, Trends, Settings, etc.

## MODIFIED Requirements

### Requirement: SSR Worker 路由逻辑
The system SHALL correctly route requests to SSR rendering or Assets.

#### Scenario: 静态资源请求
- **WHEN** request matches a static file (JS, CSS, images)
- **THEN** Assets serves the file directly (default behavior)

#### Scenario: 页面请求
- **WHEN** request is for a page route (/, /dashboard, /campaigns, etc.)
- **THEN** SSR Worker renders the page with initial data
- **AND** returns HTML with embedded data

#### Scenario: API 请求
- **WHEN** request is for `/api/*`
- **THEN** Worker handles API call
- **AND** returns JSON response

## REMOVED Requirements

### Requirement: SSR 简单重定向
**Reason**: 重定向导致页面空白，无法显示前端功能
**Migration**: 使用完整的 SSR 渲染，渲染前端所有页面

## Acceptance Criteria

### AC-1: Dashboard 页面正常显示
- **Given**: User visits `/dashboard`
- **When**: Page loads
- **Then**: Display full Dashboard with statistics cards, charts, and tables
- **Verification**: human-judgement

### AC-2: Campaigns 页面正常显示
- **Given**: User visits `/campaigns`
- **When**: Page loads
- **Then**: Display Campaign Management page with campaign list
- **Verification**: human-judgement

### AC-3: Offers 页面正常显示
- **Given**: User visits `/offers`
- **When**: Page loads
- **Then**: Display Offers Management page with offers list
- **Verification**: human-judgement

### AC-4: Landings 页面正常显示
- **Given**: User visits `/landings`
- **When**: Page loads
- **Then**: Display Landings Management page with landing pages list
- **Verification**: human-judgement

### AC-5: Traffic Sources 页面正常显示
- **Given**: User visits `/traffic-sources`
- **When**: Page loads
- **Then**: Display Traffic Sources Management page with traffic sources list
- **Verification**: human-judgement

### AC-6: Clicks Log 页面正常显示
- **Given**: User visits `/clicks-log`
- **When**: Page loads
- **Then**: Display Clicks Log page with click tracking data
- **Verification**: human-judgement

### AC-7: Conversions Log 页面正常显示
- **Given**: User visits `/conversions-log`
- **When**: Page loads
- **Then**: Display Conversions Log page with conversion tracking data
- **Verification**: human-judgement

### AC-8: 所有页面都有内容
- **Given**: User visits any page
- **When**: Page loads
- **Then**: Page displays content, not blank
- **Verification**: programmatic
