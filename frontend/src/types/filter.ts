/**
 * File: filter.ts
 * Purpose: Filter组件类型定义
 * Input/Output: 定义过滤器相关的所有类型接口
 * Logic: 参考Keitaro过滤系统，支持多种过滤条件和逻辑关系
 */

/**
 * 过滤器逻辑关系
 * AND: 所有条件都必须满足
 * OR: 任一条件满足即可
 */
export type FilterLogic = 'AND' | 'OR';

/**
 * 过滤条件类型
 * IS: 允许匹配此条件的流量
 * IS NOT: 阻止匹配此条件的流量
 */
export type FilterConditionType = 'IS' | 'IS_NOT';

/**
 * 过滤器操作符
 */
export type FilterOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'in_list'
  | 'not_in_list'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'empty'
  | 'not_empty';

/**
 * 过滤器类型分类
 */
export type FilterCategory = 'geo' | 'device' | 'network' | 'traffic' | 'time' | 'custom' | 'campaign' | 'financial';

/**
 * 过滤器类型
 */
export type FilterType = 
  | 'country'
  | 'region'
  | 'city'
  | 'isp'
  | 'connection_type'
  | 'device_type'
  | 'os'
  | 'os_version'
  | 'browser'
  | 'browser_version'
  | 'device_model'
  | 'device_brand'
  | 'screen_resolution'
  | 'ip'
  | 'ip_range'
  | 'vpn'
  | 'proxy'
  | 'datacenter'
  | 'referrer'
  | 'user_agent'
  | 'source'
  | 'medium'
  | 'campaign'
  | 'sub_id'
  | 'keyword'
  | 'parameter'
  | 'day_of_week'
  | 'time_of_day'
  | 'date_range'
  | 'click_count'
  | 'conversion_count'
  | 'custom_parameter'
  | 'status'
  | 'type'
  | 'offer'
  | 'stream'
  | 'landing'
  | 'affiliate_network'
  | 'traffic_source';

/**
 * 过滤器定义
 */
export interface FilterDefinition {
  id: string;
  type: FilterType;
  category: FilterCategory;
  label: string;
  description?: string;
  operators: FilterOperator[];
  valueType: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'boolean';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

/**
 * Group By 选项定义
 */
export interface GroupByOption {
  value: string;
  label: string;
  category: string;
}

/**
 * Group By 配置
 */
export interface GroupByConfig {
  key: string;
  label: string;
  options: GroupByOption[];
  maxLevels?: number;
}

/**
 * Group By 值状态
 */
export interface GroupByState {
  field: string;
  value: string;
}
