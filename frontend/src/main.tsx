/**
 * File: main.tsx
 * Purpose: React 搴旂敤鍏ュ彛
 * Input/Output: 娓叉煋 React 搴旂敤鍒?root 鍏冪礌锛岀鐞嗘暟鎹敞鍏?
 * Logic:
 *   - 妫€娴?SSR 棰勫姞杞芥暟鎹?
 *   - 浣跨敤 createRoot 杩涜娓叉煋
 *   - 鍒濆鍖?DataCacheProvider
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DataCacheProvider } from './context/DataCacheContext'
import { ThemeProvider } from './context/ThemeContext'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

const ssrData = (window as any).__SSR_DATA__;
const hasSSRData = ssrData && Object.keys(ssrData).length > 0;

console.log('[Main] SSR Data available:', hasSSRData, hasSSRData ? Object.keys(ssrData) : 'none');

const AppWrapper = (
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <DataCacheProvider initialData={ssrData}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </DataCacheProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);

// 褰撳墠鏋舵瀯锛氭湇鍔＄鍙敞鍏ユ暟鎹剼鏈紙window.__SSR_DATA__锛夛紝涓嶆敞鍏ュ畬鏁?HTML
// 鍥犳濮嬬粓浣跨敤 createRoot锛孲SR 鏁版嵁閫氳繃 DataCacheProvider 浼犻€掔粰缁勪欢
createRoot(rootElement).render(AppWrapper);
