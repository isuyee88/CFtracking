import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './components/Toast'
import { getRawBootstrapData, loadBootstrapForLocation, setPageBootstrapData } from './services/bootstrap'
import { initPerformanceDebug } from './services/performance-debug'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

function safeGetStorageItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

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
  if (!bootScreen || bootScreen.classList.contains('boot-hidden')) {
    return
  }

  bootScreen.classList.add('boot-hidden')
  window.setTimeout(() => bootScreen.remove(), 180)
}

async function purgeLegacyServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  if (!import.meta.env.PROD && !isLocalPreviewHost()) {
    return false
  }

  let didPurge = false

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    if (registrations.length > 0) {
      didPurge = true
    }
    await Promise.all(registrations.map((registration) => registration.unregister()))
  } catch (error) {
    console.warn('[PWA] Service worker cleanup failed', error)
  }

  if (!('caches' in window)) {
    return didPurge
  }

  try {
    const cacheKeys = await caches.keys()
    if (cacheKeys.length > 0) {
      didPurge = true
    }
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)))
  } catch (error) {
    console.warn('[PWA] Cache cleanup failed', error)
  }

  return didPurge
}

function hasServiceWorkerResetMarker() {
  const params = new URLSearchParams(window.location.search)
  return params.has('__sw_reset')
}

function buildServiceWorkerResetUrl() {
  const nextUrl = new URL(window.location.href)
  const marker = Date.now().toString(36)
  nextUrl.searchParams.set('__sw_reset', marker)
  nextUrl.searchParams.set('__nocache', marker)
  return nextUrl.toString()
}

async function readAuthStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return true
    }

    const payload = await response.json().catch(() => null)
    return Boolean(payload?.data?.enabled)
  } catch (error) {
    console.warn('[Auth] Failed to fetch auth status, fallback to auth ON mode.', error)
    return true
  }
}

async function enforceAuthBeforeAppStart(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return true
  }

  if (window.location.pathname === '/login') {
    return true
  }

  const token = safeGetStorageItem('token')
  if (token) {
    return true
  }

  const authEnabled = await readAuthStatus()
  if (!authEnabled) {
    return true
  }

  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
  const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
  window.location.replace(loginUrl)
  return false
}

async function startApp() {
  migrateLegacyHashRoute()
  const didPurgeLegacySw = await purgeLegacyServiceWorkers()
  if (didPurgeLegacySw && !hasServiceWorkerResetMarker()) {
    window.location.replace(buildServiceWorkerResetUrl())
    return
  }

  try {
    initPerformanceDebug()
  } catch (error) {
    console.warn('[Perf] Performance debug init skipped in restricted context.', error)
  }

  const canContinue = await enforceAuthBeforeAppStart()
  if (!canContinue) {
    return
  }

  const injectedInitialData = window.__INITIAL_DATA__
  if (injectedInitialData !== undefined) {
    setPageBootstrapData(injectedInitialData)
    delete window.__INITIAL_DATA__
  }

  const initialData = getRawBootstrapData()
  window.__PAGE_BOOTSTRAP__ = initialData

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ToastProvider>
        <App initialData={initialData} onReady={hideBootScreen} />
      </ToastProvider>
    </StrictMode>,
  )

  if (injectedInitialData === undefined) {
    void loadBootstrapForLocation().catch((error) => {
      console.warn('[Bootstrap] Initial preload failed', error)
    })
  }
}

void startApp()
