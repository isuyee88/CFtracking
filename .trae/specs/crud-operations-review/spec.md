# CRUD Operations Review Spec

## Why
用户报告各页面的批量操作（删除、暂停、激活) 按钮可能存在响应问题，需要全面评审以确保数据一致性。

## What Changes
- 修复 CampaignManagement 页面的批量操作功能（之前只打印日志，没有实际 API 调用)
- 评审 Offers、 Landings, TrafficSources, AffiliateNetworks 页面的批量操作功能（确保 API 调用正确)
- 添加 Toast 提示反馈

## Impact
- Affected specs: 所有管理页面的 CRUD 操作
- Affected code: 
  - `frontend/src/pages/CampaignManagement.tsx`
  - `frontend/src/pages/Offers.tsx`
  - `frontend/src/pages/Landings.tsx`
  - `frontend/src/pages/TrafficSources.tsx`
  - `frontend/src/pages/AffiliateNetworks.tsx`
  - `frontend/src/services/api.ts` (API 函数)

## ADDED Requirements
### Requirement: Bulk Operations
The system SHALL provide bulk operations for activate, pause, and delete multiple items at When user selects items and clicks action buttons

#### Scenario: Bulk activate
- **WHEN** user selects multiple campaigns and clicks "Activate"
- **THEN** all selected campaigns' status changes to "active"
- **AND** toast notification shows success message

#### Scenario: Bulk pause
- **WHEN** user selects several campaigns and clicks "Pause"
- **THEN** all selected campaigns' status changes to "paused"
- **AND** toast notification shows success message

#### Scenario: Bulk delete
- **WHEN** user selects several campaigns and clicks "Delete"
- **THEN** confirmation dialog appears
- **AND** after deletion, the selected items are removed from the list
- **AND** toast notification shows success message

#### Scenario: Empty selection
- **WHEN** user clicks action button with nothing selected
- **THEN** warning message appears

#### Scenario: API Error Handling
- **WHEN** API call fails during bulk operation
- **THEN** error message is displayed to the user

