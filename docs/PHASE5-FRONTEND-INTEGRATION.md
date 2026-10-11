# Phase 5 实施计划：Landing Page 前端集成

**日期**: 2026-10-11  
**目标**: 将新后端 API 与现有前端完美集成  
**预计时间**: 4-6 小时

---

## 🎯 当前状态

### 已完成（Phase 1-4）
- ✅ 后端数据模型扩展
- ✅ Repository 层完整实现
- ✅ 公开访问路由 /lp/:slug
- ✅ 完整模板系统
- ✅ KV 缓存和 Cron 预渲染

### 现有前端
- ✅ `frontend/src/pages/Landings.tsx` 已存在
- ⏳ 需要验证与新 API 兼容性
- ⏳ 需要支持新字段

---

## 📋 Task 5.1: 前端 API 集成验证

### Step 1: 检查现有 Landings.tsx
**文件**: `frontend/src/pages/Landings.tsx`

**检查项**:
- [ ] API 端点是否正确（/api/landing-pages）
- [ ] 数据结构是否匹配新类型定义
- [ ] 新字段支持（template, content, seo_*, is_public）

### Step 2: 更新类型定义
**文件**: `frontend/src/types/landingPage.ts`（如果存在）

**确保包含**:
```typescript
interface LandingPage {
  id: string;
  name: string;
  url?: string;
  slug: string;
  template: 'betting-comparison' | 'casino-review' | 'bonus-guide';
  content: LandingPageContent;
  seo_title: string;
  seo_description?: string;
  geo_targeting?: string[];
  is_public: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}
```

### Step 3: 表单字段扩展
**新增表单字段**:
- Template 选择器
- Slug 输入（自动生成建议）
- SEO Title/Description
- Is Public 开关
- Geo Targeting 多选
- Content JSON 编辑器

---

## 📋 Task 5.2: UI 功能增强

### 列表视图增强
- [ ] Slug 列显示
- [ ] Template 标签显示
- [ ] Public 状态图标
- [ ] 预览链接（/lp/:slug）
- [ ] 复制公开 URL 功能

### 创建/编辑表单
- [ ] Template 选择下拉框
- [ ] Slug 输入（自动从 name 生成）
- [ ] SEO 优化区域
  - Title（必填，60 字符限制）
  - Description（可选，160 字符限制）
  - Keywords
- [ ] Content 编辑器
  - JSON 模式（高级用户）
  - 可视化编辑器（待 Phase 6+）
- [ ] Geo Targeting 多选
- [ ] Public 开关

### 操作增强
- [ ] 快速预览（新标签打开 /lp/:slug）
- [ ] 复制公开 URL
- [ ] 清除缓存按钮
- [ ] 状态切换（active/inactive）

---

## 📋 Task 5.3: 本地测试验证

### 测试用例
1. **创建 Landing Page**
   - 填写所有字段
   - 验证 Slug 唯一性
   - 保存成功

2. **编辑 Landing Page**
   - 修改 Content
   - 更新 SEO 信息
   - 保存成功

3. **公开访问测试**
   - 设置 is_public = true
   - 浏览器访问 /lp/:slug
   - 验证内容正确显示

4. **缓存验证**
   - 首次访问（X-Cache: MISS）
   - 再次访问（X-Cache: HIT）

5. **列表操作**
   - 搜索
   - 排序
   - 分页
   - 批量操作

---

## 📋 Task 5.4: 部署验证

### 部署步骤
1. 前端构建
   ```bash
   cd frontend && npm run build
   ```

2. 部署 Worker
   ```bash
   wrangler deploy
   ```

3. 浏览器回归测试
   - 管理界面访问
   - CRUD 操作
   - 公开页面访问
   - 性能验证

### 验收标准
- ✅ 前端管理界面正常工作
- ✅ 所有 CRUD 操作成功
- ✅ 公开页面正确显示
- ✅ 缓存系统正常
- ✅ 布局交互与原系统一致
- ✅ 响应式设计正常

---

## 🚀 立即开始

**第一步**: 检查 Landings.tsx 当前实现
**第二步**: 更新以支持新字段
**第三步**: 本地测试验证
**第四步**: 部署并浏览器验证

**预计完成时间**: 4-6 小时
