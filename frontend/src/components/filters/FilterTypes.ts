/**
 * File: FilterTypes.ts
 * Purpose: 过滤器类型定义
 * Input/Output: 定义Filter相关的接口和类型
 * Logic: 参考Keitaro的过滤功能，支持多种过滤条件和操作符
 */

// 过滤条件操作符
export type FilterOperator = 
  | 'equals'           // 等于
  | 'not_equals'       // 不等于
  | 'contains'         // 包含
  | 'not_contains'     // 不包含
  | 'starts_with'      // 以...开头
  | 'ends_with'        // 以...结尾
  | 'regex_match'      // 匹配正则
  | 'regex_not_match'  // 不匹配正则
  | 'in_list'          // 在列表中
  | 'not_in_list'      // 不在列表中
  | 'less_than'        // 小于
  | 'greater_than'     // 大于
  | 'between'          // 在...之间
  | 'empty'            // 为空
  | 'not_empty';       // 不为空

// 逻辑关系
export type FilterLogic = 'AND' | 'OR';

// 过滤器类型分类
export type FilterCategory = 'geo' | 'device' | 'network' | 'traffic' | 'time' | 'custom' | 'conversion';

// 过滤器定义
export interface FilterDefinition {
  value: string;
  label: string;
  category: FilterCategory;
  operators: FilterOperator[];
  placeholder?: string;
  description?: string;
  allowMultiple?: boolean;
}

// 单个过滤器条件
export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string | string[];
  logic?: FilterLogic; // 与前一个条件的逻辑关系（第一个条件忽略）
}

// 过滤器组
export interface FilterGroup {
  id: string;
  name: string;
  logic: FilterLogic;
  conditions: FilterCondition[];
}

// 过滤器配置
export interface FilterConfig {
  groups: FilterGroup[];
  globalLogic: FilterLogic;
}

// 操作符配置
export interface OperatorConfig {
  value: FilterOperator;
  label: string;
  description: string;
  needsValue: boolean;
  allowMultiple: boolean;
}

// 过滤结果
export interface FilterResult<T = any> {
  data: T[];
  totalCount: number;
  filteredCount: number;
  appliedFilters: number;
}

// 预定义的过滤器字段
export const FILTER_FIELDS: FilterDefinition[] = [
  // Geo 地理
  { value: 'country', label: 'Country', category: 'geo', operators: ['equals', 'not_equals', 'in_list', 'not_in_list', 'empty', 'not_empty'], placeholder: 'US, UK, CA...' },
  { value: 'region', label: 'Region/State', category: 'geo', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'empty', 'not_empty'] },
  { value: 'city', label: 'City', category: 'geo', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'empty', 'not_empty'] },
  { value: 'isp', label: 'ISP', category: 'network', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'regex_match', 'regex_not_match', 'empty', 'not_empty'] },
  
  // Device 设备
  { value: 'device_type', label: 'Device Type', category: 'device', operators: ['equals', 'not_equals', 'in_list', 'not_in_list'], placeholder: 'mobile, desktop, tablet' },
  { value: 'os', label: 'Operating System', category: 'device', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'regex_match', 'regex_not_match'] },
  { value: 'browser', label: 'Browser', category: 'device', operators: ['equals', 'not_equals', 'contains', 'not_contains'] },
  { value: 'device_model', label: 'Device Model', category: 'device', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'empty', 'not_empty'] },
  
  // Network 网络
  { value: 'ip', label: 'IP Address', category: 'network', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex_match', 'in_list'], placeholder: '192.168.1.1 or 192.168.0.0/24' },
  { value: 'user_agent', label: 'User Agent', category: 'network', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex_match', 'regex_not_match'], placeholder: 'Mozilla/5.0...' },
  { value: 'connection_type', label: 'Connection Type', category: 'network', operators: ['equals', 'not_equals', 'in_list'], placeholder: 'wifi, cellular, broadband' },
  
  // Traffic 流量
  { value: 'source', label: 'Traffic Source', category: 'traffic', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'in_list', 'not_in_list'] },
  { value: 'campaign', label: 'Campaign', category: 'traffic', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'in_list'] },
  { value: 'referrer', label: 'Referrer', category: 'traffic', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'regex_match', 'empty', 'not_empty'] },
  { value: 'sub_id_1', label: 'Sub ID 1', category: 'traffic', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'empty', 'not_empty'] },
  { value: 'sub_id_2', label: 'Sub ID 2', category: 'traffic', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'empty', 'not_empty'] },
  { value: 'sub_id_3', label: 'Sub ID 3', category: 'traffic', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'empty', 'not_empty'] },
  { value: 'sub_id_4', label: 'Sub ID 4', category: 'traffic', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'empty', 'not_empty'] },
  { value: 'sub_id_5', label: 'Sub ID 5', category: 'traffic', operators: ['equals', 'not_equals', 'contains', 'not_contains', 'empty', 'not_empty'] },
  
  // Time 时间
  { value: 'hour', label: 'Hour of Day', category: 'time', operators: ['equals', 'not_equals', 'less_than', 'greater_than', 'between'], placeholder: '0-23' },
  { value: 'day_of_week', label: 'Day of Week', category: 'time', operators: ['equals', 'not_equals', 'in_list'], placeholder: 'Mon, Tue, Wed...' },
  { value: 'date', label: 'Date', category: 'time', operators: ['equals', 'not_equals', 'less_than', 'greater_than', 'between'] },
  
  // Conversion 转化
  { value: 'conversion_status', label: 'Conversion Status', category: 'conversion', operators: ['equals', 'not_equals'], placeholder: 'converted, not_converted' },
  { value: 'revenue', label: 'Revenue', category: 'conversion', operators: ['equals', 'not_equals', 'less_than', 'greater_than', 'between'] },
  { value: 'payout', label: 'Payout', category: 'conversion', operators: ['equals', 'not_equals', 'less_than', 'greater_than', 'between'] },
];

// 操作符配置
export const OPERATOR_CONFIG: Record<FilterOperator, OperatorConfig> = {
  equals: { value: 'equals', label: 'Equals', description: 'Exact match', needsValue: true, allowMultiple: false },
  not_equals: { value: 'not_equals', label: 'Not Equals', description: 'Not exact match', needsValue: true, allowMultiple: false },
  contains: { value: 'contains', label: 'Contains', description: 'Contains substring', needsValue: true, allowMultiple: false },
  not_contains: { value: 'not_contains', label: 'Not Contains', description: 'Does not contain substring', needsValue: true, allowMultiple: false },
  starts_with: { value: 'starts_with', label: 'Starts With', description: 'Starts with value', needsValue: true, allowMultiple: false },
  ends_with: { value: 'ends_with', label: 'Ends With', description: 'Ends with value', needsValue: true, allowMultiple: false },
  regex_match: { value: 'regex_match', label: 'Match Regexp', description: 'Matches regular expression', needsValue: true, allowMultiple: false },
  regex_not_match: { value: 'regex_not_match', label: 'No Match Regexp', description: 'Does not match regular expression', needsValue: true, allowMultiple: false },
  in_list: { value: 'in_list', label: 'In List', description: 'Value is in list', needsValue: true, allowMultiple: true },
  not_in_list: { value: 'not_in_list', label: 'Not In List', description: 'Value is not in list', needsValue: true, allowMultiple: true },
  less_than: { value: 'less_than', label: 'Less Than', description: 'Less than value', needsValue: true, allowMultiple: false },
  greater_than: { value: 'greater_than', label: 'Greater Than', description: 'Greater than value', needsValue: true, allowMultiple: false },
  between: { value: 'between', label: 'Between', description: 'Between two values', needsValue: true, allowMultiple: true },
  empty: { value: 'empty', label: 'Is Empty', description: 'Value is empty', needsValue: false, allowMultiple: false },
  not_empty: { value: 'not_empty', label: 'Is Not Empty', description: 'Value is not empty', needsValue: false, allowMultiple: false },
};

// 按分类组织过滤器
export const FILTER_CATEGORIES: { value: FilterCategory; label: string }[] = [
  { value: 'geo', label: 'Geographic' },
  { value: 'device', label: 'Device' },
  { value: 'network', label: 'Network' },
  { value: 'traffic', label: 'Traffic' },
  { value: 'time', label: 'Time' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'custom', label: 'Custom' },
];
