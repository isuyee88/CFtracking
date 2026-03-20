/**
 * @fileoverview Flow 过滤器函数库
 * @description 提供所有过滤器操作符的实现函数
 * @module utils/flow.filters
 * @input 过滤器配置和上下文值
 * @output 布尔值表示是否匹配
 * @logic 根据操作符类型执行相应的比较逻辑
 * @frontend 无
 * @backend FlowValidator 使用
 */

import type { FilterOperator, FilterTarget, ValidationContext } from '@/types/flow.schema';

/**
 * 从上下文中获取目标字段值
 * @param target - 目标字段路径
 * @param context - 验证上下文
 * @returns 字段值
 */
export function getContextValue(target: FilterTarget, context: ValidationContext): unknown {
  const [category, field] = target.split('.') as [keyof ValidationContext, string];

  if (category === 'visitor') {
    return context.visitor[field as keyof typeof context.visitor];
  }

  if (category === 'visit') {
    return context.visit[field as keyof typeof context.visit];
  }

  return undefined;
}

/**
 * 过滤器函数签名类型
 */
export type FilterFunction = (
  contextValue: unknown,
  filterValue: unknown,
  context?: ValidationContext
) => boolean;

/**
 * 过滤器函数映射表
 */
export const filterFunctions: Record<FilterOperator, FilterFunction> = {
  /**
   * 等于 - 严格相等比较
   */
  equals: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return filterValue === undefined || filterValue === null;
    }
    return contextValue === filterValue;
  },

  /**
   * 不等于
   */
  notEquals: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return filterValue !== undefined && filterValue !== null;
    }
    return contextValue !== filterValue;
  },

  /**
   * 包含 - 字符串包含或数组包含
   */
  contains: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    const strValue = String(contextValue).toLowerCase();
    const strFilter = String(filterValue).toLowerCase();

    return strValue.includes(strFilter);
  },

  /**
   * 不包含
   */
  notContains: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return true;
    }

    const strValue = String(contextValue).toLowerCase();
    const strFilter = String(filterValue).toLowerCase();

    return !strValue.includes(strFilter);
  },

  /**
   * 以...开头
   */
  startsWith: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    const strValue = String(contextValue).toLowerCase();
    const strFilter = String(filterValue).toLowerCase();

    return strValue.startsWith(strFilter);
  },

  /**
   * 以...结尾
   */
  endsWith: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    const strValue = String(contextValue).toLowerCase();
    const strFilter = String(filterValue).toLowerCase();

    return strValue.endsWith(strFilter);
  },

  /**
   * 正则匹配
   * @description 支持超时保护的正则匹配，防止 ReDoS 攻击
   */
  regex: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    try {
      const pattern = new RegExp(String(filterValue), 'i');
      const strValue = String(contextValue);
      
      // 使用超时保护执行正则
      return executeRegexWithTimeout(pattern, strValue, 100); // 100ms 超时
    } catch {
      return false;
    }
  },

  /**
   * 在列表中
   */
  in: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    const values = Array.isArray(filterValue) ? filterValue : [filterValue];
    const strContextValue = String(contextValue).toLowerCase();

    return values.some(v => String(v).toLowerCase() === strContextValue);
  },

  /**
   * 不在列表中
   */
  notIn: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return true;
    }

    const values = Array.isArray(filterValue) ? filterValue : [filterValue];
    const strContextValue = String(contextValue).toLowerCase();

    return !values.some(v => String(v).toLowerCase() === strContextValue);
  },

  /**
   * 大于
   */
  greaterThan: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    const numContext = Number(contextValue);
    const numFilter = Number(filterValue);

    if (isNaN(numContext) || isNaN(numFilter)) {
      return String(contextValue) > String(filterValue);
    }

    return numContext > numFilter;
  },

  /**
   * 小于
   */
  lessThan: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    const numContext = Number(contextValue);
    const numFilter = Number(filterValue);

    if (isNaN(numContext) || isNaN(numFilter)) {
      return String(contextValue) < String(filterValue);
    }

    return numContext < numFilter;
  },

  /**
   * 大于等于
   */
  greaterOrEquals: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    const numContext = Number(contextValue);
    const numFilter = Number(filterValue);

    if (isNaN(numContext) || isNaN(numFilter)) {
      return String(contextValue) >= String(filterValue);
    }

    return numContext >= numFilter;
  },

  /**
   * 小于等于
   */
  lessOrEquals: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    const numContext = Number(contextValue);
    const numFilter = Number(filterValue);

    if (isNaN(numContext) || isNaN(numFilter)) {
      return String(contextValue) <= String(filterValue);
    }

    return numContext <= numFilter;
  },

  /**
   * 在范围内 [min, max]
   */
  between: (contextValue, filterValue): boolean => {
    if (contextValue === undefined || contextValue === null) {
      return false;
    }

    const numContext = Number(contextValue);

    if (isNaN(numContext)) {
      return false;
    }

    let min: number, max: number;

    if (Array.isArray(filterValue) && filterValue.length >= 2) {
      min = Number(filterValue[0]);
      max = Number(filterValue[1]);
    } else if (typeof filterValue === 'string' && filterValue.includes(',')) {
      const parts = filterValue.split(',');
      min = Number(parts[0]);
      max = Number(parts[1]);
    } else {
      return false;
    }

    if (isNaN(min) || isNaN(max)) {
      return false;
    }

    return numContext >= min && numContext <= max;
  },

  /**
   * 存在 - 值不为 undefined 和 null
   */
  exists: (contextValue): boolean => {
    return contextValue !== undefined && contextValue !== null && contextValue !== '';
  },

  /**
   * 不存在
   */
  notExists: (contextValue): boolean => {
    return contextValue === undefined || contextValue === null || contextValue === '';
  },
};

/**
 * 使用超时保护执行正则表达式匹配
 * @param pattern - 正则表达式
 * @param value - 待匹配的字符串
 * @param timeoutMs - 超时时间（毫秒）
 * @returns 是否匹配
 */
function executeRegexWithTimeout(pattern: RegExp, value: string, timeoutMs: number): boolean {
  const start = Date.now();

  // 检查是否需要超时保护（非全局正则不会无限循环）
  if (!pattern.global) {
    // 非全局正则：只匹配一次，不存在 ReDoS 风险
    try {
      const result = pattern.test(value);
      return result;
    } catch {
      return false;
    }
  }

  // 全局正则：使用超时保护
  let lastIndex = 0;
  let matchCount = 0;
  const maxMatches = 10000; // 限制最大匹配次数

  while (lastIndex < value.length && matchCount < maxMatches) {
    // 检查超时
    if (Date.now() - start > timeoutMs) {
      console.warn(`Regex timeout after ${timeoutMs}ms`);
      return false;
    }

    pattern.lastIndex = lastIndex;
    const match = pattern.exec(value);

    if (!match) {
      break;
    }

    matchCount++;
    lastIndex = pattern.lastIndex;

    // 防止 lastIndex 不变化导致的无限循环
    if (pattern.lastIndex === lastIndex) {
      lastIndex++;
    }
  }

  // 如果达到最大匹配次数，认为可能有 ReDoS 风险
  if (matchCount >= maxMatches) {
    console.warn(`Regex matched ${maxMatches} times, possible ReDoS`);
    return false;
  }

  return matchCount > 0;
}

/**
 * 执行单个过滤器验证
 * @param operator - 操作符
 * @param contextValue - 上下文值
 * @param filterValue - 过滤器值
 * @param context - 完整上下文（可选）
 * @returns 是否匹配
 */
export function executeFilter(
  operator: FilterOperator,
  contextValue: unknown,
  filterValue: unknown,
  context?: ValidationContext
): boolean {
  const filterFn = filterFunctions[operator];

  if (!filterFn) {
    console.warn(`Unknown filter operator: ${operator}`);
    return false;
  }

  return filterFn(contextValue, filterValue, context);
}

/**
 * IP 地址相关过滤器（特殊处理）
 */
export const ipFilters = {
  /**
   * 检查 IP 是否在 CIDR 范围内
   */
  inCidr: (ip: string, cidr: string): boolean => {
    try {
      const [subnet, prefixStr] = cidr.split('/');
      if (!subnet || !prefixStr) {
        return false;
      }
      const prefix = parseInt(prefixStr, 10);

      if (isNaN(prefix) || prefix < 0 || prefix > 32) {
        return false;
      }

      const ipNum = ipToNumber(ip);
      const subnetNum = ipToNumber(subnet);
      const mask = -1 << (32 - prefix);

      return (ipNum & mask) === (subnetNum & mask);
    } catch {
      return false;
    }
  },

  /**
   * 检查 IP 是否在 IP 列表中
   */
  inList: (ip: string, ipList: string[]): boolean => {
    return ipList.some(item => {
      // CIDR 格式
      if (item.includes('/')) {
        return ipFilters.inCidr(ip, item);
      }
      // 精确匹配
      return ip === item;
    });
  },

  /**
   * 检查 IP 是否在范围内
   */
  inRange: (ip: string, startIp: string, endIp: string): boolean => {
    try {
      const ipNum = ipToNumber(ip);
      const startNum = ipToNumber(startIp);
      const endNum = ipToNumber(endIp);

      return ipNum >= startNum && ipNum <= endNum;
    } catch {
      return false;
    }
  },
};

/**
 * 将 IP 地址转换为数字
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    throw new Error('Invalid IP address');
  }

  return parts.reduce((acc, part) => {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) {
      throw new Error('Invalid IP address');
    }
    return (acc << 8) + num;
  }, 0);
}

/**
 * User Agent 相关过滤器
 */
export const uaFilters = {
  /**
   * 检查是否为移动设备
   */
  isMobile: (ua: string): boolean => {
    const mobilePattern = /Mobile|Android|iPhone|iPad|iPod|Windows Phone|BlackBerry/i;
    return mobilePattern.test(ua);
  },

  /**
   * 检查是否为桌面设备
   */
  isDesktop: (ua: string): boolean => {
    return !uaFilters.isMobile(ua);
  },

  /**
   * 检查是否为机器人
   */
  isBot: (ua: string): boolean => {
    const botPattern = /bot|crawler|spider|crawling|googlebot|bingbot|yandex/i;
    return botPattern.test(ua);
  },

  /**
   * 获取设备类型
   */
  getDeviceType: (ua: string): string => {
    if (/iPhone|Android.*Mobile|Windows Phone/i.test(ua)) {
      return 'mobile';
    }
    if (/iPad|Android(?!.*Mobile)/i.test(ua)) {
      return 'tablet';
    }
    return 'desktop';
  },

  /**
   * 获取操作系统
   */
  getOS: (ua: string): string => {
    if (/Windows NT 10/.test(ua)) return 'Windows 10';
    if (/Windows NT 6.3/.test(ua)) return 'Windows 8.1';
    if (/Windows NT 6.2/.test(ua)) return 'Windows 8';
    if (/Windows NT 6.1/.test(ua)) return 'Windows 7';
    if (/Mac OS X/.test(ua)) return 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    if (/Android/.test(ua)) return 'Android';
    if (/iOS|iPhone|iPad/.test(ua)) return 'iOS';
    return 'Unknown';
  },

  /**
   * 获取浏览器
   */
  getBrowser: (ua: string): string => {
    if (/Chrome/.test(ua) && !/Edge/.test(ua)) return 'Chrome';
    if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Safari';
    if (/Firefox/.test(ua)) return 'Firefox';
    if (/Edge/.test(ua)) return 'Edge';
    if (/Opera|OPR/.test(ua)) return 'Opera';
    if (/MSIE|Trident/.test(ua)) return 'IE';
    return 'Unknown';
  },
};

/**
 * 时间相关过滤器
 */
export const timeFilters = {
  /**
   * 检查是否在时间范围内
   * @param hour - 当前小时 (0-23)
   * @param range - 时间范围，如 "9-18" 或 [9, 18]
   */
  inHourRange: (hour: number, range: string | number[]): boolean => {
    let start: number | undefined, end: number | undefined;

    if (Array.isArray(range) && range.length >= 2) {
      start = range[0];
      end = range[1];
    } else if (typeof range === 'string' && range.includes('-')) {
      const parts = range.split('-');
      if (parts[0] && parts[1]) {
        start = parseInt(parts[0], 10);
        end = parseInt(parts[1], 10);
      }
    } else {
      return false;
    }

    if (start === undefined || end === undefined || isNaN(start) || isNaN(end)) {
      return false;
    }

    return hour >= start && hour <= end;
  },

  /**
   * 检查是否在星期列表中
   * @param day - 当前星期 (0=周日, 1=周一, ...)
   * @param days - 星期列表，如 [1, 2, 3, 4, 5] 表示工作日
   */
  inDays: (day: number, days: number[]): boolean => {
    return days.includes(day);
  },
};

/**
 * Proxy/VPN/Datacenter 检测过滤器
 */
export const proxyFilters = {
  /**
   * 检测是否为代理
   * @param headers - HTTP headers
   * @returns 是否为代理
   */
  isProxy: (headers: Record<string, string>): boolean => {
    const proxyHeaders = [
      'via',
      'x-forwarded-for',
      'x-forwarded-host',
      'x-forwarded-proto',
      'x-forwarded-port',
      'x-proxy-id',
      'x-proxy-server',
    ];
    
    const headerKeys = Object.keys(headers).map(k => k.toLowerCase());
    return proxyHeaders.some(h => headerKeys.includes(h));
  },

  /**
   * 检测是否为VPN (基于已知VPN特征)
   * @param _ip - IP地址
   * @param isp - ISP信息
   * @returns 是否为VPN
   */
  isVpn: (_ip: string, isp?: string): boolean => {
    // 常见VPN ISP关键词
    const vpnKeywords = [
      'vpn',
      'virtual private network',
      'nordvpn',
      'expressvpn',
      'surfshark',
      'cyberghost',
      'private internet access',
      'protonvpn',
      'tunnelbear',
      'hidemyass',
      'ipvanish',
      'vyprvpn',
      'purevpn',
      'strongvpn',
      'torguard',
    ];
    
    if (isp) {
      const ispLower = isp.toLowerCase();
      return vpnKeywords.some(keyword => ispLower.includes(keyword));
    }
    
    return false;
  },

  /**
   * 检测是否为数据中心IP
   * @param _ip - IP地址
   * @param isp - ISP信息
   * @returns 是否为数据中心
   */
  isDatacenter: (_ip: string, isp?: string): boolean => {
    // 常见数据中心/托管服务商
    const datacenterKeywords = [
      'amazon',
      'aws',
      'google cloud',
      'gcp',
      'microsoft azure',
      'azure',
      'digitalocean',
      'linode',
      'vultr',
      'ovh',
      'hetzner',
      'alibaba cloud',
      'tencent cloud',
      'huawei cloud',
      'contabo',
      'scaleway',
      'upcloud',
      'rackspace',
      'softlayer',
      'ibm cloud',
      'oracle cloud',
      'hosting',
      'datacenter',
      'data center',
      'cloudflare',
      'fastly',
      'incapsula',
    ];
    
    if (isp) {
      const ispLower = isp.toLowerCase();
      return datacenterKeywords.some(keyword => ispLower.includes(keyword));
    }
    
    return false;
  },

  /**
   * 检测是否为Tor出口节点
   * @param _ip - IP地址
   * @returns 是否为Tor
   */
  isTor: (_ip: string): boolean => {
    // Tor出口节点列表通常需要从外部API获取
    // 这里仅作示例，实际实现需要查询Tor出口节点数据库
    return false;
  },
};

/**
 * Connection Type 检测
 */
export const connectionFilters = {
  /**
   * 获取连接类型
   * @param connection - 连接信息字符串
   * @returns 连接类型: wifi, 4g, 5g, ethernet, cellular, unknown
   */
  getConnectionType: (connection?: string): string => {
    if (!connection) return 'unknown';
    
    const conn = connection.toLowerCase();
    
    if (conn.includes('wifi') || conn.includes('wi-fi')) return 'wifi';
    if (conn.includes('5g')) return '5g';
    if (conn.includes('4g') || conn.includes('lte')) return '4g';
    if (conn.includes('3g')) return '3g';
    if (conn.includes('ethernet') || conn.includes('cable')) return 'ethernet';
    if (conn.includes('cellular') || conn.includes('mobile')) return 'cellular';
    if (conn.includes('dial') || conn.includes('dsl')) return 'dsl';
    
    return 'unknown';
  },

  /**
   * 检查是否为移动网络
   * @param connection - 连接信息
   * @returns 是否为移动网络
   */
  isMobile: (connection?: string): boolean => {
    if (!connection) return false;
    const type = connectionFilters.getConnectionType(connection);
    return ['4g', '5g', '3g', 'cellular'].includes(type);
  },

  /**
   * 检查是否为WiFi
   * @param connection - 连接信息
   * @returns 是否为WiFi
   */
  isWifi: (connection?: string): boolean => {
    if (!connection) return false;
    return connectionFilters.getConnectionType(connection) === 'wifi';
  },
};

/**
 * Language 检测
 */
export const languageFilters = {
  /**
   * 获取语言代码
   * @param acceptLanguage - Accept-Language header
   * @returns 语言代码
   */
  getLanguage: (acceptLanguage?: string): string => {
    if (!acceptLanguage) return 'unknown';
    
    // 提取第一个语言代码
    const match = acceptLanguage.match(/^([a-z]{2}(-[A-Z]{2})?)/i);
    return match?.[1]?.toLowerCase() ?? 'unknown';
  },

  /**
   * 获取语言列表
   * @param acceptLanguage - Accept-Language header
   * @returns 语言代码列表
   */
  getLanguages: (acceptLanguage?: string): string[] => {
    if (!acceptLanguage) return [];
    
    // 解析语言列表，按优先级排序
    return acceptLanguage
      .split(',')
      .map(lang => {
        const match = lang.trim().match(/^([a-z]{2}(-[A-Z]{2})?)/i);
        return match?.[1]?.toLowerCase() ?? null;
      })
      .filter((lang): lang is string => lang !== null);
  },

  /**
   * 检查语言是否在列表中
   * @param acceptLanguage - Accept-Language header
   * @param languages - 要检查的语言列表
   * @returns 是否匹配
   */
  matchesLanguage: (acceptLanguage: string, languages: string[]): boolean => {
    const userLangs = languageFilters.getLanguages(acceptLanguage);
    return userLangs.some(lang => 
      languages.some(target => 
        lang === target.toLowerCase() || lang.startsWith(target.toLowerCase())
      )
    );
  },
};

/**
 * 获取所有可用的过滤器操作符列表
 */
export function getAvailableOperators(): { value: FilterOperator; label: string; description: string }[] {
  return [
    { value: 'equals', label: 'Equals', description: 'Exact match' },
    { value: 'notEquals', label: 'Not Equals', description: 'Not equal to value' },
    { value: 'contains', label: 'Contains', description: 'String contains substring' },
    { value: 'notContains', label: 'Not Contains', description: 'String does not contain substring' },
    { value: 'startsWith', label: 'Starts With', description: 'String starts with value' },
    { value: 'endsWith', label: 'Ends With', description: 'String ends with value' },
    { value: 'regex', label: 'Regex', description: 'Matches regular expression' },
    { value: 'in', label: 'In List', description: 'Value is in the list' },
    { value: 'notIn', label: 'Not In List', description: 'Value is not in the list' },
    { value: 'greaterThan', label: 'Greater Than', description: 'Number greater than value' },
    { value: 'lessThan', label: 'Less Than', description: 'Number less than value' },
    { value: 'greaterOrEquals', label: 'Greater Or Equals', description: 'Number greater or equal' },
    { value: 'lessOrEquals', label: 'Less Or Equals', description: 'Number less or equal' },
    { value: 'between', label: 'Between', description: 'Number in range [min, max]' },
    { value: 'exists', label: 'Exists', description: 'Value exists and is not empty' },
    { value: 'notExists', label: 'Not Exists', description: 'Value does not exist or is empty' },
  ];
}

/**
 * 获取所有可用的过滤器目标列表
 */
export function getAvailableTargets(): { value: string; label: string; category: string; type: 'string' | 'number' | 'boolean' }[] {
  return [
    // Visitor fields
    { value: 'visitor.ip', label: 'IP Address', category: 'Visitor', type: 'string' },
    { value: 'visitor.country', label: 'Country', category: 'Visitor', type: 'string' },
    { value: 'visitor.region', label: 'Region', category: 'Visitor', type: 'string' },
    { value: 'visitor.city', label: 'City', category: 'Visitor', type: 'string' },
    { value: 'visitor.isp', label: 'ISP', category: 'Visitor', type: 'string' },
    { value: 'visitor.connectionType', label: 'Connection Type', category: 'Visitor', type: 'string' },
    { value: 'visitor.deviceType', label: 'Device Type', category: 'Visitor', type: 'string' },
    { value: 'visitor.os', label: 'Operating System', category: 'Visitor', type: 'string' },
    { value: 'visitor.browser', label: 'Browser', category: 'Visitor', type: 'string' },
    { value: 'visitor.language', label: 'Language', category: 'Visitor', type: 'string' },
    { value: 'visitor.userAgent', label: 'User Agent', category: 'Visitor', type: 'string' },
    { value: 'visitor.isProxy', label: 'Is Proxy', category: 'Visitor', type: 'boolean' },
    { value: 'visitor.isVpn', label: 'Is VPN', category: 'Visitor', type: 'boolean' },
    { value: 'visitor.isDatacenter', label: 'Is Datacenter', category: 'Visitor', type: 'boolean' },

    // Visit fields
    { value: 'visit.referrer', label: 'Referrer', category: 'Visit', type: 'string' },
    { value: 'visit.source', label: 'Source', category: 'Visit', type: 'string' },
    { value: 'visit.medium', label: 'Medium', category: 'Visit', type: 'string' },
    { value: 'visit.campaign', label: 'Campaign', category: 'Visit', type: 'string' },
    { value: 'visit.subId', label: 'Sub ID', category: 'Visit', type: 'string' },
    { value: 'visit.clickId', label: 'Click ID', category: 'Visit', type: 'string' },
    { value: 'visit.timestamp', label: 'Timestamp', category: 'Visit', type: 'number' },
    { value: 'visit.hourOfDay', label: 'Hour of Day', category: 'Visit', type: 'number' },
    { value: 'visit.dayOfWeek', label: 'Day of Week', category: 'Visit', type: 'number' },
    { value: 'visit.landingPage', label: 'Landing Page', category: 'Visit', type: 'string' },
    { value: 'visit.offer', label: 'Offer', category: 'Visit', type: 'string' },
    { value: 'visit.conversion', label: 'Has Conversion', category: 'Visit', type: 'boolean' },
    { value: 'visit.revenue', label: 'Revenue', category: 'Visit', type: 'number' },
    { value: 'visit.visitsCount', label: 'Visits Count', category: 'Visit', type: 'number' },
    { value: 'visit.firstVisit', label: 'First Visit', category: 'Visit', type: 'boolean' },
    { value: 'visit.returning', label: 'Returning Visitor', category: 'Visit', type: 'boolean' },
  ];
}
