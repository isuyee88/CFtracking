/**
 * @fileoverview Vite 项目配置文件
 * @description 配置 Vite 构建系统，支持前端 SPA 应用
 * Input: 项目源代码
 * Output: 前端构建产物
 * Logic: 
 *   - 前端构建：生成浏览器可执行的 JS/CSS
 *   - 代码分割：优化加载性能
 *   - Ant Design 配置：支持按需加载
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
    
    // 代码分割优化
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      output: {
        // 启用文件名内容哈希
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        
        // 手动代码分割
        manualChunks: (id) => {
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
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
