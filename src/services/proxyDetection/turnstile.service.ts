/**
 * @fileoverview Cloudflare Turnstile人机验证服务
 * @description 处理Turnstile挑战验证、信任状态管理
 * @module services/proxyDetection/turnstile.service
 */

import type { Env } from '@/config/env';
import type { D1Database } from '@/handlers/d1/index';
import { KV } from '@/handlers/kv';

export interface TurnstileVerifyResult {
  success: boolean;
  challengeTs?: string;
  hostname?: string;
  errorCodes?: string[];
}

export interface ChallengeRecord {
  id: number;
  session_id: string;
  ip_address: string;
  user_agent: string | null;
  fingerprint: string | null;
  challenge_token: string | null;
  challenge_type: 'managed' | 'invisible';
  challenge_status: 'pending' | 'passed' | 'failed' | 'expired';
  challenge_time: string;
  response_time: string | null;
  passed_at: string | null;
  fail_count: number;
  fail_reason: string | null;
  trust_level: 'untrusted' | 'verified' | 'trusted';
  trust_expires_at: string | null;
  metadata: string | null;
}

export interface TrustState {
  ip: string;
  userAgentHash: string;
  fingerprint?: string;
  trustLevel: 'verified' | 'trusted';
  challengePassedAt: string;
  expiresAt: string;
  metadata: {
    sessionId: string;
    challengeType: string;
  };
}

export class TurnstileService {
  private db: D1Database;
  private kv: KV;
  private secretKey: string;
  private siteKey: string;
  private trustDuration: number;
  private maxRetryCount: number;

  constructor(
    env: Env,
    config: {
      secretKey: string;
      siteKey: string;
      trustDuration?: number;
      maxRetryCount?: number;
    }
  ) {
    this.db = env.DB;
    this.kv = new KV(env.UNIQUENESS_KV);
    this.secretKey = config.secretKey;
    this.siteKey = config.siteKey;
    this.trustDuration = config.trustDuration || 604800; // 7天
    this.maxRetryCount = config.maxRetryCount || 3;
  }

  /**
   * 验证Turnstile令牌
   */
  async verifyToken(
    token: string,
    ip: string,
    sessionId: string
  ): Promise<TurnstileVerifyResult> {
    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: this.secretKey,
          response: token,
          remoteip: ip,
        }),
      });

      const result = await response.json() as {
        success: boolean;
        challenge_ts?: string;
        hostname?: string;
        'error-codes'?: string[];
      };

      // 记录挑战结果
      await this.recordChallengeResult(sessionId, ip, token, result.success);

      return {
        success: result.success,
        challengeTs: result.challenge_ts,
        hostname: result.hostname,
        errorCodes: result['error-codes'],
      };
    } catch (error) {
      console.error('Turnstile verification failed:', error);
      return { success: false, errorCodes: ['verification_failed'] };
    }
  }

  /**
   * 记录挑战结果
   */
  private async recordChallengeResult(
    sessionId: string,
    ip: string,
    token: string,
    success: boolean
  ): Promise<void> {
    const now = new Date().toISOString();

    try {
      // 更新挑战记录
      await this.db
        .prepare(`
          UPDATE turnstile_challenges 
          SET 
            challenge_status = ?,
            challenge_token = ?,
            response_time = ?,
            passed_at = ?,
            trust_level = ?
          WHERE session_id = ? AND ip_address = ?
        `)
        .bind(
          success ? 'passed' : 'failed',
          token,
          now,
          success ? now : null,
          success ? 'verified' : 'untrusted',
          sessionId,
          ip
        )
        .run();
    } catch (error) {
      console.error('Failed to record challenge result:', error);
    }
  }

  /**
   * 创建挑战记录
   */
  async createChallenge(
    sessionId: string,
    ip: string,
    userAgent: string,
    fingerprint?: string
  ): Promise<ChallengeRecord> {
    const now = new Date().toISOString();

    try {
      const result = await this.db
        .prepare(`
          INSERT INTO turnstile_challenges (
            session_id, ip_address, user_agent, fingerprint,
            challenge_type, challenge_status, challenge_time, fail_count, trust_level
          ) VALUES (?, ?, ?, ?, 'managed', 'pending', ?, 0, 'untrusted')
          RETURNING *
        `)
        .bind(sessionId, ip, userAgent, fingerprint || null, now)
        .first<ChallengeRecord>();

      return result!;
    } catch (error) {
      console.error('Failed to create challenge:', error);
      throw error;
    }
  }

  /**
   * 获取挑战记录
   */
  async getChallenge(sessionId: string): Promise<ChallengeRecord | null> {
    try {
      const result = await this.db
        .prepare('SELECT * FROM turnstile_challenges WHERE session_id = ? ORDER BY id DESC LIMIT 1')
        .bind(sessionId)
        .first<ChallengeRecord>();

      return result || null;
    } catch (error) {
      console.error('Failed to get challenge:', error);
      return null;
    }
  }

  /**
   * 设置信任状态
   */
  async setTrustState(
    ip: string,
    userAgent: string,
    sessionId: string,
    fingerprint?: string,
    challengeType: string = 'managed'
  ): Promise<void> {
    const uaHash = await this.hashUserAgent(userAgent);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.trustDuration * 1000);

    const trustState: TrustState = {
      ip,
      userAgentHash: uaHash,
      fingerprint,
      trustLevel: 'verified',
      challengePassedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      metadata: {
        sessionId,
        challengeType,
      },
    };

    // 设置KV缓存
    const cacheKey = fingerprint
      ? `trust:${ip}:${uaHash}:${fingerprint.substring(0, 16)}`
      : `trust:${ip}:${uaHash}`;
    await this.kv.set(cacheKey, trustState, this.trustDuration);

    // 更新数据库记录
    try {
      await this.db
        .prepare(`
          UPDATE turnstile_challenges 
          SET 
            trust_level = 'verified',
            trust_expires_at = ?
          WHERE session_id = ?
        `)
        .bind(expiresAt.toISOString(), sessionId)
        .run();
    } catch (error) {
      console.error('Failed to update trust state in DB:', error);
    }
  }

  /**
   * 检查信任状态
   */
  async checkTrustState(ip: string, userAgent: string, fingerprint?: string): Promise<boolean> {
    const uaHash = await this.hashUserAgent(userAgent);
    const cacheKey = fingerprint
      ? `trust:${ip}:${uaHash}:${fingerprint.substring(0, 16)}`
      : `trust:${ip}:${uaHash}`;
    const trustState = await this.kv.get<TrustState>(cacheKey);

    if (!trustState) {
      return false;
    }

    // 检查是否过期
    const expiresAt = new Date(trustState.expiresAt);
    if (expiresAt < new Date()) {
      await this.kv.delete(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * 清除信任状态
   */
  async clearTrustState(ip: string, userAgent: string, fingerprint?: string): Promise<void> {
    const uaHash = await this.hashUserAgent(userAgent);
    const cacheKey = fingerprint
      ? `trust:${ip}:${uaHash}:${fingerprint.substring(0, 16)}`
      : `trust:${ip}:${uaHash}`;
    await this.kv.delete(cacheKey);
  }

  /**
   * 增加失败计数
   */
  async incrementFailCount(sessionId: string, reason?: string): Promise<number> {
    try {
      const result = await this.db
        .prepare(`
          UPDATE turnstile_challenges 
          SET 
            fail_count = fail_count + 1,
            fail_reason = ?,
            challenge_status = CASE 
              WHEN fail_count + 1 >= ? THEN 'failed' 
              ELSE challenge_status 
            END
          WHERE session_id = ?
          RETURNING fail_count
        `)
        .bind(reason || 'verification_failed', this.maxRetryCount, sessionId)
        .first<{ fail_count: number }>();

      return result?.fail_count || 0;
    } catch (error) {
      console.error('Failed to increment fail count:', error);
      return 0;
    }
  }

  /**
   * 检查是否超过最大重试次数
   */
  async isMaxRetryExceeded(sessionId: string): Promise<boolean> {
    try {
      const result = await this.db
        .prepare('SELECT fail_count FROM turnstile_challenges WHERE session_id = ?')
        .bind(sessionId)
        .first<{ fail_count: number }>();

      return (result?.fail_count || 0) >= this.maxRetryCount;
    } catch (error) {
      console.error('Failed to check max retry:', error);
      return false;
    }
  }

  /**
   * 获取挑战统计
   */
  async getStats(timeRange?: { start: Date; end: Date }): Promise<{
    total: number;
    passed: number;
    failed: number;
    pending: number;
    passRate: number;
  }> {
    const start = timeRange?.start || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = timeRange?.end || new Date();

    try {
      const result = await this.db
        .prepare(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN challenge_status = 'passed' THEN 1 ELSE 0 END) as passed,
            SUM(CASE WHEN challenge_status = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN challenge_status = 'pending' THEN 1 ELSE 0 END) as pending
          FROM turnstile_challenges
          WHERE challenge_time BETWEEN ? AND ?
        `)
        .bind(start.toISOString(), end.toISOString())
        .first<{ total: number; passed: number; failed: number; pending: number }>();

      const total = result?.total || 0;
      const passed = result?.passed || 0;

      return {
        total,
        passed,
        failed: result?.failed || 0,
        pending: result?.pending || 0,
        passRate: total > 0 ? (passed / total) * 100 : 0,
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return { total: 0, passed: 0, failed: 0, pending: 0, passRate: 0 };
    }
  }

  /**
   * 清理过期记录
   */
  async cleanupExpiredRecords(): Promise<number> {
    try {
      const result = await this.db
        .prepare(`
          DELETE FROM turnstile_challenges 
          WHERE challenge_status IN ('expired', 'failed') 
          AND challenge_time < datetime('now', '-7 days')
        `)
        .run();

      return result.meta.changes || 0;
    } catch (error) {
      console.error('Failed to cleanup expired records:', error);
      return 0;
    }
  }

  /**
   * 生成User-Agent哈希
   */
  private async hashUserAgent(userAgent: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(userAgent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  /**
   * 获取Site Key（用于前端）
   */
  getSiteKey(): string {
    return this.siteKey;
  }

  /**
   * 生成挑战页面HTML
   */
  generateChallengeHtml(
    sessionId: string,
    reason: string,
    redirectUrl?: string
  ): string {
    const siteKey = this.siteKey;
    const redirect = redirectUrl || '/';

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>安全验证</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #fff;
    }
    .challenge-container {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 450px;
      width: 90%;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    h1 {
      font-size: 24px;
      margin-bottom: 16px;
      color: #fff;
    }
    .reason {
      color: #888;
      font-size: 14px;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .turnstile-widget {
      display: flex;
      justify-content: center;
      margin: 24px 0;
    }
    .status {
      margin-top: 20px;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      display: none;
    }
    .status.success {
      display: block;
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
    .status.error {
      display: block;
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: #666;
    }
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="challenge-container">
    <h1>🔐 安全验证</h1>
    <p class="reason">${reason}</p>
    <div class="turnstile-widget" id="turnstile-widget"></div>
    <div class="status" id="status"></div>
    <p class="footer">此验证用于确认您是真实用户，而非自动化程序。</p>
  </div>

  <script>
    const sessionId = '${sessionId}';
    const redirectUrl = '${redirect}';
    
    document.addEventListener('DOMContentLoaded', function() {
      turnstile.render('#turnstile-widget', {
        sitekey: '${siteKey}',
        theme: 'dark',
        callback: function(token) {
          verifyChallenge(token);
        },
        'error-callback': function() {
          showStatus('验证失败，请刷新页面重试', 'error');
        },
        'expired-callback': function() {
          showStatus('验证已过期，请重新验证', 'error');
          turnstile.reset();
        }
      });
    });

    async function verifyChallenge(token) {
      const statusEl = document.getElementById('status');
      statusEl.innerHTML = '<span class="loading"></span> 正在验证...';
      statusEl.className = 'status';
      statusEl.style.display = 'block';

      try {
        const response = await fetch('/api/proxy-detection/verify-challenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            token: token,
            timestamp: Date.now()
          })
        });

        const result = await response.json();

        if (result.success) {
          showStatus('验证成功，正在跳转...', 'success');
          setTimeout(function() {
            window.location.href = redirectUrl;
          }, 1000);
        } else {
          showStatus(result.error || '验证失败，请重试', 'error');
          turnstile.reset();
        }
      } catch (error) {
        showStatus('网络错误，请重试', 'error');
        turnstile.reset();
      }
    }

    function showStatus(message, type) {
      const statusEl = document.getElementById('status');
      statusEl.textContent = message;
      statusEl.className = 'status ' + type;
    }
  </script>
</body>
</html>
    `;
  }
}

export function createTurnstileService(
  env: Env,
  config?: {
    secretKey?: string;
    siteKey?: string;
    trustDuration?: number;
    maxRetryCount?: number;
  }
): TurnstileService {
  return new TurnstileService(env, {
    secretKey: config?.secretKey || env.TURNSTILE_SECRET_KEY || '',
    siteKey: config?.siteKey || env.TURNSTILE_SITE_KEY || '',
    trustDuration: config?.trustDuration,
    maxRetryCount: config?.maxRetryCount,
  });
}
