import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react({
      include: '**/*.tsx',
    }),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
        globIgnores: [
          'assets/page-*.js',
          'assets/recharts-*.js',
          'assets/d3-*.js',
          'assets/vendor-victory-vendor-*.js',
        ],
        globDirectory: 'dist',
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//, /stats\.html$/],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.example\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:woff|woff2)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:css|js)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\.example\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
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
        enabled: false,
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
            dep.includes('hooks') ||
            dep.includes('services') ||
            dep.includes('filters-ui')
        ),
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
          if (
            id.includes('src/contexts/InitialDataContext.tsx') ||
            id.includes('src\\contexts\\InitialDataContext.tsx') ||
            id.includes('src/contexts/CloudSyncContext.tsx') ||
            id.includes('src\\contexts\\CloudSyncContext.tsx')
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
            id.includes('src\\components\\ChartWrapper.tsx') ||
            id.includes('src/components/DataSourceBadge.tsx') ||
            id.includes('src\\components\\DataSourceBadge.tsx') ||
            id.includes('src/components/BrandIcon.tsx') ||
            id.includes('src\\components\\BrandIcon.tsx') ||
            id.includes('src/components/VirtualTable.tsx') ||
            id.includes('src\\components\\VirtualTable.tsx') ||
            id.includes('src/components/VirtualTableEnhanced.tsx') ||
            id.includes('src\\components\\VirtualTableEnhanced.tsx') ||
            id.includes('src/hooks/useTableScroll.ts') ||
            id.includes('src\\hooks\\useTableScroll.ts')
          ) {
            return 'dashboard-ui';
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

          if (id.includes('node_modules/antd/')) {
            return 'antd';
          }

          if (
            id.includes('node_modules/@ant-design/') ||
            id.includes('node_modules/rc-util/')
          ) {
            return 'antd-icons';
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
            return null;
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
      'es-toolkit',
      'es-toolkit/compat',
    ],
    exclude: ['antd', 'recharts', 'motion', 'lucide-react'],
    esbuildOptions: {
      packages: 'external',
    },
  },
  ssr: {
    noExternal: ['antd', '@ant-design', 'rc-*'],
  },
});
