export class ApiError extends Error {
  status: number;
  authFailed: boolean;
  code?: string;

  constructor(message: string, status: number, authFailed = false, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.authFailed = authFailed;
    this.code = code;
  }
}

export type ApiOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  retries?: number;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  userId: number;
  email: string;
};

const ACCESS_KEY = 'bms_accessToken';
const REFRESH_KEY = 'bms_refreshToken';
const USER_KEY = 'bms_user';

let accessToken: string | null = localStorage.getItem(ACCESS_KEY);
let refreshToken: string | null = localStorage.getItem(REFRESH_KEY);
let user: { userId: number; email: string } | null = null;

try {
  user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
} catch {
  user = null;
}

type AuthListener = () => void;
const authListeners = new Set<AuthListener>();

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function getUser() {
  return user;
}

export function isLoggedIn() {
  return !!accessToken;
}

export function onAuthChange(listener: AuthListener) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function notifyAuthChange() {
  authListeners.forEach((l) => l());
}

export function setSession(tokens: TokenPair) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  user = { userId: tokens.userId, email: tokens.email };
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChange();
}

export function clearSession() {
  accessToken = null;
  refreshToken = null;
  user = null;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChange();
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) {
    clearSession();
    return false;
  }
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error('refresh failed');
      const data = (await res.json()) as TokenPair;
      setSession(data);
      return true;
    } catch {
      clearSession();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

type AuthRequiredHandler = () => Promise<boolean>;
let authRequiredHandler: AuthRequiredHandler | null = null;

/** Centralized handler invoked when an authenticated request fails auth. */
export function setAuthRequiredHandler(handler: AuthRequiredHandler) {
  authRequiredHandler = handler;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRetry(status: number, attempt: number, max: number) {
  if (attempt >= max) return false;
  return status === 429 || status >= 500;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, retries = 2 } = opts;

  const doFetch = async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let attempt = 0;
  while (true) {
    let res = await doFetch();

    if ((res.status === 401 || res.status === 403) && auth && refreshToken) {
      const refreshed = await tryRefresh();
      if (refreshed) res = await doFetch();
    }

    if ((res.status === 401 || res.status === 403) && auth) {
      const authFailed = true;
      if (authRequiredHandler) {
        const ok = await authRequiredHandler();
        if (ok) {
          res = await doFetch();
          if (res.ok) {
            const text = await res.text();
            return (text ? JSON.parse(text) : null) as T;
          }
        }
      }
      const text = await res.text();
      let data: { message?: string; code?: string } | null = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        /* ignore */
      }
      throw new ApiError(
        data?.message || `Request failed (${res.status})`,
        res.status,
        authFailed,
        data?.code,
      );
    }

    if (!res.ok && shouldRetry(res.status, attempt, retries)) {
      attempt += 1;
      await sleep(Math.min(1000 * 2 ** attempt, 8000));
      continue;
    }

    const text = await res.text();
    let data: { message?: string; code?: string } | string | null = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const message =
        (data && typeof data === 'object' && 'message' in data && data.message) ||
        (typeof data === 'string' ? data : `Request failed (${res.status})`);
      throw new ApiError(String(message), res.status, auth && (res.status === 401 || res.status === 403));
    }

    return data as T;
  }
}

/** Authenticated request with centralized re-auth retry (replaces per-action logic). */
export async function apiWithAuthRetry<T>(path: string, opts: Omit<ApiOptions, 'auth'> = {}): Promise<T> {
  try {
    return await api<T>(path, { ...opts, auth: true });
  } catch (e) {
    if (e instanceof ApiError && e.authFailed && authRequiredHandler) {
      const ok = await authRequiredHandler();
      if (ok) return api<T>(path, { ...opts, auth: true });
    }
    throw e;
  }
}

export async function login(email: string, password: string) {
  const data = await api<TokenPair>('/auth/login', { method: 'POST', body: { email, password } });
  setSession(data);
  return data;
}

export async function signup(name: string, email: string, password: string) {
  await api('/users/signup', { method: 'POST', body: { name, email, password } });
  return login(email, password);
}

export async function fetchMe() {
  return api<{ userId: number; email: string; name: string; role: string }>('/auth/me', { auth: true });
}
