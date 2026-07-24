/** Cache in-memory đơn giản có TTL, dùng cho dự báo thời tiết và triều cường. */
const store = new Map();

export function cacheGet(key) {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

export function cacheSet(key, value, ttlMs) {
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

/**
 * Trả về giá trị đã cache, hoặc gọi `producer` rồi cache lại.
 * Nếu producer lỗi mà vẫn còn giá trị cũ (kể cả hết hạn) thì trả giá trị cũ (stale-on-error).
 */
export async function cached(key, ttlMs, producer) {
  const fresh = cacheGet(key);
  if (fresh !== null) return fresh;
  try {
    const value = await producer();
    return cacheSet(key, value, ttlMs);
  } catch (err) {
    const stale = store.get(key);
    if (stale) return stale.value;
    throw err;
  }
}
