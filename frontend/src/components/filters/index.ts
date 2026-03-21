/**
 * File: index.ts
 * Purpose: Filter组件库导出
 * Input/Output: 统一导出所有Filter相关组件和工具
 * Logic: 提供完整的过滤器功能模块
 */

// 类型定义
export type {
  FilterOperator,
  FilterLogic,
  FilterCategory,
  FilterDefinition,
  FilterCondition,
  FilterGroup,
  FilterConfig,
  OperatorConfig,
  FilterResult,
} from './FilterTypes';

// 常量
export {
  FILTER_FIELDS,
  OPERATOR_CONFIG,
  FILTER_CATEGORIES,
} from './FilterTypes';

// 组件
export { FilterBuilder } from './FilterBuilder';

// 引擎
export { 
  FilterEngine,
  createFilterEngine,
  validateCondition,
  formatFilterDescription,
} from './FilterEngine';
