/**
 * @fileoverview SSR + DO + SSE 项目配置文件
 * @description 配置 Vite 构建系统，支持 SSR 渲染、代码分割、Ant Design
 * Input: 项目源代码
 * Output: SSR 构建产物（客户端 + 服务端）
 * Logic: 
 *   - 客户端构建：生成浏览器可执行的 JS/CSS
 *   - 服务端构建：生成 Workers 可执行的 SSR 代码
 *   - 代码分割：优化加载性能
 *   - Ant Design 配置：支持 SSR
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// 检测是否为 SSR 构建
const isSSR = process.env.BUILD_MODE === 'ssr'

export default defineConfig({
  plugins: [
    react({
      // 启用 React 快速刷新
      include: '**/*.tsx',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
      '@backend': path.resolve(__dirname, './src'),
      '@frontend': path.resolve(__dirname, './frontend/src'),
    },
  },
  build: {
    // 目标现代浏览器
    target: 'esnext',
    cssTarget: 'chrome80',
    
    // 代码分割优化（仅客户端构建）
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      output: {
        // 启用文件名内容哈希
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        
        // 手动代码分割（仅客户端构建时生效）
        manualChunks: isSSR ? undefined : (id) => {
          // React 核心
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/')) {
            return 'react-vendor'
          }
          
          // React Router
          if (id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/react-router/')) {
            return 'router'
          }
          
          // Ant Design
          if (id.includes('node_modules/antd/')) {
            return 'antd'
          }
          if (id.includes('node_modules/@ant-design/')) {
            return 'antd-icons'
          }
          
          // Recharts
          if (id.includes('node_modules/recharts/')) {
            return 'recharts'
          }
          
          // 其他 node_modules
          if (id.includes('node_modules/')) {
            const vendor = id.split('node_modules/')[1].split('/')[0]
            if (vendor && vendor.startsWith('@')) {
              const scoped = id.split('node_modules/')[1].split('/').slice(0, 2).join('/')
              if (scoped.includes('@emotion') || scoped.includes('@babel')) {
                return `vendor-${scoped.replace('/', '-')}`
              }
              return null
            }
            if (['axios', 'dayjs', 'zustand'].includes(vendor)) {
              return `vendor-${vendor}`
            }
            return null
          }
          
          // 应用代码按功能模块分割
          if (id.includes('/frontend/src/pages/')) {
            const page = id.split('/frontend/src/pages/')[1].split('/')[0]
            return `page-${page}`
          }
          
          if (id.includes('/frontend/src/components/')) {
            return 'components'
          }
          
          if (id.includes('/frontend/src/hooks/')) {
            return 'hooks'
          }
        },
      },
    },
    
    // 压缩配置
    minify: 'esbuild',
    
    // CSS 分割
    cssCodeSplit: true,
    
    // 块大小警告限制
    chunkSizeWarningLimit: 500,
  },
  
  // SSR 配置
  ssr: {
    // Ant Design SSR 外部化
    noExternal: ['antd', '@ant-design', 'rc-*'],
    // SSR 构建配置
    target: 'webworker',
    format: 'esm',
  },
  
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      'antd',
    ],
  },
  
  server: {
    port: 5173,
    host: true,
  },
})
