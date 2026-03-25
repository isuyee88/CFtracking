/**
 * @fileoverview 服务端入口
 * @description SSR 服务端渲染入口，在 Workers 环境中执行
 * 输入：URL 路径、初始状态
 * 输出：渲染后的 HTML 字符串
 * 逻辑交互：
 *   - 使用 ReactDOMServer 渲染 React 组件为 HTML
 *   - 注入初始状态到 HTML
 *   - 支持 Ant Design 组件 SSR
 */

import { renderToString } from 'react-dom/server'
import { StaticRouterProvider, createStaticRouter, createStaticHandler } from 'react-router-dom'
import App from './App'

export interface SSRContext {
  url: string
  initialState?: any
}

/**
 * SSR 渲染函数
 * @param context SSR 上下文
 * @returns 渲染后的 HTML 字符串
 */
export async function renderToStringWithSSR(context: SSRContext): Promise<string> {
  const { url, initialState = {} } = context

  try {
    // 使用 StaticRouterProvider 进行 SSR 渲染
    const html = renderToString(
      <StaticRouterProvider 
        router={createStaticRouter([], { location: url })}
        context={{}}
      />
    )

    return html
  } catch (error) {
    console.error('❌ SSR render error:', error)
    throw error
  }
}

/**
 * 预加载页面资源（可选优化）
 * @param url 页面 URL
 */
export async function preloadResources(url: string): Promise<void> {
  // TODO: 预加载页面所需的资源
  // 例如：预加载数据、图片等
  console.log('📦 Preloading resources for:', url)
}
