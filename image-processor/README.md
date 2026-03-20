# Keitaro 文档截图处理系统

自动从 Keitaro 文档网站爬取截图，进行分类、分析并生成结构化描述。

## 功能特性

- 📸 **自动爬取**: 使用 Playwright 爬取 docs.keitaro.io 的所有截图
- 📂 **智能分类**: 按功能模块自动分类存储（安装、仪表板、活动管理等）
- 🔍 **视觉分析**: 使用 GPT-4V 分析图像，提取 UI 元素、文本和功能描述
- 📊 **结构化输出**: 生成 AI 可理解的 JSON 格式描述

## 目录结构

```
image-processor/
├── config.py          # 配置文件
├── models.py          # 数据模型定义
├── crawler.py         # 网页爬取模块
├── storage.py         # 存储管理模块
├── analyzer.py        # 图像分析模块
├── main.py            # 主程序入口
├── requirements.txt   # Python 依赖
├── .env.example       # 环境变量示例
└── README.md          # 本文档

keitaro-images/
├── raw/               # 原始爬取的图片
├── categorized/       # 按分类整理的图片
│   ├── installation/
│   ├── dashboard/
│   └── ...
└── metadata/
    ├── images.json    # 图片索引
    └── descriptions/  # 结构化描述 JSON
```

## 安装步骤

### 1. 创建虚拟环境（推荐）

```bash
cd image-processor
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 安装 Playwright 浏览器

```bash
playwright install chromium
```

### 4. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
```

## 使用方法

### 完整流程（爬取 + 分析）

```bash
python main.py
```

### 仅爬取（不分析）

如果没有配置 API Key，程序会自动跳过分析步骤，仅下载图片。

## 分类类目

| 类目 | 说明 |
|-----|------|
| installation | 安装指南 |
| dashboard | 仪表板 |
| campaign-management | 活动管理 |
| offer-management | Offer 管理 |
| landing-page-management | 着陆页管理 |
| flow-management | 流量流管理 |
| rule-management | 规则管理 |
| payment-integration | 支付集成 |
| api-documentation | API 文档 |
| settings | 系统设置 |
| other | 其他 |

## 输出格式

### images.json - 图片索引

```json
{
  "version": "1.0",
  "images": [
    {
      "id": "img_abc123",
      "source_url": "https://...",
      "category": "installation",
      "file_path": "keitaro-images/categorized/installation/img_abc123.png",
      ...
    }
  ]
}
```

### {image-id}.json - 图像描述

包含：
- `basic_info`: 基本信息（类目、标题）
- `ui_elements`: UI 元素列表（带 bounding box）
- `text_content`: OCR 提取的文本
- `functional_description`: 功能描述和工作流
- `contextual_info`: 上下文信息
- `analysis_confidence`: 置信度评分

## 注意事项

1. **API 成本**: GPT-4V API 调用会产生费用，建议先小范围测试
2. **爬取速度**: 请尊重目标网站，不要过于频繁地爬取
3. **存储空间**: 确保有足够的磁盘空间存储图片

## 技术栈

- **爬虫**: Playwright
- **AI**: OpenAI GPT-4V
- **数据模型**: Pydantic
- **存储**: JSON + 文件系统
