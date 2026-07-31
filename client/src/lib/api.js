// Client API mỏng dùng chung. Dev proxy /api → :4000 (xem vite.config.js).
const BASE = '/api';

/**
 * Token quản trị, cố ý chỉ giữ trong bộ nhớ.
 *
 * KHÔNG được lưu vào localStorage hay sessionStorage: yêu cầu của phường là mở
 * lại trang quản trị thì phải nhập mật khẩu, mà cả hai chỗ đó đều sống qua lần
 * tải trang. Biến này mất khi trang tải lại — đó chính là điều mong muốn.
 */
let authToken = null;

export const setAuthToken = (t) => {
  authToken = t;
};

/**
 * Được gọi khi máy chủ trả 401 lúc đang có token — nghĩa là token hết hạn giữa
 * chừng. `AuthProvider` đăng ký hàm đưa giao diện về màn hình đăng nhập, nếu không
 * quản trị viên sẽ ngồi trước một trang mà thao tác nào cũng báo lỗi mà không hiểu vì sao.
 */
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(path, { method = 'GET', body, headers, ...rest } = {}) {
  const opts = {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    ...rest,
  };
  if (body) opts.body = body instanceof FormData ? body : JSON.stringify(body);

  const res = await fetch(BASE + path, opts);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    // Đang có token mà bị từ chối = token hết hạn. Trang đăng nhập cũng trả 401
    // khi gõ sai mật khẩu, nên phải kiểm tra `authToken` để không tự đá mình ra
    // ngay tại màn hình đăng nhập.
    if (res.status === 401 && authToken) {
      authToken = null;
      onUnauthorized?.();
    }
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
