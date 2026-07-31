/**
 * Đọc giờ mở cửa dạng chữ thành khung giờ tính được.
 *
 * Dữ liệu Google Maps ghi giờ theo nhiều kiểu: "07:00–22:30", "24 giờ",
 * "10:30–14:00, 17:30–23:00" (nghỉ trưa), "06:00–24:00". Bot cần trả lời được
 * "giờ này còn quán nào mở không" nên phải quy hết về phút kể từ 0h.
 *
 * Nguyên tắc: KHÔNG đoán. Chuỗi nào không đọc được thì trả về null và nơi gọi
 * phải nói thẳng là chưa rõ giờ, thay vì mặc định coi như đang mở.
 */

/** Múi giờ Việt Nam — máy chủ có thể chạy ở UTC nên phải cộng tay. */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Thời điểm hiện tại theo giờ Việt Nam. */
export function nowVN(at = Date.now()) {
  const d = new Date(at + VN_OFFSET_MS);
  return {
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
    weekday: d.getUTCDay(),
    hhmm: `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`,
  };
}

/** "07:30" → 450. */
const toMinutes = (h, m) => Number(h) * 60 + Number(m ?? 0);

/**
 * Phân tích chuỗi giờ mở cửa.
 * @returns {{allDay:boolean, ranges:Array<{from:number,to:number}>}|null}
 *   `to` có thể > 1440 khi quán đóng sau nửa đêm (vd 18:00–02:00 → to = 1560).
 */
export function parseHours(text) {
  const s = String(text ?? '').trim();
  if (!s) return null;

  // "24 giờ", "24/24", "mở cả ngày"
  if (/24\s*(giờ|gio|h|\/\s*24)|cả ngày|cả đêm/i.test(s)) return { allDay: true, ranges: [{ from: 0, to: 1440 }] };

  const ranges = [];
  // Chấp nhận mọi kiểu gạch nối: -, –, —, "đến", "tới"
  const re = /(\d{1,2})[:h](\d{2})?\s*(?:[-–—]|đến|tới)\s*(\d{1,2})[:h](\d{2})?/g;
  for (const m of s.matchAll(re)) {
    const from = toMinutes(m[1], m[2]);
    let to = toMinutes(m[3], m[4]);
    if (to <= from) to += 1440; // qua nửa đêm
    if (from >= 0 && from < 1440 && to > from) ranges.push({ from, to });
  }
  if (ranges.length === 0) return null;

  // "06:00–24:00" thực chất là mở suốt ngày
  const allDay = ranges.some((r) => r.from === 0 && r.to >= 1440);
  return { allDay, ranges };
}

/**
 * Cơ sở có đang mở vào phút `minutes` không?
 * @returns {true|false|null}  null = chưa có/không đọc được giờ mở cửa
 */
export function isOpenAt(openHours, minutes) {
  const h = parseHours(openHours);
  if (!h) return null;
  if (h.allDay) return true;
  return h.ranges.some((r) => (minutes >= r.from && minutes < r.to) || minutes + 1440 < r.to);
}

/** Mở cửa 24/24? */
export function isAllDay(openHours) {
  return parseHours(openHours)?.allDay === true;
}

/** Giờ mở sớm nhất trong ngày (phút), null nếu không rõ. */
export function opensAt(openHours) {
  const h = parseHours(openHours);
  if (!h) return null;
  if (h.allDay) return 0;
  return Math.min(...h.ranges.map((r) => r.from));
}

/** Giờ đóng muộn nhất (phút, có thể > 1440), null nếu không rõ. */
export function closesAt(openHours) {
  const h = parseHours(openHours);
  if (!h) return null;
  if (h.allDay) return 1440;
  return Math.max(...h.ranges.map((r) => r.to));
}

/** 450 → "07:30" (rút gọn quá nửa đêm về khung 24h). */
export function fmtMinutes(m) {
  const x = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
}
