/**
 * Kiến thức thời tiết dùng CHUNG cho cả giao diện web và chatbot.
 *
 * Đặt ở thư mục `shared/` vì cả `client/` lẫn `server/` đều import file này —
 * nhờ vậy khối gợi ý trên trang /thoi-tiet và câu trả lời của chatbot luôn khớp
 * nhau, sửa một chỗ là cả hai cùng đổi. File cố ý không import gì (kể cả React
 * hay Prisma) để chạy được ở cả trình duyệt lẫn Node.
 */

// ─── Mã thời tiết WMO → nhãn tiếng Việt ────────────────────────────────────
export const WEATHER_CODES = {
  0: { label: 'Trời quang', icon: '☀️' },
  1: { label: 'Ít mây', icon: '🌤️' },
  2: { label: 'Có mây', icon: '⛅' },
  3: { label: 'Nhiều mây', icon: '☁️' },
  45: { label: 'Sương mù', icon: '🌫️' },
  48: { label: 'Sương muối', icon: '🌫️' },
  51: { label: 'Mưa phùn nhẹ', icon: '🌦️' },
  53: { label: 'Mưa phùn', icon: '🌦️' },
  55: { label: 'Mưa phùn dày', icon: '🌧️' },
  61: { label: 'Mưa nhẹ', icon: '🌧️' },
  63: { label: 'Mưa', icon: '🌧️' },
  65: { label: 'Mưa to', icon: '🌧️' },
  66: { label: 'Mưa lạnh', icon: '🌧️' },
  67: { label: 'Mưa lạnh nặng hạt', icon: '🌧️' },
  71: { label: 'Tuyết nhẹ', icon: '🌨️' },
  80: { label: 'Mưa rào nhẹ', icon: '🌦️' },
  81: { label: 'Mưa rào', icon: '🌧️' },
  82: { label: 'Mưa rào mạnh', icon: '⛈️' },
  95: { label: 'Dông', icon: '⛈️' },
  96: { label: 'Dông kèm mưa đá', icon: '⛈️' },
  99: { label: 'Dông mạnh, mưa đá', icon: '⛈️' },
};

export const weatherInfo = (code) => WEATHER_CODES[code] ?? { label: 'Không rõ', icon: '🌡️' };

// ─── Gợi ý tham quan theo thời tiết ────────────────────────────────────────
// Nhóm di tích theo đặc điểm tham quan, dùng slug có thật trong database.
const INDOOR = ['chua-my-cu-sung-khanh-tu', 'dinh-chua-trieu-khe', 'mieu-hau-tu-vu-mieu', 'dinh-my-cu'];
const SHADED = [
  'den-an-bien-den-nu-tuong-le-chan',
  'chua-an-bien-bao-an-tu',
  'dinh-chua-nghe-lang-van-dong',
];
const OUTDOOR = [
  'don-cao-dong-trieu',
  'chua-quan-ngoc-thanh',
  'dinh-chua-binh-luc',
  'dinh-trao-ha-den-di-ai',
];

/** Chọn các di tích theo slug, giữ đúng thứ tự ưu tiên; bỏ qua slug không tồn tại. */
function pick(heritages, slugs, limit = 3) {
  const bySlug = new Map((heritages || []).map((h) => [h.slug, h]));
  return slugs
    .map((s) => bySlug.get(s))
    .filter(Boolean)
    .slice(0, limit);
}

/** Ghi chú theo mùa, dựa trên tháng dương lịch hiện tại. */
export function seasonNote(date = new Date()) {
  const m = date.getMonth() + 1;
  if (m >= 7 && m <= 9) return 'Đang mùa na dai Đông Triều — có thể ghé nhà vườn hái na tại chỗ.';
  if (m >= 10 && m <= 12)
    return 'Mùa rươi vùng sông Kinh Thầy – Đá Bạc (tháng 9–11 âm lịch); xem tab Triều cường để canh con nước.';
  if (m >= 1 && m <= 3) return 'Cao điểm mùa lễ hội xuân — nhiều hội làng diễn ra trong tháng Giêng âm lịch.';
  if (m >= 4 && m <= 6) return 'Trời chuyển nắng, nên tham quan vào sáng sớm hoặc chiều muộn.';
  return null;
}

/**
 * @param {object} weather  dữ liệu từ /api/weather
 * @param {Array}  heritages danh sách di tích từ /api/heritages
 * @returns {{tone, title, message, picks, tips}}
 */
export function getWeatherAdvice(weather, heritages = []) {
  const cur = weather?.current;
  if (!cur) return null;

  const code = cur.code ?? 0;
  const temp = cur.temp ?? 25;
  const today = weather?.daily?.[0] ?? {};
  const rainProb = today.rainProb ?? 0;
  const uv = today.uvMax ?? 0;

  const isStorm = code >= 95;
  const isRain = code >= 51 || rainProb >= 70;
  const isHot = temp >= 33 || uv >= 8;
  const isCold = temp < 18;

  const tips = [];
  const season = seasonNote();

  let tone, title, message, slugs;

  if (isStorm) {
    tone = 'warn';
    title = 'Hôm nay có dông — nên hoãn các điểm ngoài trời';
    message =
      'Trời có dông kèm gió giật. Nếu vẫn muốn đi, hãy chọn các điểm chiêm bái có mái che và tránh khu vực đồi, cây cao.';
    slugs = INDOOR;
    tips.push('Tránh trú mưa dưới gốc cây cổ thụ trong khuôn viên di tích.');
    tips.push('Theo dõi lại dự báo trước khi khởi hành.');
  } else if (isRain) {
    tone = 'rain';
    title = 'Trời mưa — ưu tiên điểm tham quan trong nhà';
    message =
      'Thời tiết có mưa, phù hợp để chiêm bái và xem hiện vật trong không gian có mái che hơn là leo đồi ngắm cảnh.';
    slugs = INDOOR;
    tips.push('Mang ô hoặc áo mưa; sân di tích lát đá có thể trơn.');
    tips.push('Chùa Mỹ Cụ lưu giữ 126 hiện vật — xem được trọn vẹn dù ngoài trời mưa.');
  } else if (isHot) {
    tone = 'hot';
    title = 'Trời nắng nóng — đi sáng sớm hoặc chiều muộn';
    message = `Nhiệt độ ${Math.round(temp)}°C${
      uv >= 8 ? `, chỉ số UV cao (${Math.round(uv)})` : ''
    }. Nên tham quan trước 9h sáng hoặc sau 16h, ưu tiên nơi có cây xanh và suối.`;
    slugs = SHADED;
    tips.push('Mang đủ nước, đội mũ rộng vành và bôi kem chống nắng.');
    tips.push('Đền An Biên còn gọi là "Đền Suối" — có dòng suối chảy quanh năm, khuôn viên nhiều cây.');
  } else if (isCold) {
    tone = 'cold';
    title = 'Trời lạnh — nhớ mặc ấm khi đi lễ';
    message = `Nhiệt độ ${Math.round(temp)}°C. Tiết trời se lạnh rất hợp để đi lễ đầu năm và vãn cảnh chùa.`;
    slugs = [...INDOOR.slice(0, 2), ...OUTDOOR.slice(0, 2)];
    tips.push('Mặc ấm, mang giày đế mềm nếu có leo bậc đá.');
  } else {
    tone = 'good';
    title = 'Thời tiết đẹp — rất hợp để tham quan cả ngày';
    message = `Nhiệt độ ${Math.round(temp)}°C, trời ${
      code <= 1 ? 'quang đãng' : 'ít mây'
    }. Đây là điều kiện lý tưởng để leo đồi ngắm cảnh và đi nhiều điểm trong ngày.`;
    slugs = OUTDOOR;
    tips.push('Đồn Cao nằm trên đồi cao 61m — tầm nhìn thoáng, đẹp nhất vào lúc chiều muộn.');
    tips.push('Có thể kết hợp 3–4 điểm trong ngày vì các di tích cách nhau không xa.');
  }

  if (season) tips.push(season);

  return { tone, title, message, picks: pick(heritages, slugs), tips };
}

/** Câu gợi ý rất ngắn cho widget thời tiết ở trang chủ. */
export function getShortAdvice(weather) {
  const cur = weather?.current;
  if (!cur) return null;
  const code = cur.code ?? 0;
  const temp = cur.temp ?? 25;
  if (code >= 95) return 'Có dông — cân nhắc hoãn chuyến đi';
  if (code >= 51) return 'Trời mưa — nên chọn điểm trong nhà';
  if (temp >= 33) return 'Nắng nóng — đi sáng sớm hoặc chiều muộn';
  if (temp < 18) return 'Trời lạnh — nhớ mặc ấm khi đi lễ';
  return 'Thời tiết đẹp — hợp tham quan cả ngày';
}
