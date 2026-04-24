/**
 * @fileoverview Offer Payout 服务
 * @description 处理 Offer 支付计算和转化上限检查
 * @module services/offer/offerPayout.service
 */

import type { Env } from '@/config/env';
import type { D1Database } from '@/handlers/d1/index';
import {
  PayoutRule,
  PayoutCondition,
  PayoutCalculationResult,
  PayoutPreviewContext,
  OfferConversionStats,
} from '@/types/offerPayout';

function getD1Connection(env: Env): D1Database {
  return env.DB;
}

export class OfferPayoutService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = getD1Connection(env);
  }

  calculatePayout(
    basePayout: number,
    rules: PayoutRule[],
    context: PayoutPreviewContext
  ): PayoutCalculationResult {
    let finalPayout = basePayout;
    let appliedRule: PayoutRule | undefined;

    const sortedRules = [...rules].filter(r => r.enabled).sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.matchCondition(rule.condition, context)) {
        switch (rule.payoutType) {
          case 'cpa':
            finalPayout = rule.payoutValue;
            break;
          case 'revshare':
            finalPayout = basePayout * (rule.payoutValue / 100);
            break;
        }
        appliedRule = rule;
        break;
      }
    }

    return {
      basePayout,
      finalPayout,
      appliedRule,
      capReached: false,
      capRemaining: -1,
    };
  }

  private matchCondition(condition: PayoutCondition, context: PayoutPreviewContext): boolean {
    const value = this.getContextValue(condition.field, context);
    if (value === undefined) return false;

    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'notin':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      default:
        return false;
    }
  }

  private getContextValue(field: string, context: PayoutPreviewContext): string | undefined {
    switch (field) {
      case 'country':
        return context.country;
      case 'device':
        return context.device;
      case 'browser':
        return context.browser;
      case 'os':
        return context.os;
      default:
        return context.customParams?.[field];
    }
  }

  async checkConversionCap(offerId: string, dailyCap: number, totalCap: number): Promise<{ reached: boolean; remaining: number }> {
    if (dailyCap <= 0 && totalCap <= 0) {
      return { reached: false, remaining: -1 };
    }

    const today = new Date().toISOString().split('T')[0];

    if (dailyCap > 0) {
      const dailyStats = await this.db
        .prepare('SELECT SUM(conversions) as total FROM offer_conversion_stats WHERE offerId = ? AND date = ?')
        .bind(offerId, today)
        .first<{ total: number }>();

      const dailyConversions = dailyStats?.total || 0;
      if (dailyConversions >= dailyCap) {
        return { reached: true, remaining: 0 };
      }
      return { reached: false, remaining: dailyCap - dailyConversions };
    }

    if (totalCap > 0) {
      const totalStats = await this.db
        .prepare('SELECT SUM(conversions) as total FROM offer_conversion_stats WHERE offerId = ?')
        .bind(offerId)
        .first<{ total: number }>();

      const totalConversions = totalStats?.total || 0;
      if (totalConversions >= totalCap) {
        return { reached: true, remaining: 0 };
      }
      return { reached: false, remaining: totalCap - totalConversions };
    }

    return { reached: false, remaining: -1 };
  }

  async recordConversion(offerId: string, revenue: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await this.db
      .prepare(`
        INSERT INTO offer_conversion_stats (offerId, date, conversions, revenue)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(offerId, date) DO UPDATE SET
          conversions = conversions + 1,
          revenue = revenue + ?
      `)
      .bind(offerId, today, revenue, revenue)
      .run();
  }

  async getConversionStats(offerId: string, startDate?: string, endDate?: string): Promise<OfferConversionStats[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const results = await this.db
      .prepare('SELECT * FROM offer_conversion_stats WHERE offerId = ? AND date >= ? AND date <= ? ORDER BY date ASC')
      .bind(offerId, start, end)
      .all<OfferConversionStats>();

    return results.results || [];
  }

  async updatePayoutRules(offerId: string, rules: PayoutRule[]): Promise<void> {
    await this.db
      .prepare('UPDATE offers SET payoutRules = ?, updatedAt = ? WHERE id = ?')
      .bind(JSON.stringify(rules), new Date().toISOString(), offerId)
      .run();
  }

  async updateConversionCap(offerId: string, dailyCap: number, totalCap: number): Promise<void> {
    await this.db
      .prepare('UPDATE offers SET dailyCap = ?, conversionCap = ?, updatedAt = ? WHERE id = ?')
      .bind(dailyCap, totalCap, new Date().toISOString(), offerId)
      .run();
  }
}

export function createOfferPayoutService(env: Env): OfferPayoutService {
  return new OfferPayoutService(env);
}
