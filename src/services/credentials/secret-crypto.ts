/**
 * @fileoverview 凭据加密模块
 * @description AES-256-GCM 加解密，主密钥 CRED_MASTER_KEY（wrangler secret put）。
 *          为什么 SHA-256 派生而非 PBKDF2：主密钥本身是随机 32 字节 secret（无字典熵问题），
 *          PBKDF2 的暴力破解防护在此场景无增益；派生结果按 isolate 缓存避免每请求重派生。
 * @module services/credentials/secret-crypto
 */

const KEY_CACHE = new Map<string, CryptoKey>();

/** 由主密钥派生 AES-GCM CryptoKey（isolate 内缓存） */
async function deriveKey(masterKey: string): Promise<CryptoKey> {
  const cached = KEY_CACHE.get(masterKey);
  if (cached) return cached;

  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(masterKey));
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  KEY_CACHE.set(masterKey, key);
  return key;
}

/** Uint8Array → base64（分块避免大数组 spread 栈溢出） */
function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * 加密明文凭据 → base64(iv[12B] + ciphertext+tag)
 * GCM 自带完整性校验，密文被篡改时解密直接抛错
 */
export async function encryptSecret(masterKey: string, plaintext: string): Promise<string> {
  const key = await deriveKey(masterKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  const buf = new Uint8Array(12 + ct.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(ct), 12);
  return toBase64(buf);
}

/** 解密（密文非法/主密钥不符/被篡改时抛错，调用方须捕获） */
export async function decryptSecret(masterKey: string, payload: string): Promise<string> {
  const key = await deriveKey(masterKey);
  const buf = fromBase64(payload);
  if (buf.length <= 12) throw new Error('cipher too short');
  const iv = buf.subarray(0, 12);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    buf.subarray(12)
  );
  return new TextDecoder().decode(pt);
}

/**
 * 掩码规则：≥8 字符 → 前4 + '…' + 后4；<8 → 全 '•'（短值打掩码防前缀泄漏）
 * 为什么不返回 '****' 固定串：前4后4 足够运维辨识是否同一把 key，又不构成可利用信息
 */
export function maskSecret(value: string): string {
  const v = String(value ?? '');
  if (v.length >= 8) return `${v.slice(0, 4)}…${v.slice(-4)}`;
  return '•'.repeat(Math.max(v.length, 4));
}
