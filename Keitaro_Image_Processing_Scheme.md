# Keitaro 文档截图图像分类与处理方案

## 一、项目概述

本方案专门针对 Keitaro 文档网站（docs.keitaro.io）的截图进行自动化分类、存储和内容解析，生成 AI 可理解的结构化描述信息。

### 1.1 目标
- 自动从 Keitaro 文档爬取所有截图
- 按类目分类存储图像资源
- 解析图像内容，提取 UI 元素、文本和功能场景
- 生成结构化描述信息，便于 AI 模型理解

---

## 二、图像分类存储目录结构设计

```
keitaro-images/
├── raw/                                    # 原始爬取的图像
│   └── {timestamp}/                       # 按爬取时间分组
│       ├── image-001.png
│       ├── image-002.png
│       └── ...
├── categorized/                             # 分类后的图像
│   ├── installation/                        # 安装相关
│   │   ├── digitalocean/
│   │   ├── hetzner/
│   │   └── ...
│   ├── dashboard/                          # 仪表板界面
│   │   ├── overview/
│   │   ├── analytics/
│   │   └── ...
│   ├── campaign-management/                # 活动管理
│   │   ├── create-campaign/
│   │   ├── edit-campaign/
│   │   └── ...
│   ├── offer-management/                   # Offer 管理
│   ├── landing-page-management/            # 着陆页管理
│   ├── flow-management/                    # 流量流管理
│   ├── rule-management/                    # 规则管理
│   ├── payment-integration/                # 支付集成
│   │   ├── payment-methods/
│   │   ├── transaction-history/
│   │   └── ...
│   ├── api-documentation/                  # API 文档
│   ├── settings/                           # 系统设置
│   └── other/                              # 其他未分类
└── metadata/                                # 元数据存储
    ├── images.json                         # 图像索引数据库
    └── descriptions/                       # 结构化描述
        ├── {image-id}.json
        └── ...
```

### 2.1 类目定义（基于 Keitaro 功能模块）

| 类目 ID | 类目名称 | 描述 |
|---------|---------|------|
| installation | 安装指南 | 服务器选择、安装步骤、配置界面 |
| dashboard | 仪表板 | 数据概览、统计图表、快速操作 |
| campaign-management | 活动管理 | 创建/编辑活动、活动列表、活动详情 |
| offer-management | Offer 管理 | Offer 创建、编辑、列表、详情 |
| landing-page-management | 着陆页管理 | 着陆页配置、列表、详情 |
| flow-management | 流量流管理 | 流量分配、流配置、流程图 |
| rule-management | 规则管理 | 规则创建、编辑、规则引擎 |
| payment-integration | 支付集成 | 支付方式配置、交易记录、账单 |
| api-documentation | API 文档 | API 接口、请求示例、响应格式 |
| settings | 系统设置 | 账户设置、偏好配置、集成设置 |
| other | 其他 | 未分类的截图 |

---

## 三、图像内容解析技术路线

### 3.1 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                        图像输入                                 │
└──────────────────────┬────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼─────────┐         ┌────────▼─────────┐
│   UI 元素识别    │         │   OCR 文本提取    │
│  (对象检测)      │         │  (文字识别)       │
└───────┬─────────┘         └────────┬─────────┘
        │                             │
        └──────────────┬──────────────┘
                       │
              ┌────────▼─────────┐
              │  功能场景理解     │
              │  (上下文分析)     │
              └────────┬─────────┘
                       │
              ┌────────▼─────────┐
              │  结构化描述生成   │
              └──────────────────┘
```

### 3.2 技术选型

| 功能模块 | 技术方案 | 说明 |
|---------|---------|------|
| 网页爬取 | Playwright / Puppeteer | 支持动态页面渲染，获取完整截图 |
| UI 元素识别 | YOLO / CLIP / 视觉语言模型 | 检测按钮、表单、菜单等界面元素 |
| OCR 文本提取 | Tesseract / PaddleOCR / 视觉语言模型 | 提取截图中的所有文字 |
| 功能场景理解 | GPT-4V / Claude 3 Vision / Qwen-VL | 理解界面功能和使用场景 |
| 结构化数据存储 | JSON / SQLite | 易于 AI 模型理解和检索 |

### 3.3 图像处理流程

#### 步骤 1：图像预处理
- 格式统一（PNG/JPEG）
- 尺寸标准化
- 去噪增强
- 格式转换

#### 步骤 2：UI 元素识别
检测并标注以下元素：
- 按钮（Button）
- 输入框（Input）
- 下拉菜单（Dropdown）
- 表格（Table）
- 图表（Chart）
- 导航栏（Navbar）
- 侧边栏（Sidebar）
- 模态框（Modal）
- 标签页（Tab）
- 复选框（Checkbox）
- 单选按钮（Radio）

#### 步骤 3：OCR 文本提取
- 提取所有可见文本
- 识别文本区域位置
- 保留文本的相对位置关系

#### 步骤 4：功能场景理解
分析：
- 页面所属功能模块
- 用户操作流程
- 数据展示方式
- 关键操作路径

---

## 四、结构化描述信息格式定义

### 4.1 图像元数据格式（images.json）

```json
{
  "version": "1.0",
  "images": [
    {
      "id": "img_001",
      "source_url": "https://docs.keitaro.io/.../screenshot.png",
      "original_filename": "installation-guide.png",
      "category": "installation",
      "subcategory": "digitalocean",
      "file_path": "categorized/installation/digitalocean/img_001.png",
      "file_size": 245760,
      "width": 1920,
      "height": 1080,
      "format": "png",
      "crawl_timestamp": "2026-03-15T10:30:00Z",
      "last_updated": "2026-03-15T10:30:00Z",
      "description_file": "metadata/descriptions/img_001.json",
      "tags": ["digitalocean", "installation", "vps", "setup"]
    }
  ]
}
```

### 4.2 图像详细描述格式（{image-id}.json）

```json
{
  "image_id": "img_001",
  "version": "1.0",
  "generated_at": "2026-03-15T10:35:00Z",
  "model_used": "gpt-4-vision-preview",
  
  "basic_info": {
    "category": "installation",
    "subcategory": "digitalocean",
    "page_title": "DigitalOcean Auto-Installation",
    "language": "en"
  },
  
  "ui_elements": [
    {
      "id": "elem_001",
      "type": "button",
      "label": "Create Droplet",
      "bounding_box": {
        "x": 1200,
        "y": 300,
        "width": 200,
        "height": 50
      },
      "text_content": "Create Droplet",
      "is_primary": true,
      "is_interactive": true
    },
    {
      "id": "elem_002",
      "type": "input",
      "label": "Hostname",
      "placeholder": "Enter hostname",
      "bounding_box": {
        "x": 300,
        "y": 400,
        "width": 400,
        "height": 40
      },
      "is_interactive": true
    },
    {
      "id": "elem_003",
      "type": "dropdown",
      "label": "Region",
      "options": ["New York", "San Francisco", "Amsterdam"],
      "selected_option": "New York",
      "bounding_box": {
        "x": 300,
        "y": 500,
        "width": 400,
        "height": 40
      },
      "is_interactive": true
    },
    {
      "id": "elem_004",
      "type": "table",
      "bounding_box": {
        "x": 100,
        "y": 600,
        "width": 800,
        "height": 300
      },
      "headers": ["Plan", "CPU", "RAM", "Price"],
      "rows": 5,
      "columns": 4
    }
  ],
  
  "text_content": {
    "full_text": "DigitalOcean Auto-Installation\nCreate Droplet\nHostname: Enter hostname\nRegion: New York\n...",
    "sections": [
      {
        "heading": "Step 1: Choose a Region",
        "content": "Select the datacenter region closest to your target audience.",
        "position": {
          "x": 100,
          "y": 200,
          "width": 600,
          "height": 100
        }
      },
      {
        "heading": "Step 2: Choose a Plan",
        "content": "Select the appropriate server size based on your expected traffic.",
        "position": {
          "x": 100,
          "y": 550,
          "width": 600,
          "height": 50
        }
      }
    ],
    "key_phrases": [
      "Create Droplet",
      "Choose a Region",
      "Choose a Plan",
      "$5/month",
      "4 GB RAM",
      "2 CPU"
    ]
  },
  
  "functional_description": {
    "primary_function": "Server provisioning interface for creating a DigitalOcean droplet with Keitaro pre-installed",
    "user_goal": "Create a VPS server on DigitalOcean with Keitaro tracker automatically installed",
    "workflow_steps": [
      {
        "step": 1,
        "action": "Enter hostname for the server",
        "element_id": "elem_002"
      },
      {
        "step": 2,
        "action": "Select a region from dropdown",
        "element_id": "elem_003"
      },
      {
        "step": 3,
        "action": "Choose a server plan from the table",
        "element_id": "elem_004"
      },
      {
        "step": 4,
        "action": "Click 'Create Droplet' button",
        "element_id": "elem_001"
      }
    ],
    "data_displayed": [
      "Server plans with CPU, RAM, and pricing",
      "Available regions",
      "Hostname input field"
    ],
    "critical_elements": [
      "elem_001", // Create Droplet button
      "elem_003", // Region selection
      "elem_004"  // Plan selection table
    ]
  },
  
  "contextual_info": {
    "related_pages": [
      "Hetzner Auto-Installation",
      "Vultr Auto-Installation",
      "Server Requirements"
    ],
    "parent_section": "Getting Started",
    "documentation_path": "/en/get-started/auto-installation.html",
    "keywords": [
      "DigitalOcean",
      "VPS",
      "installation",
      "droplet",
      "server",
      "Keitaro",
      "tracker"
    ]
  },
  
  "analysis_confidence": {
    "ui_detection": 0.92,
    "ocr_accuracy": 0.95,
    "functional_understanding": 0.88,
    "overall": 0.91
  }
}
```

### 4.3 UI 元素类型定义

```typescript
type UIElementType = 
  | 'button'
  | 'input'
  | 'textarea'
  | 'dropdown'
  | 'checkbox'
  | 'radio'
  | 'tab'
  | 'table'
  | 'chart'
  | 'navbar'
  | 'sidebar'
  | 'modal'
  | 'alert'
  | 'badge'
  | 'card'
  | 'list'
  | 'menu'
  | 'breadcrumb'
  | 'pagination'
  | 'progress'
  | 'slider'
  | 'toggle'
  | 'image'
  | 'icon'
  | 'link'
  | 'heading'
  | 'paragraph'
  | 'other';
```

---

## 五、实现步骤与时间预估

### 5.1 项目阶段划分

| 阶段 | 任务 | 预计时间 | 交付物 |
|-----|------|---------|-------|
| **阶段 1：准备工作** | 环境搭建、依赖安装、API 配置 | 0.5 天 | 可运行的开发环境 |
| **阶段 2：网页爬取** | Keitaro 文档网站爬取、截图下载 | 1 天 | 原始截图数据集 |
| **阶段 3：图像分类** | 类目体系建立、自动分类算法 | 1 天 | 分类后的图像目录 |
| **阶段 4：UI 元素识别** | UI 检测模型集成、元素标注 | 1.5 天 | UI 元素识别模块 |
| **阶段 5：OCR 文本提取** | OCR 引擎集成、文本后处理 | 1 天 | OCR 文本提取模块 |
| **阶段 6：功能理解** | 视觉语言模型集成、场景分析 | 1.5 天 | 功能描述生成模块 |
| **阶段 7：结构化描述** | JSON 格式生成、数据验证 | 1 天 | 完整的描述文件 |
| **阶段 8：测试与优化** | 端到端测试、准确率优化 | 1.5 天 | 测试报告、优化后的系统 |
| **总计** | | **10 天** | |

### 5.2 详细实现步骤

#### 阶段 1：准备工作（0.5 天）
1. 创建项目目录结构
2. 安装 Python/Node.js 依赖
3. 配置视觉语言模型 API（GPT-4V / Claude 3 Vision / Qwen-VL）
4. 配置 OCR 引擎
5. 编写基础配置文件

#### 阶段 2：网页爬取（1 天）
1. 使用 Playwright 访问 Keitaro 文档网站
2. 遍历所有文档页面
3. 检测并下载页面中的所有图片
4. 保存原始图片到 `raw/` 目录
5. 记录图片来源 URL 和元数据

#### 阶段 3：图像分类（1 天）
1. 基于 URL 路径和页面内容进行初步分类
2. 使用视觉语言模型进行内容确认
3. 移动图片到对应类目目录
4. 更新 `images.json` 索引

#### 阶段 4：UI 元素识别（1.5 天）
1. 集成 UI 检测模型（YOLO / 视觉语言模型）
2. 定义 UI 元素类型规范
3. 实现元素检测与标注
4. 生成 bounding box 坐标
5. 元素属性提取（文本、是否交互等）

#### 阶段 5：OCR 文本提取（1 天）
1. 集成 OCR 引擎（PaddleOCR / Tesseract）
2. 实现文本区域检测
3. 文本识别与后处理（去噪、纠错）
4. 保留文本位置信息
5. 生成结构化文本数据

#### 阶段 6：功能理解（1.5 天）
1. 集成视觉语言模型 API
2. 设计提示词（Prompt）模板
3. 实现功能场景分析
4. 工作流步骤提取
5. 上下文关联分析

#### 阶段 7：结构化描述（1 天）
1. 实现 JSON Schema 验证
2. 组合各模块输出
3. 生成完整的描述文件
4. 数据一致性检查
5. 元数据更新

#### 阶段 8：测试与优化（1.5 天）
1. 端到端流程测试
2. 准确率评估
3. 错误案例分析
4. 模型参数调优
5. 性能优化

---

## 六、潜在技术难点及解决方案

### 6.1 难点 1：UI 元素识别准确率

**问题**：
- 不同设计风格的界面元素识别困难
- 小尺寸元素漏检
- 重叠元素误识别

**解决方案**：
- 使用视觉语言模型（GPT-4V / Claude 3 Vision）替代纯对象检测模型
- 采用多尺度检测策略
- 人工标注少量样本进行 Few-shot Learning
- 后处理：基于上下文和位置关系过滤误检

### 6.2 难点 2：OCR 文本质量

**问题**：
- 低分辨率图像文字识别困难
- 艺术字体、斜体文字识别错误
- 文字与背景对比度低

**解决方案**：
- 图像预处理：超分辨率、对比度增强
- 使用多 OCR 引擎集成，结果投票
- 基于上下文的文本纠错
- 对于无法识别的文本，标记为待人工审核

### 6.3 难点 3：功能场景理解的准确性

**问题**：
- 孤立的截图难以理解完整上下文
- 不同语言界面的理解困难
- 功能描述的粒度难以把控

**解决方案**：
- 结合文档页面的上下文文本
- 多图联合分析（同一流程的多张截图）
- 设计分层的提示词模板
- 提供置信度评分，人工审核低置信度结果

### 6.4 难点 4：类目分类的准确性

**问题**：
- 跨类目的截图分类困难
- 新功能页面未在预定义类目中
- 类目边界模糊

**解决方案**：
- 混合策略：URL 规则 + 内容理解
- 支持多级类目和标签系统
- 提供"其他"类目作为兜底
- 定期更新类目体系

### 6.5 难点 5：大规模数据处理效率

**问题**：
- 视觉语言模型 API 调用成本高
- 处理速度慢
- 并发控制复杂

**解决方案**：
- 批处理 + 缓存机制
- 任务队列 + 异步处理
- 模型降级策略（先用轻量模型预筛选）
- 结果复用（相似截图共享描述）

### 6.6 难点 6：数据一致性与可维护性

**问题**：
- 描述格式变更后历史数据兼容
- 数据质量监控困难
- 人工审核流程缺失

**解决方案**：
- 版本化的数据格式
- 数据迁移脚本
- 质量监控仪表板
- 审核工具与工作流

---

## 七、可扩展性设计

### 7.1 类目扩展
- 支持动态添加新类目
- 类目元数据配置化
- 类目迁移工具

### 7.2 模型扩展
- 插件化的模型接口
- 支持多种视觉语言模型
- 模型性能对比与自动选择

### 7.3 存储扩展
- 支持本地存储 / R2 / S3
- 分布式存储架构
- 数据分片与冷热分离

### 7.4 API 扩展
- RESTful API 接口
- 批量处理 API
- Webhook 回调机制

---

## 八、技术栈建议

### 8.1 后端
- **语言**: Python 3.11+
- **Web 框架**: FastAPI（用于 API 服务）
- **爬虫框架**: Playwright
- **OCR**: PaddleOCR
- **图像处理**: Pillow, OpenCV
- **数据存储**: SQLite + JSON 文件

### 8.2 AI 服务
- **视觉语言模型**: OpenAI GPT-4V / Anthropic Claude 3 Vision / 阿里云 Qwen-VL
- **UI 检测**: 可选项（YOLO, 或直接用 VLM）

### 8.3 部署
- **容器化**: Docker
- **任务队列**: Celery + Redis
- **监控**: Prometheus + Grafana

---

## 九、风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|------|---------|
| API 调用成本超支 | 中 | 高 | 设置预算上限、批处理、缓存 |
| 识别准确率不达标 | 中 | 高 | 多模型集成、人工审核流程 |
| 网站结构变化导致爬取失败 | 低 | 中 | 容错设计、定期更新爬取规则 |
| 数据存储容量不足 | 低 | 中 | 压缩存储、云存储扩展 |
| 项目延期 | 中 | 中 | 敏捷开发、分阶段交付 |

---

## 十、后续优化方向

1. **主动学习**：基于人工反馈持续优化模型
2. **多语言支持**：扩展到非英文界面
3. **视频解析**：支持操作录像的解析
4. **知识库构建**：基于结构化描述构建搜索知识库
5. **自动化测试**：基于界面描述生成自动化测试脚本

---

**方案版本**: v1.0  
**创建日期**: 2026-03-15  
**最后更新**: 2026-03-15
