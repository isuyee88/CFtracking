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
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心
          'react-vendor': ['react', 'react-dom'],
          // React Router
          'router': ['react-router-dom'],
          // 图表库 - 较大的库单独分割
          'recharts': ['recharts'],
          // UI 组件库
          'antd': ['antd'],
          // 动画库
          'motion': ['motion'],
        }
      }
    },
    // 提高块大小警告限制
    chunkSizeWarningLimit: 600
  }
})
