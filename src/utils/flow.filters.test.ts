/**
 * @fileoverview FilterService 单元测试
 * @description 测试 flow.filters.ts 中的过滤器函数
 */

import { describe, expect, test } from 'vitest';
import {
  filterFunctions,
  executeFilter,
  getAvailableOperators,
  getAvailableTargets
} from './flow.filters';

describe('FilterFunctions', () => {
  describe('equals', () => {
    test('matching value returns true', () => {
      expect(filterFunctions.equals('US', 'US')).toBe(true);
      expect(filterFunctions.equals(123, 123)).toBe(true);
      expect(filterFunctions.equals(true, true)).toBe(true);
    });

    test('non-matching value returns false', () => {
      expect(filterFunctions.equals('US', 'UK')).toBe(false);
      expect(filterFunctions.equals(123, 456)).toBe(false);
    });

    test('null/undefined handling', () => {
      expect(filterFunctions.equals(undefined, undefined)).toBe(true);
      expect(filterFunctions.equals(null, null)).toBe(true);
      expect(filterFunctions.equals(undefined, 'value')).toBe(false);
    });
  });

  describe('notEquals', () => {
    test('different values returns true', () => {
      expect(filterFunctions.notEquals('US', 'UK')).toBe(true);
    });

    test('same values returns false', () => {
      expect(filterFunctions.notEquals('US', 'US')).toBe(false);
    });
  });

  describe('contains', () => {
    test('substring contained returns true', () => {
      expect(filterFunctions.contains('hello world', 'world')).toBe(true);
      expect(filterFunctions.contains('Hello World', 'hello')).toBe(true); // case insensitive
    });

    test('substring not contained returns false', () => {
      expect(filterFunctions.contains('hello', 'world')).toBe(false);
    });

    test('null/undefined returns false', () => {
      expect(filterFunctions.contains(null, 'value')).toBe(false);
      expect(filterFunctions.contains(undefined, 'value')).toBe(false);
    });
  });

  describe('notContains', () => {
    test('substring not contained returns true', () => {
      expect(filterFunctions.notContains('hello', 'world')).toBe(true);
    });

    test('substring contained returns false', () => {
      expect(filterFunctions.notContains('hello world', 'world')).toBe(false);
    });

    test('null/undefined returns true', () => {
      expect(filterFunctions.notContains(null, 'value')).toBe(true);
      expect(filterFunctions.notContains(undefined, 'value')).toBe(true);
    });
  });

  describe('startsWith', () => {
    test('matching prefix returns true', () => {
      expect(filterFunctions.startsWith('hello world', 'hello')).toBe(true);
      expect(filterFunctions.startsWith('Hello', 'hello')).toBe(true); // case insensitive
    });

    test('non-matching prefix returns false', () => {
      expect(filterFunctions.startsWith('hello', 'world')).toBe(false);
    });
  });

  describe('endsWith', () => {
    test('matching suffix returns true', () => {
      expect(filterFunctions.endsWith('hello world', 'world')).toBe(true);
      expect(filterFunctions.endsWith('Hello World', 'world')).toBe(true); // case insensitive
    });

    test('non-matching suffix returns false', () => {
      expect(filterFunctions.endsWith('hello', 'world')).toBe(false);
    });
  });

  describe('regex', () => {
    test('pattern matches returns true', () => {
      // 使用全局正则或只匹配一次的模式
      expect(filterFunctions.regex('hello123', '^hello')).toBe(true);
      expect(filterFunctions.regex('hello', '^hello$')).toBe(true);
    });

    test('pattern not matches returns false', () => {
      expect(filterFunctions.regex('abc', '\\d+')).toBe(false);
    });

    test('invalid regex returns false', () => {
      expect(filterFunctions.regex('test', '[invalid')).toBe(false);
    });

    test('null/undefined returns false', () => {
      expect(filterFunctions.regex(null, '\\d+')).toBe(false);
      expect(filterFunctions.regex(undefined, '\\d+')).toBe(false);
    });
  });

  describe('in', () => {
    test('value in list returns true', () => {
      expect(filterFunctions.in('US', ['US', 'UK', 'CA'])).toBe(true);
      expect(filterFunctions.in(123, [100, 123, 200])).toBe(true);
    });

    test('value not in list returns false', () => {
      expect(filterFunctions.in('FR', ['US', 'UK', 'CA'])).toBe(false);
    });

    test('case insensitive for strings', () => {
      expect(filterFunctions.in('US', ['us', 'uk'])).toBe(true);
    });
  });

  describe('notIn', () => {
    test('value not in list returns true', () => {
      expect(filterFunctions.notIn('FR', ['US', 'UK', 'CA'])).toBe(true);
    });

    test('value in list returns false', () => {
      expect(filterFunctions.notIn('US', ['US', 'UK', 'CA'])).toBe(false);
    });
  });

  describe('greaterThan', () => {
    test('greater value returns true', () => {
      expect(filterFunctions.greaterThan(10, 5)).toBe(true);
    });

    test('smaller value returns false', () => {
      expect(filterFunctions.greaterThan(5, 10)).toBe(false);
    });

    test('equal values returns false', () => {
      expect(filterFunctions.greaterThan(5, 5)).toBe(false);
    });

    test('string comparison works', () => {
      expect(filterFunctions.greaterThan('z', 'a')).toBe(true);
    });
  });

  describe('lessThan', () => {
    test('smaller value returns true', () => {
      expect(filterFunctions.lessThan(5, 10)).toBe(true);
    });

    test('greater value returns false', () => {
      expect(filterFunctions.lessThan(10, 5)).toBe(false);
    });
  });

  describe('greaterOrEquals', () => {
    test('greater value returns true', () => {
      expect(filterFunctions.greaterOrEquals(10, 5)).toBe(true);
    });

    test('equal value returns true', () => {
      expect(filterFunctions.greaterOrEquals(5, 5)).toBe(true);
    });

    test('smaller value returns false', () => {
      expect(filterFunctions.greaterOrEquals(3, 5)).toBe(false);
    });
  });

  describe('lessOrEquals', () => {
    test('smaller value returns true', () => {
      expect(filterFunctions.lessOrEquals(5, 10)).toBe(true);
    });

    test('equal value returns true', () => {
      expect(filterFunctions.lessOrEquals(5, 5)).toBe(true);
    });

    test('greater value returns false', () => {
      expect(filterFunctions.lessOrEquals(10, 5)).toBe(false);
    });
  });

  describe('between', () => {
    test('value in range returns true', () => {
      expect(filterFunctions.between(5, [1, 10])).toBe(true);
      expect(filterFunctions.between(5, '1,10')).toBe(true);
    });

    test('value out of range returns false', () => {
      expect(filterFunctions.between(15, [1, 10])).toBe(false);
      expect(filterFunctions.between(0, [1, 10])).toBe(false);
    });

    test('boundary values included', () => {
      expect(filterFunctions.between(1, [1, 10])).toBe(true);
      expect(filterFunctions.between(10, [1, 10])).toBe(true);
    });
  });

  describe('exists', () => {
    test('non-null value returns true', () => {
      expect(filterFunctions.exists('value', undefined)).toBe(true);
      expect(filterFunctions.exists(0, undefined)).toBe(true);
      expect(filterFunctions.exists(false, undefined)).toBe(true);
    });

    test('null/undefined/empty string returns false', () => {
      expect(filterFunctions.exists(null, undefined)).toBe(false);
      expect(filterFunctions.exists(undefined, undefined)).toBe(false);
      expect(filterFunctions.exists('', undefined)).toBe(false);
    });
  });

  describe('notExists', () => {
    test('null/undefined/empty string returns true', () => {
      expect(filterFunctions.notExists(null, undefined)).toBe(true);
      expect(filterFunctions.notExists(undefined, undefined)).toBe(true);
      expect(filterFunctions.notExists('', undefined)).toBe(true);
    });

    test('non-null value returns false', () => {
      expect(filterFunctions.notExists('value', undefined)).toBe(false);
    });
  });
});

describe('executeFilter', () => {
  test('executes known operator correctly', () => {
    expect(executeFilter('equals', 'US', 'US')).toBe(true);
    expect(executeFilter('contains', 'hello world', 'world')).toBe(true);
  });

  test('returns false for unknown operator', () => {
    expect(executeFilter('unknown' as any, 'value', 'value')).toBe(false);
  });
});

describe('getAvailableOperators', () => {
  test('returns array of operators', () => {
    const operators = getAvailableOperators();
    expect(Array.isArray(operators)).toBe(true);
    expect(operators.length).toBeGreaterThan(0);
  });

  test('each operator has required properties', () => {
    const operators = getAvailableOperators();
    operators.forEach((op) => {
      expect(op).toHaveProperty('value');
      expect(op).toHaveProperty('label');
      expect(op).toHaveProperty('description');
    });
  });

  test('includes common operators', () => {
    const operators = getAvailableOperators();
    const values = operators.map((op) => op.value);
    expect(values).toContain('equals');
    expect(values).toContain('contains');
    expect(values).toContain('in');
    expect(values).toContain('regex');
  });
});

describe('getAvailableTargets', () => {
  test('returns array of targets', () => {
    const targets = getAvailableTargets();
    expect(Array.isArray(targets)).toBe(true);
    expect(targets.length).toBeGreaterThan(0);
  });

  test('each target has required properties', () => {
    const targets = getAvailableTargets();
    targets.forEach((target) => {
      expect(target).toHaveProperty('value');
      expect(target).toHaveProperty('label');
      expect(target).toHaveProperty('category');
      expect(target).toHaveProperty('type');
    });
  });

  test('includes visitor fields', () => {
    const targets = getAvailableTargets();
    const visitorTargets = targets.filter((t) => t.category === 'Visitor');
    expect(visitorTargets.length).toBeGreaterThan(0);
    expect(visitorTargets.some((t) => t.value === 'visitor.country')).toBe(true);
    expect(visitorTargets.some((t) => t.value === 'visitor.ip')).toBe(true);
  });

  test('includes visit fields', () => {
    const targets = getAvailableTargets();
    const visitTargets = targets.filter((t) => t.category === 'Visit');
    expect(visitTargets.length).toBeGreaterThan(0);
    expect(visitTargets.some((t) => t.value === 'visit.referrer')).toBe(true);
  });
});
