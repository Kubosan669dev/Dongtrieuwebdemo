/** Lỗi HTTP có mã trạng thái, để error handler trả về đúng status. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Bọc handler async để tự chuyển lỗi sang next(). */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** fetch có timeout (Node 20 có sẵn fetch & AbortSignal.timeout). */
export async function fetchJson(url, { timeoutMs = 8000, ...opts } = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), ...opts });
  if (!res.ok) throw new HttpError(502, `Upstream ${res.status}: ${url}`);
  return res.json();
}

export async function fetchText(url, { timeoutMs = 8000, headers, ...opts } = {}) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    // Một số cổng thông tin (vd nchmf.gov.vn) chặn request không có User-Agent
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DongTrieuTourism/1.0)', ...headers },
    ...opts,
  });
  if (!res.ok) throw new HttpError(502, `Upstream ${res.status}: ${url}`);
  return res.text();
}
