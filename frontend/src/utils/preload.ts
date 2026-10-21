/**
 * File: preload.ts
 * Purpose: 页面预加载管理工具
 * Input/Output: 管理页面代码和数据的预加载
 * Logic: 实现空闲时间预加载、悬停触发预加载等策略
 */

// 页面路径到组件导入的映射
const pageImports: Record<string, () => Promise<any>> = {
  '/campaigns': () => import('../pages/CampaignManagement'),
  '/landings': () => import('../pages/Landings'),
  '/offers': () => import('../pages/Offers'),
  '/trends': () => import('../pages/Trends'),
  '/traffic-sources': () => import('../pages/TrafficSources'),
  '/affiliate-networks': () => import('../pages/AffiliateNetworks'),
  '/audit': () => import('../pages/ClicksLog'),
  '/conversions': () => import('../pages/ConversionsLog'),
  '/rules': () => import('../pages/RuleManagement'),
  '/blacklist': () => import('../pages/Blacklist'),
  '/whitelist': () => import('../pages/Whitelist'),
  '/settings': () => import('../pages/Settings'),
  '/help': () => import('../pages/HelpCenter'),
  '/platforms': () => import('../pages/PlatformManagement'),
  '/reports': () => import('../pages/Reports'),
  '/target': () => import('../pages/Target')
};

// 高频访问页面优先级排序
const PRIORITY_PAGES = [
  '/campaigns',
  '/landings',
  '/offers',
  '/trends',
  '/traffic-sources',
  '/audit'
];

// 已预加载的页面
const preloadedPages = new Set<string>();

/**
 * 预加载指定页面的代码
 * @param pagePath 页面路径
 */
export const preloadPage = async (pagePath: string): Promise<void> => {
  if (preloadedPages.has(pagePath) || !pageImports[pagePath]) {
    return;
  }

  try {
    await pageImports[pagePath]();
    preloadedPages.add(pagePath);
    console.log(`[Preload] Page ${pagePath} preloaded successfully`);
  } catch (error) {
    console.error(`[Preload] Failed to preload page ${pagePath}:`, error);
  }
};

/**
 * 空闲时间预加载
 * 利用浏览器空闲时间预加载高频访问页面
 */
export const preloadOnIdle = (): void => {
  const preloadQueue = PRIORITY_PAGES.filter(page => !preloadedPages.has(page));
  
  if (preloadQueue.length === 0) {
    return;
  }

  const preloadNext = (index: number = 0) => {
    if (index >= preloadQueue.length) {
      return;
    }

    const pagePath = preloadQueue[index];
    
    // 预加载当前页面
    preloadPage(pagePath).then(() => {
      // 继续预加载下一个页面，添加延迟避免阻塞
      setTimeout(() => {
        preloadNext(index + 1);
      }, 100);
    });
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadNext();
    });
  } else {
    // 降级方案
    setTimeout(() => {
      preloadNext();
    }, 1000);
  }
};

/**
 * 批量预加载多个页面
 * @param pagePaths 页面路径数组
 */
export const preloadPages = async (pagePaths: string[]): Promise<void> => {
  const promises = pagePaths
    .filter(page => !preloadedPages.has(page) && pageImports[page])
    .map(page => preloadPage(page));

  await Promise.all(promises);
};

/**
 * 获取已预加载的页面列表
 */
export const getPreloadedPages = (): string[] => {
  return Array.from(preloadedPages);
};

/**
 * 清除预加载缓存
 */
export const clearPreloadCache = (): void => {
  preloadedPages.clear();
  console.log('[Preload] Cache cleared');
};

export default {
  preloadPage,
  preloadOnIdle,
  preloadPages,
  getPreloadedPages,
  clearPreloadCache
};