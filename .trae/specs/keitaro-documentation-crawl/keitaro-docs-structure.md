# Keitaro 文档结构映射

## 1. 文档概览

Keitaro文档网站采用模块化结构，包含17个主要模块，每个模块下包含多个子页面。文档支持多语言（英文和俄文），采用响应式设计，适合不同设备访问。

## 2. 模块结构

### 2.1 Get Started (入门指南)
- Step 1. Keitaro Installation
- Alternative installation method
- Step 2: Create an administrator
- Step 3. Keitaro workspace and tracker resources
- Step 4: Creating your first campaign

### 2.2 Site (站点管理)
- Keitaro license key
- Payments
- Keitaro edition plans

### 2.3 Domains (域名管理)
- Domain setup
- Connecting a domain to a tracker via Cloudflare

### 2.4 Campaigns and Streams (广告系列和流程)
- Campaign Report
- Creating campaign
- Flows
- Filters
- Campaign URL
- Campaign parameters
- Campaign integrations
- Redirects
- Actions
- Flow monitoring
- Split Testing of Landing Pages and Offers
- S2S postbacks
- S2S postback placeholders
- Updating costs manually
- Cleaning statistics
- Traffic simulation

### 2.5 Landing Pages and Offers (着陆页和优惠)
- Landing pages report
- Creating landing page
- Landing page: Local
- Landing page: Redirect
- Landing page: Preload
- Landing page: Action
- JS adapter
- Editor
- Offers report
- Creating offers
- Multioffers
- Offer URL
- Placeholders
- Updating parameters
- Conversion Cap
- Landing page developer guidelines

### 2.6 Traffic Sources (流量来源)
- Creating traffic source
- Traffic sources report
- Traffic source S2S postback
- Passing traffic source parameters
- Traffic source: HasOffers

### 2.7 Conversions and Postback (转化和回传)
- Conversion log
- Postback
- Affiliate networks in Keitaro
- Affiliate network postback
- Importing conversions
- Postback Troubleshooting
- Conversion tracking via API to affiliate networks
- FB Pixel
- TikTok Pixel

### 2.8 Campaign Integrations (广告系列集成)
- How integrations work
- KClient PHP
- KClient JS
- Tracking Script
- WordPress Plugin
- Banners

### 2.9 Team Management (团队管理)
- Adding new user
- User permissions
- Admin API Keys
- Restoring password

### 2.10 Settings (设置)
- Settings page
- Profile
- GEO databases
- Bot lists
- Conversion types
- Custom metrics
- System Settings
- Privacy Settings

### 2.11 Reports (报告)
- Dashboard
- Trends
- Create report
- Click log
- Black and White lists
- Report by Conversion Date

### 2.12 Third-party Integrations (第三方集成)
- Facebook
- Google Ads
- TikTok
- Dolphin
- FBTool
- Cloudflare
- Namecheap

### 2.13 Maintenance (维护)
- Updating the tracker and server version
- Transfer tracker to another server
- Geo profiles
- Status
- Logs
- Archive
- Troubleshooting
- Security
- ClickHouse
- Drill-down reports
- Global search

### 2.14 Development (开发)
- Click API
- Admin API
- Keitaro CLI
- Custom redirect
- Custom action
- Custom filter
- Custom placeholder (macro)
- PHP interfaces
- Server Customization

### 2.15 Release Notes (发布说明)
- Release 10.2
- Release 11
- Release 11.1

### 2.16 Videolessons (视频课程)
- Keitaro Academy

### 2.17 Miscellaneous (其他)
- Glossary
- FAQ

## 3. 核心功能模块分析

### 3.1 Campaign 模块
**功能概述**：Campaign模块是Keitaro的核心功能，用于创建和管理广告系列。

**主要功能**：
- 广告系列创建和配置
- 流量分配和流程管理
- 转化跟踪和报告
- 多维度数据统计和分析
- A/B测试和流量分割

**关键页面**：
- Campaign Report：提供详细的广告系列性能报告
- Creating campaign：广告系列创建和配置界面
- Flows：流量流程管理
- Filters：流量过滤规则设置
- Campaign URL：广告系列链接生成和管理

### 3.2 Offers 模块
**功能概述**：Offers模块用于管理优惠和着陆页。

**主要功能**：
- 优惠创建和管理
- 着陆页配置和管理
- 多优惠管理
- 转化跟踪和优化
- 着陆页编辑器

**关键页面**：
- Creating offers：优惠创建和配置
- Offers report：优惠性能报告
- Creating landing page：着陆页创建
- Landing page types：不同类型着陆页配置

### 3.3 Traffic Sources 模块
**功能概述**：Traffic Sources模块用于管理流量来源。

**主要功能**：
- 流量来源创建和配置
- 流量参数传递和管理
- 流量来源S2S回传
- 流量来源性能报告

**关键页面**：
- Creating traffic source：流量来源创建
- Traffic sources report：流量来源性能报告
- Traffic source postback：流量来源回传配置

## 4. 技术架构

### 4.1 文档系统架构
- 静态网站生成
- 多语言支持
- 响应式设计
- 模块化结构
- 搜索功能

### 4.2 导航结构
- 侧边栏导航
- 面包屑导航
- 页内导航
- 跨模块链接

## 5. 内容特点

### 5.1 内容组织
- 分层结构：模块 → 子模块 → 页面
- 逻辑顺序：从基础到高级
- 功能导向：按功能模块组织内容

### 5.2 内容类型
- 教程指南
- 配置参考
- 最佳实践
- API文档
- 故障排除

### 5.3 多媒体内容
- 截图和示例图片
- 视频教程
- 代码示例
- 图表和流程图

## 6. 对标参考价值

### 6.1 结构参考
- 模块化组织方式
- 层次化导航结构
- 内容分类标准
- 文档版本管理

### 6.2 功能参考
- 核心功能模块设计
- 配置选项和参数
- 报告和分析功能
- 集成能力

### 6.3 用户体验参考
- 导航便捷性
- 内容可读性
- 搜索功能
- 多语言支持

## 7. 结论

Keitaro文档网站提供了全面、结构化的技术文档，涵盖了从安装到高级功能的所有方面。其模块化结构和详细的内容组织为CFTracking的文档设计提供了有价值的参考。通过分析Keitaro的文档结构和内容组织方式，CFTracking可以构建更加用户友好、功能完整的文档系统。

## 8. 后续建议

1. **结构优化**：参考Keitaro的模块化结构，为CFTracking设计清晰的文档层次
2. **内容丰富**：提供详细的教程、配置指南和最佳实践
3. **技术集成**：支持多语言、响应式设计和搜索功能
4. **用户体验**：优化导航结构，提高内容可发现性
5. **持续更新**：建立文档版本管理和更新机制