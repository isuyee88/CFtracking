/**
 * @fileoverview esbuild 配置文件 - 用于 wrangler 部署时的路径别名解析
 * @description 解决 wrangler 部署时无法解析 TypeScript 路径别名的问题
 * Input: TypeScript 源代码
 * Output: 解析路径别名后的 JavaScript 代码
 */

const path = require('path');

module.exports = {
  alias: {
    '@/utils/cn': path.resolve(__dirname, 'frontend/src/utils/cn.ts'),
    '@/components/DateRangePicker': path.resolve(__dirname, 'frontend/src/components/DateRangePicker.tsx'),
    '@/components/GroupByFilter': path.resolve(__dirname, 'frontend/src/components/GroupByFilter.tsx'),
    '@/components/UrlPreview': path.resolve(__dirname, 'frontend/src/components/UrlPreview.tsx'),
    '@/components/DataSourceBadge': path.resolve(__dirname, 'frontend/src/components/DataSourceBadge.tsx'),
    '@/hooks/useCloudSync': path.resolve(__dirname, 'frontend/src/hooks/useCloudSync.ts'),
    '@/contexts/CloudSyncContext': path.resolve(__dirname, 'frontend/src/contexts/CloudSyncContext.tsx'),
    '@/utils/storage': path.resolve(__dirname, 'frontend/src/utils/storage/index.ts'),
  },
};
