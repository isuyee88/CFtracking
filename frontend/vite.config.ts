/**
 * File: vite.config.ts
 * Purpose: Vite 配置文件，配置 PWA、代码分割和构建性能优化
 * Input: 项目源代码
 * Output: 优化后的构建产物（含 Service Worker）
 * Logic: 配置 vite-plugin-pwa、手动代码分割、tree-shaking、压缩等优化策略
 * Dependencies: vite-plugin-pwa, workbox-window
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // 启用 React 快速刷新
      include: '**/*.tsx',
    }),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // 全局参数
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff2,webp}',
        ],
        // 预缓存所有资源
        globDirectory: 'dist',
        // 清理不必要的旧缓存
        cleanupOutdatedCaches: true,
        // 客户端导航时跳过等待
        skipWaiting: true,
        clientsClaim: true,
        // 导航预加载
        navigateFallback: '/index.html',
        // 仅缓存白名单中的 URL
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/auth\//,
          /stats\.html$/, // 排除 stats.html 文件
        ],
        // 增加缓存文件大小限制到 5MB
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // 运行时缓存配置
        runtimeCaching: [
          // 静态资源缓存策略
          {
            urlPattern: /^https:\/\/cdn\.example\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 图片资源缓存
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 字体资源缓存
          {
            urlPattern: /\.(?:woff|woff2)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 年
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // CSS 和 JS 资源缓存
          {
            urlPattern: /\.(?:css|js)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // API 请求缓存策略（网络优先）
          {
            urlPattern: /^https:\/\/api\.example\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 1 天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'CF Tracking',
        short_name: 'CFTrack',
        description: 'Affiliate Tracking Platform',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      devOptions: {
        enabled: false, // 开发环境不启用 PWA
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    // 目标现代浏览器，启用 ESBuild 压缩
    target: 'esnext',
    cssTarget: 'chrome80',
    
    // 启用 tree-shaking
    treeShake: true,
    
    // 代码分割优化
    modulePreload: {
      polyfill: false,
      resolveDependencies: (url, deps) => {
        // 只预加载核心 React 和路由，其他按需加载
        return deps.filter(dep => 
          dep.includes('react-vendor') || 
          dep.includes('router')
        );
      }
    },
    
    rollupOptions: {
      // 启用 tree-shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
      output: {
        // 启用文件名内容哈希，优化缓存
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        
        // 手动代码分割配置 - 优化策略
        manualChunks: (id) => {
          // React 核心 - 最小初始包
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          
          // React Router - 路由核心
          if (id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/react-router/')) {
            return 'router';
          }
          
          // Ant Design - 大型 UI 库，单独分包
          if (id.includes('node_modules/antd/')) {
            return 'antd';
          }
          if (id.includes('node_modules/@ant-design/') ||
              id.includes('node_modules/rc-util/')) {
            return 'antd-icons';
          }
          
          // Recharts - 图表库，按需加载
          if (id.includes('node_modules/recharts/')) {
            return 'recharts';
          }
          if (id.includes('node_modules/d3-')) {
            return 'd3';
          }
          
          // Motion - 动画库
          if (id.includes('node_modules/motion/') ||
              id.includes('node_modules/framer-motion/')) {
            return 'motion';
          }
          
          // Lucide 图标 - 按需加载（不单独分割，让 tree-shaking 处理）
          if (id.includes('node_modules/lucide-react/')) {
            return null;
          }
          
          // Redux 相关
          if (id.includes('node_modules/@reduxjs/') ||
              id.includes('node_modules/redux/') ||
              id.includes('node_modules/react-redux/') ||
              id.includes('node_modules/redux-thunk/') ||
              id.includes('node_modules/reselect/')) {
            return 'redux';
          }
          
          // 其他常用库
          if (id.includes('node_modules/dayjs/')) {
            return 'dayjs';
          }
          if (id.includes('node_modules/immer/')) {
            return 'immer';
          }
          if (id.includes('node_modules/axios/')) {
            return 'axios';
          }
          
          // 其他 node_modules 按包名分割（避免过于细碎）
          if (id.includes('node_modules/')) {
            const vendor = id.split('node_modules/')[1].split('/')[0];
            if (vendor && vendor.startsWith('@')) {
              // 处理 scoped packages
              const scoped = id.split('node_modules/')[1].split('/').slice(0, 2).join('/');
              // 只分割重要的 scoped 包
              if (scoped.includes('@emotion') || scoped.includes('@babel')) {
                return `vendor-${scoped.replace('/', '-')}`;
              }
              return null; // 其他不分割
            }
            // 只分割重要的第三方库
            if (['es-toolkit', 'decimal.js-light', 'victory-vendor', 'resize-observer-polyfill'].includes(vendor)) {
              return `vendor-${vendor}`;
            }
            return null; // 默认不分割，避免生成空 chunk
          }
          
          // 应用代码按功能模块分割
          if (id.includes('/src/pages/')) {
            const page = id.split('/src/pages/')[1].split('/')[0];
            return `page-${page}`;
          }
          
          if (id.includes('/src/components/')) {
            return 'components';
          }
          
          if (id.includes('/src/hooks/')) {
            return 'hooks';
          }
          
          if (id.includes('/src/services/')) {
            return 'services';
          }
        }
      }
    },
    
    // 压缩配置
    minify: 'esbuild',
    esbuildOptions: {
      // 移除 console.log
      drop: ['console'],
      // 移除 debugger
      dropLabels: ['DEBUG'],
    },
    
    // CSS 配置
    cssCodeSplit: true,
    
    // 资源报告
    reportCompressedSize: true,
    
    // 块大小警告限制
    chunkSizeWarningLimit: 500
  },
  
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      'react-is',
      'es-toolkit',
      'es-toolkit/compat',
    ],
    exclude: ['antd', 'recharts', 'motion', 'lucide-react'],
    // 强制预构建核心依赖，减少初始加载
    esbuildOptions: {
      packages: 'external',
    },
  },
  
  // SSR 配置 - 为未来 SSR 优化做准备
  ssr: {
    noExternal: ['antd', '@ant-design', 'rc-*'],
  }
})
