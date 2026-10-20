/**
 * File: vite.config.ts
 * Purpose: Vite 閰嶇疆鏂囦欢锛岄厤缃?React Router v7 SSR 鍜屾瀯寤轰紭鍖?
 * Input: 椤圭洰婧愪唬鐮?
 * Output: 浼樺寲鍚庣殑鏋勫缓浜х墿
 * Logic: 閰嶇疆 React Router v7 SSR銆佷唬鐮佸垎鍓层€乼ree-shaking銆佸帇缂╃瓑浼樺寲绛栫暐
 */
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    target: 'esnext',
    cssTarget: 'chrome80',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    treeShake: true,
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks: (id) => {
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/react-router/')) {
            return 'router';
          }
          if (id.includes('node_modules/antd/')) {
            return 'antd';
          }
          if (id.includes('node_modules/@ant-design/') ||
              id.includes('node_modules/rc-util/')) {
            return 'antd-icons';
          }
          if (id.includes('node_modules/recharts/')) {
            return 'recharts';
          }
          if (id.includes('node_modules/d3-')) {
            return 'd3';
          }
          if (id.includes('node_modules/dayjs/')) {
            return 'dayjs';
          }
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
          return undefined;
        }
      }
    },
    minify: 'esbuild',
    esbuildOptions: {
      drop: ['console'],
      dropLabels: ['DEBUG'],
    },
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
    ],
  },
  ssr: {
    noExternal: [],
    external: [
      'antd',
      '@ant-design/icons',
      '@ant-design/icons-svg',
      'rc-*',
      'dayjs',
    ],
  }
})
