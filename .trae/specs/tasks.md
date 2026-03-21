# CFTracking 功能完善实施计划

## [x] Task 1: Uniqueness 验证系统
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 实现点击去重验证系统
  - 支持 IP、IP+UA、Cookie、参数四种去重方式
  - 实现 Uniqueness TTL 配置
  - 集成到 ClickService
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: IP 去重验证 - 相同 IP 重复点击返回 non-unique
  - `programmatic` TR-1.2: IP+UA 去重验证 - 相同 IP 不同 UA 返回 unique
  - `programmatic` TR-1.3: Cookie 去重验证 - 带 Cookie 返回 non-unique
  - `programmatic` TR-1.4: TTL 过期后点击返回 unique
- **Notes**: 已更新 uniqueness.service.ts 支持 ip_ua 方法，已更新 click.service.ts 使用 Campaign 配置

## [x] Task 2: Campaign URL 自动生成
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 实现 Campaign URL 自动生成功能
  - 支持 Domain + Alias 组合
  - 支持参数自动追加
  - 添加复制到剪贴板功能
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 创建 Campaign 后返回完整 URL
  - `programmatic` TR-2.2: URL 格式为 https://{domain}/{alias}
  - `programmatic` TR-2.3: 支持 UTM 参数追加
- **Notes**: 已在 CampaignForm.tsx 中实现 URL 自动生成和复制功能

## [x] Task 3: Flow Filters 系统
- **Priority**: P1
- **Depends On**: Task 7
- **Description**: 
  - 实现 Flow Filter 评估逻辑
  - 支持多种操作符（equals, contains, regex, in, between 等）
  - 支持 IP 相关过滤器（CIDR、范围、列表）
  - 支持 User Agent 解析
  - 支持时间相关过滤器
  - 支持 Proxy/VPN/Datacenter 检测
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: equals 操作符正确执行
  - `programmatic` TR-3.2: contains 操作符正确执行
  - `programmatic` TR-3.3: regex 操作符正确执行
  - `programmatic` TR-3.4: IP CIDR 过滤正确执行
- **Notes**: 已有完整的 flow.filters.ts 实现，包含所有过滤器操作符

## [x] Task 4: Flow Actions 系统
- **Priority**: P1
- **Depends On**: Task 3
- **Description**: 
  - 实现 Flow 动作系统
  - 支持 302/301 重定向
  - 支持 JavaScript 注入
  - 支持直接显示 Offer
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-4.1: 302 重定向正确执行
  - `programmatic` TR-4.2: JavaScript 注入正确执行
  - `programmatic` TR-4.3: Offer 直接显示正确执行
- **Notes**: 已创建 flow-action.service.ts，支持完整的动作执行逻辑

## [x] Task 5: Statistics 报表系统
- **Priority**: P1
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 实现 Dashboard 统计数据查询
  - 实现实体统计数据查询（Campaigns, Landings, Offers, Sources）
  - 实现趋势报告数据查询
  - 实现图表数据查询
  - 支持 Analytics Engine SQL API
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-5.1: Dashboard 统计数据正确返回
  - `programmatic` TR-5.2: 实体统计数据正确返回
  - `programmatic` TR-5.3: 趋势报告数据正确返回
- **Notes**: 已有完整的 analytics-query.service.ts 实现，支持 Analytics Engine SQL 查询

## [x] Task 6: Campaign 数据库 Schema 更新
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 添加 uniquenessMethod 字段
  - 添加 uniquenessParameter 字段
  - 添加 costValue 字段
  - 添加 currency 字段
  - 更新 CampaignRepository
  - 更新 Campaign 类型定义
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-6.1: 新字段正确创建
  - `programmatic` TR-6.2: 迁移脚本正确执行
- **Notes**: 创建 023_add_campaign_uniqueness_method.sql 迁移文件

## [x] Task 7: Flow 数据库 Schema 更新
- **Priority**: P1
- **Depends On**: Task 6
- **Description**: 
  - 添加 filters 字段 (JSON)
  - 添加 actionType 字段
  - 添加 actionConfig 字段 (JSON)
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-7.1: 新字段正确创建
  - `programmatic` TR-7.2: JSON 数据正确存储和读取
- **Notes**: 已创建 024_add_flow_action_fields.sql 迁移文件，已更新 Flow 类型和 FlowRepository

## [x] Task 8: 前端 Campaign 页面完善
- **Priority**: P0
- **Depends On**: Task 2, Task 6
- **Description**: 
  - 添加 Campaign URL 显示和复制功能
  - 添加 Uniqueness 配置（方法、参数、TTL）
  - 添加 Cost 配置（模型、值、货币）
  - 添加 Traffic Source 选择
  - 添加 Group 选择
  - 自动生成 Alias（基于 name）
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-8.1: Campaign URL 正确显示
  - `programmatic` TR-8.2: Uniqueness 配置正确保存
  - `human-judgement` TR-8.3: UI 界面友好易用
- **Notes**: 已更新 CampaignForm.tsx，添加了完整的表单字段

## [ ] Task 9: 前端 Flow 页面完善
- **Priority**: P1
- **Depends On**: Task 3, Task 4, Task 7
- **Description**: 
  - 添加 Filters 配置界面
  - 添加 Actions 配置界面
  - 添加 Flow 类型选择
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-9.1: Filters 配置正确保存
  - `programmatic` TR-9.2: Actions 配置正确保存
  - `human-judgement` TR-9.3: UI 界面友好易用
- **Notes**: 创建 FlowManagement.tsx 页面

## [ ] Task 10: 前端 Dashboard 页面完善
- **Priority**: P1
- **Depends On**: Task 5
- **Description**: 
  - 添加时间范围选择
  - 添加图表展示
  - 添加多维度统计
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-10.1: 时间范围筛选正确
  - `programmatic` TR-10.2: 图表数据正确显示
  - `human-judgement` TR-10.3: UI 界面友好易用
- **Notes**: 更新 Dashboard.tsx

## [x] Task 11: Tracking 服务完善
- **Priority**: P0
- **Depends On**: Task 1, Task 3, Task 4
- **Description**: 
  - 集成 Uniqueness 验证（使用 Campaign 配置）
  - 集成 Flow Filters
  - 集成 Flow Actions
  - 实现参数传递
  - 支持 Cloudflare 信息提取
  - 支持风险评估
- **Acceptance Criteria Addressed**: AC-1, AC-3
- **Test Requirements**:
  - `programmatic` TR-11.1: 点击追踪正确执行
  - `programmatic` TR-11.2: 去重验证正确执行（使用 Campaign 配置）
  - `programmatic` TR-11.3: 流量分配正确执行
- **Notes**: 已更新 click.service.ts 使用 Campaign 的 uniquenessMethod 配置

## [ ] Task 12: 部署和测试
- **Priority**: P0
- **Depends On**: All previous tasks
- **Description**: 
  - 部署到 Cloudflare
  - 执行数据库迁移
  - 进行功能测试
- **Acceptance Criteria Addressed**: All
- **Test Requirements**:
  - `programmatic` TR-12.1: 部署成功
  - `programmatic` TR-12.2: 数据库迁移成功
  - `programmatic` TR-12.3: 所有 API 端点正常
- **Notes**: 
  - 前端已构建成功
  - 需要手动执行数据库迁移: `npx wrangler d1 migrations apply cf-tracking-db --remote`
  - 需要手动部署: `npx wrangler deploy`
  - 网络问题导致自动部署失败
