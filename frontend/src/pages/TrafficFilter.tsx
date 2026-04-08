/**
 * File: TrafficFilter.tsx
 * Purpose: 流量过滤规则管理页面，支持ISP白名单、ASN黑名单、国家过滤的组合配置
 * Input/Output: 显示过滤规则列表，支持CRUD操作
 * Logic: 从API获取过滤规则，支持多维度组合过滤
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Ban,
  Eye,
  EyeOff,
  Filter,
  Globe,
  Building2,
  Monitor,
  Smartphone,
  Fingerprint,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ASNCategory = 'blacklist' | 'greylist' | 'whitelist' | 'unknown';
type ASNType = 'bot' | 'datacenter' | 'vpn' | 'proxy' | 'hosting' | 'isp' | 'mobile' | 'business' | 'education' | 'government';
type ISPType = 'isp' | 'mobile' | 'business' | 'education' | 'government';
type CountryAction = 'allow' | 'block' | 'challenge';

interface ASNEntry {
  id: string;
  asn: number;
  asName?: string;
  category: ASNCategory;
  type: ASNType;
  riskScore: number;
  reason: string;
  source: 'builtin' | 'api' | 'manual';
  enabled: boolean;
}

interface ISPEntry {
  id: string;
  namePattern: string;
  type: ISPType;
  country?: string;
  priority: number;
  enabled: boolean;
}

interface CountryRule {
  id: string;
  countryCode: string;
  countryName?: string;
  action: CountryAction;
  enabled: boolean;
}

interface Stats {
  ispBlacklistKeywordCount: number;
  ispWhitelistCount: number;
  asnBlacklistCount: number;
  asnGreylistCount: number;
  asnWhitelistCount: number;
}

const API_BASE = '/api/traffic-filter';

const asnCategoryOptions: { value: ASNCategory; label: string; color: string }[] = [
  { value: 'blacklist', label: '黑名单', color: 'bg-red-500/20 text-red-400' },
  { value: 'greylist', label: '灰名单', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'whitelist', label: '白名单', color: 'bg-green-500/20 text-green-400' },
  { value: 'unknown', label: '未知', color: 'bg-gray-500/20 text-gray-400' },
];

const asnTypeOptions: { value: ASNType; label: string }[] = [
  { value: 'bot', label: 'Bot' },
  { value: 'datacenter', label: '数据中心' },
  { value: 'vpn', label: 'VPN' },
  { value: 'proxy', label: '代理' },
  { value: 'hosting', label: '托管' },
  { value: 'isp', label: 'ISP' },
  { value: 'mobile', label: '移动网络' },
  { value: 'business', label: '企业' },
  { value: 'education', label: '教育' },
  { value: 'government', label: '政府' },
];

const ispTypeOptions: { value: ISPType; label: string }[] = [
  { value: 'isp', label: 'ISP运营商' },
  { value: 'mobile', label: '移动网络' },
  { value: 'business', label: '企业' },
  { value: 'education', label: '教育机构' },
  { value: 'government', label: '政府机构' },
];

const commonCountries = [
  { code: 'US', name: '美国' },
  { code: 'CN', name: '中国' },
  { code: 'JP', name: '日本' },
  { code: 'KR', name: '韩国' },
  { code: 'GB', name: '英国' },
  { code: 'DE', name: '德国' },
  { code: 'FR', name: '法国' },
  { code: 'AU', name: '澳大利亚' },
  { code: 'CA', name: '加拿大' },
  { code: 'IN', name: '印度' },
  { code: 'BR', name: '巴西' },
  { code: 'RU', name: '俄罗斯' },
  { code: 'SG', name: '新加坡' },
  { code: 'HK', name: '香港' },
  { code: 'TW', name: '台湾' },
];

const TrafficFilter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'asn' | 'isp' | 'country' | 'ip' | 'ua' | 'fingerprint'>('asn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [asnList, setAsnList] = useState<ASNEntry[]>([]);
  const [ispList, setIspList] = useState<ISPEntry[]>([]);
  const [countryRules, setCountryRules] = useState<CountryRule[]>([]);
  
  // IP黑白名单
  const [ipBlacklist, setIpBlacklist] = useState<any[]>([]);
  const [ipWhitelist, setIpWhitelist] = useState<any[]>([]);
  
  // UA黑白名单
  const [uaBlacklist, setUaBlacklist] = useState<any[]>([]);
  const [uaWhitelist, setUaWhitelist] = useState<any[]>([]);
  
  // 设备指纹黑白名单
  const [fingerprintBlacklist, setFingerprintBlacklist] = useState<any[]>([]);
  const [fingerprintWhitelist, setFingerprintWhitelist] = useState<any[]>([]);
  
  const [stats, setStats] = useState<Stats>({
    ispBlacklistKeywordCount: 0,
    ispWhitelistCount: 0,
    asnBlacklistCount: 0,
    asnGreylistCount: 0,
    asnWhitelistCount: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ASNCategory | 'all'>('all');

  const [showAsnForm, setShowAsnForm] = useState(false);
  const [showIspForm, setShowIspForm] = useState(false);
  const [showCountryForm, setShowCountryForm] = useState(false);

  const [asnForm, setAsnForm] = useState({
    asn: 0,
    asName: '',
    category: 'blacklist' as ASNCategory,
    type: 'vpn' as ASNType,
    riskScore: 80,
    reason: '',
    enabled: true,
  });

  const [ispForm, setIspForm] = useState({
    namePattern: '',
    type: 'isp' as ISPType,
    country: '',
    priority: 50,
    enabled: true,
  });

  const [countryForm, setCountryForm] = useState({
    countryCode: '',
    action: 'block' as CountryAction,
    enabled: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [asnRes, ispRes, countryRes, statsRes, ipBlacklistRes, ipWhitelistRes, uaBlacklistRes, uaWhitelistRes, fpBlacklistRes, fpWhitelistRes] = await Promise.all([
        fetch(`${API_BASE}/asn`).then((r) => r.json()),
        fetch(`${API_BASE}/isp`).then((r) => r.json()),
        fetch(`${API_BASE}/country`).then((r) => r.json()),
        fetch(`${API_BASE}/stats`).then((r) => r.json()),
        fetch(`/api/proxy-detection/ip-blacklist`).then((r) => r.json()),
        fetch(`/api/proxy-detection/ip-whitelist`).then((r) => r.json()),
        fetch(`/api/proxy-detection/ua-blacklist`).then((r) => r.json()),
        fetch(`/api/proxy-detection/ua-whitelist`).then((r) => r.json()),
        fetch(`/api/proxy-detection/fingerprint-blacklist`).then((r) => r.json()),
        fetch(`/api/proxy-detection/fingerprint-whitelist`).then((r) => r.json()),
      ]);

      if (asnRes.success) setAsnList(asnRes.data || []);
      if (ispRes.success) setIspList(ispRes.data || []);
      if (countryRes.success) setCountryRules(countryRes.data || []);
      if (statsRes.success) setStats(statsRes.data);
      if (ipBlacklistRes.success) setIpBlacklist(ipBlacklistRes.data?.items || []);
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

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchAsnList = async () => {
    try {
      const response = await fetch(`${API_BASE}/asn`);
      const data = await response.json();
      if (data.success) {
        setAsnList(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch ASN list:', err);
    }
  };

  const fetchIspList = async () => {
    try {
      const response = await fetch(`${API_BASE}/isp`);
      const data = await response.json();
      if (data.success) {
        setIspList(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch ISP list:', err);
    }
  };

  const fetchCountryRules = async () => {
    try {
      const response = await fetch(`${API_BASE}/country`);
      const data = await response.json();
      if (data.success) {
        setCountryRules(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch country rules:', err);
    }
  };

  // ASN操作
  const handleAddAsn = async () => {
    if (!asnForm.asn) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/asn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asnForm),
      });
      const data = await response.json();
      if (data.success) {
        setShowAsnForm(false);
        setAsnForm({
          asn: 0,
          asName: '',
          category: 'blacklist',
          type: 'vpn',
          riskScore: 80,
          reason: '',
          enabled: true,
        });
        fetchAsnList();
        fetchStats();
      } else {
        setError(data.error || '添加失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAsn = async (asn: number) => {
    if (!confirm('确定要删除此ASN规则吗？')) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/asn/${asn}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchAsnList();
        fetchStats();
      } else {
        setError(data.error || '删除失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAsn = async (asn: number, enabled: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/asn/${asn}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const data = await response.json();
      if (data.success) {
        fetchAsnList();
      } else {
        setError(data.error || '操作失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // ISP操作
  const handleAddIsp = async () => {
    if (!ispForm.namePattern) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/isp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ispForm),
      });
      const data = await response.json();
      if (data.success) {
        setShowIspForm(false);
        setIspForm({ namePattern: '', type: 'isp', country: '', priority: 50, enabled: true });
        fetchIspList();
        fetchStats();
      } else {
        setError(data.error || '添加失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIsp = async (id: string) => {
    if (!confirm('确定要删除此ISP规则吗？')) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/isp/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchIspList();
        fetchStats();
      } else {
        setError(data.error || '删除失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 国家操作
  const handleAddCountry = async () => {
    if (!countryForm.countryCode) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/country`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(countryForm),
      });
      const data = await response.json();
      if (data.success) {
        setShowCountryForm(false);
        setCountryForm({ countryCode: '', action: 'block', enabled: true });
        fetchCountryRules();
      } else {
        setError(data.error || '添加失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCountry = async (id: string) => {
    if (!confirm('确定要删除此国家规则吗？')) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/country/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchCountryRules();
      } else {
        setError(data.error || '删除失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 过滤ASN列表
  const filteredAsnList = asnList.filter((item) => {
    const matchesSearch =
      item.asn.toString().includes(searchTerm) ||
      (item.asName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // 渲染统计概览
  const renderStats = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">ISP黑名单关键词</p>
              <p className="text-3xl font-bold text-red-400 mt-2">{stats.ispBlacklistKeywordCount}</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg">
              <Ban size={24} className="text-red-400" />
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-2">VPN/Proxy/Hosting关键词</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">ISP白名单</p>
              <p className="text-3xl font-bold text-green-400 mt-2">{stats.ispWhitelistCount}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <CheckCircle size={24} className="text-green-400" />
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-2">信任的运营商网络</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">ASN黑名单</p>
              <p className="text-3xl font-bold text-red-400 mt-2">{stats.asnBlacklistCount}</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg">
              <Ban size={24} className="text-red-400" />
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-2">VPN/Proxy/Bot网络</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">ASN灰名单</p>
              <p className="text-3xl font-bold text-yellow-400 mt-2">{stats.asnGreylistCount}</p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <AlertTriangle size={24} className="text-yellow-400" />
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-2">数据中心/托管服务</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">ASN白名单</p>
              <p className="text-3xl font-bold text-blue-400 mt-2">{stats.asnWhitelistCount}</p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Shield size={24} className="text-blue-400" />
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-2">已知良好ASN</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">过滤策略说明（从严处理）</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg mt-0.5">
              <Ban size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">ISP黑名单关键词优先拦截</p>
              <p className="text-gray-400 text-sm">ISP名称包含VPN/Proxy/Hosting/VPS/Cloud等关键词，直接拦截</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg mt-0.5">
              <CheckCircle size={16} className="text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium">ISP白名单放行</p>
              <p className="text-gray-400 text-sm">匹配ISP白名单的流量直接放行，无需进一步检测</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg mt-0.5">
              <Ban size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">ASN黑名单拦截</p>
              <p className="text-gray-400 text-sm">已知VPN/Proxy/Bot ASN直接拦截或挑战</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg mt-0.5">
              <AlertTriangle size={16} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-white font-medium">ASN灰名单挑战</p>
              <p className="text-gray-400 text-sm">数据中心/托管ASN触发验证挑战</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg mt-0.5">
              <Filter size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white font-medium">未知ASN标记</p>
              <p className="text-gray-400 text-sm">不在列表中的ASN标记为需要进一步检测</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
          <p className="text-gray-300 text-sm">
            <strong>成本优势：</strong>此方案完全使用Cloudflare免费提供的ASN和ISP信息，
            无需第三方API调用，可节省90%以上的检测成本。
          </p>
        </div>
      </div>
    </div>
  );

  // 渲染ASN列表
  const renderAsnList = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索ASN或名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as ASNCategory | 'all')}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">所有类别</option>
          {asnCategoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowAsnForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          添加ASN
        </button>
      </div>

      {showAsnForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">添加ASN规则</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">ASN号码 *</label>
              <input
                type="number"
                value={asnForm.asn}
                onChange={(e) => setAsnForm({ ...asnForm, asn: parseInt(e.target.value, 10) || 0 })}
                placeholder="例如: 15169"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">组织名称</label>
              <input
                type="text"
                value={asnForm.asName}
                onChange={(e) => setAsnForm({ ...asnForm, asName: e.target.value })}
                placeholder="例如: Google LLC"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">类别</label>
              <select
                value={asnForm.category}
                onChange={(e) => setAsnForm({ ...asnForm, category: e.target.value as ASNCategory })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {asnCategoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">类型</label>
              <select
                value={asnForm.type}
                onChange={(e) => setAsnForm({ ...asnForm, type: e.target.value as ASNType })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {asnTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">风险评分 (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={asnForm.riskScore}
                onChange={(e) => setAsnForm({ ...asnForm, riskScore: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">原因</label>
              <input
                type="text"
                value={asnForm.reason}
                onChange={(e) => setAsnForm({ ...asnForm, reason: e.target.value })}
                placeholder="例如: VPN provider"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="asnEnabled"
              checked={asnForm.enabled}
              onChange={(e) => setAsnForm({ ...asnForm, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="asnEnabled" className="text-gray-300 text-sm">
              启用此规则
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => setShowAsnForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddAsn}
              disabled={loading || !asnForm.asn}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              保存
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">ASN</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">组织名称</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">类别</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">类型</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">风险评分</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">来源</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">状态</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredAsnList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                filteredAsnList.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-white font-mono">{item.asn}</td>
                    <td className="px-4 py-3 text-gray-300">{item.asName || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          asnCategoryOptions.find((o) => o.value === item.category)?.color
                        )}
                      >
                        {asnCategoryOptions.find((o) => o.value === item.category)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {asnTypeOptions.find((o) => o.value === item.type)?.label}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={cn(
                            'h-full rounded-full',
                            item.riskScore >= 80
                              ? 'bg-red-500'
                              : item.riskScore >= 50
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            )}
                            style={{ width: `${item.riskScore}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-sm">{item.riskScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                        'px-2 py-1 rounded text-xs',
                        item.source === 'builtin'
                          ? 'bg-purple-500/20 text-purple-400'
                          : item.source === 'api'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-500/20 text-gray-400'
                      )}
                      >
                        {item.source === 'builtin' ? '内置' : item.source === 'api' ? 'API' : '手动'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleAsn(item.asn, item.enabled)}
                        className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded text-xs',
                        item.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      )}
                      >
                        {item.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                        {item.enabled ? '启用' : '禁用'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteAsn(item.asn)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // 渲染ISP列表
  const renderIspList = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowIspForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          添加ISP
        </button>
      </div>

      {showIspForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">添加ISP白名单</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">ISP名称模式 *</label>
              <input
                type="text"
                value={ispForm.namePattern}
                onChange={(e) => setIspForm({ ...ispForm, namePattern: e.target.value })}
                placeholder="例如: China Telecom"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">类型</label>
              <select
                value={ispForm.type}
                onChange={(e) => setIspForm({ ...ispForm, type: e.target.value as ISPType })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {ispTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">国家代码</label>
              <select
                value={ispForm.country}
                onChange={(e) => setIspForm({ ...ispForm, country: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">全部国家</option>
                {commonCountries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">优先级</label>
              <input
                type="number"
                min="1"
                max="100"
                value={ispForm.priority}
                onChange={(e) => setIspForm({ ...ispForm, priority: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="ispEnabled"
              checked={ispForm.enabled}
              onChange={(e) => setIspForm({ ...ispForm, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="ispEnabled" className="text-gray-300 text-sm">
              启用此规则
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => setShowIspForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddIsp}
              disabled={loading || !ispForm.namePattern}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              保存
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">ISP名称模式</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">类型</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">国家</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">优先级</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">状态</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {ispList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                ispList.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-white">{item.namePattern}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {ispTypeOptions.find((o) => o.value === item.type)?.label}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {item.country || '全部'}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{item.priority}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                        'px-2 py-1 rounded text-xs',
                        item.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      )}
                      >
                        {item.enabled ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteIsp(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <Trash2 size={16} />
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
  );

  // 渲染国家过滤
  const renderCountryList = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCountryForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          添加国家规则
        </button>
      </div>

      {showCountryForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">添加国家过滤规则</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">国家 *</label>
              <select
                value={countryForm.countryCode}
                onChange={(e) => setCountryForm({ ...countryForm, countryCode: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">选择国家</option>
                {commonCountries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">操作</label>
              <select
                value={countryForm.action}
                onChange={(e) => setCountryForm({ ...countryForm, action: e.target.value as CountryAction })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="allow">允许</option>
                <option value="block">拦截</option>
                <option value="challenge">挑战</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="countryEnabled"
                  checked={countryForm.enabled}
                  onChange={(e) => setCountryForm({ ...countryForm, enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="countryEnabled" className="text-gray-300 text-sm">
                  启用此规则
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => setShowCountryForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddCountry}
              disabled={loading || !countryForm.countryCode}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              保存
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">国家代码</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">国家名称</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">操作</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">状态</th>
                <th className="px-4 py-3 text-left text-gray-300 text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {countryRules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                countryRules.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-white font-mono">{item.countryCode}</td>
                    <td className="px-4 py-3 text-gray-300">{item.countryName || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                        'px-2 py-1 rounded text-xs',
                        item.action === 'allow'
                          ? 'bg-green-500/20 text-green-400'
                          : item.action === 'block'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                      )}
                      >
                        {item.action === 'allow' ? '允许' : item.action === 'block' ? '拦截' : '挑战'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                        'px-2 py-1 rounded text-xs',
                        item.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      )}
                      >
                        {item.enabled ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteCountry(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <Trash2 size={16} />
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
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">流量过滤规则</h1>
          <p className="text-gray-400 text-sm mt-1">基于ASN + ISP的智能流量过滤系统</p>
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

      {renderStats()}

      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="border-b border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('asn')}
              className={cn(
              'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'asn'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            )}
            >
              <div className="flex items-center gap-2">
                <Globe size={18} />
                ASN规则
              </div>
            </button>
            <button
              onClick={() => setActiveTab('isp')}
              className={cn(
              'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'isp'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            )}
            >
              <div className="flex items-center gap-2">
                <Building2 size={18} />
                ISP白名单
              </div>
            </button>
            <button
              onClick={() => setActiveTab('country')}
              className={cn(
              'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'country'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            )}
            >
              <div className="flex items-center gap-2">
                <Globe size={18} />
                国家过滤
              </div>
            </button>
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
                <Monitor size={18} />
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
                <Smartphone size={18} />
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
          {activeTab === 'asn' && renderAsnList()}
          {activeTab === 'isp' && renderIspList()}
          {activeTab === 'country' && renderCountryList()}
          {activeTab === 'ip' && renderIpList()}
          {activeTab === 'ua' && renderUaList()}
          {activeTab === 'fingerprint' && renderFingerprintList()}
        </div>
      </div>
    </div>
  );
};

export default TrafficFilter;
