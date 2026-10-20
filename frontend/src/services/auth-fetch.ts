/**
 * @file 同源 /api/* 请求自动附加 Bearer token。
 * @platform cftracking
 * @owner frontend
 * @invariant 只处理同源 /api/*；不覆盖已有 Authorization；登录请求本身无 token。
 */

let installed = false;

export function installAuthFetch() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const url = new URL(rawUrl, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    const token = window.localStorage.getItem('token');
    if (!token) return originalFetch(input, init);

    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

    if (input instanceof Request) {
      return originalFetch(new Request(input, { headers }));
    }
    return originalFetch(input, { ...init, headers });
  };
}
