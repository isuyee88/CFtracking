# Campaign URL自动生成 Spec

## Why
当前CFTracking的Campaign URL需要手动拼接，用户体验不佳。需要实现自动生成追踪链接功能，让用户可以一键复制正确的追踪URL。

## What Changes
- 后端：生成带追踪参数的完整URL
- 前端：在CampaignForm中添加URL预览组件
- 支持一键复制到剪贴板
- 支持自定义参数前缀

## Impact
- Affected code:
  - src/services/campaign/campaign.service.ts
  - frontend/src/components/CampaignForm.tsx
  - frontend/src/components/UrlPreview.tsx

## Technical Notes

### URL格式
```
https://{domain}/{campaignAlias}?sub1={value}&click_id={click_id}
```

### 数据流
1. 用户配置Campaign（选择domain、alias、设置参数）
2. 前端实时预览生成的URL
3. 用户点击复制，URL写入剪贴板
4. 点击追踪时，URL参数被正确解析和传递

### 参数映射
| 参数 | 说明 | 示例 |
|------|------|------|
| click_id | 点击ID | clk_123456 |
| sub1-sub5 | 自定义子ID | utm_source |
| {offer_id} | Offer ID | 123 |
| {flow_id} | Flow ID | 456 |
