/**
 * @fileoverview HMAC-SHA256签名服务
 * @description 为Postback提供HMAC签名生成与验证能力 (Taboola等平台需要)
 * @module services/postback/hmac.service
 *
 * 输入:
 *   - 密钥 (secret key)
 *   - 待签名的数据 (原始字符串)
 *
 * 输出:
 *   - HMAC-SHA256签名字符串 (hex格式，64字符)
 *   - 验证结果 (boolean)
 *
 * 逻辑交互:
 *   - 被TaboolaPostbackAdapter调用
 *   - 使用Web Crypto API (crypto.subtle) 实现
 *   - 支持Taboola特定签名格式
 *
 * 技术约束:
 *   - 必须使用Web Standard APIs (crypto.subtle)
 *   - 不能使用Node.js crypto模块
 *   - Cloudflare Workers环境兼容
 */

/**
 * HMAC-SHA256签名服务
 * @description 提供HMAC-SHA256签名生成和验证功能
 */
export class HmacService {
  /**
   * 算法标识符
   * @description 使用HMAC-SHA256算法
   */
  private static readonly ALGORITHM = 'HMAC';
  private static readonly HASH = 'SHA-256';

  /**
   * 生成HMAC-SHA256签名
   *
   * @param secret 密钥字符串 (如: "my-secret-key")
   * @param data 待签名的原始数据 (如: "clickid=123&timestamp=1234567890")
   * @returns Promise<string> hex格式的签名字符串 (64字符)
   *
   * @example
   * ```typescript
   * const hmacService = new HmacService();
   * const signature = await hmacService.sign('my-secret', 'data-to-sign');
   * // 结果: "a1b2c3d4e5f6..." (64个hex字符)
   * ```
   *
   * PRECONDITIONS:
   * - secret非空字符串
   * - data为有效字符串
   *
   * POSTCONDITIONS:
   * - 返回64字符的hex格式签名
   * - 同一输入始终产生相同输出 (确定性)
   *
   * SIDE_EFFECTS:
   * - 无副作用 (纯计算)
   */
  async sign(secret: string, data: string): Promise<string> {
    try {
      // 将密钥和数据转换为Uint8Array
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const dataBuffer = encoder.encode(data);

      // 导入密钥
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: HmacService.ALGORITHM, hash: HmacService.HASH },
        false, //不可提取
        ['sign']
      );

      // 生成签名
      const signatureBuffer = await crypto.subtle.sign(HmacService.ALGORITHM, cryptoKey, dataBuffer);

      // 转换为hex字符串
      return this.bufferToHex(signatureBuffer);
    } catch (error) {
      console.error('[HmacService] sign error:', error);
      throw new Error(`HMAC签名失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 验证HMAC-SHA256签名
   *
   * @param secret 密钥字符串
   * @param data 原始数据
   * @param signature 待验证的签名 (hex格式)
   * @returns Promise<boolean> 签名是否有效
   *
   * @example
   * ```typescript
   * const isValid = await hmacService.verify('my-secret', 'data-to-sign', 'a1b2c3...');
   * // 结果: true 或 false
   * ```
   *
   * PRECONDITIONS:
   * - secret非空字符串
   * - data为有效字符串
   * - signature为有效的hex字符串 (64字符)
   *
   * POSTCONDITIONS:
   * - 返回true表示签名验证通过
   * - 返回false表示签名无效或被篡改
   *
   * SIDE_EFFECTS:
   * - 无副作用 (纯计算)
   */
  async verify(secret: string, data: string, signature: string): Promise<boolean> {
    try {
      // 重新计算签名
      const computedSignature = await this.sign(secret, data);

      // 使用恒定时间比较防止时序攻击
      return this.timingSafeEqual(computedSignature, signature);
    } catch (error) {
      console.error('[HmacService] verify error:', error);
      return false;
    }
  }

  /**
   * 生成Taboola风格的HMAC签名
   *
   * @description Taboola Postback需要特定的签名格式:
   * HMAC-SHA256(token + timestamp, client_secret)
   *
   * @param token Taboola token (通常是clickid或其他标识符)
   * @param timestamp Unix时间戳 (秒或毫秒)
   * @param clientSecret Taboola提供的client_secret
   * @returns Promise<string> hex格式的Taboola签名
   *
   * @example
   * ```typescript
   * const signature = await hmacService.signTaboola(
   *   'clk_1234567890',
   *   Date.now(),
   *   'taboola-client-secret'
   * );
   * ```
   *
   * PRECONDITIONS:
   * - token非空字符串
   * - timestamp为有效数字
   * - clientSecret非空字符串
   *
   * POSTCONDITIONS:
   * - 返回符合Taboola要求的签名格式
   *
   * SIDE_EFFECTS:
   * - 无副作用 (纯计算)
   */
  async signTaboola(token: string, timestamp: number, clientSecret: string): Promise<string> {
    // 构建待签名数据: token + timestamp
    const dataToSign = `${token}${timestamp}`;

    // 使用client_secret作为密钥进行HMAC-SHA256签名
    return this.sign(clientSecret, dataToSign);
  }

  /**
   * 将ArrayBuffer转换为Hex字符串
   *
   * @param buffer ArrayBuffer对象
   * @returns hex格式字符串
   *
   * @private 内部方法
   */
  private bufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * 恒定时间字符串比较 (防时序攻击)
   *
   * @param a 字符串a
   * @param b 字符串b
   * @returns 是否相等
   *
   * @description 使用XOR操作实现恒定时间比较，
   * 防止攻击者通过响应时间差异猜测正确签名
   *
   * @private 内部方法
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
