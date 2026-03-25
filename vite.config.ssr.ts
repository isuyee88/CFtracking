/**
 * @fileoverview SSR 构建配置文件
 * @description 专门用于 SSR 构建，不使用 manualChunks
 * Input: SSR 入口文件
 * Output: SSR 构建产物
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
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
    target: 'esnext',
    cssTarget: 'chrome80',
    minify: 'esbuild',
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/ssr/entry-server.tsx',
      output: {
        entryFileNames: 'entry-server.js',
        format: 'esm',
      },
    },
  },
  ssr: {
    noExternal: ['antd', '@ant-design', 'rc-*'],
    target: 'webworker',
    format: 'esm',
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      'antd',
    ],
  },
})
