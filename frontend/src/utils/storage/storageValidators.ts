/**
 * File: storageValidators.ts
 * Purpose: 数据验证器集合，确保存储数据的完整性和有效性
 * Input/Output: 验证存储数据，返回验证结果
 * Logic: 为不同类型的用户偏好数据提供验证逻辑
 */

import { ValidationResult } from './StorageManager';

// ==================== 验证器工厂 ====================

export class Validators {
  // 主题验证
  static theme(value: any): ValidationResult<'light' | 'dark' | 'auto'> {
    const validThemes = ['light', 'dark', 'auto'];
    
    if (typeof value !== 'string') {
      return {
        valid: false,
        errors: ['Theme must be a string'],
      };
    }
    
    if (!validThemes.includes(value)) {
      return {
        valid: false,
        errors: [`Theme must be one of: ${validThemes.join(', ')}`],
      };
    }
    
    return {
      valid: true,
      data: value as 'light' | 'dark' | 'auto',
      errors: [],
    };
  }

  // 密度验证
  static density(value: any): ValidationResult<'compact' | 'standard' | 'loose'> {
    const validDensities = ['compact', 'standard', 'loose'];
    
    if (typeof value !== 'string') {
      return {
        valid: false,
        errors: ['Density must be a string'],
      };
    }
    
    if (!validDensities.includes(value)) {
      return {
        valid: false,
        errors: [`Density must be one of: ${validDensities.join(', ')}`],
      };
    }
    
    return {
      valid: true,
      data: value as 'compact' | 'standard' | 'loose',
      errors: [],
    };
  }

  // 字体大小验证
  static fontSize(value: any): ValidationResult<'small' | 'medium' | 'large'> {
    const validSizes = ['small', 'medium', 'large'];
    
    if (typeof value !== 'string') {
      return {
        valid: false,
        errors: ['Font size must be a string'],
      };
    }
    
    if (!validSizes.includes(value)) {
      return {
        valid: false,
        errors: [`Font size must be one of: ${validSizes.join(', ')}`],
      };
    }
    
    return {
      valid: true,
      data: value as 'small' | 'medium' | 'large',
      errors: [],
    };
  }

  // 表格配置验证
  static tableConfig(value: any): ValidationResult<any> {
    const errors: string[] = [];

    if (!value || typeof value !== 'object') {
      return {
        valid: false,
        errors: ['Table config must be an object'],
      };
    }

    // 验证 columns
    if (value.columns) {
      if (typeof value.columns !== 'object') {
        errors.push('columns must be an object');
      } else {
        if (!Array.isArray(value.columns.visible)) {
          errors.push('columns.visible must be an array');
        }
        if (!Array.isArray(value.columns.order)) {
          errors.push('columns.order must be an array');
        }
        if (typeof value.columns.widths !== 'object') {
          errors.push('columns.widths must be an object');
        }
      }
    }

    // 验证 sorting
    if (value.sorting !== null && typeof value.sorting !== 'undefined') {
      if (typeof value.sorting !== 'object') {
        errors.push('sorting must be an object or null');
      } else {
        if (typeof value.sorting.column !== 'string') {
          errors.push('sorting.column must be a string');
        }
        if (!['asc', 'desc', null].includes(value.sorting.direction)) {
          errors.push('sorting.direction must be "asc", "desc", or null');
        }
      }
    }

    // 验证 pagination
    if (value.pagination) {
      if (typeof value.pagination !== 'object') {
        errors.push('pagination must be an object');
      } else {
        if (typeof value.pagination.pageSize !== 'number' || value.pagination.pageSize < 1) {
          errors.push('pagination.pageSize must be a positive number');
        }
        if (typeof value.pagination.currentPage !== 'number' || value.pagination.currentPage < 1) {
          errors.push('pagination.currentPage must be a positive number');
        }
      }
    }

    return {
      valid: errors.length === 0,
      data: value,
      errors,
    };
  }

  // 时区验证
  static timezone(value: any): ValidationResult<string> {
    if (typeof value !== 'string') {
      return {
        valid: false,
        errors: ['Timezone must be a string'],
      };
    }

    // 简单验证时区格式
    const timezoneRegex = /^[A-Za-z0-9_+-]+\/[A-Za-z0-9_+-]+$/;
    if (!timezoneRegex.test(value) && value !== 'UTC') {
      return {
        valid: false,
        errors: ['Invalid timezone format'],
      };
    }

    return {
      valid: true,
      data: value,
      errors: [],
    };
  }

  // 语言验证
  static language(value: any): ValidationResult<string> {
    const validLanguages = ['en', 'zh', 'ru', 'es', 'fr', 'de', 'ja', 'ko'];
    
    if (typeof value !== 'string') {
      return {
        valid: false,
        errors: ['Language must be a string'],
      };
    }
    
    if (!validLanguages.includes(value)) {
      return {
        valid: false,
        errors: [`Language must be one of: ${validLanguages.join(', ')}`],
      };
    }
    
    return {
      valid: true,
      data: value,
      errors: [],
    };
  }

  // 刷新间隔验证
  static refreshInterval(value: any): ValidationResult<number> {
    if (typeof value !== 'number') {
      return {
        valid: false,
        errors: ['Refresh interval must be a number'],
      };
    }
    
    if (value < 5000 || value > 300000) {
      return {
        valid: false,
        errors: ['Refresh interval must be between 5000 and 300000 milliseconds'],
      };
    }
    
    return {
      valid: true,
      data: value,
      errors: [],
    };
  }

  // 日期格式验证
  static dateFormat(value: any): ValidationResult<string> {
    const validFormats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD'];
    
    if (typeof value !== 'string') {
      return {
        valid: false,
        errors: ['Date format must be a string'],
      };
    }
    
    if (!validFormats.includes(value)) {
      return {
        valid: false,
        errors: [`Date format must be one of: ${validFormats.join(', ')}`],
      };
    }
    
    return {
      valid: true,
      data: value,
      errors: [],
    };
  }

  // 视图配置验证
  static viewConfig(value: any): ValidationResult<any> {
    const errors: string[] = [];

    if (!value || typeof value !== 'object') {
      return {
        valid: false,
        errors: ['View config must be an object'],
      };
    }

    // 验证 timeRange
    if (value.timeRange) {
      if (typeof value.timeRange !== 'object') {
        errors.push('timeRange must be an object');
      } else {
        if (typeof value.timeRange.interval !== 'string') {
          errors.push('timeRange.interval must be a string');
        }
        if (value.timeRange.from && typeof value.timeRange.from !== 'string') {
          errors.push('timeRange.from must be a string or undefined');
        }
        if (value.timeRange.to && typeof value.timeRange.to !== 'string') {
          errors.push('timeRange.to must be a string or undefined');
        }
      }
    }

    // 验证 metrics
    if (value.metrics && !Array.isArray(value.metrics)) {
      errors.push('metrics must be an array');
    }

    // 验证 entities
    if (value.entities && !Array.isArray(value.entities)) {
      errors.push('entities must be an array');
    }

    return {
      valid: errors.length === 0,
      data: value,
      errors,
    };
  }
}

// ==================== 注册验证器到 StorageManager ====================

import { storageManager } from './StorageManager';

export function registerAllValidators(): void {
  // 主题验证
  storageManager.registerValidator('cf:v1:pref:user:theme', Validators.theme);
  
  // 密度验证
  storageManager.registerValidator('cf:v1:pref:user:density', Validators.density);
  
  // 字体大小验证
  storageManager.registerValidator('cf:v1:pref:user:fontSize', Validators.fontSize);
  
  // 表格配置验证
  storageManager.registerValidator('cf:v1:pref:user:tableConfigs', Validators.tableConfig);
  
  // 时区验证
  storageManager.registerValidator('cf:v1:pref:user:timezone', Validators.timezone);
  
  // 语言验证
  storageManager.registerValidator('cf:v1:pref:user:language', Validators.language);
  
  // 刷新间隔验证
  storageManager.registerValidator('cf:v1:pref:user:refreshInterval', Validators.refreshInterval);
  
  // 日期格式验证
  storageManager.registerValidator('cf:v1:pref:user:dateFormat', Validators.dateFormat);
  
  // 视图配置验证
  storageManager.registerValidator('cf:v1:pref:user:viewConfigs', Validators.viewConfig);
}

// ==================== 自动注册 ====================

// 在模块加载时自动注册所有验证器
if (typeof window !== 'undefined') {
  registerAllValidators();
}

export default Validators;
