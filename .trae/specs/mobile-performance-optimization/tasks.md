# Tasks

- [x] Task 1: 添加 Table 横向滚动渐变阴影提示
  - [x] SubTask 1.1: 在 index.css 中添加滚动容器样式和渐变阴影伪元素
  - [x] SubTask 1.2: 添加 JavaScript 滚动监听逻辑（动态显示/隐藏阴影）
  - [x] SubTask 1.3: 添加首次访问手势提示动画（可选）
  - [x] SubTask 1.4: 测试验证（桌面端和移动端）

- [x] Task 2: 优化移动端图表显示（Trends 页面简化）
  - [x] SubTask 2.1: 在 Trends.tsx 中添加媒体查询检测移动端
  - [x] SubTask 2.2: 实现图表 Tab 切换组件
  - [x] SubTask 2.3: 添加 Tab 切换样式
  - [x] SubTask 2.4: 测试验证（移动端图表切换流畅性）

- [x] Task 3: 增加可点击区域到≥44px
  - [x] SubTask 3.1: 在 index.css 中添加全局最小点击区域样式
  - [x] SubTask 3.2: 调整图标按钮 padding
  - [x] SubTask 3.3: 调整表格操作按钮样式
  - [x] SubTask 3.4: 测试验证（测量所有按钮尺寸）

- [x] Task 4: 优化移动端表格字体大小
  - [x] SubTask 4.1: 在 index.css 中添加移动端表格字体样式
  - [x] SubTask 4.2: 测试验证（检查所有页面表格字体）

- [x] Task 5: 性能深度优化
  - [x] SubTask 5.1: 配置 Vite 代码分割优化
  - [x] SubTask 5.2: 添加图片懒加载
  - [x] SubTask 5.3: 测试验证（Lighthouse 性能测试）

- [x] Task 6: 全面测试与验证
  - [x] SubTask 6.1: 桌面端 vs 移动端对比测试
  - [x] SubTask 6.2: Lighthouse 性能测试
  - [x] SubTask 6.3: 手动测试清单验证

# Task Dependencies

- Task 2 依赖于 Task 1（先完成基础样式优化）
- Task 3 和 Task 4 可并行
- Task 5 依赖于 Task 1-4（基础优化完成后进行深度优化）
- Task 6 依赖于所有开发任务
