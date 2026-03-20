/**
 * @fileoverview 设备指纹生成器 - 结构化指纹编码方案 (客户端专用)
 * @description 
 * 指纹结构：[硬件稳定(16位)].[硬件易变(4-8位)]-[软件稳定(8位)].[软件易变(4-8位)]
 * 使用 Base32 编码，小写字母+数字，URL安全
 * 
 * 注意：此文件只能在浏览器环境中使用，包含 DOM API 调用
 * 
 * 硬件稳定部分包含：屏幕、硬件规格、Canvas指纹、外设信息（蓝牙、触摸板、电池、音响）
 * 硬件易变部分包含：时区、语言、屏幕方向、颜色模式
 * 软件稳定部分包含：操作系统、浏览器引擎、平台架构、存储支持
 * 软件易变部分包含：浏览器版本、插件、字体、WebGL、网络信息
 * 
 * @module utils/deviceFingerprint
 * @client-only
 */

// 声明浏览器全局变量
declare const window: Window & typeof globalThis;
declare const document: Document;
declare const screen: Screen;
declare const navigator: Navigator;
declare const indexedDB: IDBFactory;

// Base32 字符集（小写，去掉易混淆的字符 l 和 o）
const BASE32_CHARS = '0123456789abcdefghijkmnpqrstuvwxyz';

/**
 * 检查是否在浏览器环境中
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * 将数字转换为 Base32 字符串
 * @param num 数字
 * @param length 输出长度
 * @returns Base32 字符串
 */
function toBase32(num: number, length: number): string {
  let result = '';
  let n = Math.abs(num);
  do {
    result = BASE32_CHARS[n % 32] + result;
    n = Math.floor(n / 32);
  } while (n > 0);
  
  return result.padStart(length, '0');
}

/**
 * 计算字符串哈希值（FNV-1a 算法变体）
 * @param str 输入字符串
 * @returns 哈希数字
 */
function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

/**
 * 提取特征并编码
 * @param features 特征数组
 * @param bitsPerFeature 每个特征的位数
 * @returns 编码后的字符串
 */
function encodeFeatures(features: number[], bitsPerFeature: number = 5): string {
  let result = '';
  for (const feature of features) {
    const maxValue = Math.pow(2, bitsPerFeature) - 1;
    const normalizedValue = Math.abs(feature) % maxValue;
    result += toBase32(normalizedValue, Math.ceil(bitsPerFeature / 5));
  }
  return result;
}

// ============================================
// 设备能力检测工具函数
// ============================================

/**
 * 检测蓝牙支持
 * @returns 蓝牙支持编码 (0-3)
 */
function detectBluetooth(): number {
  if (!isBrowser()) return 0;
  const nav = navigator as any;
  if (nav.bluetooth) {
    return nav.bluetooth.getAvailability ? 2 : 1;
  }
  return 0;
}

/**
 * 检测触摸板/触控设备
 * @returns 触摸板编码 (0-7)
 */
function detectTouchpad(): number {
  if (!isBrowser()) return 0;
  let code = 0;
  
  // 最大触控点数
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  if (maxTouchPoints > 0) code += 1;
  if (maxTouchPoints >= 5) code += 2;
  
  // 指针类型检测
  if (window.matchMedia('(pointer: coarse)').matches) {
    code += 4;
  }
  
  return code % 8;
}

/**
 * 检测电池信息（异步）
 * @returns Promise<电池编码 (0-7)>
 */
async function detectBattery(): Promise<number> {
  if (!isBrowser()) return 0;
  try {
    const nav = navigator as any;
    if (!nav.getBattery) return 0;
    
    const battery = await nav.getBattery();
    let code = 1; // 支持电池API
    
    if (battery.charging) code += 2;
    if (battery.level > 0.5) code += 4;
    
    return code % 8;
  } catch (e) {
    return 0;
  }
}

/**
 * 检测音频/音响设备
 * @returns Promise<音频编码 (0-7)>
 */
async function detectAudioDevices(): Promise<number> {
  if (!isBrowser()) return 0;
  try {
    let code = 0;
    
    // 检查 MediaDevices API
    if (navigator.mediaDevices) {
      code += 1;
      
      // 尝试枚举设备
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter((d: MediaDeviceInfo) => d.kind === 'audiooutput');
      
      if (audioOutputs.length > 0) code += 2;
      if (audioOutputs.length > 1) code += 4;
    }
    
    // 检查 AudioContext
    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) code += 1;
    
    return code % 8;
  } catch (e) {
    return 0;
  }
}

/**
 * 检测显卡/GPU信息
 * @returns GPU编码 (0-15)
 */
function detectGPU(): number {
  if (!isBrowser()) return 0;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 0;
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 1;
    
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    
    let code = 0;
    
    // 根据厂商编码
    if (vendor.includes('NVIDIA')) code = 1;
    else if (vendor.includes('AMD') || vendor.includes('ATI')) code = 2;
    else if (vendor.includes('Intel')) code = 3;
    else if (vendor.includes('Apple')) code = 4;
    else if (vendor.includes('Qualcomm')) code = 5;
    else if (vendor.includes('Mali')) code = 6;
    else if (vendor.includes('Adreno')) code = 7;
    else code = 8;
    
    // 根据渲染器判断性能级别
    if (/RTX|RX [6-9]|GTX [1-9][0-9]/.test(renderer)) code += 8;
    
    return code % 16;
  } catch (e) {
    return 0;
  }
}

/**
 * 生成 Canvas 指纹
 * @returns Canvas 指纹字符串
 */
function generateCanvasFingerprint(): string {
  if (!isBrowser()) return 'canvas_not_supported';
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'canvas_not_supported';
    
    canvas.width = 280;
    canvas.height = 60;
    
    // 背景
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 文字
    ctx.font = '16px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText('CFTracking Device Fingerprint', 10, 25);
    
    ctx.font = '12px Times New Roman';
    ctx.fillStyle = '#666';
    ctx.fillText(`Time: ${Date.now()}`, 10, 45);
    
    // 几何图形
    ctx.strokeStyle = '#007bff';
    ctx.beginPath();
    ctx.arc(240, 30, 15, 0, Math.PI * 2);
    ctx.stroke();
    
    // 渐变
    const gradient = ctx.createLinearGradient(150, 0, 280, 60);
    gradient.addColorStop(0, 'rgba(255,0,0,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,255,0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(150, 35, 120, 20);
    
    return canvas.toDataURL('image/png');
  } catch (e) {
    return 'canvas_error';
  }
}

/**
 * 检测可用字体
 * @returns 字体检测结果字符串
 */
function detectFonts(): string {
  if (!isBrowser()) return '';
  const testFonts = [
    'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana',
    'Helvetica', 'Tahoma', 'Trebuchet MS', 'Palatino Linotype',
    'Impact', 'Comic Sans MS', 'Arial Black'
  ];
  
  const availableFonts: string[] = [];
  const testString = 'mmmmmmmmmmlli';
  const testSize = '72px';
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // 基准测量（使用默认字体）
  ctx.font = `${testSize} monospace`;
  const baselineWidth = ctx.measureText(testString).width;
  
  for (const font of testFonts) {
    ctx.font = `${testSize} "${font}", monospace`;
    const width = ctx.measureText(testString).width;
    // 如果宽度不同，说明字体可用
    if (width !== baselineWidth) {
      availableFonts.push(font);
    }
  }
  
  return availableFonts.join(',');
}

/**
 * 获取 WebGL 信息
 * @returns WebGL 渲染器信息
 */
function getWebGLInfo(): string {
  if (!isBrowser()) return 'webgl_not_supported';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'webgl_not_supported';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      return `${vendor}|${renderer}`;
    }
    return 'webgl_no_debug_info';
  } catch (e) {
    return 'webgl_error';
  }
}

// ============================================
// 指纹各部分生成函数
// ============================================

/**
 * 硬件稳定部分 (16位)
 * 变化频率：低 - 屏幕、硬件规格、Canvas指纹、外设信息
 */
async function generateHardwareStablePart(): Promise<string> {
  if (!isBrowser()) return '0000000000000000';
  
  const features: number[] = [];
  
  // 1. 屏幕分辨率哈希 (4位)
  const screenRes = `${screen.width}x${screen.height}x${screen.colorDepth}`;
  features.push(hashString(screenRes) % 1048576);
  
  // 2. 硬件规格：CPU核心数 + 内存 + GPU (4位)
  const cores = navigator.hardwareConcurrency || 0;
  const memory = (navigator as any).deviceMemory || 0;
  const gpuCode = detectGPU();
  features.push((cores * 1000 + memory * 100 + gpuCode) % 1048576);
  
  // 3. Canvas 指纹哈希 (4位)
  const canvasHash = generateCanvasFingerprint();
  features.push(hashString(canvasHash) % 1048576);
  
  // 4. 外设信息：蓝牙 + 触摸板 + 电池 + 音响 (4位)
  const bluetoothCode = detectBluetooth();
  const touchpadCode = detectTouchpad();
  const batteryCode = await detectBattery();
  const audioCode = await detectAudioDevices();
  
  const peripheralCode = (bluetoothCode * 512 + touchpadCode * 64 + batteryCode * 8 + audioCode);
  features.push(peripheralCode % 1048576);
  
  return encodeFeatures(features, 20);
}

/**
 * 硬件易变部分 (4-8位)
 * 变化频率：中 - 时区、语言、屏幕方向、颜色模式
 */
function generateHardwareVolatilePart(): string {
  if (!isBrowser()) return '0000';
  
  const features: number[] = [];
  
  // 1. 时区偏移 (2位)
  const timezoneOffset = new Date().getTimezoneOffset();
  features.push(Math.abs(timezoneOffset) % 1024);
  
  // 2. 语言设置 (2位)
  const language = navigator.language || 'en';
  features.push(hashString(language) % 1024);
  
  // 3. 屏幕方向 (1位)
  const orientation = (screen as any).orientation?.type || 'unknown';
  const orientationCode = orientation.includes('portrait') ? 1 : 
                          orientation.includes('landscape') ? 2 : 0;
  features.push(orientationCode % 32);
  
  // 4. 系统颜色模式 (1-3位)
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 1 : 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 2 : 0;
  features.push((colorScheme * 10 + reducedMotion) % 32);
  
  return encodeFeatures(features, 10).substring(0, 6);
}

/**
 * 软件稳定部分 (8位)
 * 变化频率：低 - 操作系统、浏览器引擎、平台
 */
function generateSoftwareStablePart(): string {
  if (!isBrowser()) return '00000000';
  
  const features: number[] = [];
  
  const ua = navigator.userAgent;
  let osCode = 0;
  let osVersion = 0;
  
  // 操作系统检测
  if (/Windows NT 10/.test(ua)) { osCode = 1; osVersion = 10; }
  else if (/Windows NT 6.3/.test(ua)) { osCode = 1; osVersion = 8; }
  else if (/Mac OS X 10_15/.test(ua) || /macOS/.test(ua)) { osCode = 2; osVersion = 15; }
  else if (/iPhone OS 17|iPad OS 17/.test(ua)) { osCode = 3; osVersion = 17; }
  else if (/iPhone OS 16|iPad OS 16/.test(ua)) { osCode = 3; osVersion = 16; }
  else if (/Android 14/.test(ua)) { osCode = 4; osVersion = 14; }
  else if (/Android 13/.test(ua)) { osCode = 4; osVersion = 13; }
  else if (/Linux/.test(ua)) { osCode = 5; osVersion = 1; }
  
  features.push((osCode * 100 + osVersion) % 32768);
  
  // 浏览器引擎
  let engineCode = 0;
  if (/Chrome\/[0-9]+/.test(ua)) engineCode = 1;
  else if (/Firefox\/[0-9]+/.test(ua)) engineCode = 2;
  else if (/Safari\/[0-9]+/.test(ua) && /Version\/[0-9]+/.test(ua)) engineCode = 3;
  else if (/Edg\/[0-9]+/.test(ua)) engineCode = 4;
  
  features.push(engineCode % 1024);
  
  // 平台架构
  const platform = navigator.platform || '';
  const archCode = platform.includes('Win64') || platform.includes('x86_64') ? 1 : 
                   platform.includes('arm') ? 2 : 0;
  features.push(archCode % 32);
  
  // Cookie/LocalStorage/IndexedDB 支持
  const cookieSupport = navigator.cookieEnabled ? 1 : 0;
  const lsSupport = typeof Storage !== 'undefined' ? 2 : 0;
  const idbSupport = typeof indexedDB !== 'undefined' ? 4 : 0;
  features.push((cookieSupport + lsSupport + idbSupport) % 1024);
  
  return encodeFeatures(features, 15).substring(0, 8);
}

/**
 * 软件易变部分 (4-8位)
 * 变化频率：高 - IP、浏览器版本、插件、字体
 */
function generateSoftwareVolatilePart(): string {
  if (!isBrowser()) return '0000';
  
  const features: number[] = [];
  
  const ua = navigator.userAgent;
  let version = 0;
  
  // 浏览器版本号
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  const firefoxMatch = ua.match(/Firefox\/(\d+)/);
  const safariMatch = ua.match(/Version\/(\d+)/);
  const edgeMatch = ua.match(/Edg\/(\d+)/);
  
  if (chromeMatch) version = parseInt(chromeMatch[1], 10);
  else if (firefoxMatch) version = parseInt(firefoxMatch[1], 10);
  else if (safariMatch) version = parseInt(safariMatch[1], 10);
  else if (edgeMatch) version = parseInt(edgeMatch[1], 10);
  
  features.push(version % 1024);
  
  // 插件数量
  const pluginCount = navigator.plugins?.length || 0;
  features.push(pluginCount % 32);
  
  // 字体列表哈希
  const fontHash = detectFonts();
  features.push(hashString(fontHash) % 1024);
  
  // WebGL 渲染器信息
  const webglInfo = getWebGLInfo();
  features.push(hashString(webglInfo) % 1024);
  
  return encodeFeatures(features, 10).substring(0, 7);
}

// ============================================
// 主函数和工具函数
// ============================================

/**
 * 生成完整设备指纹
 * 格式：[硬件稳定(16位)].[硬件易变(4-8位)]-[软件稳定(8位)].[软件易变(4-8位)]
 * @returns Promise<结构化设备指纹>
 */
export async function generateDeviceFingerprint(): Promise<string> {
  if (!isBrowser()) {
    return '0000000000000000.0000-00000000.0000';
  }
  
  const hardwareStable = await generateHardwareStablePart();
  const hardwareVolatile = generateHardwareVolatilePart();
  const softwareStable = generateSoftwareStablePart();
  const softwareVolatile = generateSoftwareVolatilePart();
  
  return `${hardwareStable}.${hardwareVolatile}-${softwareStable}.${softwareVolatile}`;
}

/**
 * 同步版本（不包含异步检测如电池）
 * @returns 结构化设备指纹
 */
export function generateDeviceFingerprintSync(): string {
  if (!isBrowser()) {
    return '0000000000000000.0000-00000000.0000';
  }
  
  const hardwareVolatile = generateHardwareVolatilePart();
  const softwareStable = generateSoftwareStablePart();
  const softwareVolatile = generateSoftwareVolatilePart();
  
  // 硬件稳定部分使用简化版本（不含异步检测）
  const features: number[] = [];
  
  const screenRes = `${screen.width}x${screen.height}x${screen.colorDepth}`;
  features.push(hashString(screenRes) % 1048576);
  
  const cores = navigator.hardwareConcurrency || 0;
  const memory = (navigator as any).deviceMemory || 0;
  const gpuCode = detectGPU();
  features.push((cores * 1000 + memory * 100 + gpuCode) % 1048576);
  
  const canvasHash = generateCanvasFingerprint();
  features.push(hashString(canvasHash) % 1048576);
  
  // 简化外设检测（不含电池和音频）
  const bluetoothCode = detectBluetooth();
  const touchpadCode = detectTouchpad();
  const peripheralCode = (bluetoothCode * 64 + touchpadCode);
  features.push(peripheralCode % 1048576);
  
  const hardwareStable = encodeFeatures(features, 20);
  
  return `${hardwareStable}.${hardwareVolatile}-${softwareStable}.${softwareVolatile}`;
}

/**
 * 解析指纹字符串
 * @param fingerprint 指纹字符串
 * @returns 解析后的各部分
 */
export function parseDeviceFingerprint(fingerprint: string): {
  hardwareStable: string;
  hardwareVolatile: string;
  softwareStable: string;
  softwareVolatile: string;
} | null {
  const match = fingerprint.match(/^([a-z0-9]{16})\.([a-z0-9]{4,8})-([a-z0-9]{8})\.([a-z0-9]{4,8})$/);
  if (!match) return null;
  
  return {
    hardwareStable: match[1] || '',
    hardwareVolatile: match[2] || '',
    softwareStable: match[3] || '',
    softwareVolatile: match[4] || ''
  };
}

/**
 * 比较两个指纹的相似度
 * @param fp1 指纹1
 * @param fp2 指纹2
 * @returns 相似度分数 (0-100)
 */
export function compareFingerprints(fp1: string, fp2: string): number {
  const parts1 = parseDeviceFingerprint(fp1);
  const parts2 = parseDeviceFingerprint(fp2);
  
  if (!parts1 || !parts2) return 0;
  
  let score = 0;
  let maxScore = 0;
  
  // 硬件稳定部分权重最高 (40%)
  maxScore += 40;
  if (parts1.hardwareStable === parts2.hardwareStable) {
    score += 40;
  } else {
    let matches = 0;
    for (let i = 0; i < 16; i++) {
      if (parts1.hardwareStable[i] === parts2.hardwareStable[i]) matches++;
    }
    score += (matches / 16) * 40;
  }
  
  // 软件稳定部分权重次高 (30%)
  maxScore += 30;
  if (parts1.softwareStable === parts2.softwareStable) {
    score += 30;
  } else {
    let matches = 0;
    for (let i = 0; i < 8; i++) {
      if (parts1.softwareStable[i] === parts2.softwareStable[i]) matches++;
    }
    score += (matches / 8) * 30;
  }
  
  // 硬件易变部分权重较低 (20%)
  maxScore += 20;
  const hwVolatileMatch = Math.min(
    parts1.hardwareVolatile.length,
    parts2.hardwareVolatile.length
  );
  let hwMatches = 0;
  for (let i = 0; i < hwVolatileMatch; i++) {
    if (parts1.hardwareVolatile[i] === parts2.hardwareVolatile[i]) hwMatches++;
  }
  score += (hwMatches / hwVolatileMatch) * 20;
  
  // 软件易变部分权重最低 (10%)
  maxScore += 10;
  const swVolatileMatch = Math.min(
    parts1.softwareVolatile.length,
    parts2.softwareVolatile.length
  );
  let swMatches = 0;
  for (let i = 0; i < swVolatileMatch; i++) {
    if (parts1.softwareVolatile[i] === parts2.softwareVolatile[i]) swMatches++;
  }
  score += (swMatches / swVolatileMatch) * 10;
  
  return Math.round((score / maxScore) * 100);
}

/**
 * 获取指纹的详细分解信息（去重显示）
 * @param fingerprint 指纹字符串
 * @returns 人类可读的分解信息
 */
export function getFingerprintDetails(fingerprint: string): {
  fullFingerprint: string;
  hardware: {
    stable: string;
    volatile: string;
    description: string;
    features: string[];
  };
  software: {
    stable: string;
    volatile: string;
    description: string;
    features: string[];
  };
  stability: 'high' | 'medium' | 'low';
} {
  const parts = parseDeviceFingerprint(fingerprint);
  
  if (!parts) {
    return {
      fullFingerprint: fingerprint,
      hardware: { stable: '', volatile: '', description: 'Invalid fingerprint', features: [] },
      software: { stable: '', volatile: '', description: 'Invalid fingerprint', features: [] },
      stability: 'low'
    };
  }
  
  // 根据易变部分的长度判断稳定性
  const volatileLength = parts.hardwareVolatile.length + parts.softwareVolatile.length;
  const stability = volatileLength <= 6 ? 'high' : volatileLength <= 10 ? 'medium' : 'low';
  
  // 硬件特征（去重）
  const hardwareFeatures = [
    `Screen: ${parts.hardwareStable.substring(0, 4)}`,
    `Hardware: ${parts.hardwareStable.substring(4, 8)}`,
    `Canvas: ${parts.hardwareStable.substring(8, 12)}`,
    `Peripherals: ${parts.hardwareStable.substring(12, 16)}`
  ];
  
  // 软件特征（去重）
  const softwareFeatures = [
    `OS: ${parts.softwareStable.substring(0, 3)}`,
    `Engine: ${parts.softwareStable.substring(3, 5)}`,
    `Arch: ${parts.softwareStable.substring(5, 6)}`,
    `Storage: ${parts.softwareStable.substring(6, 8)}`
  ];
  
  return {
    fullFingerprint: fingerprint,
    hardware: {
      stable: parts.hardwareStable,
      volatile: parts.hardwareVolatile,
      description: `Screen:${parts.hardwareStable.substring(0,4)}|Hardware:${parts.hardwareStable.substring(4,8)}|Canvas:${parts.hardwareStable.substring(8,12)}|Peripherals:${parts.hardwareStable.substring(12,16)}`,
      features: hardwareFeatures
    },
    software: {
      stable: parts.softwareStable,
      volatile: parts.softwareVolatile,
      description: `OS:${parts.softwareStable.substring(0,3)}|Engine:${parts.softwareStable.substring(3,5)}|Arch:${parts.softwareStable.substring(5,6)}|Storage:${parts.softwareStable.substring(6,8)}`,
      features: softwareFeatures
    },
    stability
  };
}

/**
 * 获取设备能力报告
 * @returns Promise<设备能力详细信息>
 */
export async function getDeviceCapabilities(): Promise<{
  bluetooth: boolean;
  touchpad: { supported: boolean; maxTouchPoints: number };
  battery: { supported: boolean; charging?: boolean; level?: number };
  audio: { supported: boolean; outputDevices: number };
  gpu: { vendor: string; renderer: string };
}> {
  if (!isBrowser()) {
    return {
      bluetooth: false,
      touchpad: { supported: false, maxTouchPoints: 0 },
      battery: { supported: false },
      audio: { supported: false, outputDevices: 0 },
      gpu: { vendor: 'unknown', renderer: 'unknown' }
    };
  }
  
  const nav = navigator as any;
  
  // 蓝牙
  const bluetooth = !!nav.bluetooth;
  
  // 触摸板
  const touchpad = {
    supported: navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches,
    maxTouchPoints: navigator.maxTouchPoints || 0
  };
  
  // 电池
  let batteryInfo: any = { supported: !!nav.getBattery };
  if (nav.getBattery) {
    try {
      const battery = await nav.getBattery();
      batteryInfo.charging = battery.charging;
      batteryInfo.level = battery.level;
    } catch (e) {
      batteryInfo.supported = false;
    }
  }
  
  // 音频
  let audioInfo = { supported: false, outputDevices: 0 };
  try {
    if (navigator.mediaDevices) {
      audioInfo.supported = true;
      const devices = await navigator.mediaDevices.enumerateDevices();
      audioInfo.outputDevices = devices.filter((d: MediaDeviceInfo) => d.kind === 'audiooutput').length;
    }
  } catch (e) {
    // 忽略错误
  }
  
  // GPU
  let gpuInfo = { vendor: 'unknown', renderer: 'unknown' };
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuInfo.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        gpuInfo.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch (e) {
    // 忽略错误
  }
  
  return {
    bluetooth,
    touchpad,
    battery: batteryInfo,
    audio: audioInfo,
    gpu: gpuInfo
  };
}

// 导出默认函数
export default generateDeviceFingerprint;
