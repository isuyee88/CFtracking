import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const buildId = (process.env.CFTRACK_BUILD_ID || Date.now().toString(36)).toLowerCase();

export default defineConfig({
  plugins: [
    react({
      include: '**/*.tsx',
    }),
    tailwindcss(),
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg', 'robots.txt'],
      manifest: {
        name: 'CF Tracking',
        short_name: 'CF Tracking',
        description: 'Real-time traffic tracking and analytics dashboard',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
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
    host: true,
  },
  build: {
    target: 'esnext',
    cssTarget: 'chrome80',
    treeShake: true,
    modulePreload: {
      polyfill: false,
      resolveDependencies: (_url, deps) =>
        deps.filter(
          (dep) =>
            dep.includes('react-vendor') ||
            dep.includes('router') ||
            dep.includes('app-shell') ||
            dep.includes('app-contexts') ||
            dep.includes('filters-ui')
        ),
    },
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
      output: {
        entryFileNames: `assets/[name]-${buildId}-[hash].js`,
        chunkFileNames: `assets/[name]-${buildId}-[hash].js`,
        assetFileNames: `assets/[name]-${buildId}-[hash][extname]`,
        manualChunks: (id) => {
          if (
            id.includes('src/contexts/InitialDataContext.tsx') ||
            id.includes('src\\contexts\\InitialDataContext.tsx')
          ) {
            return 'app-contexts';
          }

          if (
            id.includes('src/components/Layout.tsx') ||
            id.includes('src\\components\\Layout.tsx')
          ) {
            return 'app-shell';
          }

          if (
            id.includes('src/components/DateRangePicker.tsx') ||
            id.includes('src\\components\\DateRangePicker.tsx') ||
            id.includes('src/components/GroupByFilter.tsx') ||
            id.includes('src\\components\\GroupByFilter.tsx') ||
            id.includes('src/types/filter.ts') ||
            id.includes('src\\types\\filter.ts')
          ) {
            return 'filters-ui';
          }

          if (
            id.includes('src/components/ChartWrapper.tsx') ||
            id.includes('src\\components\\ChartWrapper.tsx')
          ) {
            return 'charts-ui';
          }

          if (
            id.includes('src/components/VirtualTable.tsx') ||
            id.includes('src\\components\\VirtualTable.tsx') ||
            id.includes('src/components/VirtualTableEnhanced.tsx') ||
            id.includes('src\\components\\VirtualTableEnhanced.tsx') ||
            id.includes('src/hooks/useTableScroll.ts') ||
            id.includes('src\\hooks\\useTableScroll.ts')
          ) {
            return 'table-ui';
          }

          if (
            id.includes('src/components/BrandIcon.tsx') ||
            id.includes('src\\components\\BrandIcon.tsx') ||
            id.includes('src/components/dashboard/DashboardRecentClicksSection.tsx') ||
            id.includes('src\\components\\dashboard\\DashboardRecentClicksSection.tsx')
          ) {
            return 'recent-clicks-ui';
          }

          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }

          if (
            id.includes('node_modules/react-router-dom/') ||
            id.includes('node_modules/react-router/')
          ) {
            return 'router';
          }

          if (
            id.includes('node_modules/antd/') ||
            id.includes('node_modules/@ant-design/') ||
            id.includes('node_modules/@rc-component/') ||
            id.includes('node_modules/rc-')
          ) {
            // Keep Ant Design ecosystem in one chunk to avoid circular chunk graph
            // (e.g. antd <-> @ant-design/icons runtime init order issues).
            return 'antd';
          }

          if (id.includes('node_modules/recharts/')) {
            return 'recharts';
          }

          if (id.includes('node_modules/d3-')) {
            return 'd3';
          }

          if (
            id.includes('node_modules/motion/') ||
            id.includes('node_modules/framer-motion/')
          ) {
            return 'motion';
          }

          if (id.includes('node_modules/lucide-react/')) {
            return 'lucide-icons';
          }

          if (
            id.includes('node_modules/@reduxjs/') ||
            id.includes('node_modules/redux/') ||
            id.includes('node_modules/react-redux/') ||
            id.includes('node_modules/redux-thunk/') ||
            id.includes('node_modules/reselect/')
          ) {
            return 'redux';
          }

          if (id.includes('node_modules/dayjs/')) {
            return 'dayjs';
          }

          if (id.includes('node_modules/immer/')) {
            return 'immer';
          }

          if (id.includes('node_modules/axios/')) {
            return 'axios';
          }

          if (id.includes('node_modules/')) {
            const vendor = id.split('node_modules/')[1].split('/')[0];

            if (vendor && vendor.startsWith('@')) {
              const scoped = id.split('node_modules/')[1].split('/').slice(0, 2).join('/');
              if (scoped.includes('@emotion') || scoped.includes('@babel')) {
                return `vendor-${scoped.replace('/', '-')}`;
              }
              return null;
            }

            if (
              ['es-toolkit', 'decimal.js-light', 'victory-vendor', 'resize-observer-polyfill'].includes(vendor)
            ) {
              return `vendor-${vendor}`;
            }

            return null;
          }

          return null;
        },
      },
    },
    minify: 'esbuild',
    esbuildOptions: {
      drop: ['console'],
      dropLabels: ['DEBUG'],
    },
    cssCodeSplit: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-is',
      'lodash',
      'lodash/get',
    ],
    exclude: ['antd', 'motion', 'lucide-react'],
    esbuildOptions: {
      packages: 'external',
    },
  },
  ssr: {
    noExternal: ['antd', '@ant-design', 'rc-*'],
  },
});
