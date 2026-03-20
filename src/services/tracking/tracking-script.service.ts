/**
 * @fileoverview Tracking Script 服务
 * @description 实现 Keitaro 风格的客户端跟踪脚本，集成结构化设备指纹
 * @module services/tracking/tracking-script.service
 * 
 * 功能:
 * - 生成跟踪脚本代码
 * - 处理客户端点击跟踪
 * - 处理转化上报
 * - 支持 Sub ID 更新
 * - 集成结构化设备指纹 (硬件稳定/易变 + 软件稳定/易变)
 */

import type { Env } from '@/config/env';

export interface TrackingScriptConfig {
  campaignId: string;
  domain: string;
  collectNonUniqueClicks?: boolean;
  base64Encode?: boolean;
}

export interface ConversionData {
  clickId: string;
  revenue?: number;
  status: 'lead' | 'sale' | 'rejected';
  tid?: string;
  subIds?: Record<string, string>;
}

export class TrackingScriptService {
  constructor(_env: Env) {
    // env 可用于后续扩展，如获取配置等
  }

  /**
   * 生成跟踪脚本代码 (用于 Landing Page)
   * 集成结构化设备指纹生成器
   */
  generateTrackingScript(config: TrackingScriptConfig): string {
    const { campaignId, domain, collectNonUniqueClicks = false } = config;
    const workerUrl = `https://${domain}`;

    const script = `
<!-- CFTracking Tracking Script -->
<script>
(function() {
  'use strict';
  
  const CONFIG = {
    campaignId: '${campaignId}',
    workerUrl: '${workerUrl}',
    collectNonUniqueClicks: ${collectNonUniqueClicks}
  };

  // Base32 字符集（小写，去掉易混淆的 l 和 o）
  const BASE32_CHARS = '0123456789abcdefghijkmnpqrstuvwxyz';

  /**
   * 将数字转换为 Base32 字符串
   */
  function toBase32(num, length) {
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
   */
  function hashString(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }

  /**
   * 提取特征并编码
   */
  function encodeFeatures(features, bitsPerFeature) {
    bitsPerFeature = bitsPerFeature || 5;
    let result = '';
    for (let i = 0; i < features.length; i++) {
      const maxValue = Math.pow(2, bitsPerFeature) - 1;
      const normalizedValue = Math.abs(features[i]) % maxValue;
      result += toBase32(normalizedValue, Math.ceil(bitsPerFeature / 5));
    }
    return result;
  }

  // ============================================
  // 设备能力检测工具函数
  // ============================================

  /**
   * 检测蓝牙支持
   */
  function detectBluetooth() {
    const nav = navigator;
    if (nav.bluetooth) {
      return nav.bluetooth.getAvailability ? 2 : 1;
    }
    return 0;
  }

  /**
   * 检测触摸板/触控设备
   */
  function detectTouchpad() {
    let code = 0;
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    if (maxTouchPoints > 0) code += 1;
    if (maxTouchPoints >= 5) code += 2;
    if (window.matchMedia('(pointer: coarse)').matches) {
      code += 4;
    }
    return code % 8;
  }

  /**
   * 检测电池信息（异步）
   */
  async function detectBattery() {
    try {
      const nav = navigator;
      if (!nav.getBattery) return 0;
      const battery = await nav.getBattery();
      let code = 1;
      if (battery.charging) code += 2;
      if (battery.level > 0.5) code += 4;
      return code % 8;
    } catch (e) {
      return 0;
    }
  }

  /**
   * 检测音频/音响设备
   */
  async function detectAudioDevices() {
    try {
      let code = 0;
      if (navigator.mediaDevices) {
        code += 1;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(function(d) { return d.kind === 'audiooutput'; });
        if (audioOutputs.length > 0) code += 2;
        if (audioOutputs.length > 1) code += 4;
      }
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) code += 1;
      return code % 8;
    } catch (e) {
      return 0;
    }
  }

  /**
   * 检测显卡/GPU信息
   */
  function detectGPU() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 0;
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return 1;
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      let code = 0;
      if (vendor.indexOf('NVIDIA') !== -1) code = 1;
      else if (vendor.indexOf('AMD') !== -1 || vendor.indexOf('ATI') !== -1) code = 2;
      else if (vendor.indexOf('Intel') !== -1) code = 3;
      else if (vendor.indexOf('Apple') !== -1) code = 4;
      else if (vendor.indexOf('Qualcomm') !== -1) code = 5;
      else if (vendor.indexOf('Mali') !== -1) code = 6;
      else if (vendor.indexOf('Adreno') !== -1) code = 7;
      else code = 8;
      if (/RTX|RX [6-9]|GTX [1-9][0-9]/.test(renderer)) code += 8;
      return code % 16;
    } catch (e) {
      return 0;
    }
  }

  /**
   * 生成 Canvas 指纹
   */
  function generateCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'canvas_not_supported';
      canvas.width = 280;
      canvas.height = 60;
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '16px Arial';
      ctx.fillStyle = '#333';
      ctx.fillText('CFTracking Device Fingerprint', 10, 25);
      ctx.font = '12px Times New Roman';
      ctx.fillStyle = '#666';
      ctx.fillText('Time: ' + Date.now(), 10, 45);
      ctx.strokeStyle = '#007bff';
      ctx.beginPath();
      ctx.arc(240, 30, 15, 0, Math.PI * 2);
      ctx.stroke();
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
   */
  function detectFonts() {
    const testFonts = [
      'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana',
      'Helvetica', 'Tahoma', 'Trebuchet MS', 'Palatino Linotype',
      'Impact', 'Comic Sans MS', 'Arial Black'
    ];
    const availableFonts = [];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.font = testSize + ' monospace';
    const baselineWidth = ctx.measureText(testString).width;
    for (let i = 0; i < testFonts.length; i++) {
      ctx.font = testSize + ' "' + testFonts[i] + '", monospace';
      const width = ctx.measureText(testString).width;
      if (width !== baselineWidth) {
        availableFonts.push(testFonts[i]);
      }
    }
    return availableFonts.join(',');
  }

  /**
   * 获取 WebGL 信息
   */
  function getWebGLInfo() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'webgl_not_supported';
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return vendor + '|' + renderer;
      }
      return 'webgl_no_debug_info';
    } catch (e) {
      return 'webgl_error';
    }
  }

  // ============================================
  // 结构化指纹各部分生成函数
  // ============================================

  /**
   * 硬件稳定部分 (16位)
   * 变化频率：低 - 屏幕、硬件规格、Canvas指纹、外设信息
   */
  async function generateHardwareStablePart() {
    const features = [];
    
    // 1. 屏幕分辨率哈希 (4位)
    const screenRes = screen.width + 'x' + screen.height + 'x' + screen.colorDepth;
    features.push(hashString(screenRes) % 1048576);
    
    // 2. 硬件规格：CPU核心数 + 内存 + GPU (4位)
    const cores = navigator.hardwareConcurrency || 0;
    const memory = navigator.deviceMemory || 0;
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
  function generateHardwareVolatilePart() {
    const features = [];
    
    // 1. 时区偏移 (2位)
    const timezoneOffset = new Date().getTimezoneOffset();
    features.push(Math.abs(timezoneOffset) % 1024);
    
    // 2. 语言设置 (2位)
    const language = navigator.language || 'en';
    features.push(hashString(language) % 1024);
    
    // 3. 屏幕方向 (1位)
    const orientation = screen.orientation ? screen.orientation.type : 'unknown';
    const orientationCode = orientation.indexOf('portrait') !== -1 ? 1 : 
                            orientation.indexOf('landscape') !== -1 ? 2 : 0;
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
  function generateSoftwareStablePart() {
    const features = [];
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
    if (/Chrome\\/[0-9]+/.test(ua)) engineCode = 1;
    else if (/Firefox\\/[0-9]+/.test(ua)) engineCode = 2;
    else if (/Safari\\/[0-9]+/.test(ua) && /Version\\/[0-9]+/.test(ua)) engineCode = 3;
    else if (/Edg\\/[0-9]+/.test(ua)) engineCode = 4;
    features.push(engineCode % 1024);
    
    // 平台架构
    const platform = navigator.platform || '';
    const archCode = platform.indexOf('Win64') !== -1 || platform.indexOf('x86_64') !== -1 ? 1 : 
                     platform.indexOf('arm') !== -1 ? 2 : 0;
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
   * 变化频率：高 - 浏览器版本、插件、字体、WebGL
   */
  function generateSoftwareVolatilePart() {
    const features = [];
    const ua = navigator.userAgent;
    let version = 0;
    
    // 浏览器版本号
    const chromeMatch = ua.match(/Chrome\\/(\\d+)/);
    const firefoxMatch = ua.match(/Firefox\\/(\\d+)/);
    const safariMatch = ua.match(/Version\\/(\\d+)/);
    const edgeMatch = ua.match(/Edg\\/(\\d+)/);
    
    if (chromeMatch) version = parseInt(chromeMatch[1], 10);
    else if (firefoxMatch) version = parseInt(firefoxMatch[1], 10);
    else if (safariMatch) version = parseInt(safariMatch[1], 10);
    else if (edgeMatch) version = parseInt(edgeMatch[1], 10);
    
    features.push(version % 1024);
    
    // 插件数量
    const pluginCount = navigator.plugins ? navigator.plugins.length : 0;
    features.push(pluginCount % 32);
    
    // 字体列表哈希
    const fontHash = detectFonts();
    features.push(hashString(fontHash) % 1024);
    
    // WebGL 渲染器信息
    const webglInfo = getWebGLInfo();
    features.push(hashString(webglInfo) % 1024);
    
    return encodeFeatures(features, 10).substring(0, 7);
  }

  /**
   * 生成完整结构化设备指纹
   * 格式：[硬件稳定(16位)].[硬件易变(4-8位)]-[软件稳定(8位)].[软件易变(4-8位)]
   */
  async function generateStructuredFingerprint() {
    const hardwareStable = await generateHardwareStablePart();
    const hardwareVolatile = generateHardwareVolatilePart();
    const softwareStable = generateSoftwareStablePart();
    const softwareVolatile = generateSoftwareVolatilePart();
    return hardwareStable + '.' + hardwareVolatile + '-' + softwareStable + '.' + softwareVolatile;
  }

  // 获取 URL 参数
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      clickId: params.get('clickid') || params.get('subid'),
      subId1: params.get('subid1') || params.get('sub1'),
      subId2: params.get('subid2') || params.get('sub2'),
      subId3: params.get('subid3') || params.get('sub3'),
      subId4: params.get('subid4') || params.get('sub4'),
      subId5: params.get('subid5') || params.get('sub5'),
    };
  }

  // 获取 UTM 参数
  function getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
      utm_id: params.get('utm_id') || '',
    };
  }

  // 获取设备信息
  async function getDeviceInfo() {
    const fingerprint = await generateStructuredFingerprint();
    return {
      fingerprint: fingerprint,
      screenResolution: screen.width + 'x' + screen.height,
      screenColorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      language: navigator.language,
      languages: navigator.languages ? navigator.languages.join(',') : navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: navigator.deviceMemory || 0,
      touchSupport: 'ontouchstart' in window ? 1 : 0,
      cookieEnabled: navigator.cookieEnabled ? 1 : 0,
      doNotTrack: navigator.doNotTrack || '',
    };
  }

  // 获取或创建 visitor ID
  function getVisitorId() {
    let visitorId = localStorage.getItem('cf_visitor_id');
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('cf_visitor_id', visitorId);
    }
    return visitorId;
  }

  // 发送跟踪请求
  async function trackVisit() {
    const params = getUrlParams();
    const utmParams = getUTMParams();
    const deviceInfo = await getDeviceInfo();
    const visitorId = getVisitorId();
    
    // 检查是否已跟踪（避免重复）
    const trackedKey = 'cf_tracked_' + CONFIG.campaignId;
    if (!CONFIG.collectNonUniqueClicks && sessionStorage.getItem(trackedKey)) {
      return;
    }
    
    const trackData = {
      campaignId: CONFIG.campaignId,
      clickId: params.clickId,
      visitorId: visitorId,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      subId1: params.subId1,
      subId2: params.subId2,
      subId3: params.subId3,
      subId4: params.subId4,
      subId5: params.subId5,
      // UTM 参数
      utmSource: utmParams.utm_source,
      utmMedium: utmParams.utm_medium,
      utmCampaign: utmParams.utm_campaign,
      utmTerm: utmParams.utm_term,
      utmContent: utmParams.utm_content,
      utmId: utmParams.utm_id,
      // 结构化设备指纹信息
      deviceFingerprint: deviceInfo.fingerprint,
      screenResolution: deviceInfo.screenResolution,
      screenColorDepth: deviceInfo.screenColorDepth,
      timezone: deviceInfo.timezone,
      timezoneOffset: deviceInfo.timezoneOffset,
      language: deviceInfo.language,
      languages: deviceInfo.languages,
      platform: deviceInfo.platform,
      hardwareConcurrency: deviceInfo.hardwareConcurrency,
      deviceMemory: deviceInfo.deviceMemory,
      touchSupport: deviceInfo.touchSupport,
      cookieEnabled: deviceInfo.cookieEnabled,
      doNotTrack: deviceInfo.doNotTrack,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(CONFIG.workerUrl + '/api/tracking/script/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackData)
      });
      
      if (response.ok) {
        const result = await response.json();
        sessionStorage.setItem(trackedKey, '1');
        
        // 触发 ready 回调
        if (window.KTracking && window.KTracking._readyCallbacks) {
          window.KTracking._readyCallbacks.forEach(function(cb) {
            cb(result.subId || params.clickId, result.token);
          });
        }
      }
    } catch (err) {
      console.error('[CFTracking] Track error:', err);
    }
  }

  // KTracking 全局对象
  window.KTracking = {
    _readyCallbacks: [],
    
    // 页面加载完成后执行
    ready: function(callback) {
      if (document.readyState === 'complete') {
        const params = getUrlParams();
        callback(params.clickId, null);
      } else {
        this._readyCallbacks.push(callback);
      }
    },

    // 上报转化
    reportConversion: async function(payout, status, params, callback) {
      const urlParams = getUrlParams();
      const conversionData = {
        campaignId: CONFIG.campaignId,
        clickId: urlParams.clickId,
        payout: payout || 0,
        status: status || 'lead',
        tid: params?.tid || Math.floor(Math.random() * 1000000000).toString(),
        subIds: {}
      };

      // 提取 sub_id_1 到 sub_id_30
      if (params) {
        for (let i = 1; i <= 30; i++) {
          const key = 'sub_id_' + i;
          if (params[key]) {
            conversionData.subIds[key] = params[key];
          }
        }
      }

      try {
        const response = await fetch(CONFIG.workerUrl + '/api/tracking/script/conversion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(conversionData)
        });

        if (response.ok) {
          console.log('[CFTracking] Conversion reported:', status);
          if (callback) callback();
        }
      } catch (err) {
        console.error('[CFTracking] Conversion error:', err);
      }
    },

    // 更新点击参数
    update: async function(params) {
      const urlParams = getUrlParams();
      const updateData = {
        campaignId: CONFIG.campaignId,
        clickId: urlParams.clickId,
        subIds: params
      };

      try {
        const response = await fetch(CONFIG.workerUrl + '/api/tracking/script/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          console.log('[CFTracking] Parameters updated');
        }
      } catch (err) {
        console.error('[CFTracking] Update error:', err);
      }
    }
  };

  // 页面加载时自动跟踪
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackVisit);
  } else {
    trackVisit();
  }
})();
</script>
<!-- End CFTracking Tracking Script -->`;

    return script.trim();
  }

  /**
   * 生成 KClient JS 代码 (用于远程站点)
   */
  generateKClientJS(config: TrackingScriptConfig): string {
    const { campaignId, domain, base64Encode = false } = config;
    const workerUrl = `https://${domain}`;

    let script = `
<!-- CFTracking KClient JS -->
<script>
(function() {
  'use strict';
  
  const CONFIG = {
    campaignId: '${campaignId}',
    workerUrl: '${workerUrl}'
  };

  // 获取 visitor ID
  function getVisitorId() {
    let visitorId = localStorage.getItem('cf_kclient_vid');
    if (!visitorId) {
      visitorId = 'kc_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('cf_kclient_vid', visitorId);
    }
    return visitorId;
  }

  // 执行流量处理
  async function processTraffic() {
    const visitorId = getVisitorId();
    
    const requestData = {
      campaignId: CONFIG.campaignId,
      visitorId: visitorId,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(CONFIG.workerUrl + '/api/tracking/kclient/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // 根据返回结果执行动作
        if (result.action === 'redirect' && result.url) {
          window.location.href = result.url;
        } else if (result.action === 'show_content' && result.content) {
          // 动态替换页面内容
          document.open();
          document.write(result.content);
          document.close();
        }
        // action === 'do_nothing' 则保持当前页面
      }
    } catch (err) {
      console.error('[CFTracking KClient] Process error:', err);
    }
  }

  // 立即执行
  processTraffic();
})();
</script>
<!-- End CFTracking KClient JS -->`;

    if (base64Encode) {
      script = `<!-- CFTracking KClient JS (Base64) -->
<script>
eval(atob('${btoa(script)}'));
</script>`;
    }

    return script.trim();
  }
}

export function createTrackingScriptService(env: Env): TrackingScriptService {
  return new TrackingScriptService(env);
}
