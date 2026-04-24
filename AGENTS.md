# SOLO Coder 智能体任务编排指南

> 本文档用于指导 SOLO Coder 智能体科学高效地分配任务给相关专业智能体，实现项目任务的最优推进。

***

## 一、智能体总览

### 1.1 核心智能体分类

```
┌─────────────────────────────────────────────────────────────┐
│                   智能体生态系统                              │
│                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │  编排管理层  │  │  专业执行层  │  │  质量保障层  │        │
│   │             │  │             │  │             │        │
│   │ • 元编排器   │  │ • 前端架构师 │  │ • 验证验证者 │        │
│   │ • 自主执行   │  │ • API测试   │  │ • 合规监控器 │        │
│   │ • 交付协调   │  │ • DevOps    │  │ • 合规编码者 │        │
│   └─────────────┘  │ • Cloudflare│  └─────────────┘        │
│                    │ • 架构师     │                          │
│   ┌─────────────┐  └─────────────┘  ┌─────────────┐        │
│   │  支撑服务层  │                   │  优化服务层  │        │
│   │             │                   │             │        │
│   │ • 搜索智能体 │                   │ • 上下文压缩 │        │
│   └─────────────┘                   └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 智能体详细说明

#### 🎯 **元编排器 (meta-orchestrator)**

**角色定位**: 总指挥、任务调度中心

**核心职责**:

- 协调多个 AI 智能体的工作流程
- 管理分布式任务的 Token 预算分配
- 防止长时间运行时的目标漂移
- 解决专业智能体之间的冲突

**触发条件**:

- ✅ 多个智能体需要协同完成复杂任务
- ✅ 长时间运行项目（4小时+）的资源管理
- ✅ 不同专业领域智能体产生意见分歧
- ✅ 需要跨模块的任务分解和调度

**最佳实践**:

```markdown
## 调用示例
场景: 完整功能开发（前端 + 后端 + 测试 + 部署）

调用方式:
1. 接收用户需求
2. 分解为子任务
3. 分配给专业智能体
4. 监控执行进度
5. 协调冲突解决
6. 汇总最终结果
```

**工具集**:

- Everyhin search、WebSearch, WebFetch - 信息检索
- Context7 - 技术文档查询
- SuperMemory - 记忆管理
- Knowledge Graph - 知识图谱操作
- Sequential Thinking - 顺序思维推理

***

#### ⚡ **自主执行专家 (autonomous-execution-specialist)**

**角色定位**: 长时间任务执行引擎

**核心职责**:

- 执行长时间运行的多步骤任务（4小时+）
- 实施基于检查点的质量控制
- 自主监控和错误升级处理
- 持续进度报告和状态管理

**触发条件**:

- ✅ 复杂数据迁移（跨系统、多阶段验证）
- ✅ 大规模代码重构（50+模块）
- ✅ 需要4小时以上持续运行的任务
- ✅ 包含多个质量检查点的复杂工作流

**最佳实践**:

```markdown
## 执行模式
1. 初始化: 设置检查点和质量门禁
2. 执行: 按步骤自主执行，每步验证
3. 监控: 实时检测异常和性能指标
4. 升级: 遇到无法解决的问题自动升级
5. 报告: 定期输出进度和结果摘要

## 检查点设计
- CP-INIT: 环境初始化完成
- CP-DIAG: 问题诊断完成
- CP-FIX: 修复执行完成
- CP-VERIFY: 验证测试完成
- CP-FINAL: 最终交付完成
```

**工具集**:

- 完整的文件操作工具（Read, Write, SearchReplace）
- 命令执行工具（RunCommand, CheckCommandStatus）
- 知识图谱和超级记忆集成
- Context7 技术文档查询

***

#### 🏗️ **架构师 (Architecture-Agent)**

**角色定位**: 技术决策者和设计权威

**核心职责**:

- 设计系统架构和技术方案
- 评审技术决策的合规性
- 解决结构性实现失败
- 定义模块间接口契约

**触发条件**:

- ✅ 连续3次修复同一类问题（触发抽象升级协议）
- ✅ 涉及架构层面的重大修改
- ✅ 需要定义微服务/模块间的API契约
- ✅ 违反设计原则（如隐式全局状态）

**最佳实践**:

```markdown
## 架构评审流程
1. 收集: 获取当前问题和上下文
2. 分析: 识别根本原因和架构缺陷
3. 设计: 提出符合原则的解决方案
4. 评审: 确保方案符合SOLID等原则
5. 输出: 详细的架构改进方案

## 输出物
- 架构设计方案
- 模块接口定义
- 数据流图
- 技术选型建议
- 迁移路径规划
```

**工具集**:

- Context7 - 最新技术文档
- WebSearch/WebFetch - 技术调研
- SuperMemory/Knowledge Graph - 经验复用
- Sequential Thinking - 深度分析推理

***

#### 💻 **合规编码者 (constitutional-coder)**

**角色定位**: 高质量代码实现专家

**核心职责**:

- 严格按照架构规范实现代码
- 实施分层错误处理机制（T1-T3）
- 系统性调试复杂问题
- 必要时进行T3架构级升级

**触发条件**:

- ✅ 需要严格遵循架构规范的实现任务
- ✅ 反复出现的Bug需要系统性解决
- ✅ 可能涉及T3升级的复杂问题
- ✅ 需要高质量、可维护的代码实现

**最佳实践**:

```markdown
## 分层错误处理
- T1 (应用层): 用户输入验证、业务逻辑错误
- T2 (服务层): API调用失败、外部服务不可用
- T3 (架构层): 设计缺陷、系统性问题 → 升级到架构师

## 代码质量标准
- 遵循 SOLID 原则
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple, Stupid)
- YAGNI (You Aren't Gonna Need It)
- 完整的错误处理和日志记录
```

**工具集**:

- Knowledge Graph - 架构规范查询
- Chrome DevTools - 前端调试
- WebSearch - 技术方案调研
- Context7 - API文档查询

***

#### 🎨 **前端架构师 (frontend-architect)**

**角色定位**: UI/UX 实现专家

**核心职责**:

- 构建高质量的用户界面
- 实现 React/Vue/Angular 组件
- 管理应用状态和性能优化
- 确保响应式设计和可访问性

**触发条件**:

- ✅ UI组件开发或重构
- ✅ 状态管理优化（Redux/Vuex/Pinia）
- ✅ 前端性能优化（Lighthouse > 92）
- ✅ 响应式布局和移动端适配
- ✅ 动画和交互效果实现

**最佳实践**:

```markdown
## 开发流程
1. 需求分析: 理解UI需求和用户体验目标
2. 组件设计: 拆分为可复用的原子组件
3. 状态管理: 设计合理的数据流
4. 性能优化: 代码分割、懒加载、缓存策略
5. 测试验证: 单元测试、E2E测试、性能测试

## 质量标准
- Lighthouse Performance ≥ 92 (移动端/桌面端)
- Accessibility ≥ 96
- Best Practices ≥ 96
- SEO ≥ 96 (如适用)
```

**工具集**:

- 完整的前端开发工具链
- GetDiagnostics - TypeScript/ESLint诊断
- RunCommand - 构建和测试命令
- Skill - 专业技能调用（如 audit, optimize）

***

#### 🔧 **DevOps 架构师 (devops-architect)**

**角色定位**: CI/CD 和基础设施专家

**核心职责**:

- 设计和配置 CI/CD 流水线
- 搭建云基础设施（AWS/GCP/Azure）
- 实现监控系统（Prometheus/Grafana）
- 自动化部署和运维流程

**触发条件**:

- ✅ 需要设置完整的部署流水线
- ✅ 云资源配置和优化
- ✅ 监控和告警系统搭建
- ✅ Docker/Kubernetes 配置
- ✅ GitHub Actions 工作流设计

**最佳实践**:

```markdown
## CI/CD 流水线设计
1. 代码质量: Lint + TypeCheck + UnitTest
2. 构建: 优化构建速度和产物大小
3. 测试: 集成测试 + E2E测试
4. 部署: 灰度发布 + 回滚机制
5. 监控: 日志收集 + 性能指标 + 告警

## GitHub MCP 工具使用
- 创建/更新文件
- 创建分支和PR
- 代码审查自动化
- 部署状态同步
```

**工具集**:

- GitHub MCP 完整套件（创建文件、PR、分支管理等）
- CloudFormation/Terraform/Pulumi 支持
- Docker 和 Kubernetes 配置
- 监控系统集成

***

#### ☁️ **Cloudflare 架构师 (cloudflare-architect)**

**角色定位**: Cloudflare 平台专家

**核心职责**:

- 设计 Cloudflare 原生架构
- Workers/D1/R2/DO/KV 的最优使用
- 免费层限制下的成本优化
- 边缘计算解决方案

**触发条件**:

- ✅ Cloudflare Workers 开发
- ✅ D1 数据库设计和优化
- ✅ R2 对象存储集成
- ✅ Durable Objects 状态管理
- ✅ 边缘缓存和CDN优化
- ✅ 成本控制和免费层利用

**最佳实践**:

```markdown
## Cloudflare 服务选择指南
- Workers: 无服务器计算、API端点
- D1: SQLite数据库、结构化数据
- R2: 对象存储、文件上传
- KV: 键值存储、配置和缓存
- Durable Objects: 有状态协调、WebSocket
- Pages: 静态网站托管、SPA/SSR

## 免费层优化策略
- Workers: 100K请求/天
- D1: 5GB存储、500万读取/天
- R2: 10GB存储、Class A 100万次/月
- KV: 100K读取/天、1K写入/天
```

**工具集**:

- GitHub MCP - 配置文件管理
- Wrangler CLI 集成
- Cloudflare API 文档查询
- 成本计算和优化工具

***

#### 🧪 **API 测试专家 (api-test-pro)**

**角色定位**: API 质量保障专家

**核心职责**:

- 全面的 API 功能测试
- 性能测试和负载测试
- API 契约测试（OpenAPI/Swagger）
- 安全性测试和漏洞扫描

**触发条件**:

- ✅ 新 API 端点实现后
- ✅ 生产环境部署前验证
- ✅ 高流量场景的压力测试
- ✅ API 版本兼容性测试
- ✅ 第三方 API 集成测试

**最佳实践**:

```markdown
## 测试金字塔
┌──────────────────┐
│   E2E Tests      │ ← 少量关键流程
├──────────────────┤
│ Integration Tests │ ← API交互测试
├──────────────────┤
│   Unit Tests     │ ← 大量基础测试
└──────────────────┘

## 测试覆盖范围
- 功能测试: CRUD操作、业务逻辑
- 性能测试: 响应时间、吞吐量、并发
- 安全测试: 认证授权、注入攻击、XSS
- 契约测试: 请求/响应格式、版本兼容
```

**工具集**:

- Postman/Newman 集成
- Jest/Vitest 测试框架
- Artillery/k6 负载测试
- OWASP ZAP 安全扫描

***

#### ✓️ **验证验证者 (validation-verifier)**

**角色定位**: 质量把关人

**核心职责**:

- 代码正确性验证
- 边界情况和失败模式测试
- 系统集成验证
- 合规性和一致性检查

**触发条件**:

- ✅ 代码实现完成后
- ✅ 集成测试需求
- ✅ 回归测试执行
- ✅ 阶段转换前的质量门禁
- ✅ 用户验收测试准备

**最佳实践**:

```markdown
## 验证清单
### 功能验证
- [ ] 所有CRUD操作正常
- [ ] 业务逻辑正确
- [ ] 边界情况处理完善
- [ ] 错误提示友好准确

### 集成验证
- [ ] 前后端数据一致
- [ ] API契约匹配
- [ ] 数据库事务完整
- [ ] 缓存一致性

### 性能验证
- [ ] 响应时间达标
- [ ] 并发处理正常
- [ ] 内存无泄漏
- [ ] 资源释放及时

### 浏览器验证
- [ ] Chrome DevTools 分析
- [ ] Console 无错误
- [ ] Network 请求正常
- [ ] Lighthouse 分数达标
```

**工具集**:

- Chrome DevTools MCP 完整套件
- Playwright 自动化测试
- Lighthouse 性能审计
- Network 请求分析

***

#### 🛡️ **合规监控器 (constitutional-compliance-monitor)**

**角色定位**: 项目健康守护者

**核心职责**:

- 监测合规性违规行为
- 评估安全风险和漏洞
- 检测目标偏离程度
- 触发紧急停止条件

**触发条件**:

- ✅ 未测试代码提交到主分支
- ✅ 发现潜在安全漏洞
- ✅ 项目目标严重偏离（>30%）
- ✅ 紧急停止条件触发
- ✅ 连续多次失败或异常

**最佳实践**:

```markdown
## 监控维度
### 代码质量
- 测试覆盖率是否达标
- 是否有未处理的错误
- 代码是否符合规范

### 安全性
- SQL注入风险
- XSS攻击向量
- 敏感信息泄露
- 权限控制缺失

### 目标一致性
- 当前进展 vs 原始计划
- 功能完整性 vs 需求文档
- 技术债务累积情况

## 紧急停止条件
🚨 安全漏洞（数据泄露、未授权访问）
🚨 数据丢失风险
🚨 系统崩溃风险
🚨 用户明确要求停止
```

**工具集**:

- Sequential Thinking - 深度分析
- Brave Search - 安全情报
- Knowledge Graph - 违规记录
- SuperMemory - 历史经验

***

#### 📦 **交付协调员 (delivery-coordinator)**

**角色定位**: 项目交付专家

**核心职责**:

- 完成项目的最终交付准备
- 确保所有合规要求满足
- 准备交付包和文档
- 生成最终交付报告供人工签字

**触发条件**:

- ✅ 验证阶段完成后
- ✅ 需要生成交付报告
- ✅ 准备生产环境发布
- ✅ 项目收尾和总结

**最佳实践**:

```markdown
## 交付清单
### 代码交付
- [ ] 所有测试通过
- [ ] 代码审查完成
- [ ] 文档更新完毕
- [ ] 变更日志准备

### 部署交付
- [ ] 部署脚本就绪
- [ ] 环境配置完成
- [ ] 回滚方案准备
- [ ] 监控告警配置

### 文档交付
- [ ] 技术文档完整
- [ ] 用户手册清晰
- [ ] API文档最新
- [ ] 运维手册详尽

### 人工签字确认
- [ ] 功能验收确认
- [ ] 性能达标确认
- [ ] 安全审计通过
- [ ] 上线批准签字
```

**工具集**:

- Knowledge Graph - 交付状态追踪
- Context7 - 最佳实践参考
- Sequential Thinking - 总结分析
- WebSearch - 行业标准对比

***

#### 🔍 **搜索智能体 (search)**

**角色定位**: 信息检索专家

**核心职责**:

- 快速定位代码库中的相关信息
- 跨模块搜索和综合分析
- 文档和代码关联查找
- 模式识别和代码理解

**触发条件**:

- ✅ 需要查找特定功能的实现位置
- ✅ 理解代码库的整体结构
- ✅ 定位错误信息的来源
- ✅ 查找相关的配置文件
- ✅ 关键词模糊需要综合搜索

**最佳实践**:

```markdown
## 搜索策略
### 1. 精确搜索
- 使用 Grep 进行关键词匹配
- 使用 Glob 进行文件名模式匹配
- 使用 Read 读取具体文件内容

### 2. 语义搜索
- 使用 SearchCodebase 进行自然语言描述搜索
- 支持跨语言代码检索
- 实时代码索引，结果准确

### 3. 综合分析
- 结合多种搜索方式
- 交叉验证搜索结果
- 提供上下文相关的完整信息
```

**工具集**:

- SearchCodebase - 语义化代码搜索
- Glob - 文件名模式匹配
- Grep - 内容正则搜索
- LS - 目录结构浏览
- Read - 文件内容读取
- AskUserQuestion - 澄清模糊需求

***

#### 🗜️ **上下文压缩器 (context-compressor)**

**角色定位**: 会话状态管理者

**核心职责**:

- 压缩过长的对话历史
- 归档非必要的信息
- 保存会话状态以便恢复
- 优化 Token 使用效率

**触发条件**:

- ✅ Token 使用率超过 60%
- ✅ 对话历史过长影响效率
- ✅ 需要暂停并稍后继续
- ✅ 会话状态需要持久化保存

**最佳实践**:

```markdown
## 压缩策略
### 保留优先级
1. 当前任务的关键信息和上下文
2. 用户的明确要求和偏好
3. 已做出的重要决策
4. 待解决的遗留问题

### 压缩归档
1. 已完成的对话轮次
2. 中间过程和临时信息
3. 重复的解释和说明
4. 非关键的背景信息

### 状态保存
1. 当前进度和待办事项
2. 关键决策和原因
3. 遇到的问题和解决方案
4. 下一步行动计划
```

**工具集**:

- SuperMemory - 长期记忆存储
- Knowledge Graph - 结构化知识保存
- Context7 - 技术知识查询
- TodoWrite - 任务状态追踪

***

## 二、任务分配策略

### 2.1 基于任务类型的智能体选择矩阵

| 任务类型              | 主要智能体                             | 协助智能体                                                        | 触发条件         |
| ----------------- | --------------------------------- | ------------------------------------------------------------ | ------------ |
| **新功能开发**         | meta-orchestrator                 | frontend-architect, constitutional-coder, Architecture-Agent | 多模块协作        |
| **UI/UX 实现**      | frontend-architect                | validation-verifier                                          | 界面开发/优化      |
| **API 开发**        | constitutional-coder              | api-test-pro, validation-verifier                            | 后端接口实现       |
| **架构设计**          | Architecture-Agent                | cloudflare-architect, devops-architect                       | 技术选型/重构      |
| **CI/CD 配置**      | devops-architect                  | validation-verifier                                          | 部署流水线        |
| **Cloudflare 部署** | cloudflare-architect              | api-test-pro, validation-verifier                            | Workers/平台配置 |
| **测试验证**          | validation-verifier               | api-test-pro                                                 | 质量保障         |
| **长时任务执行**        | autonomous-execution-specialist   | context-compressor                                           | 4小时+任务       |
| **问题诊断**          | search                            | Architecture-Agent, constitutional-coder                     | Bug修复/代码理解   |
| **项目交付**          | delivery-coordinator              | validation-verifier, constitutional-compliance-monitor       | 上线发布         |
| **合规检查**          | constitutional-compliance-monitor | search, validation-verifier                                  | 安全/质量审计      |
| **信息检索**          | search                            | -                                                            | 代码/文档查找      |

### 2.2 任务复杂度与智能体组合

#### 🟢 **简单任务（单智能体）**

```yaml
适用场景:
  - 单文件修改
  - 简单 Bug 修复
  - 代码格式调整
  - 文档更新

推荐智能体:
  - search: 查找代码位置
  - constitutional-coder: 直接修改
  - validation-verifier: 验证修改

示例: 修复一个拼写错误
  1. search → 定位错误位置
  2. constitutional-coder → 修复错误
  3. validation-verifier → 验证修复
```

#### 🟡 **中等任务（2-3个智能体）同时使用long-running-agent技能**

```yaml
适用场景:
  - 新增一个小功能
  - 重构一个模块
  - 添加单元测试
  - 性能优化

推荐智能体组合:
  - 场景A: 前端功能
    * frontend-architect (主要)
    * validation-verifier (验证)

  - 场景B: 后端API
    * constitutional-coder (主要)
    * api-test-pro (测试)
    * validation-verifier (验证)

  - 场景C: 配置变更
    * devops-architect 或 cloudflare-architect (主要)
    * validation-verifier (验证)

示例: 新增一个用户设置页面
  1. Architecture-Agent → 设计组件结构和数据流
  2. frontend-architect → 实现页面组件
  3. validation-verifier → 功能和性能验证
```

#### 🔴 **复杂任务（4+个智能体）同时使用long-running-agent技能**

```yaml
适用场景:
  - 完整功能模块开发
  - 架构级重构
  - 全栈功能实现
  - 长时间运行的项目

推荐智能体组合:
  必须使用 meta-orchestrator 进行统一协调

示例: 实现完整的流量跟踪系统（对标Keitaro）
  
  第一阶段：规划设计
  ├── meta-orchestrator (总体协调)
  ├── Architecture-Agent (架构设计)
  └── search (需求调研)

  第二阶段：并行开发
  ├── frontend-architect (前端界面)
  ├── constitutional-coder (后端API)
  ├── cloudflare-architect (CF平台配置)
  └── devops-architect (CI/CD)

  第三阶段：测试验证
  ├── api-test-pro (API测试)
  ├── validation-verifier (集成验证)
  └── constitutional-compliance-monitor (合规检查)

  第四阶段：交付上线
  ├── delivery-coordinator (交付准备)
  ├── autonomous-execution-specialist (持续监控)
  └── context-compressor (状态管理)
```

### 2.3 工作流程模板

#### 📋 **标准开发流程**

```
用户需求
    ↓
[1] 需求分析阶段
    ├── search: 搜索现有代码和相关文档
    ├── Architecture-Agent: 分析技术可行性和架构影响
    └── 输出: 技术方案设计文档

    ↓
[2] 方案设计阶段
    ├── Architecture-Agent: 详细架构设计
    ├── cloudflare-architect: 平台资源规划（如涉及）
    └── 输出: 实现方案和任务分解

    ↓
[3] 实现阶段
    ├── 前端部分 → frontend-architect
    ├── 后端部分 → constitutional-coder
    ├── 配置部分 → devops-architect / cloudflare-architect
    └── 并行执行以提高效率

    ↓
[4] 测试验证阶段
    ├── api-test-pro: API功能和性能测试
    ├── validation-verifier: 集成测试和回归测试
    ├── constitutional-compliance-monitor: 合规和安全检查
    └── 输出: 测试报告和质量评估

    ↓
[5] 交付部署阶段
    ├── delivery-coordinator: 准备交付包
    ├── devops-architect / cloudflare-architect: 部署执行
    ├── autonomous-execution-specialist: 上线后监控（如需长期）
    └── 输出: 交付报告和上线确认

    ↓
✅ 任务完成
```

#### 🔄 **迭代修复流程，同时使用long-running-agent技能**

```
发现问题
    ↓
[1] 问题定位
    ├── search: 搜索错误信息和相关代码
    ├── Knowledge Graph: 查询历史解决方案
    └── 输出: 问题根因分析

    ↓
[2] 方案制定
    ├── Architecture-Agent: 如果是架构层面问题
    ├── constitutional-coder: 如果是实现层面问题
    └── 输出: 修复方案

    ↓
[3] 执行修复
    ├── constitutional-coder: 实施修复
    ├── context-compressor: 如Token过高则压缩上下文
    └── 输出: 修复后的代码

    ↓
[4] 验证确认
    ├── validation-verifier: 验证修复效果
    ├── api-test-pro: 回归测试（如涉及API）
    └── 输出: 验证报告

    ↓
[5] 部署上线
    ├── devops-architect / cloudflare-architect: 部署修复
    ├── delivery-coordinator: 更新交付文档
    └── Knowledge Graph: 记录解决方案

    ↓
✅ 修复完成并沉淀经验
```

***

## 三、协作模式

### 3.1 串行协作模式

**适用场景**: 任务有明确的依赖关系

```
Task A (search)
    ↓ 完成后触发
Task B (Architecture-Agent)
    ↓ 完成后触发
Task C (constitutional-coder)
    ↓ 完成后触发
Task D (validation-verifier)
```

**示例**:

1. search → 查找现有认证逻辑
2. Architecture-Agent → 设计新的认证方案
3. constitutional-coder → 实现新认证逻辑
4. validation-verifier → 验证认证功能

### 3.2 并行协作模式

**适用场景**: 任务相互独立，可以同时执行

```
                    ┌→ Task A (frontend-architect)
                    │
User Request ──────┼→ Task B (constitutional-coder)
                    │
                    └→ Task C (cloudflare-architect)
                            ↓
                    Result Aggregator (meta-orchestrator)
```

**示例**: 同时开发前后端

1. frontend-architect → 开发前端界面
2. constitutional-coder → 开发后端API
3. cloudflare-architect → 配置D1数据库和Workers
4. meta-orchestrator → 汇总结果并进行集成

### 3.3 层级协作模式

**适用场景**: 复杂项目需要管理和监督

```
meta-orchestrator (项目经理)+协同使用long-running-agent技能
    ├── Team A: 前端组
    │   ├── frontend-architect (技术负责人)
    │   └── validation-verifier (QA)
    │
    ├── Team B: 后端组
    │   ├── constitutional-coder (开发者)
    │   ├── api-test-pro (测试专家)
    │   └── validation-verifier (QA)
    │
    └── Team C: 运维组
        ├── devops-architect (DevOps)
        ├── cloudflare-architect (平台专家)
        └── delivery-coordinator (交付)
```

### 3.4 共识协作模式

**适用场景**: 重要决策需要多角度评估

```
Issue (技术选型/架构决策)
    ↓
┌─────────────────────────────────────┐
│         专家评审委员会               │
│                                     │
│  Architecture-Agent     → 架构视角  │
│  cloudflare-architect   → 平台视角  │
│  devops-architect       → 运维视角  │
│  frontend-architect     → 前端视角  │
│  api-test-pro           → 测试视角  │
└─────────────────────────────────────┘
    ↓
meta-orchestrator (汇总意见，做出决策)
    ↓
输出: 决策文档和理由
```

***

## 四、最佳实践

### 4.1 任务分配黄金法则

```markdown
## ✅ DO（应该做）

1. **明确优先级**
   - P0: 阻塞性问题 → 立即处理，可能需要多智能体协作
   - P1: 功能性问题 → 尽快处理，通常需要2-3个智能体
   - P2: 体验问题 → 计划处理，可以单智能体完成
   - P3: 优化建议 → 择机处理，低优先级

2. **合理拆分任务**
   - 每个子任务应该在30分钟内可完成
   - 明确每个子任务的输入和输出
   - 定义清晰的依赖关系
   - 设置可衡量的成功标准

3. **充分共享上下文**
   - 提供足够的背景信息
   - 说明已尝试的方法和结果
   - 明确约束条件和限制
   - 给出期望的输出格式

4. **及时监控和反馈**
   - 定期检查任务进度
   - 及时处理阻塞问题
   - 记录遇到的问题和解决方案
   - 适时调整任务分配

## ❌ DON'T（不应该做）

1. **避免过度分配**
   - 不要同时给一个智能体分配多个独立任务
   - 不要在智能体忙时强行分配新任务
   - 不要忽略智能体的能力和专长限制

2. **避免重复劳动**
   - 不要让多个智能体做相同的工作
   - 不要重复已经完成的验证
   - 不要重新调查已知的问题

3. **避免沟通不畅**
   - 不要假设智能体理解隐含的需求
   - 不要省略重要的上下文信息
   - 不要使用模糊不清的任务描述

4. **避免缺乏监督**
   - 不要分配任务后就完全不管
   - 不要等到最后才检查结果
   - 不要忽视智能体的反馈和建议
```

### 4.2 错误处理和升级机制

```yaml
# 错误处理流程

Level_1_自动重试:
  条件: 临时性错误（网络超时、API限流）
  处理: 自动重试最多3次，指数退避
  示例: npm install 失败 → 重试 → 清除缓存 → 重试

Level_2_同级协助:
  条件: 单智能体连续失败2次
  处理: 调用同级别其他智能体协助
  示例: frontend-architect 失败 → 请 constitutional-coder 协助排查

Level_3_上级升级:
  条件: 同级协助仍然失败或架构层面问题
  处理: 升级到 Architecture-Agent 或 meta-orchestrator
  示例: 连续3次修复失败 → Architecture-Agent 进行架构审查

Level_4_紧急停止:
  条件: 安全漏洞、数据丢失风险、系统崩溃
  处理: 立即停止所有任务，通知用户
  触发: constitutional-compliance-monitor 检测到严重违规
```

### 4.3 Token 管理策略

```markdown
## Token 使用监控阈值

🟢 正常 (< 50%):
  - 正常执行任务
  - 可以启动新的智能体

🟡 注意 (50% - 70%):
  - 开始关注Token使用
  - 优先完成任务，减少新任务启动
  - 考虑调用 context-compressor

🟠 警告 (70% - 85%):
  - 强制调用 context-compressor
  - 只保留当前最关键的任务
  - 暂停非必要的智能体

🔴 危险 (> 85%):
  - 立即保存检查点
  - 压缩所有可压缩的内容
  - 准备结束当前会话，保存状态

## 优化技巧

1. **精确的任务描述**: 避免冗长的背景说明
2. **结构化的输出**: 要求智能体返回结构化的结果
3. **增量式处理**: 分批次处理大任务
4. **及时清理**: 完成的任务立即标记并归档
5. **复用已有结果**: 通过Knowledge Graph查询历史解决方案
```

### 4.4 质量保障机制

```markdown
## 多层次质量检查

### 第1层: 自检（智能体内置）
- constitutional-coder: 编写时遵循编码规范
- frontend-architect: 实现时考虑性能和可访问性
- Architecture-Agent: 设计时遵循架构原则

### 第2层: 互检（智能体间交叉验证）
- api-test-pro 测试 constitutional-coder 的代码
- validation-verifier 验证 frontend-architect 的界面
- constitutional-compliance-monitor 审查所有变更

### 第3层: 专检（专项质量保障）
- validation-verifier: 全面的功能和性能验证
- api-test-pro: API契约和压力测试
- delivery-coordinator: 交付前的最终检查

### 第4层: 人检（用户验收）
- 功能演示和验收测试
- 性能指标确认
- 安全审计通过
- 上线批准签字

## 质量门禁（Quality Gates）

Gate_1_代码完成:
  ✅ TypeScript 类型检查通过
  ✅ ESLint 检查通过
  ✅ 单元测试通过（覆盖率 > 80%）

Gate_2_集成验证:
  ✅ API 测试全部通过
  ✅ E2E 测试关键流程通过
  ✅ 前后端数据一致

Gate_3_性能达标:
  ✅ Lighthouse Performance ≥ 92
  ✅ API 响应时间 < 200ms (P95)
  ✅ 无内存泄漏

Gate_4_安全合规:
  ✅ 无已知安全漏洞
  ✅ 敏感信息无泄露
  ✅ 权限控制完善

Gate_5_交付就绪:
  ✅ 文档完整且最新
  ✅ 部署脚本可用
  ✅ 回滚方案就绪
  ✅ 监控告警配置完成
```

***

## 五、典型场景示例

### 5.1 场景一：新增流量跟踪功能（对标 Keitaro）

```yaml
任务描述: 
  实现完整的流量跟踪和管理系统，包括：
  - 流量来源跟踪
  - 落地页管理
  - 转化率统计
  - A/B测试
  - 流量分配规则

智能体编排:

  Phase_1_需求分析与架构设计 (预计 30分钟):
    主要智能体: meta-orchestrator
    协助智能体:
      - search: 调研现有代码结构和Keitaro功能
      - Architecture-Agent: 设计整体架构
      - cloudflare-architect: 评估Cloudflare资源需求
    
    输出物:
      - 架构设计文档
      - 数据模型设计
      - API接口定义
      - 任务分解和排期

  Phase_2_并行开发 (预计 90分钟):
    Track_A_前端界面:
      智能体: frontend-architect
      任务: 
        - 流量仪表盘
        - 落地页编辑器
        - 规则配置界面
        - 报表展示组件
    
    Track_B_后端API:
      智能体: constitutional-coder
      任务:
        - D1数据库表设计和迁移
        - RESTful API实现
        - 业务逻辑处理
        - 数据聚合和统计
    
    Track_C_平台配置:
      智能体: cloudflare-architect
      任务:
        - Workers路由配置
        - D1数据库绑定
        - KV缓存策略
        - CORS和安全配置
    
    Track_D_CI_CD:
      智能体: devops-architect
      任务:
        - GitHub Actions工作流
        - 自动化测试流程
        - 部署脚本
        - 环境变量管理

  Phase_3_测试验证 (预计 45分钟):
    主要智能体: validation-verifier
    协助智能体:
      - api-test-pro: API功能和性能测试
      - constitutional-compliance-monitor: 安全和合规检查
      - frontend-architect: Lighthouse性能优化
    
    验证项:
      - [ ] 所有CRUD操作正常
      - [ ] 前后端数据一致
      - [ ] API响应时间 < 200ms
      - [ ] Lighthouse ≥ 92
      - [ ] 无安全漏洞
      - [ ] 移动端适配良好

  Phase_4_部署上线 (预计 15分钟):
    主要智能体: delivery-coordinator
    协助智能体:
      - devops-architect: 执行部署
      - cloudflare-architect: 验证线上配置
      - autonomous-execution-specialist: 上线后24小时监控
    
    交付物:
      - 完整的功能文档
      - API文档（OpenAPI/Swagger）
      - 运维手册
      - 部署确认报告
```

### 5.2 场景二：紧急Bug修复

```yaml
问题描述:
  生产环境发现流量统计数据不准确，
  部分转化事件未被正确记录。

紧急程度: P0_CRITICAL

快速响应流程:

  Step_1_立即诊断 (5分钟):
    智能体: search
    任务:
      - 搜索相关错误日志
      - 定位数据写入代码
      - 查询Knowledge Graph是否有类似问题
    
    输出: 问题根因初步分析

  Step_2_根因分析 (10分钟):
    智能体: Architecture-Agent (如果涉及架构) 或 constitutional-coder
    任务:
      - 分析数据流向
      - 定位具体bug位置
      - 评估影响范围
      - 设计最小化修复方案
    
    输出: 修复方案和风险评估

  Step_3_快速修复 (15分钟):
    智能体: constitutional-coder
    任务:
      - 实施修复代码
      - 添加防御性编程
      - 补充单元测试
      - 确保向后兼容
    
    输出: 修复后的代码和测试

  Step_4_紧急验证 (10分钟):
    智能体: validation-verifier
    任务:
      - 验证修复有效性
      - 回归测试相关功能
      - 检查数据一致性
      - 性能影响评估
    
    输出: 验证报告

  Step_5_紧急部署 (5分钟):
    智能体: devops-architect / cloudflare-architect
    任务:
      - 紧急发布修复
      - 监控部署状态
      - 验证线上修复效果
      - 准备回滚方案
    
    输出: 部署确认和监控报告

  Step_6_经验沉淀 (持续):
    智能体: context-compressor + Knowledge Graph
    任务:
      - 记录问题现象和根因
      - 保存解决方案
      - 更新预防措施
      - 通知相关智能体
    
    输出: 知识库更新

  总耗时: 约 45-60 分钟
```

### 5.3 场景三：性能优化专项

```yaml
优化目标:
  将页面加载性能从 Lighthouse 75 提升到 95+
  优化范围: 首屏渲染、API响应、资源加载

智能体编排:

  Phase_1_性能诊断 (20分钟):
    主要智能体: validation-verifier
    工具: Chrome DevTools MCP, Lighthouse
    
    诊断项:
      - [ ] Core Web Vitals 指标
      - [ ] 渲染阻塞资源
      - [ ] 大型JavaScript包
      - [ ] 未优化的图片
      - [ ] API响应时间分析
      - [ ] 网络瀑布流
    
    输出: 性能瓶颈报告和优化建议

  Phase_2_分类优化 (并行执行, 60分钟):
    
    Track_A_前端优化:
      智能体: frontend-architect
      优化项:
        - 代码分割和懒加载
        - 组件级SSR/SSG
        - 图片优化和WebP转换
        - CSS优化和关键CSS内联
        - 字体加载优化
    
    Track_B_后端优化:
      智能体: constitutional-coder + cloudflare-architect
      优化项:
        - D1查询优化和索引添加
        - API响应缓存策略
        - Worker边缘缓存配置
        - 数据预聚合和批处理
        - GraphQL替代REST（如适用）
    
    Track_C_资源优化:
      智能体: devops-architect
      优化项:
        - CDN配置优化
        - 资源压缩和Brotli
        - HTTP/2或HTTP/3启用
        - 预连接和预加载
        - Service Worker缓存策略

  Phase_3_优化验证 (30分钟):
    主要智能体: api-test-pro + validation-verifier
    
    验证项:
      - [ ] Lighthouse分数提升到95+
      - [ ] Core Web Vitals全绿
      - [ ] API P95响应时间 < 150ms
      - [ ] 包体积减少30%+
      - [ ] 移动端性能达标
      - [ ] 无功能 regression

  Phase_4_持续监控 (可选, autonomous-execution-specialist):
    监控周期: 7天
    监控指标:
      - 真实用户性能数据(RUM)
      - 错误率和异常检测
      - 缓存命中率
      - CDN流量分布
```

***

## 六、高级技巧

### 6.1 智能体能力互补

```markdown
## 互补配对

1. **创意 + 审慎**
   - frontend-architect (创意实现) + validation-verifier (严谨验证)
   - 适用: UI创新功能的开发和验证

2. **广度 + 深度**
   - search (广泛搜索) + Architecture-Agent (深度分析)
   - 适用: 复杂问题的全面诊断

3. **速度 + 质量**
   - constitutional-coder (快速实现) + api-test-pro ( thorough testing)
   - 适用: 需要快速迭代的功能开发

4. **理想 + 现实**
   - Architecture-Agent (理想架构) + cloudflare-architect (平台约束)
   - 适用: 在限制条件下寻找最优解

5. **开发 + 运维**
   - frontend-architect/constitutional-coder (开发) + devops-architect (运维)
   - 适用: 需要考虑部署和维护的功能
```

### 6.2 动态任务重分配

```yaml
# 当检测到以下情况时，动态调整任务分配

情况1_智能体效率低下:
  检测指标:
    - 任务完成时间超过预期2倍
    - 连续出现质量问题
    - 频繁请求帮助或澄清
  
  应对措施:
    - 评估是否任务不匹配该智能体的专长
    - 考虑更换更合适的智能体
    - 或者增加协助智能体

情况2_新信息导致方向变化:
  检测指标:
    - 用户提供了新的需求或约束
    - 发现了之前未知的技术限制
    - 外部依赖发生变化
  
  应对措施:
    - 暂停当前任务
    - 重新评估和规划
    - 与用户确认新的方向
    - 重新分配任务

情况3_依赖关系变化:
  检测指标:
    - 前置任务提前/延迟完成
    - 发现了新的依赖关系
    - 某个任务变得不再必要
  
  应对措施:
    - 更新任务依赖图
    - 调整执行顺序
    - 重新平衡负载
    - 通知受影响的智能体

情况4_资源约束:
  检测指标:
    - Token使用接近阈值
    - 某些工具不可用
    - 外部API限流
  
  应对措施:
    - 优先保证关键任务
    - 压缩或延迟非关键任务
    - 寻找替代方案
    - 及时通知用户
```

### 6.3 知识积累和复用

````markdown
## 利用 Knowledge Graph 和 SuperMemory

### 1. 任务开始前查询
```python
# 伪代码示例
query = "流量跟踪 数据库设计 性能优化"
results = knowledge_graph_search(query)

if results:
    # 应用已有的解决方案
    apply_solution(results.best_match)
else:
    # 从头开始分析和设计
    design_from_scratch()
````

### 2. 任务完成后记录

```python
# 记录成功的经验
knowledge_graph_create_entity({
    "name": "D1数据库批量插入优化",
    "type": "Solution",
    "observations": [
        "场景: 需要批量插入10万+条流量记录",
        "方案: 使用D1的batch语句，每次1000条",
        "效果: 插入速度提升20倍",
        "注意事项: 需要处理唯一约束冲突",
        "日期": "2026-04-07",
        "项目": "CFtracking"
    ]
})

# 创建关联关系
knowledge_graph_create_relation({
    "from": "D1数据库批量插入优化",
    "to": "性能优化",
    "relation": "solves"
})
```

### 3. 错误和失败记录

```python
# 记录失败的教训
knowledge_graph_create_entity({
    "name": "Worker内存溢出OOM",
    "type": "Error",
    "observations": [
        "症状: Worker在处理大量数据时报错 EXCEED_CPU_LIMIT",
        "原因: 在单个请求中处理过多数据",
        "解决方案: 分批处理，使用Durable Objects协调",
        "预防: 设置数据处理大小限制",
        "日期": "2026-04-07"
    ]
})
```

### 4. 智能体间的知识共享

- 每个智能体完成任务后，将关键经验写入Knowledge Graph
- 其他智能体在接收到相似任务时，先查询Knowledge Graph
- meta-orchestrator 定期整理和归纳知识
- context-compressor 在压缩时提取关键知识

````

### 6.4 自适应学习机制

```markdown
## 智能体效能评估

### 评估维度
1. **任务成功率**: 完成的任务数 / 分配的总任务数
2. **质量评分**: 验证通过的次数 / 总验证次数
3. **效率指标**: 实际用时 / 预计用时
4. **协作评价**: 其他智能体的反馈评分

### 学习和优化
1. **识别强项**: 哪些类型的任务某个智能体特别擅长
2. **发现弱点**: 哪些情况下某个智能体表现不佳
3. **优化分配**: 根据历史表现调整未来的任务分配策略
4. **能力提升**: 通过Knowledge Graph分享最佳实践

### 示例: 任务分配优化
初始分配:
  - 所有前端任务 → frontend-architect
  
经过一段时间观察后发现:
  - frontend-architect 擅长: 组件开发、状态管理、性能优化
  - frontend-architect 相对弱: 动画效果、复杂的CSS布局
  
优化后的分配:
  - 组件/状态/性能 → frontend-architect
  - 动画/CSS布局 → 调用 Skill (animate, typeset 等)
  - 或者寻求其他智能体协助
````

***

## 七、故障排除指南

### 7.1 常见问题及解决方案

```yaml
Problem_1: 智能体无响应
  可能原因:
    - Token耗尽
    - 任务描述不清楚
    - 工具调用权限问题
    - 网络连接问题
  
  解决步骤:
    1. 检查Token使用率，必要时调用context-compressor
    2. 重新组织任务描述，更加明确和具体
    3. 检查智能体是否有所需的工具权限
    4. 验证网络连接和外部API可用性
    5. 如果仍无响应，尝试更换其他智能体

Problem_2: 输出质量不达标
  可能原因:
    - 任务超出智能体能力范围
    - 上下文信息不足
    - 任务要求不够明确
    - 缺乏足够的示例和参考
  
  解决步骤:
    1. 评估任务是否适合该智能体，考虑换用更专业的智能体
    2. 提供更多的背景信息和上下文
    3. 细化任务要求，给出具体的验收标准
    4. 提供类似的优秀示例作为参考
    5. 增加validation-verifier进行二次验证

Problem_3: 智能体间冲突
  可能原因:
    - 任务边界不清晰
    - 两个智能体修改同一文件
    - 对技术方案有分歧
    - 缺乏统一的协调
  
  解决步骤:
    1. 立即暂停冲突的任务
    2. 调用meta-orchestrator进行仲裁
    3. 明确划分每个智能体的责任范围
    4. 对于文件修改，建立串行的修改顺序
    5. 技术分歧由Architecture-Agent做最终决定

Problem_4: 任务进度停滞
  可能原因:
    - 遇到了难以解决的技术难题
    - 缺少必要的信息或资源
    - 任务依赖的其他任务未完成
    - 智能体陷入了循环
  
  解决步骤:
    1. 检查智能体的输出日志，了解卡在哪一步
    2. 调用search或Architecture-Agent提供额外支持
    3. 确认前置任务的状态，催促或协助完成
    4. 如果陷入循环，强制中断并重新分配任务
    5. 考虑将大任务拆分为更小的子任务

Problem_5: 资源耗尽（Token/时间/API限额）
  可能原因:
    - 任务规模估计不足
    - 过多的并行智能体
    - 循环或递归调用
    - 外部API频繁调用
  
  解决步骤:
    1. 立即调用context-compressor释放空间
    2. 暂停非关键任务，集中资源完成核心任务
    3. 检查是否有循环调用，打破循环
    4. 启用缓存机制，避免重复的API调用
    5. 必要时保存检查点，稍后继续
```

### 7.2 紧急恢复程序

```markdown
## 当发生严重故障时

### Step 1: 故障评估 (5分钟)
- 确定故障类型和影响范围
- 评估是否需要紧急停止
- 决定恢复策略

### Step 2: 状态保存 (10分钟)
- 调用context-compressor保存当前状态
- 更新Todo列表记录已完成和未完成的工作
- 将关键信息写入Knowledge Graph
- 创建恢复检查点

### Step 3: 故障隔离 (15分钟)
- 确定故障源头
- 隔离受影响的模块或智能体
- 保护已完成的工作不被破坏
- 通知用户当前状况

### Step 4: 恢复执行 (根据故障类型)
- 如果是临时性故障: 清除后重试
- 如果是智能体问题: 更换智能体继续
- 如果是架构问题: 调用Architecture-Agent重新设计
- 如果是资源问题: 优化或等待资源释放

### Step 5: 验证恢复 (20分钟)
- 验证所有功能恢复正常
- 确认没有引入新的问题
- 运行完整的回归测试
- 更新监控和告警

### Step 6: 事后复盘 (持续)
- 记录故障的根因和影响
- 更新预防措施到Knowledge Grid
- 优化故障处理流程
- 如果是用户纠正，更新项目规则
```

***

## 八、附录

### 8.1 快速参考卡片

#### 📋 智能体速查表

| 智能体                                   | 一句话描述  | 最擅长                     | 不太擅长          |
| ------------------------------------- | ------ | ----------------------- | ------------- |
| **meta-orchestrator**                 | 总指挥    | 任务协调、冲突解决、资源管理          | 具体代码实现        |
| **autonomous-execution-specialist**   | 长跑健将   | 长时间任务、持续监控、检查点管理        | 快速响应的短期任务     |
| **Architecture-Agent**                | 架构师    | 技术选型、架构设计、问题诊断          | 具体编码实现        |
| **constitutional-coder**              | 代码工匠   | 高质量编码、错误处理、Bug修复        | 架构设计、UI实现     |
| **frontend-architect**                | 前端专家   | UI/UX、React组件、性能优化      | 后端API、数据库设计   |
| **devops-architect**                  | 运维专家   | CI/CD、容器化、云基础设施         | 业务逻辑、前端开发     |
| **cloudflare-architect**              | CF平台专家 | Workers/D1/R2、边缘计算、成本优化 | 通用Web开发、非CF平台 |
| **api-test-pro**                      | 测试专家   | API测试、性能测试、契约测试         | 功能开发、UI实现     |
| **validation-verifier**               | 质量管家   | 全面验证、浏览器测试、性能审计         | 主动开发、架构设计     |
| **constitutional-compliance-monitor** | 合规卫士   | 安全审计、合规检查、风险监测          | 功能实现、性能优化     |
| **delivery-coordinator**              | 交付专员   | 项目交付、文档准备、上线发布          | 开发任务、技术实现     |
| **search**                            | 搜索达人   | 代码定位、信息检索、模式识别          | 主动创造、决策制定     |
| **context-compressor**                | 压缩大师   | 上下文管理、状态保存、Token优化      | 主动任务执行        |

#### 🎯 场景快速匹配

```
我需要...                        → 调用这个智能体
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
开发一个新功能                  → meta-orchestrator + 相关专业智能体
修复一个Bug                     → search + constitutional-ccoder
优化页面性能                    → frontend-architect + validation-verifier
设计系统架构                    → Architecture-Agent
配置部署流水线                  → devops-architect
部署到Cloudflare                → cloudflare-architect
测试API接口                     → api-test-pro
验证功能正确性                  → validation-verifier
检查安全问题                    → constitutional-compliance-monitor
准备项目交付                    → delivery-coordinator
执行长时间任务                  → autonomous-execution-specialist
查找代码或文档                  → search
管理对话上下文                  → context-compressor
```

#### ⚡ 常用组合快捷方式

```yaml
# 组合1: 全栈开发
名称: FullStack_Development
智能体: [meta-orchestrator, frontend-architect, constitutional-coder, validation-verifier]
适用: 新功能从0到1的完整开发

# 组合2: Bug修复
名称: Bug_Fix_Squad
智能体: [search, constitutional-coder, validation-verifier]
适用: 问题定位、修复、验证一站式

# 组合3: 性能优化
名称: Performance_Optimization_Team
智能体: [validation-verifier, frontend-architect, cloudflare-architect, api-test-pro]
适用: 端到端的性能提升

# 组合4: 部署发布
名称: Deployment_Pipeline
智能体: [devops-architect, cloudflare-architect, delivery-coordinator, validation-verifier]
适用: 从代码到上线的完整流程

# 组合5: 紧急响应
名称: Incident_Response
智能体: [search, constitutional-coder, devops-architect/cloudflare-architect, validation-verifier]
适用: 生产问题紧急修复

# 组合6: 质量保障
名称: Quality_Assurance
智能体: [api-test-pro, validation-verifier, constitutional-compliance-monitor]
适用: 发布前的全面质量检查
```

### 8.2 工具集对照表

| 工具类型       | 可用的MCP工具                                               | 主要使用者                                                          |
| ---------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| **文件操作**   | Read, Write, SearchReplace, DeleteFile, Glob, LS, Grep | 所有智能体                                                          |
| **命令执行**   | RunCommand, CheckCommandStatus, StopCommand            | devops-architect, cloudflare-architect, validation-verifier    |
| **Web访问**  | WebSearch, WebFetch                                    | Architecture-Agent, search, api-test-pro                       |
| **浏览器**    | Chrome DevTools MCP套件                                  | validation-verifier, frontend-architect, constitutional-coder  |
| **GitHub** | GitHub MCP套件                                           | devops-architect, cloudflare-architect, delivery-coordinator   |
| **知识管理**   | Knowledge Graph, SuperMemory                           | 所有智能体（特别是context-compressor）                                   |
| **技术文档**   | Context7                                               | Architecture-Agent, constitutional-coder, cloudflare-architect |
| **任务管理**   | TodoWrite, AskUserQuestion                             | meta-orchestrator, autonomous-execution-specialist             |
| **专业技能**   | Skill (audit, optimize, wrangler等)                     | 按需调用的各种智能体                                                     |
| **预览测试**   | OpenPreview, Playwright                                | validation-verifier, frontend-architect, api-test-pro          |

### 8.3 性能基准参考

```yaml
# 各智能体的典型任务完成时间参考

简单任务 (< 30分钟):
  search: 2-5分钟
  constitutional-coder (小修改): 10-20分钟
  validation-verifier (单项验证): 10-15分钟
  context-compressor (压缩): 5-10分钟

中等任务 (30分钟 - 2小时):
  frontend-architect (单页面): 30-60分钟
  constitutional-coder (API开发): 45-90分钟
  api-test-pro (API测试套件): 30-60分钟
  devops-architect (CI/CD配置): 45-90分钟
  cloudflare-architect (Workers配置): 30-60分钟

复杂任务 (2-4小时):
  Architecture-Agent (架构设计): 60-120分钟
  meta-orchestrator (协调复杂项目): 120-240分钟
  autonomous-execution-specialist (长时任务): 240分钟+

超大任务 (4小时+, 需要分阶段):
  完整功能模块开发: 4-8小时
  系统级重构: 8-16小时
  全面上线部署: 4-8小时
  (建议使用autonomous-execution-specialist + 检查点机制)
```

### 8.4 术语表

| 术语                     | 定义                                                   |
| ---------------------- | ---------------------------------------------------- |
| **SOLO Coder**         | 主导任务分配和协调的核心智能体（即本指南的使用者）                            |
| **智能体 (Agent)**        | 具有特定专业能力和工具集的AI助手实例                                  |
| **任务 (Task)**          | 分配给智能体执行的明确工作单元                                      |
| **编排 (Orchestration)** | 协调多个智能体协同工作的过程                                       |
| **检查点 (Checkpoint)**   | 长时间任务中的状态保存点，用于恢复和断点续传                               |
| **Token**              | AI模型的上下文窗口计量单位，有限资源                                  |
| **Knowledge Graph**    | 结构化的知识存储系统，用于积累和复用经验                                 |
| **SuperMemory**        | 长期记忆存储系统，用于保存重要信息                                    |
| **Context Compressor** | 压缩对话历史以节省Token使用的机制                                  |
| **Quality Gate**       | 质量门禁，进入下一阶段必须满足的条件                                   |
| **Escalation**         | 问题升级，当当前层级无法解决时上报给更高层级                               |
| **PDCA**               | Plan-Do-Check-Act循环，持续改进方法论                          |
| **SOLID**              | 面向对象设计的5个基本原则                                        |
| **DRY**                | Don't Repeat Yourself，不要重复自己                         |
| **KISS**               | Keep It Simple, Stupid，保持简单                          |
| **YAGNI**              | You Aren't Gonna Need It，不过度设计                       |
| **Lighthouse**         | Google的网页性能审计工具                                      |
| **Core Web Vitals**    | Google定义的用户体验关键指标                                    |
| **P0/P1/P2/P3**        | 优先级等级，P0最高，P3最低                                      |
| **CRUD**               | Create, Read, Update, Delete，基本数据操作                  |
| **CI/CD**              | Continuous Integration/Continuous Deployment，持续集成/部署 |
| **MCP**                | Model Context Protocol，模型上下文协议                       |
| **D1/R2/KV/DO**        | Cloudflare的各种服务产品                                    |
| **Wrangler**           | Cloudflare的CLI工具                                     |
| **E2E**                | End-to-End，端到端测试                                     |
| **Regression**         | 回归测试，确保新改动没有破坏已有功能                                   |

***

## 九、版本历史

| 版本     | 日期         | 作者         | 变更说明                 |
| ------ | ---------- | ---------- | -------------------- |
| v1.0.0 | 2026-04-07 | SOLO Coder | 初始版本，包含13个智能体的完整编排指南 |

***

## 十、反馈和改进

本指南是一个活文档，将持续改进和优化。

### 如何贡献改进：

1. 在使用过程中记录遇到的问题和解决方案
2. 通过Knowledge Graph分享最佳实践
3. 定期评估智能体效能，优化分配策略
4. 当用户提出纠正时，及时更新相关规则

### 联系方式：

- 问题反馈: 通过TodoWrite记录并提交给meta-orchestrator
- 改进建议: 通过Knowledge Graph创建实体和观察
- 紧急问题: 直接触发constitutional-compliance-monitor

***

**文档结束**

> 💡 **提示**: 建议将本文档放在项目根目录或 `.trae/` 目录下，方便SOLO Coder智能体随时查阅。也可以将其核心内容整合到智能体的系统提示中，以实现更自然的任务分配。

