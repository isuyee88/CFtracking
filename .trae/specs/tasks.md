# CFTracking 功能完善实施计划

## [ ] Task 1: Uniqueness 验证系统
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 实现点击去重验证系统
  - 支持 IP、IP+UA、Cookie、参数四种去重方式
  - 实现 Uniqueness TTL 配置
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: IP 去重验证 - 相同 IP 重复点击返回 non-unique
  - `programmatic` TR-1.2: IP+UA 去重验证 - 相同 IP 不同 UA 返回 unique
  - `programmatic` TR-1.3: Cookie 去重验证 - 带 Cookie 返回 non-unique
  - `programmatic` TR-1.4: TTL 过期后点击返回 unique
- **Notes**: 需要修改数据库 Schema 添加 uniquenessMethod 字段

## [ ] Task 2: Campaign URL 自动生成
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 实现 Campaign URL 自动生成功能
  - 支持 Domain + Alias 组合
  - 支持参数自动追加
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 创建 Campaign 后返回完整 URL
  - `programmatic` TR-2.2: URL 格式为 https://{domain}/{alias}
  - `programmatic` TR-2.3: 支持 UTM 参数追加
- **Notes**: 需要更新前端 CampaignManagement 页面显示 URL

## [ ] Task 3: Flow Filters 系统
- **Priority**: P1
- **Depends On**: Task 1
- **Description**: 
  - 实现 Flow 过滤器系统
  - 支持国家/地区过滤
  - 支持设备类型过滤
  - 支持浏览器过滤
  - 支持自定义参数过滤
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 国家过滤 - 指定国家流量通过
  - `programmatic` TR-3.2: 设备过滤 - 指定设备类型通过
  - `programmatic` TR-3.3: 多条件组合过滤
- **Notes**: 需要修改数据库 Schema 添加 filters 字段到 flows 表

## [ ] Task 4: Flow Actions 系统
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
- **Notes**: 需要修改数据库 Schema 添加 actionType 字段

## [ ] Task 5: Statistics 报表系统
- **Priority**: P1
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 实现实时统计功能
  - 实现多维度分析
  - 实现图表展示
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-5.1: Dashboard 显示真实数据
  - `programmatic` TR-5.2: 时间范围筛选正确
  - `programmatic` TR-5.3: 多维度统计正确
- **Notes**: 需要实现数据聚合服务

## [ ] Task 6: Campaign 数据库 Schema 更新
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 添加 uniquenessMethod 字段
  - 添加 apiToken 字段
  - 添加 trafficSourceId 字段
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-6.1: 新字段正确创建
  - `programmatic` TR-6.2: 迁移脚本正确执行
- **Notes**: 创建 002_add_campaign_fields.sql 迁移文件

## [ ] Task 7: Flow 数据库 Schema 更新
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
- **Notes**: 创建 003_add_flow_fields.sql 迁移文件

## [ ] Task 8: 前端 Campaign 页面完善
- **Priority**: P0
- **Depends On**: Task 2, Task 6
- **Description**: 
  - 添加 Campaign URL 显示
  - 添加 Uniqueness 配置
  - 添加 Traffic Source 选择
  - 添加 Group 选择
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-8.1: Campaign URL 正确显示
  - `programmatic` TR-8.2: Uniqueness 配置正确保存
  - `human-judgement` TR-8.3: UI 界面友好易用
- **Notes**: 更新 CampaignManagement.tsx

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

## [ ] Task 11: Tracking 服务完善
- **Priority**: P0
- **Depends On**: Task 1, Task 3, Task 4
- **Description**: 
  - 集成 Uniqueness 验证
  - 集成 Flow Filters
  - 集成 Flow Actions
  - 实现参数传递
- **Acceptance Criteria Addressed**: AC-1, AC-3
- **Test Requirements**:
  - `programmatic` TR-11.1: 点击追踪正确执行
  - `programmatic` TR-11.2: 去重验证正确执行
  - `programmatic` TR-11.3: 流量分配正确执行
- **Notes**: 更新 click.service.ts

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
- **Notes**: 使用代理端口 12334 部署
