/**
 * @fileoverview IP/UA/设备指纹黑白名单管理页面
 * @description 支持IP地址、用户代理、设备指纹的黑白名单组合配置
 * @module frontend/pages/BlacklistWhitelist
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Ban,
  Fingerprint,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PROXY_API_BASE = '/api/proxy-detection';

interface IPEntry {
  id: string;
  ip_address: string;
  ip_range?: string;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  source?: string;
  enabled: boolean;
}

interface UAEntry {
  id: string;
  pattern: string;
  pattern_type: 'exact' | 'contains' | 'regex';
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

interface FingerprintEntry {
  id: string;
  fingerprint: string;
  fingerprint_type: 'browser' | 'canvas' | 'webgl' | 'audio' | 'font' | 'combined';
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

const severityOptions = [
  { value: 'low', label: '低', color: 'bg-gray-500/20 text-gray-400' },
  { value: 'medium', label: '中', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'high', label: '高', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'critical', label: '严重', color: 'bg-red-500/20 text-red-400' },
];

const patternTypeOptions = [
  { value: 'exact', label: '精确匹配' },
  { value: 'contains', label: '包含' },
  { value: 'regex', label: '正则表达式' },
];

const fingerprintTypeOptions = [
  { value: 'browser', label: '浏览器指纹' },
  { value: 'canvas', label: 'Canvas指纹' },
  { value: 'webgl', label: 'WebGL指纹' },
  { value: 'audio', label: '音频指纹' },
  { value: 'font', label: '字体指纹' },
  { value: 'combined', label: '组合指纹' },
];

const BlacklistWhitelist: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ip' | 'ua' | 'fingerprint'>('ip');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ipBlacklist, setIpBlacklist] = useState<IPEntry[]>([]);
  const [ipWhitelist, setIpWhitelist] = useState<IPEntry[]>([]);
  const [uaBlacklist, setUaBlacklist] = useState<UAEntry[]>([]);
  const [uaWhitelist, setUaWhitelist] = useState<UAEntry[]>([]);
  const [fingerprintBlacklist, setFingerprintBlacklist] = useState<FingerprintEntry[]>([]);
  const [fingerprintWhitelist, setFingerprintWhitelist] = useState<FingerprintEntry[]>([]);

  const [showIPForm, setShowIPForm] = useState(false);
  const [showUAForm, setShowUAForm] = useState(false);
  const [showFingerprintForm, setShowFingerprintForm] = useState(false);
  const [isBlacklist, setIsBlacklist] = useState(true);

  const [ipForm, setIpForm] = useState({
    ip_address: '',
    ip_range: '',
    reason: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    enabled: true,
  });

  const [uaForm, setUaForm] = useState({
    pattern: '',
    pattern_type: 'contains' as 'exact' | 'contains' | 'regex',
    reason: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    enabled: true,
  });

  const [fingerprintForm, setFingerprintForm] = useState({
    fingerprint: '',
    fingerprint_type: 'browser' as 'browser' | 'canvas' | 'webgl' | 'audio' | 'font' | 'combined',
    reason: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    enabled: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ipBlacklistRes, ipWhitelistRes, uaBlacklistRes, uaWhitelistRes, fpBlacklistRes, fpWhitelistRes] = await Promise.all([
        fetch(`${PROXY_API_BASE}/ip-blacklist`).then((r) => r.json()),
        fetch(`${PROXY_API_BASE}/ip-whitelist`).then((r) => r.json()),
        fetch(`${PROXY_API_BASE}/ua-blacklist`).then((r) => r.json()),
        fetch(`${PROXY_API_BASE}/ua-whitelist`).then((r) => r.json()),
        fetch(`${PROXY_API_BASE}/fingerprint-blacklist`).then((r) => r.json()),
        fetch(`${PROXY_API_BASE}/fingerprint-whitelist`).then((r) => r.json()),
      ]);

      if (ipBlacklistRes.success) setIpBlacklist(ipBlacklistRes.data || []);
      if (ipWhitelistRes.success) setIpWhitelist(ipWhitelistRes.data || []);
      if (uaBlacklistRes.success) setUaBlacklist(uaBlacklistRes.data || []);
      if (uaWhitelistRes.success) setUaWhitelist(uaWhitelistRes.data || []);
      if (fpBlacklistRes.success) setFingerprintBlacklist(fpBlacklistRes.data || []);
      if (fpWhitelistRes.success) setFingerprintWhitelist(fpWhitelistRes.data || []);
    } catch (err) {
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIPBlacklist = async (ip: string, reason?: string, severity?: 'low' | 'medium' | 'high' | 'critical') => {
    try {
      const response = await fetch(`${PROXY_API_BASE}/ip-blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: ip,
          reason: reason || '',
          severity: severity || 'medium',
          enabled: true,
        }),
      });

      if (response.ok) {
        fetchData();
        setShowIPForm(false);
        setIpForm({ ip_address: '', ip_range: '', reason: '', severity: 'medium', enabled: true });
      } else {
        const data = await response.json();
        setError(data.error || '添加IP黑名单失败');
      }
    } catch (err) {
      setError('添加IP黑名单失败');
    }
  };

  const handleAddIPWhitelist = async (ip: string, reason?: string) => {
    try {
      const response = await fetch(`${PROXY_API_BASE}/ip-whitelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: ip,
          reason: reason || '',
          enabled: true,
        }),
      });

      if (response.ok) {
        fetchData();
        setShowIPForm(false);
        setIsBlacklist(true);
        setIpForm({ ip_address: '', ip_range: '', reason: '', severity: 'medium', enabled: true });
      } else {
        const data = await response.json();
        setError(data.error || '添加IP白名单失败');
      }
    } catch (err) {
      setError('添加IP白名单失败');
    }
  };

  const handleAddUABlacklist = async (pattern: string, patternType: 'exact' | 'contains' | 'regex', reason?: string, severity?: 'low' | 'medium' | 'high' | 'critical') => {
    try {
      const response = await fetch(`${PROXY_API_BASE}/ua-blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern,
          pattern_type: patternType,
          reason: reason || '',
          severity: severity || 'medium',
          enabled: true,
        }),
      });

      if (response.ok) {
        fetchData();
        setShowUAForm(false);
        setUaForm({ pattern: '', pattern_type: 'contains', reason: '', severity: 'medium', enabled: true });
      } else {
        const data = await response.json();
        setError(data.error || '添加UA黑名单失败');
      }
    } catch (err) {
      setError('添加UA黑名单失败');
    }
  };

  const handleAddUAWhitelist = async (pattern: string, patternType: 'exact' | 'contains' | 'regex', reason?: string) => {
    try {
      const response = await fetch(`${PROXY_API_BASE}/ua-whitelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern,
          pattern_type: patternType,
          reason: reason || '',
          enabled: true,
        }),
      });

      if (response.ok) {
        fetchData();
        setShowUAForm(false);
        setIsBlacklist(true);
        setUaForm({ pattern: '', pattern_type: 'contains', reason: '', severity: 'medium', enabled: true });
      } else {
        const data = await response.json();
        setError(data.error || '添加UA白名单失败');
      }
    } catch (err) {
      setError('添加UA白名单失败');
    }
  };

  const handleAddFingerprintBlacklist = async (fingerprint: string, fingerprintType: 'browser' | 'canvas' | 'webgl' | 'audio' | 'font' | 'combined', reason?: string, severity?: 'low' | 'medium' | 'high' | 'critical') => {
    try {
      const response = await fetch(`${PROXY_API_BASE}/fingerprint-blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint,
          fingerprint_type: fingerprintType,
          reason: reason || '',
          severity: severity || 'medium',
          enabled: true,
        }),
      });

      if (response.ok) {
        fetchData();
        setShowFingerprintForm(false);
        setFingerprintForm({ fingerprint: '', fingerprint_type: 'browser', reason: '', severity: 'medium', enabled: true });
      } else {
        const data = await response.json();
        setError(data.error || '添加设备指纹黑名单失败');
      }
    } catch (err) {
      setError('添加设备指纹黑名单失败');
    }
  };

  const handleAddFingerprintWhitelist = async (fingerprint: string, fingerprintType: 'browser' | 'canvas' | 'webgl' | 'audio' | 'font' | 'combined', reason?: string) => {
    try {
      const response = await fetch(`${PROXY_API_BASE}/fingerprint-whitelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint,
          fingerprint_type: fingerprintType,
          reason: reason || '',
          trust_level: 'verified',
          enabled: true,
        }),
      });

      if (response.ok) {
        fetchData();
        setShowFingerprintForm(false);
        setIsBlacklist(true);
        setFingerprintForm({ fingerprint: '', fingerprint_type: 'browser', reason: '', severity: 'medium', enabled: true });
      } else {
        const data = await response.json();
        setError(data.error || '添加设备指纹白名单失败');
      }
    } catch (err) {
      setError('添加设备指纹白名单失败');
    }
  };

  const handleDeleteIPBlacklist = async (id: string) => {
    try {
      await fetch(`${PROXY_API_BASE}/ip-blacklist/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      setError('删除IP黑名单失败');
    }
  };

  const handleDeleteIPWhitelist = async (id: string) => {
    try {
      await fetch(`${PROXY_API_BASE}/ip-whitelist/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      setError('删除IP白名单失败');
    }
  };

  const handleDeleteUABlacklist = async (id: string) => {
    try {
      await fetch(`${PROXY_API_BASE}/ua-blacklist/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      setError('删除UA黑名单失败');
    }
  };

  const handleDeleteUAWhitelist = async (id: string) => {
    try {
      await fetch(`${PROXY_API_BASE}/ua-whitelist/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      setError('删除UA白名单失败');
    }
  };

  const handleDeleteFingerprintBlacklist = async (id: string) => {
    try {
      await fetch(`${PROXY_API_BASE}/fingerprint-blacklist/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      setError('删除设备指纹黑名单失败');
    }
  };

  const handleDeleteFingerprintWhitelist = async (id: string) => {
    try {
      await fetch(`${PROXY_API_BASE}/fingerprint-whitelist/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      setError('删除设备指纹白名单失败');
    }
  };

  const renderIPList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">IP黑白名单管理</h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowIPForm(true); setIsBlacklist(true); }}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            添加到黑名单
          </button>
          <button
            onClick={() => { setShowIPForm(true); setIsBlacklist(false); }}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            添加到白名单
          </button>
        </div>
      </div>

      {showIPForm && (
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 mb-4">
          <h4 className="text-sm font-medium text-white mb-3">
            {isBlacklist ? '添加IP到黑名单' : '添加IP到白名单'}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">IP地址</label>
              <input
                type="text"
                value={ipForm.ip_address}
                onChange={(e) => setIpForm({ ...ipForm, ip_address: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                placeholder="例如: 192.168.1.1"
              />
            </div>
            {isBlacklist && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">严重程度</label>
                <select
                  value={ipForm.severity}
                  onChange={(e) => setIpForm({ ...ipForm, severity: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                >
                  {severityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="mt-3">
            <label className="block text-sm text-gray-400 mb-1">原因</label>
            <input
              type="text"
              value={ipForm.reason}
              onChange={(e) => setIpForm({ ...ipForm, reason: e.target.value })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
              placeholder="例如: 已知恶意IP"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowIPForm(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                if (isBlacklist) {
                  handleAddIPBlacklist(ipForm.ip_address, ipForm.reason, ipForm.severity);
                } else {
                  handleAddIPWhitelist(ipForm.ip_address, ipForm.reason);
                }
              }}
              disabled={!ipForm.ip_address}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
          <h4 className="text-sm font-medium text-red-400 mb-2">IP黑名单 ({ipBlacklist.length})</h4>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="text-left py-2">IP地址</th>
                  <th className="text-left py-2">原因</th>
                  <th className="text-left py-2">严重程度</th>
                  <th className="text-left py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {ipBlacklist.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-4">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  ipBlacklist.map((item) => (
                    <tr key={item.ip_address}>
                      <td className="py-2 text-white font-mono">{item.ip_address}</td>
                      <td className="py-2 text-gray-400">{item.reason || '-'}</td>
                      <td className="py-2">
                        <span className={cn(
                          'px-2 py-1 rounded text-xs',
                          item.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                          item.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          item.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        )}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => handleDeleteIPBlacklist(item.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
          <h4 className="text-sm font-medium text-green-400 mb-2">IP白名单 ({ipWhitelist.length})</h4>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="text-left py-2">IP地址</th>
                  <th className="text-left py-2">原因</th>
                  <th className="text-left py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {ipWhitelist.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-500 py-4">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  ipWhitelist.map((item) => (
                    <tr key={item.ip_address}>
                      <td className="py-2 text-white font-mono">{item.ip_address}</td>
                      <td className="py-2 text-gray-400">{item.reason || '-'}</td>
                      <td className="py-2">
                        <button
                          onClick={() => handleDeleteIPWhitelist(item.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUAList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">UA黑白名单管理</h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowUAForm(true); setIsBlacklist(true); }}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            添加到黑名单
          </button>
          <button
            onClick={() => { setShowUAForm(true); setIsBlacklist(false); }}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            添加到白名单
          </button>
        </div>
      </div>

      {showUAForm && (
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 mb-4">
          <h4 className="text-sm font-medium text-white mb-3">
            {isBlacklist ? '添加UA到黑名单' : '添加UA到白名单'}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Pattern</label>
              <input
                type="text"
                value={uaForm.pattern}
                onChange={(e) => setUaForm({ ...uaForm, pattern: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                placeholder="例如: bot, crawler"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">匹配类型</label>
              <select
                value={uaForm.pattern_type}
                onChange={(e) => setUaForm({ ...uaForm, pattern_type: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
              >
                {patternTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          {isBlacklist && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">严重程度</label>
              <select
                value={uaForm.severity}
                onChange={(e) => setUaForm({ ...uaForm, severity: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
              >
                {severityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
          <div className="mt-3">
            <label className="block text-sm text-gray-400 mb-1">原因</label>
            <input
              type="text"
              value={uaForm.reason}
              onChange={(e) => setUaForm({ ...uaForm, reason: e.target.value })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
              placeholder="例如: 已知恶意UA"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowUAForm(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                if (isBlacklist) {
                  handleAddUABlacklist(uaForm.pattern, uaForm.pattern_type, uaForm.reason, uaForm.severity);
                } else {
                  handleAddUAWhitelist(uaForm.pattern, uaForm.pattern_type, uaForm.reason);
                }
              }}
              disabled={!uaForm.pattern}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
          <h4 className="text-sm font-medium text-red-400 mb-2">UA黑名单 ({uaBlacklist.length})</h4>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="text-left py-2">Pattern</th>
                  <th className="text-left py-2">类型</th>
                  <th className="text-left py-2">严重程度</th>
                  <th className="text-left py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {uaBlacklist.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-4">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  uaBlacklist.map((item) => (
                    <tr key={item.pattern}>
                      <td className="py-2 text-white font-mono">{item.pattern}</td>
                      <td className="py-2 text-gray-400">{item.pattern_type}</td>
                      <td className="py-2">
                        <span className={cn(
                          'px-2 py-1 rounded text-xs',
                          item.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                          item.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          item.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        )}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => handleDeleteUABlacklist(item.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
          <h4 className="text-sm font-medium text-green-400 mb-2">UA白名单 ({uaWhitelist.length})</h4>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="text-left py-2">Pattern</th>
                  <th className="text-left py-2">类型</th>
                  <th className="text-left py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {uaWhitelist.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-500 py-4">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  uaWhitelist.map((item) => (
                    <tr key={item.pattern}>
                      <td className="py-2 text-white font-mono">{item.pattern}</td>
                      <td className="py-2 text-gray-400">{item.pattern_type}</td>
                      <td className="py-2">
                        <button
                          onClick={() => handleDeleteUAWhitelist(item.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFingerprintList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">设备指纹黑白名单管理</h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowFingerprintForm(true); setIsBlacklist(true); }}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            添加到黑名单
          </button>
          <button
            onClick={() => { setShowFingerprintForm(true); setIsBlacklist(false); }}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            添加到白名单
          </button>
        </div>
      </div>

      {showFingerprintForm && (
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 mb-4">
          <h4 className="text-sm font-medium text-white mb-3">
            {isBlacklist ? '添加设备指纹到黑名单' : '添加设备指纹到白名单'}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">设备指纹</label>
              <input
                type="text"
                value={fingerprintForm.fingerprint}
                onChange={(e) => setFingerprintForm({ ...fingerprintForm, fingerprint: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                placeholder="例如: a1b2c3d4e5f6..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">指纹类型</label>
              <select
                value={fingerprintForm.fingerprint_type}
                onChange={(e) => setFingerprintForm({ ...fingerprintForm, fingerprint_type: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
              >
                {fingerprintTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          {isBlacklist && (
            <div className="mt-3">
              <label className="block text-sm text-gray-400 mb-1">严重程度</label>
              <select
                value={fingerprintForm.severity}
                onChange={(e) => setFingerprintForm({ ...fingerprintForm, severity: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
              >
                {severityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
          <div className="mt-3">
            <label className="block text-sm text-gray-400 mb-1">原因</label>
            <input
              type="text"
              value={fingerprintForm.reason}
              onChange={(e) => setFingerprintForm({ ...fingerprintForm, reason: e.target.value })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
              placeholder="例如: 已知恶意设备"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowFingerprintForm(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                if (isBlacklist) {
                  handleAddFingerprintBlacklist(fingerprintForm.fingerprint, fingerprintForm.fingerprint_type, fingerprintForm.reason, fingerprintForm.severity);
                } else {
                  handleAddFingerprintWhitelist(fingerprintForm.fingerprint, fingerprintForm.fingerprint_type, fingerprintForm.reason);
                }
              }}
              disabled={!fingerprintForm.fingerprint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
          <h4 className="text-sm font-medium text-red-400 mb-2">设备指纹黑名单 ({fingerprintBlacklist.length})</h4>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="text-left py-2">指纹</th>
                  <th className="text-left py-2">类型</th>
                  <th className="text-left py-2">严重程度</th>
                  <th className="text-left py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {fingerprintBlacklist.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-4">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  fingerprintBlacklist.map((item) => (
                    <tr key={item.fingerprint}>
                      <td className="py-2 text-white font-mono">{item.fingerprint.substring(0, 16)}...</td>
                      <td className="py-2 text-gray-400">{item.fingerprint_type}</td>
                      <td className="py-2">
                        <span className={cn(
                          'px-2 py-1 rounded text-xs',
                          item.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                          item.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          item.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        )}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => handleDeleteFingerprintBlacklist(item.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
          <h4 className="text-sm font-medium text-green-400 mb-2">设备指纹白名单 ({fingerprintWhitelist.length})</h4>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400">
                  <th className="text-left py-2">指纹</th>
                  <th className="text-left py-2">类型</th>
                  <th className="text-left py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {fingerprintWhitelist.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-gray-500 py-4">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  fingerprintWhitelist.map((item) => (
                    <tr key={item.fingerprint}>
                      <td className="py-2 text-white font-mono">{item.fingerprint.substring(1, 16)}...</td>
                      <td className="py-2 text-gray-400">{item.fingerprint_type}</td>
                      <td className="py-2">
                        <button
                          onClick={() => handleDeleteFingerprintWhitelist(item.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">黑白名单管理</h1>
          <p className="text-gray-400 text-sm mt-1">IP/UA/设备指纹黑白名单组合配置</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="border-b border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('ip')}
              className={cn(
              'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'ip'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            )}
            >
              <div className="flex items-center gap-2">
                <Shield size={18} />
                IP黑白名单
              </div>
            </button>
            <button
              onClick={() => setActiveTab('ua')}
              className={cn(
              'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'ua'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            )}
            >
              <div className="flex items-center gap-2">
                <Filter size={18} />
                UA黑白名单
              </div>
            </button>
            <button
              onClick={() => setActiveTab('fingerprint')}
              className={cn(
              'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'fingerprint'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            )}
            >
              <div className="flex items-center gap-2">
                <Fingerprint size={18} />
                设备指纹
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'ip' && renderIPList()}
          {activeTab === 'ua' && renderUAList()}
          {activeTab === 'fingerprint' && renderFingerprintList()}
        </div>
      </div>
    </div>
  );
};

export default BlacklistWhitelist;