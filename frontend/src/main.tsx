import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './components/Toast'
import { getRawBootstrapData, loadBootstrapForLocation, setPageBootstrapData } from './services/bootstrap'
import { initPerformanceDebug } from './services/performance-debug'

declare global {
  interface Window {
    __INITIAL_DATA__?: any
    __PAGE_BOOTSTRAP__?: any
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
  }
}

function migrateLegacyHashRoute() {
  const { hash, pathname, search } = window.location

  if (!hash.startsWith('#/')) {
    return
  }

  const nextLocation = hash.slice(1)
  if (!nextLocation || nextLocation === pathname + search) {
    return
  }

  window.history.replaceState(null, '', nextLocation)
}

function isLocalPreviewHost() {
  return ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

function hideBootScreen() {
  const bootScreen = document.getElementById('app-boot')
  if (!bootScreen) {
    return
  }

  bootScreen.classList.add('boot-hidden')
  window.setTimeout(() => bootScreen.remove(), 240)
}

async function purgeLegacyServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return
  }

  if (!import.meta.env.PROD && !isLocalPreviewHost()) {
    return
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  } catch (error) {
    console.warn('[PWA] Service worker cleanup failed', error)
  }

  if (!('caches' in window)) {
    return
  }

  try {
    const cacheKeys = await caches.keys()
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)))
  } catch (error) {
    console.warn('[PWA] Cache cleanup failed', error)
  }
}

async function startApp() {
  migrateLegacyHashRoute()
  initPerformanceDebug()

  const injectedInitialData = window.__INITIAL_DATA__
  if (injectedInitialData !== undefined) {
    setPageBootstrapData(injectedInitialData)
    delete window.__INITIAL_DATA__
  } else {
    try {
      await loadBootstrapForLocation()
    } catch (error) {
      console.warn('[Bootstrap] Initial preload failed', error)
    }
  }

  const initialData = getRawBootstrapData()
  window.__PAGE_BOOTSTRAP__ = initialData

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ToastProvider>
        <App initialData={initialData} />
      </ToastProvider>
    </StrictMode>,
  )

  requestAnimationFrame(() => {
    requestAnimationFrame(hideBootScreen)
  })

  void purgeLegacyServiceWorkers()
}

void startApp()
