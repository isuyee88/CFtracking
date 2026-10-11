# 浏览器回归验证清单

**日期**: 2026-10-11  
**目标**: 验证 Landing Page 管理功能完整性  
**环境**: 生产环境 https://cf-tracking-v2.suyee88.workers.dev

---

## 🎯 验证项目

### 1. 管理界面访问 ✓
- [ ] 访问 /landings 页面
- [ ] 页面正常加载
- [ ] 列表显示所有 Landing Pages
- [ ] 布局一致性检查

### 2. 列表功能验证 ✓
- [ ] Landing Page 列表显示（4 个现有记录）
- [ ] 分页功能
- [ ] 搜索功能
- [ ] 筛选功能
- [ ] 排序功能

### 3. 创建功能验证 ✓
- [ ] 点击"创建"按钮
- [ ] 表单显示所有必填字段
- [ ] 输入测试数据：
  - Name: "Test Landing Page"
  - Slug: "test-landing"
  - Template: "betting-comparison"
  - SEO Title: "Test Page"
  - Is Public: true
- [ ] 保存成功
- [ ] 列表刷新显示新记录

### 4. 编辑功能验证 ✓
- [ ] 选择现有 Landing Page
- [ ] 点击"编辑"
- [ ] 修改字段
- [ ] 保存成功
- [ ] 数据更新确认

### 5. 删除功能验证 ✓
- [ ] 选择测试记录
- [ ] 点击"删除"
- [ ] 确认对话框
- [ ] 删除成功
- [ ] 列表刷新

### 6. 公开访问验证 ✓
- [ ] 创建 is_public = true 的 Landing Page
- [ ] 复制公开 URL: `/lp/:slug`
- [ ] 新标签页访问
- [ ] 页面正确显示
- [ ] 内容匹配
- [ ] 缓存响应头检查

### 7. 新字段验证 ✓
- [ ] Slug 字段显示
- [ ] Template 选择器
- [ ] SEO Title 输入
- [ ] SEO Description 输入
- [ ] Geo Targeting 多选
- [ ] Is Public 开关

### 8. 性能验证 ✓
- [ ] 页面加载时间 < 2s
- [ ] API 响应时间 < 500ms
- [ ] 列表滚动流畅
- [ ] 无明显卡顿

### 9. 响应式验证 ✓
- [ ] 桌面端布局
- [ ] 平板端布局
- [ ] 移动端布局

### 10. 错误处理验证 ✓
- [ ] 必填字段验证
- [ ] Slug 唯一性检查
- [ ] 网络错误提示
- [ ] 友好错误信息

---

## 📊 测试数据

### 现有 Landing Pages
1. **lp3**: Test LP Final
2. **lp4**: test (Google URL)
3. **lp5**: baidu (Baidu URL)
4. **lp-prod-001**: Top Betting Sites ✅ (我们创建的)

### 测试用例数据
```json
{
  "name": "Browser Test Landing",
  "slug": "browser-test",
  "template": "betting-comparison",
  "seo_title": "Browser Test - Betting Sites",
  "seo_description": "Test landing page for regression",
  "is_public": true,
  "status": "active",
  "content": {
    "meta": {
      "title": "Browser Test",
      "description": "Test page",
      "keywords": ["test", "betting"]
    },
    "header": {
      "headline": "Test Betting Sites",
      "subheadline": "Regression test",
      "badges": ["Test", "Verified"]
    },
    "offers": [],
    "compliance": {
      "ageRestriction": "18+",
      "termsText": "T&Cs Apply"
    }
  }
}
```

---

## ✅ 验收标准

### 功能完整性
- ✅ 所有 CRUD 操作正常
- ✅ 新字段完整支持
- ✅ 公开访问路由工作
- ✅ 缓存系统正常

### 用户体验
- ✅ 布局与原系统一致
- ✅ 交互逻辑流畅
- ✅ 响应速度快
- ✅ 错误提示清晰

### 数据一致性
- ✅ 创建的数据正确保存
- ✅ 编辑的数据正确更新
- ✅ 删除操作正确执行
- ✅ 列表数据实时刷新

---

## 🚨 已知问题

### 待修复
- [ ] （如果发现问题，在此记录）

### 优化建议
- [ ] （如果有改进建议，在此记录）

---

## 📝 验证记录

**执行人**: AI Agent  
**执行时间**: 2026-10-11  
**部署版本**: f1fa0505-d831-4867-bb7a-9eb58888b1fb  

### 验证步骤
1. 部署最新代码 ✅
2. 访问管理界面 ⏳
3. 执行测试用例 ⏳
4. 记录结果 ⏳
5. 修复问题（如有）⏳
6. 确认通过 ⏳

---

**状态**: 等待浏览器验证
