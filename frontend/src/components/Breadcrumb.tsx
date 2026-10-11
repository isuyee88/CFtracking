/**
 * File: Breadcrumb.tsx
 * Purpose: 面包屑导航组件，显示当前页面在导航层级中的位置
 * Input: 无 props，自动根据当前 URL 生成面包屑路径
 * Output: 渲染可点击的面包屑导航条
 * Logic:
 *   - 使用 useLocation 获取当前路径
 *   - 通过路由映射表将 URL 段转换为可读标签
 *   - 支持动态路由参数（如 campaigns/:id → Campaign #123）
 *   - 当前页不可点击，父级页面可跳转
 */

import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * 路由段到显示标签的静态映射表
 * 与 Layout.tsx 中 navSections 保持一致
 */
const ROUTE_LABEL_MAP: Record<string, string> = {
  '': 'Dashboard',
  dashboard: 'Dashboard',
  campaigns: 'Campaigns',
  landings: 'Landing Pages',
  l: 'Landing Pages',
  offers: 'Offers',
  'traffic-sources': 'Traffic Sources',
  'affiliate-networks': 'Affiliate Networks',
  domains: 'Domains',
  trends: 'Trends',
  reports: 'Reports',
  'exported-reports': 'Exported Reports',
  'custom-metrics': 'Custom Metrics',
  audit: 'Click Log',
  conversions: 'Conversions',
  blacklist: 'Blacklist',
  whitelist: 'Whitelist',
  target: 'Target',
  rules: 'Autorules',
  platforms: 'Platforms',
  settings: 'Settings',
  help: 'Help Center',
  'auto-optimization': 'Auto Optimization',
};

/**
 * 包含动态参数（如 :id）的路由段模式
 * 用于识别并格式化嵌套路由中的 ID 参数
 */
const DYNAMIC_ROUTE_PATTERNS = [
  { segment: 'campaigns', label: 'Campaign' },
  { segment: 'landings', label: 'Landing' },
  { segment: 'offers', label: 'Offer' },
];

/** 单个面包屑节点的数据结构 */
interface BreadcrumbItem {
  /** 显示标签文本 */
  label: string;
  /** 点击后跳转的完整路径 */
  href: string;
  /** 是否为当前页（最后一项） */
  isCurrent: boolean;
}

/**
 * 将当前 URL 解析为面包屑节点数组
 *
 * 处理逻辑：
 * 1. 按 "/" 分割路径段
 * 2. 逐段累积构建路径，生成每个层级的 href
 * 3. 对已知路由段使用 ROUTE_LABEL_MAP 映射
 * 4. 对动态参数段（跟在 campaigns/landings/offers 后的纯 ID）格式化为 "Label #ID"
 * 5. 最后一项标记为 current（不可点击）
 */
function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // 去除首尾斜杠，分割为段数组；根路径返回空数组
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

  // 首页始终作为第一项
  const items: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/', isCurrent: segments.length === 0 },
  ];

  if (segments.length === 0) {
    return items;
  }

  // 记录前一段是否为包含动态参数的父路由（用于判断下一段是否为 ID）
  let prevSegmentNeedsId = false;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const href = '/' + segments.slice(0, i + 1).join('/');
    const isLast = i === segments.length - 1;

    // 判断当前段是否是动态 ID 参数
    const isDynamicId =
      prevSegmentNeedsId &&
      /^[a-zA-Z0-9_-]+$/.test(segment) &&
      !ROUTE_LABEL_MAP[segment];

    let label: string;

    if (isDynamicId) {
      // 动态 ID：从 DYNAMIC_ROUTE_PATTERNS 匹配父级标签
      const parentPattern = DYNAMIC_ROUTE_PATTERNS.find(
        (p) => p.segment === segments[i - 1]
      );
      label = parentPattern ? `${parentPattern.label} #${segment}` : segment;
      prevSegmentNeedsId = false;
    } else if (ROUTE_LABEL_MAP[segment]) {
      // 已知静态路由段
      label = ROUTE_LABEL_MAP[segment];
      // 检查该段的下一级是否有动态子路由
      prevSegmentNeedsId = DYNAMIC_ROUTE_PATTERNS.some(
        (p) => p.segment === segment
      );
    } else {
      // 未知路由段：首字母大写 + 连字符转空格
      label = segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      prevSegmentNeedsId = false;
    }

    items.push({ label, href, isCurrent: isLast });
  }

  return items;
}

/**
 * 面包屑导航组件
 *
 * 功能特性：
 * - 根据 URL 自动生成层级导航
 * - 首页显示 Dashboard 文字或首页图标
 * - 当前页以纯文本展示（aria-current="page"）
 * - 父级页面可点击跳转
 * - 支持嵌套动态路由（/campaigns/123 → Campaigns > Campaign #123）
 * - 移动端隐藏（lg 断点以上才显示）
 * - 超长文本截断省略号
 */
export function Breadcrumb() {
  const location = useLocation();

  // 使用 useMemo 缓存面包屑计算结果，避免每次渲染重复计算
  const items = useMemo(
    () => buildBreadcrumbs(location.pathname),
    [location.pathname]
  );

  // 顶级页面已有侧栏选中态和 H1；仅在嵌套页面保留面包屑，避免重复显示当前页名称。
  if (items.length <= 2) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden lg:flex items-center px-6 py-2 text-xs"
      role="navigation"
    >
      <ol className="flex items-center gap-1 min-w-0">
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;

          return (
            <li key={item.href} className="flex items-center gap-1 min-w-0">
              {/* 分隔符：非首项前面显示 ChevronRight */}
              {!isFirst && (
                <ChevronRight
                  size={14}
                  className="shrink-0 text-fg-subtle"
                  aria-hidden="true"
                />
              )}

              {/* 首项：带 Home 图标 */}
              {isFirst ? (
                <Link
                  to={item.href}
                  aria-label="Go to Dashboard"
                  className={cn(
                    'inline-flex items-center gap-1 transition-colors truncate max-w-[120px]',
                    'text-fg-muted hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg'
                  )}
                >
                  <Home size={14} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ) : isLast ? (
                /* 当前页：纯文本，不可点击 */
                <span
                  aria-current="page"
                  className="font-medium text-fg-default truncate max-w-[200px]"
                >
                  {item.label}
                </span>
              ) : (
                /* 中间层级：可点击链接 */
                <Link
                  to={item.href}
                  className={cn(
                    'transition-colors truncate max-w-[160px]',
                    'text-fg-muted hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg'
                  )}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
