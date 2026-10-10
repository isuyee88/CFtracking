/**
 * @fileoverview 自定义指标计算引擎
 * @description 解析和执行自定义指标的计算公式
 * @module services/customMetric/metric.engine
 * 
 * Input: 自定义指标公式和上下文数据
 * Output: 计算结果
 * Logic Interaction: 
 *   - 解析公式表达式
 *   - 执行数学运算
 *   - 格式化输出结果
 * Frontend-Backend: 为报表系统提供自定义指标计算能力
 */

import type {
  CustomMetric,
  MetricCalculationContext,
  MetricCalculationResult,
} from '@/types/customMetric';

export class MetricCalculationEngine {
  /**
   * 计算自定义指标值
   */
  calculate(metric: CustomMetric, context: MetricCalculationContext): MetricCalculationResult {
    try {
      // 解析公式
      const expression = this.parseFormula(metric.formula, context);
      
      // 执行计算
      const value = this.evaluateExpression(expression);
      
      // 格式化结果
      const formatted = this.formatValue(value, metric);
      
      return { value, formatted };
    } catch (error) {
      return {
        value: 0,
        formatted: 'N/A',
        error: error instanceof Error ? error.message : 'Calculation error',
      };
    }
  }

  /**
   * 解析公式,替换变量
   */
  private parseFormula(formula: string, context: MetricCalculationContext): string {
    let parsed = formula;
    
    // 替换上下文变量
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      parsed = parsed.replace(regex, String(value));
    }
    
    // 替换常用函数
    parsed = parsed.replace(/\bSUM\(/g, '(');
    parsed = parsed.replace(/\bAVG\(/g, '(');
    parsed = parsed.replace(/\bMIN\(/g, '(');
    parsed = parsed.replace(/\bMAX\(/g, '(');
    parsed = parsed.replace(/\bABS\(/g, 'Math.abs(');
    parsed = parsed.replace(/\bSQRT\(/g, 'Math.sqrt(');
    parsed = parsed.replace(/\bPOW\(/g, 'Math.pow(');
    parsed = parsed.replace(/\bROUND\(/g, 'Math.round(');
    parsed = parsed.replace(/\bFLOOR\(/g, 'Math.floor(');
    parsed = parsed.replace(/\bCEIL\(/g, 'Math.ceil(');
    
    return parsed;
  }

  /**
   * 执行表达式计算
   */
  private evaluateExpression(expression: string): number {
    // 安全检查:只允许数学运算符、数字、括号和 Math 函数
    const safeExpression = expression.replace(/[^0-9+\-*/().%\sMath.]/g, '');
    
    try {
      // 使用 Function 构造器执行表达式
      const func = new Function(`return ${safeExpression}`);
      const result = func();
      
      // 确保返回数字
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return result;
      }
      
      return 0;
    } catch (error) {
      console.error('Expression evaluation error:', error);
      return 0;
    }
  }

  /**
   * 格式化值
   */
  private formatValue(value: number, metric: CustomMetric): string {
    const decimals = metric.decimals || 2;
    const prefix = metric.prefix || '';
    const suffix = metric.suffix || '';
    
    let formatted: string;
    
    switch (metric.format) {
      case 'currency':
        formatted = `${prefix}${value.toFixed(decimals)}${suffix}`;
        break;
      case 'percent':
        formatted = `${(value * 100).toFixed(decimals)}%`;
        break;
      case 'custom':
        formatted = `${prefix}${value.toFixed(decimals)}${suffix}`;
        break;
      case 'number':
      default:
        formatted = value.toFixed(decimals);
        break;
    }
    
    return formatted;
  }

  /**
   * 验证公式语法
   */
  validateFormula(formula: string): { valid: boolean; error?: string } {
    try {
      // 检查是否包含危险操作
      const dangerousPatterns = [
        /eval\s*\(/i,
        /Function\s*\(/i,
        /document\./i,
        /window\./i,
        /globalThis\./i,
        /import\s*\(/i,
        /require\s*\(/i,
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(formula)) {
          return { valid: false, error: 'Formula contains forbidden operations' };
        }
      }
      
      // 尝试解析公式
      const testContext: MetricCalculationContext = {
        clicks: 100,
        impressions: 1000,
        conversions: 10,
        revenue: 1000,
        spend: 500,
        cost: 500,
        profit: 500,
        uniqueVisitors: 90,
      };
      
      const expression = this.parseFormula(formula, testContext);
      this.evaluateExpression(expression);
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid formula syntax',
      };
    }
  }

  /**
   * 获取公式中使用的变量列表
   */
  extractVariables(formula: string): string[] {
    const variables: string[] = [];
    const regex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let match;
    
    while ((match = regex.exec(formula)) !== null) {
      const variable = match[1];
      // 排除数学函数和关键字
      if (variable && !['Math', 'abs', 'sqrt', 'pow', 'round', 'floor', 'ceil', 'SUM', 'AVG', 'MIN', 'MAX'].includes(variable)) {
        if (!variables.includes(variable)) {
          variables.push(variable);
        }
      }
    }
    
    return variables;
  }

  /**
   * 批量计算多个指标
   */
  calculateBatch(
    metrics: CustomMetric[],
    context: MetricCalculationContext
  ): Record<string, MetricCalculationResult> {
    const results: Record<string, MetricCalculationResult> = {};
    
    for (const metric of metrics) {
      results[metric.name] = this.calculate(metric, context);
    }
    
    return results;
  }
}

export function createMetricCalculationEngine(): MetricCalculationEngine {
  return new MetricCalculationEngine();
}
