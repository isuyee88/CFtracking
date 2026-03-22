import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
    // 禁用模块预加载 - 让浏览器按需加载
    modulePreload: {
      resolveDependencies: (url, deps) => {
        // 只预加载核心依赖，不预加载 recharts/antd 等大型库
        return deps.filter(dep => 
          dep.includes('react-vendor') || 
          dep.includes('router') ||
          dep.includes('index')
        );
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React 核心 - 初始加载需要
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          // React Router - 初始加载需要
          if (id.includes('node_modules/react-router-dom/')) {
            return 'router';
          }
          // antd - 延迟加载
          if (id.includes('node_modules/antd/') || id.includes('node_modules/@ant-design/')) {
            return 'antd';
          }
          // recharts - 延迟加载
          if (id.includes('node_modules/recharts/')) {
            return 'recharts';
          }
        }
      }
    },
    // 提高块大小警告限制
    chunkSizeWarningLimit: 600
  }
})
