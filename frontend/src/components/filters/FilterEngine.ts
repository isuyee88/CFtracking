/**
 * File: FilterEngine.ts
 * Purpose: 过滤器引擎，实现数据过滤逻辑
 * Input/Output: 接收数据和过滤条件，返回过滤结果
 * Logic: 参考Keitaro的过滤功能，支持AND/OR逻辑、多种操作符
 */

import type {
  FilterCondition,
  FilterGroup,
  FilterConfig,
  FilterOperator,
  FilterLogic,
  FilterResult,
} from './FilterTypes';

/**
 * 过滤器引擎类
 */
export class FilterEngine<T extends Record<string, any>> {
  private data: T[];

  constructor(data: T[]) {
    this.data = data;
  }

  /**
   * 应用过滤器配置
   */
  apply(config: FilterConfig): FilterResult<T> {
    const totalCount = this.data.length;
    
    if (!config.groups || config.groups.length === 0) {
      return {
        data: this.data,
        totalCount,
        filteredCount: totalCount,
        appliedFilters: 0,
      };
    }

    const filteredData = this.data.filter(item => this.matchesConfig(item, config));
    
    return {
      data: filteredData,
      totalCount,
      filteredCount: filteredData.length,
      appliedFilters: this.countConditions(config),
    };
  }

  /**
   * 检查单个项目是否匹配过滤器配置
   */
  private matchesConfig(item: T, config: FilterConfig): boolean {
    if (!config.groups || config.groups.length === 0) {
      return true;
    }

    const groupResults = config.groups.map(group => this.matchesGroup(item, group));
    
    // 组之间的逻辑关系
    if (config.globalLogic === 'OR') {
      return groupResults.some(result => result);
    }
    return groupResults.every(result => result);
  }

  /**
   * 检查单个项目是否匹配过滤器组
   */
  private matchesGroup(item: T, group: FilterGroup): boolean {
    if (!group.conditions || group.conditions.length === 0) {
      return true;
    }

    let result = true;
    
    for (let i = 0; i < group.conditions.length; i++) {
      const condition = group.conditions[i];
      const conditionResult = this.matchesCondition(item, condition);
      
      if (i === 0) {
        result = conditionResult;
      } else {
        // 使用条件的逻辑关系
        const logic = condition.logic || group.logic;
        if (logic === 'OR') {
          result = result || conditionResult;
        } else {
          result = result && conditionResult;
        }
      }
    }

    return result;
  }

  /**
   * 检查单个项目是否匹配单个条件
   */
  private matchesCondition(item: T, condition: FilterCondition): boolean {
    const fieldValue = this.getFieldValue(item, condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return this.equals(fieldValue, conditionValue);
      case 'not_equals':
        return !this.equals(fieldValue, conditionValue);
      case 'contains':
        return this.contains(fieldValue, conditionValue);
      case 'not_contains':
        return !this.contains(fieldValue, conditionValue);
      case 'starts_with':
        return this.startsWith(fieldValue, conditionValue);
      case 'ends_with':
        return this.endsWith(fieldValue, conditionValue);
      case 'regex_match':
        return this.regexMatch(fieldValue, conditionValue);
      case 'regex_not_match':
        return !this.regexMatch(fieldValue, conditionValue);
      case 'in_list':
        return this.inList(fieldValue, conditionValue);
      case 'not_in_list':
        return !this.inList(fieldValue, conditionValue);
      case 'less_than':
        return this.lessThan(fieldValue, conditionValue);
      case 'greater_than':
        return this.greaterThan(fieldValue, conditionValue);
      case 'between':
        return this.between(fieldValue, conditionValue);
      case 'empty':
        return this.isEmpty(fieldValue);
      case 'not_empty':
        return !this.isEmpty(fieldValue);
      default:
        return true;
    }
  }

  /**
   * 获取字段值（支持嵌套路径）
   */
  private getFieldValue(item: T, field: string): any {
    const parts = field.split('.');
    let value: any = item;
    
    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }
    
    return value;
  }

  /**
   * 等于比较
   */
  private equals(fieldValue: any, conditionValue: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return conditionValue === null || conditionValue === undefined;
    }
    return String(fieldValue).toLowerCase() === String(conditionValue).toLowerCase();
  }

  /**
   * 包含检查
   */
  private contains(fieldValue: any, conditionValue: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
  }

  /**
   * 以...开头
   */
  private startsWith(fieldValue: any, conditionValue: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    return String(fieldValue).toLowerCase().startsWith(String(conditionValue).toLowerCase());
  }

  /**
   * 以...结尾
   */
  private endsWith(fieldValue: any, conditionValue: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    return String(fieldValue).toLowerCase().endsWith(String(conditionValue).toLowerCase());
  }

  /**
   * 正则匹配
   */
  private regexMatch(fieldValue: any, pattern: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    try {
      const regex = new RegExp(String(pattern), 'i');
      return regex.test(String(fieldValue));
    } catch {
      return false;
    }
  }

  /**
   * 在列表中
   */
  private inList(fieldValue: any, listValue: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    
    const list = Array.isArray(listValue) 
      ? listValue 
      : String(listValue).split(',').map(s => s.trim());
    
    const fieldStr = String(fieldValue).toLowerCase();
    return list.some(item => String(item).toLowerCase() === fieldStr);
  }

  /**
   * 小于
   */
  private lessThan(fieldValue: any, conditionValue: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    const num1 = parseFloat(String(fieldValue));
    const num2 = parseFloat(String(conditionValue));
    if (isNaN(num1) || isNaN(num2)) {
      return String(fieldValue) < String(conditionValue);
    }
    return num1 < num2;
  }

  /**
   * 大于
   */
  private greaterThan(fieldValue: any, conditionValue: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    const num1 = parseFloat(String(fieldValue));
    const num2 = parseFloat(String(conditionValue));
    if (isNaN(num1) || isNaN(num2)) {
      return String(fieldValue) > String(conditionValue);
    }
    return num1 > num2;
  }

  /**
   * 在...之间
   */
  private between(fieldValue: any, rangeValue: any): boolean {
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }
    
    const range = Array.isArray(rangeValue) 
      ? rangeValue 
      : String(rangeValue).split(',').map(s => s.trim());
    
    if (range.length < 2) {
      return false;
    }
    
    const numValue = parseFloat(String(fieldValue));
    const min = parseFloat(String(range[0]));
    const max = parseFloat(String(range[1]));
    
    if (isNaN(numValue) || isNaN(min) || isNaN(max)) {
      const strValue = String(fieldValue);
      return strValue >= String(range[0]) && strValue <= String(range[1]);
    }
    
    return numValue >= min && numValue <= max;
  }

  /**
   * 是否为空
   */
  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return false;
  }

  /**
   * 统计条件数量
   */
  private countConditions(config: FilterConfig): number {
    return config.groups.reduce((total, group) => total + (group.conditions?.length || 0), 0);
  }
}

/**
 * 创建过滤器引擎实例
 */
export function createFilterEngine<T extends Record<string, any>>(data: T[]): FilterEngine<T> {
  return new FilterEngine(data);
}

/**
 * 验证过滤器条件
 */
export function validateCondition(condition: FilterCondition): { valid: boolean; error?: string } {
  if (!condition.field) {
    return { valid: false, error: 'Field is required' };
  }
  if (!condition.operator) {
    return { valid: false, error: 'Operator is required' };
  }
  
  // 检查是否需要值
  const needsValue = !['empty', 'not_empty'].includes(condition.operator);
  if (needsValue && (condition.value === undefined || condition.value === null || condition.value === '')) {
    return { valid: false, error: 'Value is required for this operator' };
  }
  
  // 验证正则表达式
  if (condition.operator === 'regex_match' || condition.operator === 'regex_not_match') {
    try {
      new RegExp(String(condition.value));
    } catch {
      return { valid: false, error: 'Invalid regular expression' };
    }
  }
  
  return { valid: true };
}

/**
 * 格式化过滤器为可读文本
 */
export function formatFilterDescription(condition: FilterCondition): string {
  const operatorLabels: Record<string, string> = {
    equals: '=',
    not_equals: '≠',
    contains: 'contains',
    not_contains: 'not contains',
    starts_with: 'starts with',
    ends_with: 'ends with',
    regex_match: 'matches',
    regex_not_match: 'not matches',
    in_list: 'in',
    not_in_list: 'not in',
    less_than: '<',
    greater_than: '>',
    between: 'between',
    empty: 'is empty',
    not_empty: 'is not empty',
  };
  
  const op = operatorLabels[condition.operator] || condition.operator;
  const value = Array.isArray(condition.value) 
    ? condition.value.join(', ') 
    : condition.value;
  
  if (condition.operator === 'empty' || condition.operator === 'not_empty') {
    return `${condition.field} ${op}`;
  }
  
  return `${condition.field} ${op} "${value}"`;
}
