// In dev: '/api' (Vite proxy strips prefix and forwards to localhost:8000)
// In prod: full backend URL like 'https://monteq-api.onrender.com'
const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (email: string, password: string) =>
    request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
};

// Settings
export const settings = {
  get: () => request('/settings/'),
  update: (data: any) => request('/settings/', { method: 'PATCH', body: JSON.stringify(data) }),
};

// Deribit Keys
export const keys = {
  save: (client_id: string, client_secret: string) =>
    request('/keys/deribit', { method: 'POST', body: JSON.stringify({ client_id, client_secret }) }),
  check: () => request('/keys/deribit/status').catch(() => null),
};

// Derive Keys
export const deriveKeys = {
  save: (private_key: string, wallet_address: string, subaccount_id: number) =>
    request('/keys/derive', { method: 'POST', body: JSON.stringify({ private_key, wallet_address, subaccount_id }) }),
  check: () => request('/keys/derive/status').catch(() => null),
};

// Deribit
export const deribit = {
  account: (currency = 'BTC') => request(`/deribit/account?currency=${currency}`),
  positions: (currency = 'BTC') => request(`/deribit/positions?currency=${currency}`),
  orders: (currency = 'BTC') => request(`/deribit/orders?currency=${currency}`),
  execute: (asset = 'BTC') => request(`/deribit/execute?asset=${asset}`, { method: 'POST' }),
  close: (tradeId: string) => request(`/deribit/close/${tradeId}`, { method: 'POST' }),
  cancelAll: () => request('/deribit/orders', { method: 'DELETE' }),
};

// Derive
export const derive = {
  account: () => request('/derive/account'),
  positions: (currency = 'ETH') => request(`/derive/positions?currency=${currency}`),
  orders: (currency = 'ETH') => request(`/derive/orders?currency=${currency}`),
  execute: (asset = 'ETH') => request(`/derive/execute?asset=${asset}`, { method: 'POST' }),
  close: (tradeId: string) => request(`/derive/close/${tradeId}`, { method: 'POST' }),
  cancelAll: () => request('/derive/orders', { method: 'DELETE' }),
};

// Exchange-aware helpers
export function getExchangeApi(exchange: string) {
  return exchange === 'derive' ? derive : deribit;
}

export function getKeysApi(exchange: string) {
  return exchange === 'derive' ? deriveKeys : keys;
}

// Signals
export const signals = {
  generate: (asset = 'BTC') => request(`/signals/generate?asset=${asset}`, { method: 'POST' }),
};

// Trades
export const trades = {
  list: (status?: string, limit = 20) =>
    request(`/trades/?limit=${limit}${status ? `&status=${status}` : ''}`),
  get: (id: string) => request(`/trades/${id}`),
  events: (id: string) => request(`/trades/${id}/events`),
  allEvents: (limit = 50) => request(`/trades/events/all?limit=${limit}`),
  signals: (status?: string) =>
    request(`/trades/signals?${status ? `status=${status}&` : ''}limit=20`),
};

// Portfolio
export const portfolio = {
  risk: () => request('/portfolio/risk'),
};

// Bot
export const bot = {
  start: () => request('/bot/start', { method: 'POST' }),
  stop: () => request('/bot/stop', { method: 'POST' }),
  status: () => request('/bot/status'),
};
