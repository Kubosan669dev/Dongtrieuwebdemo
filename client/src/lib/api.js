// Client API mỏng dùng chung. Dev proxy /api → :4000 (xem vite.config.js).
const BASE = '/api';

async function request(path, { method = 'GET', body, headers, ...rest } = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: { ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...headers },
    ...rest,
  };
  if (body) opts.body = body instanceof FormData ? body : JSON.stringify(body);

  const res = await fetch(BASE + path, opts);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message = (isJson && data?.error) || `Lỗi ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.details = isJson ? data?.details : null;
    throw err;
  }
  return data;
}

export const api = {
  get: (p, opts) => request(p, opts),
  post: (p, body, opts) => request(p, { method: 'POST', body, ...opts }),
  patch: (p, body, opts) => request(p, { method: 'PATCH', body, ...opts }),
  put: (p, body, opts) => request(p, { method: 'PUT', body, ...opts }),
  del: (p, opts) => request(p, { method: 'DELETE', ...opts }),
};

// ── Các hàm tiện dụng ──
export const fetchList = (resource, params) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return api.get(`/${resource}${qs}`);
};
export const fetchOne = (resource, key) => api.get(`/${resource}/${key}`);
