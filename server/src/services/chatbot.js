/**
 * Bộ não chatbot du lịch Đông Triều — chạy hoàn toàn trên dữ liệu của phường.
 *
 * KHÔNG gọi bất kỳ dịch vụ AI bên ngoài nào. Cách hoạt động:
 *   1. Nhận diện ý định câu hỏi bằng luật tiếng Việt (thời tiết, lễ hội, ăn, ngủ…)
 *   2. Với ý định có dữ liệu động (thời tiết, triều cường, lịch âm) → tính toán thẳng
 *   3. Còn lại → tra cứu BM25 trên toàn bộ database rồi trích thông tin có thật
 *
 * Hệ quả quan trọng: bot KHÔNG BỊA. Mọi con số, số điện thoại, địa chỉ trong câu
 * trả lời đều đến từ một bản ghi cụ thể. Muốn bot thông minh hơn thì bổ sung dữ
 * liệu trong trang quản trị, hoặc thêm từ đồng nghĩa ở server/src/lib/vitext.js.
 */

import { getCorpus } from './knowledge.js';
import { ASSISTANT_NAME } from '../lib/site.js';
import { buildIndex, search } from './retrieval.js';
import { getWeather } from './weather.js';
import { getTide } from './tide.js';
import { norm, has, deaccent } from '../lib/vitext.js';
import { nowVN, isOpenAt, isAllDay, opensAt, closesAt } from '../lib/hours.js';
import { distanceKm, fmtDistance } from '../lib/geo.js';
import { solarToLunar, nextLunarOccurrence, lunarMonthLabel, lunarYearName } from '../../../shared/lunar.js';
import { weatherInfo, getWeatherAdvice, seasonNote } from '../../../shared/weather.js';

// ─── Tiện ích định dạng ────────────────────────────────────────────────────

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAY_FULL = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

/** "2026-07-24" → chỉ số ngày trong tuần (0 = Chủ nhật). */
const weekdayOf = (iso) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};
/** "2026-07-24" → "T6 24/7" */
const dayLabel = (iso) => {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${WEEKDAY[weekdayOf(iso)]} ${d}/${m}`;
};
const hhmm = (iso) => String(iso ?? '').slice(11, 16);
const round = (n) => (n === null || n === undefined ? null : Math.round(n));

/** Rút gọn văn bản dài, cắt ở cuối câu cho gọn gàng. */
function short(text, maxLen = 280) {
  const t = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const dot = cut.lastIndexOf('. ');
  if (dot > maxLen * 0.5) return cut.slice(0, dot + 1);
  // Cắt ở khoảng trắng gần nhất để không đứt giữa chừng một chữ
  const space = cut.lastIndexOf(' ');
  return `${(space > maxLen * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Gạch đầu dòng. */
const bullets = (items) => items.filter(Boolean).map((s) => `• ${s}`).join('\n');

const RANK_LABEL = {
  QUOC_GIA_DAC_BIET: 'Di tích Quốc gia đặc biệt',
  QUOC_GIA: 'Di tích Quốc gia',
  CAP_TINH: 'Di tích cấp tỉnh',
};
const LODGING_LABEL = { KHACH_SAN: 'Khách sạn', NHA_NGHI: 'Nhà nghỉ', HOMESTAY: 'Homestay' };
const RESTAURANT_LABEL = {
  NHA_HANG: 'Nhà hàng',
  QUAN_AN: 'Quán ăn',
  CAFE: 'Cà phê',
  DIEM_DUNG_CHAN: 'Điểm dừng chân',
};

// ─── Đánh giá sao ──────────────────────────────────────────────────────────
// Bộ dữ liệu khảo sát 2026 có điểm Google Maps cho phần lớn cơ sở. Hai quy tắc:
//
//   1. XẾP HẠNG phải xét độ tin cậy. Quán 5,0★ với 2 lượt đánh giá không đáng
//      tin bằng quán 4,1★ với 118 lượt, nên kéo mọi điểm về trung bình chung
//      theo số lượt (Bayesian shrinkage) trước khi so sánh.
//   2. Đây là cổng thông tin CHÍNH THỨC của phường. Bot không chủ động chê cơ
//      sở nào: các câu gợi ý chỉ lấy cơ sở từ GOOD_RATING trở lên. Nhưng khi
//      khách hỏi đích danh một quán thì vẫn trả lời đầy đủ, kể cả điểm thấp —
//      giấu thông tin lúc được hỏi thẳng còn tệ hơn.

const PRIOR_MEAN = 3.9; // điểm trung bình chung của bộ dữ liệu
const PRIOR_WEIGHT = 12; // cần ~12 lượt thì điểm thật mới thắng thế trung bình
const GOOD_RATING = 3.5; // dưới mức này thì không đưa vào danh sách gợi ý

/** Điểm xếp hạng đã hiệu chỉnh theo số lượt đánh giá. */
function bayesRating(x) {
  if (x?.rating == null) return PRIOR_MEAN - 0.5; // chưa có đánh giá: xếp giữa, không phải bét
  const v = x.ratingCount ?? 0;
  return (v * x.rating + PRIOR_WEIGHT * PRIOR_MEAN) / (v + PRIOR_WEIGHT);
}

/** Xếp giảm dần theo độ tin cậy của đánh giá. */
const byRating = (a, b) => bayesRating(b) - bayesRating(a);

/**
 * "⭐ 4,2 (80 đánh giá)" — trả về chuỗi rỗng khi chưa có lượt nào.
 * Cố ý KHÔNG hiển thị "0 sao": chưa ai đánh giá không có nghĩa là dở.
 */
function stars(x) {
  if (x?.rating == null) return '';
  const n = String(x.rating).replace('.', ',');
  return `⭐ ${n}${x.ratingCount ? ` (${x.ratingCount} đánh giá)` : ''}`;
}

/** Đủ điều kiện để bot CHỦ ĐỘNG giới thiệu? Chưa có đánh giá vẫn được. */
const isGood = (x) => x?.rating == null || x.rating >= GOOD_RATING;

/** Nhãn nguồn cho các danh sách có điểm sao. */
const RATING_NOTE =
  '_Điểm sao lấy từ Google Maps (chốt ngày 27/07/2026), chưa phải đánh giá chính thức của phường và có thể thay đổi._';

// ─── Chỉ mục tìm kiếm (dựng lại khi kho tri thức đổi) ──────────────────────

let indexCache = { builtAt: 0, index: null };

/**
 * Xuất ra ngoài để tầng Gemini (`services/gemini.js`) dùng CHUNG một chỉ mục,
 * thay vì tự dựng bản thứ hai. Hai chỉ mục là hai kết quả tra cứu khác nhau,
 * mà tầng Gemini chỉ được phép nói về đúng những tài liệu bản luật đã tìm ra.
 */
export async function getSearchIndex() {
  const corpus = await getCorpus();
  if (indexCache.builtAt !== corpus.builtAt) {
    indexCache = { builtAt: corpus.builtAt, index: buildIndex(corpus.docs) };
  }
  return { corpus, index: indexCache.index };
}

// ─── Nhận diện mốc thời gian trong câu hỏi ─────────────────────────────────

/**
 * Tìm xem người dùng hỏi về ngày nào trong 7 ngày dự báo.
 * @returns {{index:number, phrase:string}|{range:true}|null}
 */
function resolveDay(q, daily) {
  // "cuối tuần này" phải xét TRƯỚC "tuần này", nếu không sẽ bị hiểu thành cả tuần
  if (has(q, 'cuoi tuan')) {
    const i = daily.findIndex((d) => [6, 0].includes(weekdayOf(d.date)));
    if (i >= 0) return { index: i, phrase: 'cuối tuần' };
  }
  if (has(q, '7 ngay', 'bay ngay', 'tuan nay', 'tuan toi', 'ca tuan', 'nhung ngay toi', 'may ngay toi'))
    return { range: true };
  if (has(q, 'ngay mai', 'hom sau', 'mai')) return { index: 1, phrase: 'ngày mai' };
  if (has(q, 'ngay kia', 'ngay mot')) return { index: 2, phrase: 'ngày kia' };
  if (has(q, 'hom nay', 'bay gio', 'hien tai', 'luc nay')) return { index: 0, phrase: 'hôm nay' };

  const NAMES = [
    ['chu nhat', 0],
    ['thu hai', 1],
    ['thu ba', 2],
    ['thu tu', 3],
    ['thu nam', 4],
    ['thu sau', 5],
    ['thu bay', 6],
  ];
  for (const [name, wd] of NAMES) {
    if (has(q, name)) {
      const i = daily.findIndex((d) => weekdayOf(d.date) === wd);
      if (i >= 0) return { index: i, phrase: WEEKDAY_FULL[wd].toLowerCase() };
    }
  }
  return null;
}

// ─── Trả lời thời tiết ─────────────────────────────────────────────────────

function describeDay(d) {
  const info = weatherInfo(d.code);
  const parts = [`${info.icon} **${dayLabel(d.date)}**: ${round(d.tempMin)}–${round(d.tempMax)}°C, ${info.label.toLowerCase()}`];
  if (d.rainProb > 0) parts.push(`khả năng mưa ${d.rainProb}%`);
  if (d.uvMax >= 8) parts.push(`UV ${round(d.uvMax)} (cao)`);
  return parts.join(', ');
}

async function answerWeather(q, corpus) {
  const weather = await getWeather();
  const daily = weather.daily ?? [];
  const target = resolveDay(q, daily);

  // Hỏi cả tuần
  if (target?.range) {
    const lines = daily.map(describeDay).join('\n');
    return {
      intent: 'weather_range',
      reply: `📅 **Dự báo 7 ngày tới — phường Đông Triều**\n\n${lines}\n\nSố liệu từ Open-Meteo, cập nhật lúc ${hhmm(weather.current.time)} hôm nay.`,
      links: [{ label: 'Xem biểu đồ chi tiết', url: '/thoi-tiet' }],
      suggestions: ['Ngày mai có mưa không?', 'Hôm nay nên đi đâu?', 'Triều cường hôm nay thế nào?'],
    };
  }

  // Hỏi một ngày cụ thể trong tương lai
  if (target && target.index > 0) {
    const d = daily[target.index];
    if (!d) {
      return {
        intent: 'weather_day',
        reply: 'Mình chỉ có dự báo trong 7 ngày tới thôi. Bạn thử hỏi một ngày gần hơn nhé.',
        links: [{ label: 'Trang dự báo', url: '/thoi-tiet' }],
        suggestions: ['Thời tiết 7 ngày tới', 'Thời tiết hôm nay'],
      };
    }
    const info = weatherInfo(d.code);
    const advice =
      d.code >= 95
        ? 'Có dông — nên hoãn các điểm ngoài trời.'
        : d.code >= 51 || d.rainProb >= 70
          ? 'Nhiều khả năng mưa — ưu tiên điểm tham quan có mái che.'
          : d.tempMax >= 33
            ? 'Trời nóng — nên đi trước 9h sáng hoặc sau 16h.'
            : d.tempMin < 18
              ? 'Trời lạnh — nhớ mặc ấm khi đi lễ.'
              : 'Thời tiết thuận lợi để tham quan.';
    return {
      intent: 'weather_day',
      reply:
        `${info.icon} **Thời tiết ${target.phrase} (${dayLabel(d.date)}) tại Đông Triều**\n\n` +
        bullets([
          `${info.label}, ${round(d.tempMin)}–${round(d.tempMax)}°C`,
          `Khả năng mưa ${d.rainProb ?? 0}%${d.rainSum ? `, lượng mưa ~${d.rainSum}mm` : ''}`,
          `Gió mạnh nhất ${round(d.windMax)} km/h${d.uvMax ? ` · UV ${round(d.uvMax)}` : ''}`,
          `Mặt trời mọc ${hhmm(d.sunrise)}, lặn ${hhmm(d.sunset)}`,
        ]) +
        `\n\n${advice}`,
      links: [{ label: 'Xem dự báo đầy đủ', url: '/thoi-tiet' }],
      suggestions: ['Thời tiết 7 ngày tới', 'Hôm nay nên đi đâu?', 'Triều cường thế nào?'],
    };
  }

  // Mặc định: thời tiết hiện tại
  const c = weather.current;
  const today = daily[0];
  const info = weatherInfo(c.code);
  const advice = getWeatherAdvice(weather, corpus.heritages);

  const lines = [
    `${info.label}, **${round(c.temp)}°C**${c.feels != null ? ` (cảm giác như ${round(c.feels)}°C)` : ''}`,
    `Độ ẩm ${round(c.humidity)}% · gió ${round(c.wind)} km/h`,
  ];
  if (today) {
    lines.push(
      `Hôm nay ${round(today.tempMin)}–${round(today.tempMax)}°C, khả năng mưa ${today.rainProb ?? 0}%${
        today.uvMax ? `, UV cao nhất ${round(today.uvMax)}` : ''
      }`,
    );
    lines.push(`Mặt trời mọc ${hhmm(today.sunrise)}, lặn ${hhmm(today.sunset)}`);
  }

  return {
    intent: 'weather_now',
    reply:
      `${info.icon} **Thời tiết Đông Triều lúc ${hhmm(c.time)}**\n\n${bullets(lines)}` +
      (advice ? `\n\n**${advice.title}**\n${advice.message}` : ''),
    links: [
      { label: 'Dự báo theo giờ & 7 ngày', url: '/thoi-tiet' },
      ...(advice?.picks ?? []).slice(0, 3).map((h) => ({ label: h.name, url: `/di-tich/${h.slug}` })),
    ],
    suggestions: ['Thời tiết 7 ngày tới', 'Hôm nay nên đi đâu?', 'Triều cường hôm nay?'],
  };
}

// ─── Trả lời triều cường ───────────────────────────────────────────────────

async function answerTide() {
  const tide = await getTide();
  if (!tide.hasData) {
    return {
      intent: 'tide',
      reply:
        'Hiện chưa lấy được số liệu mực nước. Bạn xem lại ở trang Dự báo giúp mình nhé — ở đó có biểu đồ triều cường cập nhật liên tục.',
      links: [{ label: 'Trang dự báo', url: '/thoi-tiet' }],
      suggestions: ['Thời tiết hôm nay', 'Hôm nay nên đi đâu?'],
    };
  }

  // Chuỗi dữ liệu bắt đầu từ 00:00 hôm nay nên phải bỏ các cực trị đã qua
  const nowLocal = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16);
  const upcoming = tide.extremes.filter((e) => e.time >= nowLocal).slice(0, 6);
  const lines = (upcoming.length ? upcoming : tide.extremes.slice(-6)).map(
    (e) =>
      `${e.type === 'HIGH' ? '🔺 Nước lớn' : '🔻 Nước ròng'} ${hhmm(e.time)} ngày ${dayLabel(e.time)} — ${e.height.toFixed(2)}m`,
  );

  return {
    intent: 'tide',
    reply:
      `🌊 **Con nước — ${tide.location.label}**\n\n${bullets(lines)}\n\n` +
      `⚠️ Đây là số liệu **tham chiếu** cho vùng sông Kinh Thầy – Đá Bạc. Trung tâm phường Đông Triều nằm sâu trong đất liền nên không có trạm hải văn riêng. Đơn vị: mét so với mực nước biển trung bình.` +
      `\n\nDân đi bắt rươi thường canh con nước theo lịch này (mùa rươi tháng 9–11 âm lịch).`,
    links: [{ label: 'Biểu đồ triều cường', url: '/thoi-tiet' }],
    suggestions: ['Rươi Đông Triều có gì đặc biệt?', 'Thời tiết hôm nay', 'Mùa rươi vào tháng mấy?'],
  };
}

// ─── Gợi ý "hôm nay nên đi đâu" ────────────────────────────────────────────

async function answerWhereToGo(corpus) {
  const weather = await getWeather();
  const advice = getWeatherAdvice(weather, corpus.heritages);
  const info = weatherInfo(weather.current.code);

  if (!advice) {
    return answerListHeritages(corpus);
  }

  const picks = advice.picks.map((h) => `**${h.name}** — ${short(h.summary, 110)}`);

  return {
    intent: 'where_today',
    reply:
      `${info.icon} Hiện ${info.label.toLowerCase()}, ${round(weather.current.temp)}°C. **${advice.title}**\n\n` +
      `${advice.message}\n\n**Gợi ý cho hôm nay:**\n${bullets(picks)}\n\n${bullets(advice.tips.slice(0, 2))}`,
    links: advice.picks.map((h) => ({ label: h.name, url: `/di-tich/${h.slug}` })),
    suggestions: ['Ăn gì ở Đông Triều?', 'Lễ hội nào sắp diễn ra?', 'Đi từ Hà Nội thế nào?'],
  };
}

// ─── Lễ hội ────────────────────────────────────────────────────────────────

function answerUpcomingFestivals(corpus) {
  const now = new Date();
  const lunarToday = solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear());

  const withDates = corpus.festivals
    .filter((f) => f.lunarMonth && f.lunarDay)
    .map((f) => ({ f, next: nextLunarOccurrence(f.lunarDay, f.lunarMonth, now) }))
    .filter((x) => x.next)
    .sort((a, b) => a.next.daysAway - b.next.daysAway)
    .slice(0, 5);

  if (withDates.length === 0) {
    return answerListFestivals(corpus);
  }

  const lines = withDates.map(({ f, next }) => {
    const d = next.date;
    const when =
      next.daysAway === 0
        ? '**hôm nay**'
        : next.daysAway === 1
          ? '**ngày mai**'
          : `còn **${next.daysAway} ngày**`;
    return `**${f.name}** — ${f.lunarTimeText}\n   Dương lịch: ${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()} (${when})`;
  });

  return {
    intent: 'festival_upcoming',
    reply:
      `📅 Hôm nay là ngày ${lunarToday.day} ${lunarMonthLabel(lunarToday.month)} âm lịch, năm ${lunarYearName(lunarToday.year)}.\n\n` +
      `**Các lễ hội sắp diễn ra:**\n\n${lines.join('\n')}\n\n` +
      `Ngày dương lịch do mình quy đổi từ âm lịch. Giờ giấc cụ thể từng năm có thể xê dịch, bạn nên hỏi lại ban tổ chức tại di tích.`,
    links: withDates.slice(0, 3).map(({ f }) => ({ label: f.name, url: `/le-hoi/${f.slug}` })),
    suggestions: ['Lễ hội Thái Miếu có gì?', 'Đông Triều có bao nhiêu lễ hội?', 'Hôm nay nên đi đâu?'],
  };
}

function answerFestivalsInMonth(corpus, month) {
  const list = corpus.festivals.filter((f) => f.lunarMonth === month);
  if (list.length === 0) {
    return {
      intent: 'festival_month',
      reply: `Theo dữ liệu của phường thì ${lunarMonthLabel(month)} âm lịch không có lễ hội nào được ghi nhận. Phần lớn hội làng ở Đông Triều tập trung vào tháng Giêng.`,
      links: [{ label: 'Xem toàn bộ lịch lễ hội', url: '/le-hoi' }],
      suggestions: ['Lễ hội nào sắp diễn ra?', 'Lễ hội tháng Giêng có những gì?'],
    };
  }
  const lines = list.map((f) => `**${f.name}** — ${f.lunarTimeText}, tại ${short(f.location, 70)}`);
  return {
    intent: 'festival_month',
    reply: `📅 **${list.length} lễ hội trong ${lunarMonthLabel(month)} âm lịch:**\n\n${bullets(lines)}`,
    links: list.slice(0, 4).map((f) => ({ label: f.name, url: `/le-hoi/${f.slug}` })),
    suggestions: ['Lễ hội nào sắp diễn ra?', 'Hôm nay nên đi đâu?'],
  };
}

function answerListFestivals(corpus) {
  const list = corpus.festivals.slice(0, 6);
  return {
    intent: 'list_festival',
    reply:
      `🎏 Đông Triều có **${corpus.festivals.length} lễ hội** được ghi trong hồ sơ, hầu hết vào mùa xuân.\n\n` +
      bullets(list.map((f) => `**${f.name}** — ${f.lunarTimeText}`)) +
      (corpus.festivals.length > list.length ? `\n\n…và ${corpus.festivals.length - list.length} lễ hội khác.` : ''),
    links: [{ label: 'Xem toàn bộ lịch lễ hội', url: '/le-hoi' }],
    suggestions: ['Lễ hội nào sắp diễn ra?', 'Lễ hội Thái Miếu có gì?'],
  };
}

// ─── Hỏi sâu về một lễ hội ─────────────────────────────────────────────────
// Hồ sơ chi tiết 2026 tách rõ phần LỄ (nghi lễ) với phần HỘI (hoạt động văn
// hoá), kèm nhân vật được thờ, ý nghĩa và kinh nghiệm cho du khách. Nhờ đó bot
// trả lời đúng khía cạnh khách hỏi thay vì đọc lại cả đoạn giới thiệu.

/** Khách đang hỏi khía cạnh nào của lễ hội? null nếu hỏi chung chung. */
function detectFestivalAspect(q) {
  if (has(q, 'tho ai', 'tho vi nao', 'tho nhung ai', 'thanh hoang', 'tho ong', 'tho than', 'tuong nho ai')) return 'worship';
  if (has(q, 'nghi le', 'nghi thuc', 'te le', 'ruoc', 'phan le', 'cung te', 'dang huong')) return 'ritual';
  if (has(q, 'phan hoi', 'hoat dong', 'tro choi', 'thi dau', 'van nghe', 'co gi choi', 'giai tri', 'choi gi')) return 'activity';
  if (has(q, 'kinh nghiem', 'luu y', 'can chuan bi', 'nen di luc nao', 'meo', 'trang phuc', 'chu y gi', 'can biet'))
    return 'tips';
  if (has(q, 'y nghia', 'nghia la gi', 'de lam gi', 'muc dich', 'gia tri')) return 'meaning';
  if (has(q, 'lich su', 'co tu bao gio', 'nguon goc', 'hinh thanh', 'tu khi nao', 'bat dau tu')) return 'history';
  return null;
}

/** Nội dung cho từng khía cạnh — null khi hồ sơ lễ hội chưa có phần đó. */
function festivalAspectBody(f, aspect) {
  if (aspect === 'worship' && f.worship?.length)
    return `🙏 **${f.name} thờ:**\n\n${bullets(f.worship)}` + (f.history ? `\n\n${short(f.history, 260)}` : '');

  if (aspect === 'ritual' && f.rituals?.length)
    return `🕯️ **Nghi lễ chính trong ${f.name}:**\n\n${bullets(f.rituals.map((x) => short(x, 150)))}`;

  if (aspect === 'activity' && f.activities?.length)
    return `🎪 **Phần hội — các hoạt động ở ${f.name}:**\n\n${bullets(f.activities.map((x) => short(x, 150)))}`;

  if (aspect === 'tips' && f.visitorTips?.length)
    return (
      `🎒 **Kinh nghiệm dự ${f.name}:**\n\n${bullets(f.visitorTips.map((x) => short(x, 160)))}` +
      (f.duration ? `\n\nLễ hội kéo dài **${f.duration.toLowerCase()}**, diễn ra ${f.lunarTimeText}.` : '')
    );

  if (aspect === 'meaning' && (f.meaningCultural || f.meaningSpiritual))
    return (
      `💫 **Ý nghĩa của ${f.name}**\n\n` +
      bullets([
        f.meaningCultural ? `**Văn hoá:** ${f.meaningCultural}` : '',
        f.meaningSpiritual ? `**Tâm linh:** ${f.meaningSpiritual}` : '',
      ])
    );

  if (aspect === 'history' && f.history)
    return `📜 **Lịch sử ${f.name}**\n\n${short(f.history, 420)}`;

  return null;
}

function answerFestivalAspect(f, aspect, url) {
  const body = festivalAspectBody(f, aspect);

  // Hồ sơ lễ hội này chưa có phần khách hỏi → nói thật, đừng lấy đoạn khác thế vào
  if (!body) {
    return {
      intent: 'festival_aspect',
      matched: false,
      reply:
        `Hồ sơ **${f.name}** trong dữ liệu của phường chưa có phần này 😔\n\n` +
        `Mình đang có: ${short(f.intro, 200)}\n\n` +
        'Hồ sơ chi tiết (nghi lễ, phần hội, kinh nghiệm dự lễ) hiện mới đầy đủ cho 6 lễ hội lớn của vùng.',
      links: [{ label: `Chi tiết ${f.name}`, url }, { label: 'Lịch lễ hội', url: '/le-hoi' }],
      suggestions: ['Lễ hội nào sắp diễn ra?', 'Lễ hội đền An Sinh thờ ai?', 'Hôm nay nên đi đâu?'],
    };
  }

  const next = f.lunarMonth && f.lunarDay ? nextLunarOccurrence(f.lunarDay, f.lunarMonth) : null;
  const when = next
    ? `\n\n📅 ${f.lunarTimeText} — lần tới còn **${next.daysAway} ngày** (${next.date.getUTCDate()}/${next.date.getUTCMonth() + 1}/${next.date.getUTCFullYear()}).`
    : `\n\n📅 ${f.lunarTimeText}.`;

  return {
    intent: 'festival_aspect',
    reply: body + when + (f.sourceNote ? `\n\n_Nguồn: ${f.sourceNote}._` : ''),
    links: [{ label: `Chi tiết ${f.name}`, url }, { label: 'Lịch lễ hội', url: '/le-hoi' }],
    // Gợi ý các khía cạnh khác mà hồ sơ này có, bỏ khía cạnh vừa trả lời
    suggestions: [
      aspect !== 'tips' && f.visitorTips?.length ? `Đi ${f.name} cần lưu ý gì?` : '',
      aspect !== 'ritual' && f.rituals?.length ? `${f.name} có nghi lễ gì?` : '',
      aspect !== 'worship' && f.worship?.length ? `${f.name} thờ ai?` : '',
      'Lễ hội nào sắp diễn ra?',
    ]
      .filter(Boolean)
      .slice(0, 3),
  };
}

// ─── Danh sách theo nhóm ───────────────────────────────────────────────────

function answerListHeritages(corpus) {
  const list = corpus.heritages.slice(0, 6);
  return {
    intent: 'list_heritage',
    reply:
      `🏯 Phường Đông Triều có **${corpus.heritages.length} cụm di tích đã được xếp hạng**.\n\n` +
      bullets(list.map((h) => `**${h.name}** — ${RANK_LABEL[h.rankLevel] ?? ''}`)) +
      (corpus.heritages.length > list.length
        ? `\n\n…và ${corpus.heritages.length - list.length} di tích khác.`
        : ''),
    links: [
      { label: 'Xem tất cả di tích', url: '/di-tich' },
      ...list.slice(0, 3).map((h) => ({ label: h.name, url: `/di-tich/${h.slug}` })),
    ],
    suggestions: ['Hôm nay nên đi đâu?', 'Chùa Mỹ Cụ có gì đặc biệt?', 'Đi từ Hà Nội thế nào?'],
  };
}

function answerListCuisines(corpus) {
  const list = corpus.cuisines;
  return {
    intent: 'list_cuisine',
    reply:
      `🍽️ **Đặc sản Đông Triều** (${list.length} món trong dữ liệu):\n\n` +
      bullets(list.map((c) => `**${c.name}** — ${short(c.summary, 90)}`)) +
      `\n\n${seasonNote() ?? ''}`,
    links: [
      { label: 'Trang ẩm thực', url: '/am-thuc' },
      ...list.slice(0, 3).map((c) => ({ label: c.name, url: `/am-thuc/${c.slug}` })),
    ],
    suggestions: ['Ăn ở nhà hàng nào?', 'Na Đông Triều mùa nào?', 'Mua quà gì về?'],
  };
}

/**
 * @param {string|null} placeHint  tên một di tích nếu khách hỏi "gần <di tích>".
 *   Ta không có toạ độ để tính khoảng cách thật (chỉ 1/13 di tích có GPS, 0 cơ sở
 *   lưu trú có GPS) nên nói thẳng thay vì bịa ra thứ tự "gần nhất".
 */
function answerListLodgings(corpus, placeHint = null) {
  const { minutes } = nowVN();
  const good = corpus.lodgings.filter(isGood).sort(byRating);
  const list = good.slice(0, 6);
  const near = placeHint
    ? `Bạn hỏi các cơ sở gần **${placeHint}**. Hồ sơ di tích này chưa có toạ độ và cũng chưa quy được về khu phố nên mình không dám xếp theo khoảng cách — dưới đây là các cơ sở lưu trú trong phường, phường không rộng nên đều khá thuận tiện.\n\n`
    : '';
  const registered = corpus.lodgings.filter((l) => l.registeredWithWard).length;

  return {
    intent: 'list_lodging',
    reply:
      near +
      `🛏️ Phường có **${corpus.lodgings.length} cơ sở lưu trú** trong dữ liệu` +
      (registered ? ` (${registered} cơ sở có trong Danh sách UBND phường 2026)` : '') +
      ':\n\n' +
      bullets(list.map((l) => placeLine(l, minutes) + `\n   📍 ${l.address}`)) +
      (good.length > list.length ? `\n\n…và ${good.length - list.length} cơ sở khác.` : ''),
    links: [{ label: 'Xem tất cả nơi lưu trú', url: '/luu-tru' }, ...mapsLink(list[0])],
    suggestions: ['Khách sạn nào đánh giá cao nhất?', 'Lịch trình 2 ngày 1 đêm?', 'Ăn gì ở Đông Triều?'],
  };
}

function answerListRestaurants(corpus, placeHint = null) {
  const { minutes } = nowVN();
  // Chỉ nơi ĂN — quán cà phê tách sang answerListCafes, nếu không "ăn ở đâu"
  // sẽ trả về một danh sách toàn quán nước.
  const good = eateries(corpus).filter(isGood).sort(byRating);
  const list = good.slice(0, 6);
  const anyUnverified = list.some((r) => !r.isVerified);
  const near = placeHint
    ? `Bạn hỏi kèm tên **${placeHint}**. Mình chưa xếp được theo khoảng cách tới điểm đó, nên liệt kê các nơi ăn uống được đánh giá tốt trong vùng — phường không rộng nên đi lại đều khá thuận tiện.\n\n`
    : '';
  return {
    intent: 'list_restaurant',
    reply:
      near +
      `🍜 **Nơi ăn uống ở Đông Triều** (${eateries(corpus).length} quán ăn, nhà hàng trong dữ liệu — xếp theo đánh giá):\n\n` +
      bullets(list.map((r) => placeLine(r, minutes) + `\n   📍 ${r.address}`)) +
      (good.length > list.length ? `\n\n…và ${good.length - list.length} nơi khác.` : '') +
      `\n\nNgoài ra phường còn **${cafes(corpus).length} quán cà phê, trà sữa** — hỏi mình _"quán cà phê nào đẹp"_ nhé.` +
      `\n\n${RATING_NOTE}` +
      (anyUnverified
        ? '\n\n⚠️ Một số thông tin tổng hợp từ Internet và **chưa được gọi xác minh**, số điện thoại có thể đã thay đổi.'
        : ''),
    links: [{ label: 'Trang ẩm thực', url: '/am-thuc' }, ...mapsLink(list[0])],
    suggestions: ['Quán nào đánh giá cao nhất?', 'Giờ này còn quán nào mở?', 'Đặc sản Đông Triều có gì?'],
  };
}

/** Danh sách quán cà phê / trà sữa — nhóm riêng, trước đây lẫn vào nhà hàng. */
function answerListCafes(corpus) {
  const { minutes } = nowVN();
  const good = cafes(corpus).filter(isGood).sort(byRating);
  if (good.length === 0) return answerListRestaurants(corpus);

  return {
    intent: 'list_cafe',
    reply:
      `☕ **Quán cà phê & trà sữa ở Đông Triều** (${cafes(corpus).length} quán trong dữ liệu):\n\n` +
      bullets(good.slice(0, 6).map((r) => placeLine(r, minutes) + (r.tags?.length ? `\n   🏷️ ${r.tags.slice(0, 4).join(', ')}` : ''))) +
      `\n\n${RATING_NOTE}`,
    links: [{ label: 'Trang ẩm thực', url: '/am-thuc' }, ...mapsLink(good[0])],
    suggestions: ['Quán nào mở 24/24?', 'Quán ăn nào đánh giá cao?', 'Hôm nay nên đi đâu?'],
  };
}

function answerListAttractions(corpus) {
  const list = corpus.attractions;
  return {
    intent: 'list_attraction',
    reply:
      `⛰️ **Điểm đến lân cận** — ngoài phường nhưng rất tiện kết hợp (${list.length} điểm):\n\n` +
      bullets(
        list.map(
          (a) =>
            `**${a.name}**${a.ward ? ` (${a.ward})` : ''}${a.distanceKm ? ` — cách khoảng ${a.distanceKm}km` : ''}\n   ${short(a.summary, 100)}`,
        ),
      ),
    links: [
      { label: 'Xem trên bản đồ', url: '/ban-do' },
      { label: 'Trang di tích', url: '/di-tich' },
    ],
    suggestions: ['Ngoạ Vân đi thế nào?', 'Lịch trình 2 ngày 1 đêm?', 'Hôm nay nên đi đâu?'],
  };
}

// ─── Mô tả một bản ghi cụ thể ──────────────────────────────────────────────

function describeDoc(doc) {
  const r = doc.raw;

  if (doc.kind === 'heritage') {
    const lines = [];
    if (r.address) lines.push(`📍 ${r.address}`);
    if (r.rankLevelText || r.rankLevel) lines.push(`🏅 ${r.rankLevelText || RANK_LABEL[r.rankLevel]}`);
    if (r.worship?.length) lines.push(`🙏 Thờ: ${r.worship.join(', ')}`);
    if (r.festivalNote) lines.push(`🎏 ${short(r.festivalNote, 120)}`);
    const highlights = r.highlights?.length ? `\n\n**Điểm nổi bật:**\n${bullets(r.highlights.slice(0, 3).map((h) => short(h, 130)))}` : '';
    return {
      reply: `🏯 **${r.name}**\n\n${short(r.summary, 300)}\n\n${bullets(lines)}${highlights}`,
      links: [{ label: `Chi tiết ${r.name}`, url: doc.url }, { label: 'Xem trên bản đồ', url: '/ban-do' }],
      suggestions: [`Đi ${r.name} thế nào?`, 'Hôm nay nên đi đâu?', 'Lễ hội nào sắp diễn ra?'],
    };
  }

  if (doc.kind === 'festival') {
    const lines = [
      `📅 ${r.lunarTimeText}${r.solarEstimate ? ` (${r.solarEstimate})` : ''}${r.duration ? ` · kéo dài ${r.duration.toLowerCase()}` : ''}`,
      `📍 ${r.location}`,
    ];
    const next = r.lunarMonth && r.lunarDay ? nextLunarOccurrence(r.lunarDay, r.lunarMonth) : null;
    if (next) {
      const d = next.date;
      lines.push(
        `⏳ Lần tới: ${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}${
          next.daysAway === 0 ? ' — **hôm nay**' : ` — còn ${next.daysAway} ngày`
        }`,
      );
    }
    if (r.worship?.length) lines.push(`🙏 Thờ: ${r.worship.join(', ')}`);

    const rituals = r.rituals?.length
      ? `\n\n**Nghi lễ chính:**\n${bullets(r.rituals.slice(0, 4).map((x) => short(x, 120)))}`
      : '';
    const activities = r.activities?.length
      ? `\n\n**Phần hội:**\n${bullets(r.activities.slice(0, 3).map((x) => short(x, 110)))}`
      : '';
    // Có hồ sơ chi tiết thì mách khách hỏi tiếp được gì
    const more = r.visitorTips?.length ? `\n\n💡 Hỏi mình _"đi ${r.name} cần lưu ý gì"_ để xem kinh nghiệm dự lễ.` : '';

    return {
      reply: `🎏 **${r.name}**\n\n${short(r.intro, 300)}\n\n${bullets(lines)}${rituals}${activities}${more}`,
      links: [{ label: `Chi tiết ${r.name}`, url: doc.url }, { label: 'Lịch lễ hội', url: '/le-hoi' }],
      suggestions: [
        r.visitorTips?.length ? `Đi ${r.name} cần lưu ý gì?` : 'Lễ hội nào sắp diễn ra?',
        r.worship?.length ? `${r.name} thờ ai?` : 'Hôm nay nên đi đâu?',
        'Ăn gì ở Đông Triều?',
      ],
    };
  }

  if (doc.kind === 'cuisine') {
    const lines = [];
    if (r.season) lines.push(`🗓️ Mùa: ${r.season}`);
    if (r.priceRange) lines.push(`💰 ${r.priceRange}`);
    if (r.whereToBuy?.length) lines.push(`🛒 Mua ở: ${r.whereToBuy.join(', ')}`);
    return {
      reply: `🍽️ **${r.name}**\n\n${short(r.description || r.summary, 320)}\n\n${bullets(lines)}`,
      links: [{ label: `Chi tiết ${r.name}`, url: doc.url }, { label: 'Trang ẩm thực', url: '/am-thuc' }],
      suggestions: ['Đặc sản nào nữa?', 'Ăn ở nhà hàng nào?', 'Mua quà gì về?'],
    };
  }

  if (doc.kind === 'lodging') {
    const { minutes } = nowVN();
    const lines = [`📍 ${r.address}`];
    if (r.rating != null) lines.push(stars(r));
    if (r.phones?.length) lines.push(`☎ ${r.phones.join(' · ')}`);
    if (r.owner) lines.push(`👤 Chủ cơ sở: ${r.owner}`);
    if (r.priceRange) lines.push(`💰 ${r.priceRange}`);
    const hl = hoursLine(r, minutes);
    if (hl) lines.push(hl);
    if (r.khuPho) lines.push(`🏘️ Khu phố ${r.khuPho}${r.khuPhoEstimated ? ' _(ước tính)_' : ''}`);
    if (r.registeredWithWard) lines.push('✅ Có trong Danh sách cơ sở lưu trú UBND phường 2026');

    return {
      reply:
        `🛏️ **${r.name}** (${LODGING_LABEL[r.type] ?? ''})\n\n` +
        (r.description ? `${short(r.description, 260)}\n\n` : '') +
        bullets(lines) +
        (r.rating != null ? `\n\n${RATING_NOTE}` : ''),
      links: [{ label: 'Tất cả nơi lưu trú', url: '/luu-tru' }, ...mapsLink(r)],
      suggestions: ['Còn khách sạn nào khác?', 'Ăn gì ở Đông Triều?', 'Lịch trình 2 ngày 1 đêm?'],
    };
  }

  if (doc.kind === 'restaurant') {
    const { minutes } = nowVN();
    // Chỉ nêu khu vực khi cơ sở nằm NGOÀI phường — trong phường thì địa chỉ đã
    // có sẵn "phường Đông Triều", nhắc lại chỉ thừa.
    const lines = [`📍 ${r.address}${inWard(r) ? '' : ` — **${r.area}**`}`];
    if (r.rating != null) lines.push(stars(r));
    if (r.phone) lines.push(`☎ ${r.phone}`);
    const hl = hoursLine(r, minutes);
    if (hl) lines.push(hl);
    if (r.priceRange) lines.push(`💰 ${r.priceRange}`);
    if (r.specialties?.length) lines.push(`🍽️ Phục vụ: ${r.specialties.join(', ')}`);
    if (r.khuPho) lines.push(`🏘️ Khu phố ${r.khuPho}${r.khuPhoEstimated ? ' _(ước tính)_' : ''}`);

    return {
      reply:
        `🍜 **${r.name}** (${RESTAURANT_LABEL[r.type] ?? ''})\n\n` +
        // Hỏi đích danh thì trả lời đầy đủ, kể cả nhận xét chưa hay — giấu
        // thông tin lúc khách hỏi thẳng còn tệ hơn.
        (r.description ? `${short(r.description, 300)}\n\n` : '') +
        bullets(lines) +
        (r.rating != null ? `\n\n${RATING_NOTE}` : '') +
        (r.isVerified ? '' : '\n\n⚠️ Thông tin tổng hợp từ Internet, **chưa gọi xác minh** — bạn nên gọi trước khi tới.'),
      links: [{ label: 'Trang ẩm thực', url: '/am-thuc' }, ...mapsLink(r)],
      suggestions: ['Quán nào đánh giá cao nhất?', 'Giờ này còn quán nào mở?', 'Đặc sản Đông Triều có gì?'],
    };
  }

  if (doc.kind === 'attraction') {
    const lines = [];
    if (r.ward) lines.push(`📍 ${r.ward}${r.address ? ` — ${r.address}` : ''}`);
    if (r.distanceKm) lines.push(`🚗 Cách trung tâm phường khoảng ${r.distanceKm}km`);
    const hl = r.highlights?.length ? `\n\n**Điểm nổi bật:**\n${bullets(r.highlights.slice(0, 3).map((h) => short(h, 120)))}` : '';
    return {
      reply:
        `⛰️ **${r.name}** _(điểm lân cận, ngoài phường Đông Triều)_\n\n${short(r.description || r.summary, 300)}\n\n${bullets(lines)}${hl}`,
      links: [{ label: 'Xem trên bản đồ', url: '/ban-do' }, { label: 'Điểm lân cận', url: '/di-tich' }],
      suggestions: ['Còn điểm nào gần đây?', 'Lịch trình 2 ngày 1 đêm?', 'Hôm nay nên đi đâu?'],
    };
  }

  // Bài viết
  return {
    reply: `📰 **${r.title}**\n\n${short(r.excerpt, 320)}`,
    links: [{ label: 'Đọc bài viết', url: doc.url }, { label: 'Tất cả bài viết', url: '/tin-tuc' }],
    suggestions: ['Hôm nay nên đi đâu?', 'Đi từ Hà Nội thế nào?', 'Ăn gì ở Đông Triều?'],
  };
}

// ─── Đường đi & lịch trình ─────────────────────────────────────────────────

function answerDirections(corpus, hit) {
  // Nếu người dùng nhắc tên một di tích cụ thể thì trả lời riêng cho điểm đó
  if (hit?.doc.kind === 'heritage' && hit.doc.raw.travelTips) {
    const h = hit.doc.raw;
    return {
      intent: 'directions',
      reply: `🚗 **Đường đến ${h.name}**\n\n${short(h.travelTips, 600)}\n\n📍 ${h.address}`,
      links: [{ label: `Chi tiết ${h.name}`, url: `/di-tich/${h.slug}` }, { label: 'Bản đồ', url: '/ban-do' }],
      suggestions: ['Hôm nay nên đi đâu?', 'Có khách sạn nào không?', 'Lịch trình 2 ngày 1 đêm?'],
    };
  }

  // travelTips gồm phần giới thiệu chung + phần "Riêng điểm này" của từng di tích.
  // Câu hỏi chung chung thì chỉ lấy phần đầu, bỏ phần riêng của một di tích cụ thể.
  const anyTips = (corpus.heritages.find((h) => h.travelTips)?.travelTips ?? '').split('**Riêng điểm này:**')[0];
  return {
    intent: 'directions',
    reply:
      `🚗 **Cách đến phường Đông Triều**\n\n${short(anyTips, 500)}\n\n` +
      `Mỗi di tích đều có mục "Cách đến & kinh nghiệm" riêng trong trang chi tiết.`,
    links: [
      { label: 'Bản đồ & chỉ đường', url: '/ban-do' },
      { label: 'Danh sách di tích', url: '/di-tich' },
    ],
    suggestions: ['Có khách sạn nào không?', 'Hôm nay nên đi đâu?', 'Ăn gì ở Đông Triều?'],
  };
}

// ─── Công cụ cho lịch trình & ngân sách ────────────────────────────────────

/** Định dạng số tiền kiểu Việt Nam: 200000 → "200.000đ". */
const vnd = (n) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

/**
 * Đọc số tiền NHỎ NHẤT trong chuỗi giá.
 *
 *   "200.000 – 500.000đ/người" → 200000
 *   "≈ 50k/suất"               → 50000
 *   "≈ 20–25k/đồ uống"         → 20000   (cả dải dùng chung hậu tố "k")
 *   "Bình dân", "₫₫"           → null    (không có số → KHÔNG bịa ra con số)
 *
 * Trả về null khi không có số thật: hàm này dùng để cộng tiền cho khách nên
 * đoán bừa một con số còn tệ hơn là nói không biết.
 */
const MONEY_MUL = { k: 1000, nghin: 1000, ngan: 1000, tr: 1_000_000, trieu: 1_000_000 };

function priceFloor(text) {
  const s = deaccent(String(text ?? '')).toLowerCase();
  const nums = [];
  let scale = null; // hậu tố xuất hiện ở đâu đó trong chuỗi
  for (const m of s.matchAll(/(\d[\d.,]*)\s*(k|nghin|ngan|tr|trieu)?/g)) {
    const n = Number(m[1].replace(/[.,]/g, ''));
    if (!Number.isFinite(n) || n <= 0) continue;
    const mul = m[2] ? MONEY_MUL[m[2]] : null;
    if (mul) scale = mul;
    nums.push({ n, mul });
  }
  // Số viết tắt trong dải giá ("20–25k") hiểu theo hậu tố chung; số viết đủ
  // chữ số ("200.000đ") giữ nguyên.
  const values = nums
    .map(({ n, mul }) => (mul ? n * mul : n < 1000 && scale ? n * scale : n))
    .filter((v) => v >= 1000);
  return values.length ? Math.min(...values) : null;
}

/**
 * Mức giá để SẮP XẾP rẻ → đắt khi không có con số.
 *
 * Chỉ dùng cho thứ tự hiển thị, không bao giờ in ra như một mức giá thật —
 * "Bình dân" là nhận định của người khảo sát, không phải bảng giá.
 */
function priceOrder(text) {
  const n = priceFloor(text);
  if (n) return n;
  const s = deaccent(String(text ?? '')).toLowerCase();
  if (/\bre\b|binh dan/.test(s)) return 60_000;
  if (/phai chang|hop ly/.test(s)) return 100_000;
  if (/trung binh/.test(s)) return 150_000;
  return Number.MAX_SAFE_INTEGER; // không rõ giá → xếp cuối
}

// ─── Giờ mở cửa & khoảng cách ──────────────────────────────────────────────

/**
 * Trạng thái mở cửa ngay lúc này.
 * @returns {{open:boolean, label:string}|null}  null = chưa có dữ liệu giờ
 */
function openState(x, minutes) {
  const open = isOpenAt(x?.openHours, minutes);
  if (open === null) return null;
  if (isAllDay(x.openHours)) return { open: true, label: 'mở 24/24' };
  return { open, label: open ? 'đang mở' : 'đã đóng' };
}

/** Dòng giờ mở cửa kèm trạng thái, vd "🕐 07:00–22:30 — đang mở". */
function hoursLine(x, minutes) {
  if (!x?.openHours) return null;
  const st = openState(x, minutes);
  return `🕐 ${x.openHours}${st && !isAllDay(x.openHours) ? ` — ${st.label}` : ''}`;
}

/** Nút chỉ đường Google Maps, nếu bản ghi có sẵn liên kết. */
const mapsLink = (x) => (x?.mapsUrl ? [{ label: `Chỉ đường tới ${x.name}`, url: x.mapsUrl }] : []);

/** Cơ sở thuộc phường Đông Triều (bỏ các mục lân cận khi khách hỏi trong phường). */
const inWard = (x) => !/lân cận/i.test(x?.area ?? '');

/** Đọc ngân sách người dùng nêu: "2 triệu" → 2000000, "500k" → 500000. */
function parseAmount(q) {
  let m = q.match(/(\d+(?:[.,]\d+)?)\s*(trieu|tr)\b/);
  if (m) return Math.round(Number(m[1].replace(',', '.')) * 1_000_000);
  m = q.match(/(\d+)\s*(nghin|ngan|k)\b/);
  if (m) return Number(m[1]) * 1000;
  m = q.match(/\b(\d{6,9})\s*(dong|d)?\b/); // số tiền viết đủ chữ số
  if (m) return Number(m[1]);
  return null;
}

// Di tích cần leo/đi bộ nhiều — bỏ ra khi khách muốn lộ trình nhẹ nhàng
// (người lớn tuổi, sức khoẻ yếu, đi cùng trẻ nhỏ). Đồn Cao nằm trên đồi 61m.
const STRENUOUS = new Set(['don-cao-dong-trieu']);

// Lộ trình theo sở thích — mỗi chủ đề ưu tiên một nhóm điểm có thật.
// `slugs` = thứ tự ưu tiên; `types` = lọc theo loại hình khi không liệt kê slug.
const THEMES = {
  spiritual: { label: 'tâm linh – lễ chùa', types: ['CHUA', 'DEN', 'MIEU'] },
  history: {
    label: 'lịch sử – cách mạng',
    slugs: ['don-cao-dong-trieu', 'den-chua-kenh-giang-den-yet-kieu', 'den-an-bien-den-nu-tuong-le-chan', 'dinh-trao-ha-den-di-ai'],
  },
  art: {
    label: 'kiến trúc – cổ vật',
    slugs: ['chua-my-cu-sung-khanh-tu', 'dinh-chua-trieu-khe', 'chua-quan-ngoc-thanh', 'dinh-my-cu'],
  },
  nature: {
    label: 'ngắm cảnh – thiên nhiên',
    slugs: ['don-cao-dong-trieu', 'den-an-bien-den-nu-tuong-le-chan', 'chua-quan-ngoc-thanh'],
  },
  family: {
    label: 'gia đình, có trẻ nhỏ',
    slugs: ['chua-my-cu-sung-khanh-tu', 'den-an-bien-den-nu-tuong-le-chan', 'chua-quan-ngoc-thanh', 'dinh-my-cu'],
  },
};

/** Sắp di tích theo sở thích + loại bỏ điểm leo trèo nếu cần đi nhẹ nhàng. */
function orderedHeritages(corpus, theme, easy) {
  const hs = corpus.heritages;
  const t = theme && THEMES[theme];
  let ordered;
  if (t?.slugs) {
    const bySlug = new Map(hs.map((h) => [h.slug, h]));
    ordered = t.slugs.map((s) => bySlug.get(s)).filter(Boolean);
  } else if (t?.types) {
    ordered = hs.filter((h) => t.types.includes(h.type));
  } else {
    ordered = [...hs];
  }
  for (const h of hs) if (!ordered.includes(h)) ordered.push(h); // đổ phần còn lại vào cuối
  if (easy) ordered = ordered.filter((h) => !STRENUOUS.has(h.slug));
  return ordered;
}

const hLink = (h) => ({ label: h.name, url: `/di-tich/${h.slug}` });
/** Các cơ sở thực sự để ăn (bỏ chợ, làng nghề, nhà vườn). */
const eateries = (corpus) =>
  corpus.restaurants.filter((r) => ['NHA_HANG', 'QUAN_AN'].includes(r.type));

// ─── Lộ trình linh hoạt theo buổi / sở thích / sức khoẻ / tài chính ─────────

/**
 * Nhận diện yêu cầu lộ trình và các tuỳ chọn cá nhân hoá.
 * @returns {null | {span, theme, easy, amount}}  null nếu không phải hỏi lộ trình
 */
function detectRoute(q, amount) {
  const goIntent = has(q, 'di dau', 'nen di', 'di choi', 'tham quan', 'di le', 'vieng', 'lich trinh', 'lo trinh', 'ke hoach', 'nen den', 'di duoc', 'vach', 'di tham quan');
  const routeWord = has(q, 'lich trinh', 'lo trinh', 'ke hoach', 'vach ra', 'vach lo trinh');
  const hasSang = has(q, 'buoi sang') || (has(q, 'sang') && goIntent);
  const hasChieu = has(q, 'buoi chieu') || (has(q, 'chieu') && goIntent);
  const hasDayWord = has(q, 'ca ngay', 'mot ngay', '1 ngay', 'trong ngay', 'nguyen ngay');
  // Cố ý KHÔNG nhận 'qua dem'/'ngu dem' vì "ngủ ở đâu qua đêm" là hỏi chỗ NGỦ,
  // không phải chuyến 2 ngày.
  const hasTwo = has(q, '2 ngay', 'hai ngay', '2n1d', '2 ngay 1 dem', 'hai ngay mot dem');

  // Sở thích
  let theme = null;
  if (has(q, 'tam linh', 'le chua', 'le phat', 'di le', 'chiem bai', 'cau may', 'khan', 'vai', 'tin nguong')) theme = 'spiritual';
  else if (has(q, 'lich su', 'cach mang', 'khang chien', 've nguon', 'truyen thong', 'anh hung')) theme = 'history';
  else if (has(q, 'kien truc', 'co vat', 'hien vat', 'nghe thuat', 'cham khac', 'co kinh')) theme = 'art';
  else if (has(q, 'ngam canh', 'thien nhien', 'check in', 'chup anh', 'song ao', 'canh dep', 'hoang hon', 'view')) theme = 'nature';
  else if (has(q, 'gia dinh', 'tre em', 'tre nho', 'con nho', 'ca nha', 'ong ba di cung')) theme = 'family';

  // Thể trạng: đi nhẹ nhàng, ít leo trèo
  const easy =
    has(q, 'nguoi gia', 'cao tuoi', 'lon tuoi', 'ong ba', 'suc khoe yeu', 'khong leo', 'ngai leo', 'it di bo', 'di bo it', 'de di', 'nhe nhang', 'thong tha', 'khong met', 'di cham') ||
    theme === 'family';

  // Chỉ coi là hỏi lộ trình khi có tín hiệu rõ ràng (tránh nuốt "hôm nay nên đi đâu"
  // và tránh cướp "quán ăn cho người già" → sức khoẻ chỉ tính khi kèm từ vận động).
  const wantsRoute =
    routeWord ||
    hasSang ||
    hasChieu ||
    hasDayWord ||
    hasTwo ||
    amount ||
    (theme && goIntent) ||
    (easy && (goIntent || has(q, 'leo', 'di bo', 'di lai', 'di choi')));
  if (!wantsRoute) return null;

  let span;
  if (hasTwo) span = 'two';
  else if (hasSang && !hasChieu && !hasDayWord) span = 'morning';
  else if (hasChieu && !hasSang && !hasDayWord) span = 'afternoon';
  else if (hasDayWord || (hasSang && hasChieu)) span = 'day';
  else if (amount) span = amount >= 1_500_000 ? 'two' : 'day';
  else span = 'day';

  return { span, theme, easy, amount };
}

/**
 * Dựng lộ trình cá nhân hoá.
 *
 * span: 'morning' | 'afternoon' | 'day' | 'two'.  Chỉ vẽ đúng khoảng thời gian
 * khách hỏi — hỏi buổi sáng thì KHÔNG vẽ cả ngày.
 */
function buildRoute(corpus, { span = 'day', theme = null, easy = false, amount = null }) {
  const pool = orderedHeritages(corpus, theme, easy);
  let i = 0;
  const take = (n) => pool.slice(i, (i += n));
  const nm = (arr) => arr.map((h) => `**${h.name}**`).join(', ');
  const donCao = pool.find((h) => h.slug === 'don-cao-dong-trieu'); // null nếu easy

  // Chọn nhà hàng theo mức chi mỗi bữa (nếu biết ngân sách)
  const mealsPerDay = 2;
  const dayCount = span === 'two' ? 2 : 1;
  const mealCap = amount ? Math.round((amount * 0.5) / (dayCount * mealsPerDay)) : null;
  const good = eateries(corpus).filter(isGood);
  const priced = good.map((r) => ({ r, floor: priceFloor(r.priceRange) })).filter((x) => x.floor);
  const affordable = mealCap ? priced.filter((x) => x.floor <= mealCap) : priced;
  // Có ngân sách → lọc theo giá trước rồi mới xếp theo đánh giá trong số vừa túi.
  // Không nêu ngân sách → xếp thẳng theo đánh giá cho quán được lòng khách nhất.
  const mealPool = (mealCap ? (affordable.length ? affordable : priced).map((x) => x.r) : good).sort(byRating);
  const meal = (k) => (mealPool.length ? mealPool[k % mealPool.length] : null);
  const mealLine = (r) =>
    r
      ? `**${r.name}**${r.priceRange ? ` — ${r.priceRange}` : ''}${r.rating != null ? ` ${stars(r)}` : ''}`
      : 'quán địa phương (thử đặc sản na, rươi, gà đồi tuỳ mùa)';

  const segs = [];
  const links = [];

  if (span === 'morning') {
    const m = take(2);
    segs.push('🌅 **Buổi sáng (khoảng 3–4 tiếng):**');
    segs.push(`Đi sớm 7–8h cho mát và vắng, vãn cảnh ${nm(m)}, kết thúc trước trưa để nghỉ ăn.`);
    if (!easy && donCao && !m.includes(donCao)) segs.push('Còn thời gian và sức khoẻ thì ghé **Đồn Cao** ngắm toàn cảnh trước khi về.');
    links.push(...m.map(hLink));
  } else if (span === 'afternoon') {
    const a = take(2);
    segs.push('🌇 **Buổi chiều (khoảng 3–4 tiếng):**');
    segs.push(
      `Bắt đầu sau 14h, tham quan ${nm(a)}.` +
        (!easy && donCao ? ' Canh lên **Đồn Cao** lúc 16–17h ngắm hoàng hôn là đẹp nhất.' : ''),
    );
    links.push(...a.map(hLink));
  } else if (span === 'two') {
    const d1 = take(3);
    segs.push('**📅 Ngày 1:**');
    segs.push(`🌅 Sáng: ${nm(d1.slice(0, 2))} · 🍜 Trưa: ${mealLine(meal(0))}`);
    segs.push(`🏯 Chiều: ${nm(d1.slice(2))}${!easy && donCao ? ' — lên Đồn Cao chiều muộn' : ''} · 🌆 Tối: ${mealLine(meal(1))}, nghỉ đêm tại phường.`);
    segs.push('**📅 Ngày 2:**');
    segs.push(
      `Kết hợp các điểm lân cận: ${corpus.attractions.slice(0, 2).map((a) => a.name).join(', ')}` +
        (easy ? ' _(chọn điểm bằng phẳng, tránh leo Ngoạ Vân)_' : ' _(khoẻ chân có thể leo Ngoạ Vân, đi cáp treo)_') +
        '.',
    );
    links.push(...d1.slice(0, 2).map(hLink), { label: 'Điểm lân cận', url: '/di-tich' });
  } else {
    const m = take(2);
    const a = take(2);
    segs.push(`🌅 **Sáng:** ${nm(m)} _(vào cửa miễn phí)_`);
    segs.push(`🍜 **Trưa:** ${mealLine(meal(0))}`);
    segs.push(`🏯 **Chiều:** ${nm(a)}${!easy && a.some((h) => h.slug === 'don-cao-dong-trieu') ? ' — Đồn Cao đẹp nhất lúc chiều muộn' : ''} _(miễn phí)_`);
    segs.push(`🌆 **Tối:** ${mealLine(meal(1))}`);
    links.push(...m.map(hLink), { label: 'Nơi ăn uống', url: '/am-thuc' });
  }

  // Ghi chú theo tuỳ chọn
  const foot = [];
  if (easy) foot.push('Lộ trình ưu tiên điểm **bằng phẳng, ít bậc thang**, hợp người lớn tuổi hoặc đi cùng trẻ nhỏ — đã bỏ qua Đồn Cao (đồi 61m).');
  if (amount) {
    const est = [meal(0), meal(1)].filter(Boolean).map((r) => priceFloor(r.priceRange)).filter(Boolean);
    if (est.length) foot.push(`Ước tính tiền ăn ~**${vnd(est.reduce((s, n) => s + n, 0) * dayCount)}/người**; vé tham quan miễn phí nên rất tiết kiệm.`);
  }
  foot.push('Có thể đảo thứ tự tuỳ thời tiết; giá là tham khảo theo thực đơn, nên gọi xác nhận trước.');

  // Tiêu đề mô tả đúng thứ đã cá nhân hoá
  const spanLabel = { morning: 'buổi sáng', afternoon: 'buổi chiều', two: '2 ngày 1 đêm', day: 'một ngày' }[span];
  const tags = [];
  if (theme && THEMES[theme]) tags.push(`hướng ${THEMES[theme].label}`);
  if (easy) tags.push('nhẹ nhàng');
  if (amount) tags.push(`ngân sách ~${vnd(amount)}`);
  const tail = tags.length ? ` — ${tags.join(', ')}` : '';

  return {
    intent: 'route',
    reply: `🗺️ **Lộ trình ${spanLabel}${tail}**\n\n${segs.join('\n\n')}\n\n${foot.join(' ')}`,
    links: links.slice(0, 4),
    suggestions:
      span === 'day' || span === 'two'
        ? ['Lộ trình nhẹ cho người lớn tuổi', 'Lộ trình thiên về tâm linh', 'Tôi có 2 triệu thì đi đâu?']
        : ['Vẽ lộ trình cả ngày', 'Lộ trình cho gia đình có trẻ nhỏ', 'Ăn trưa ở đâu ngon?'],
  };
}

// ─── Gợi ý dịch vụ theo đánh giá / giá ─────────────────────────────────────

/** Quán cà phê, trà sữa. */
const cafes = (corpus) => corpus.restaurants.filter((r) => r.type === 'CAFE');

/** Nhóm cơ sở tương ứng với thứ khách đang hỏi. */
function poolOf(corpus, kind) {
  if (kind === 'lodging') return corpus.lodgings;
  if (kind === 'cafe') return cafes(corpus);
  return eateries(corpus);
}

const KIND_LABEL = {
  restaurant: 'quán ăn, nhà hàng',
  cafe: 'quán cà phê, trà sữa',
  lodging: 'nơi lưu trú',
};
const KIND_PAGE = {
  restaurant: { label: 'Tất cả nơi ăn uống', url: '/am-thuc' },
  cafe: { label: 'Tất cả nơi ăn uống', url: '/am-thuc' },
  lodging: { label: 'Tất cả nơi lưu trú', url: '/luu-tru' },
};

/** Một dòng mô tả gọn cho cơ sở trong danh sách gợi ý. */
function placeLine(x, minutes, extra = '') {
  const meta = [stars(x), x.priceRange ? `💰 ${x.priceRange}` : '', extra].filter(Boolean).join(' · ');
  const type = LODGING_LABEL[x.type] ?? RESTAURANT_LABEL[x.type] ?? '';
  const st = openState(x, minutes);
  // Sau sáp nhập 2025 nhiều cơ sở tên có chữ "Đông Triều" nhưng thuộc phường
  // khác — phải nói rõ để du khách không đi nhầm.
  const outside = inWard(x) ? '' : ` _(${x.area})_`;
  return (
    `**${x.name}**${type ? ` _(${type})_` : ''}${outside}` +
    (meta ? `\n   ${meta}` : '') +
    (x.openHours ? `\n   🕐 ${x.openHours}${st && !st.open ? ' — giờ này đã đóng' : ''}` : '') +
    (x.phone || x.phones?.length ? `\n   ☎ ${x.phone ?? x.phones.join(' · ')}` : '')
  );
}

/**
 * Gợi ý cơ sở theo CHẤT LƯỢNG (điểm đánh giá) hoặc theo GIÁ.
 *
 * Chỉ lấy cơ sở đạt từ GOOD_RATING trở lên — xem ghi chú ở phần "Đánh giá sao".
 *
 * @param {{mode?:'quality'|'cheap', kind?:'restaurant'|'cafe'|'lodging'}} opts
 */
function answerRecommend(corpus, { mode = 'quality', kind = 'restaurant' } = {}) {
  const { minutes } = nowVN();
  const pool = poolOf(corpus, kind).filter(isGood);

  if (pool.length === 0) {
    return {
      intent: 'recommend',
      matched: false,
      reply: `Trong dữ liệu của phường chưa có ${KIND_LABEL[kind]} nào đủ thông tin để mình yên tâm giới thiệu 🙏`,
      links: [KIND_PAGE[kind]],
      suggestions: ['Đặc sản Đông Triều có gì?', 'Hôm nay nên đi đâu?'],
    };
  }

  const list =
    mode === 'cheap'
      ? [...pool].sort((a, b) => priceOrder(a.priceRange) - priceOrder(b.priceRange)).slice(0, 5)
      : [...pool].sort(byRating).slice(0, 5);

  const rated = list.filter((x) => x.rating != null).length;
  const label = KIND_LABEL[kind].charAt(0).toUpperCase() + KIND_LABEL[kind].slice(1);
  const head =
    mode === 'cheap'
      ? `🪙 **${label} giá mềm ở Đông Triều** (rẻ trước):`
      : `⭐ **${label} được đánh giá tốt nhất ở Đông Triều:**`;

  return {
    intent: 'recommend',
    reply:
      `${head}\n\n${bullets(list.map((x) => placeLine(x, minutes)))}\n\n` +
      (rated
        ? `${RATING_NOTE}\n\nThứ tự đã tính cả **số lượt đánh giá** — quán 5★ với 2 lượt chưa chắc hơn quán 4,2★ với 80 lượt.`
        : 'Các cơ sở này chưa có lượt đánh giá công khai nên mình xếp theo mức độ đầy đủ thông tin.') +
      '\n\n⚠️ Thông tin tổng hợp từ Internet, **chưa gọi xác minh** — nên gọi trước khi tới.',
    links: [KIND_PAGE[kind], ...mapsLink(list[0])],
    suggestions: ['Giờ này còn quán nào mở không?', 'Quán nào giá mềm?', 'Đặc sản Đông Triều có gì?'],
  };
}

// ─── Đang mở cửa / ăn khuya / mở sớm ───────────────────────────────────────

/**
 * Trả lời theo GIỜ GIẤC — năng lực mới nhờ trường `openHours`.
 *
 * @param {'now'|'late'|'early'|'allday'} mode
 */
function answerOpenNow(corpus, mode, kind = 'restaurant') {
  const { minutes, hhmm } = nowVN();
  const pool = poolOf(corpus, kind).filter(isGood);

  // Cơ sở chưa có giờ mở cửa: KHÔNG mặc định coi là đang mở, tách ra nói riêng
  const known = pool.filter((x) => x.openHours);
  const unknown = pool.length - known.length;

  const filters = {
    now: (x) => isOpenAt(x.openHours, minutes) === true,
    allday: (x) => isAllDay(x.openHours),
    late: (x) => isAllDay(x.openHours) || (closesAt(x.openHours) ?? 0) >= 22 * 60 + 30,
    early: (x) => isAllDay(x.openHours) || (opensAt(x.openHours) ?? 1440) <= 6 * 60 + 30,
  };
  const head = {
    now: `🕐 **Bây giờ là ${hhmm}** — các nơi đang mở cửa:`,
    allday: '🌙 **Các nơi mở cửa 24/24 ở Đông Triều:**',
    late: '🌙 **Ăn khuya ở Đông Triều** — các nơi mở tới muộn (từ 22h30 trở đi):',
    early: '🌅 **Mở sớm cho bữa sáng** — các nơi mở trước 6h30:',
  };

  const list = known.filter(filters[mode]).sort(byRating).slice(0, 6);

  if (list.length === 0) {
    return {
      intent: `open_${mode}`,
      matched: false,
      reply:
        (mode === 'now'
          ? `Bây giờ là **${hhmm}**, trong dữ liệu của mình chưa có nơi nào ghi nhận đang mở vào khung giờ này 😔`
          : 'Mình chưa tìm được cơ sở nào phù hợp trong dữ liệu 😔') +
        (unknown ? `\n\nCó **${unknown} cơ sở** chưa ghi giờ mở cửa — bạn nên gọi hỏi trực tiếp.` : ''),
      links: [KIND_PAGE[kind]],
      suggestions: ['Quán nào mở 24/24?', 'Ăn gì ở Đông Triều?', 'Có khách sạn nào không?'],
    };
  }

  return {
    intent: `open_${mode}`,
    reply:
      `${head[mode]}\n\n${bullets(list.map((x) => placeLine(x, minutes)))}\n\n` +
      (unknown ? `Còn **${unknown} cơ sở** khác chưa ghi giờ mở cửa nên mình không dám khẳng định. ` : '') +
      'Giờ giấc theo Google Maps, ngày lễ Tết có thể đổi — nên gọi trước cho chắc.',
    links: [KIND_PAGE[kind], ...mapsLink(list[0])],
    suggestions: ['Quán nào đánh giá cao nhất?', 'Chỗ nào mở 24/24?', 'Hôm nay nên đi đâu?'],
  };
}

// ─── Gần một di tích ───────────────────────────────────────────────────────

/**
 * "Quán ăn gần chùa Mỹ Cụ", "khách sạn gần Đồn Cao".
 *
 * Ba mức trả lời, theo đúng thứ tự đáng tin — xem ghi chú trong lib/geo.js.
 * Chỉ 1/13 di tích có toạ độ nên mức 2 (cùng khu phố) mới là mức thường dùng.
 */
function answerNear(corpus, place, kind = 'restaurant') {
  const { minutes } = nowVN();
  const pool = poolOf(corpus, kind).filter(isGood);
  const page = KIND_PAGE[kind];

  // Mức 1 — khoảng cách thật
  if (place?.lat && place?.lng) {
    const ranked = pool
      .map((x) => ({ x, km: distanceKm(place, x) }))
      .filter((r) => r.km !== null)
      .sort((a, b) => a.km - b.km)
      .slice(0, 5);
    if (ranked.length) {
      const noCoord = pool.length - pool.filter((x) => x.lat && x.lng).length;
      const label = KIND_LABEL[kind].charAt(0).toUpperCase() + KIND_LABEL[kind].slice(1);
      return {
        intent: 'near',
        reply:
          `📍 **${label} gần ${place.name}** (đường chim bay, tính từ toạ độ):\n\n` +
          bullets(ranked.map(({ x, km }) => placeLine(x, minutes, `cách ~${fmtDistance(km)}`))) +
          (noCoord ? `\n\nCòn **${noCoord} cơ sở** chưa có toạ độ nên mình không xếp vào danh sách này.` : '') +
          '\n\nKhoảng cách đường chim bay, đi đường thực tế sẽ xa hơn đôi chút.',
        links: [page, ...mapsLink(ranked[0].x)],
        suggestions: ['Giờ này còn quán nào mở?', 'Quán nào đánh giá cao nhất?', 'Hôm nay nên đi đâu?'],
      };
    }
  }

  // Mức 2 — cùng khu phố
  const kp = place?.khuPho;
  if (kp) {
    const same = pool.filter((x) => x.khuPho === kp).sort(byRating).slice(0, 5);
    if (same.length) {
      const est = same.some((x) => x.khuPhoEstimated);
      return {
        intent: 'near',
        reply:
          `📍 **${place.name}** thuộc **khu phố ${kp}**. Các ${KIND_LABEL[kind]} cùng khu phố:\n\n` +
          bullets(same.map((x) => placeLine(x, minutes))) +
          '\n\nMình xếp theo **cùng khu phố** chứ chưa có khoảng cách chính xác tới di tích — ' +
          'hồ sơ di tích chưa có toạ độ.' +
          (est ? ' Một vài mục có khu phố là **ước tính** từ tên đường, cần đối chiếu lại.' : ''),
        links: [page, { label: `Chi tiết ${place.name}`, url: `/di-tich/${place.slug}` }],
        suggestions: ['Quán nào đánh giá cao nhất?', 'Giờ này còn quán nào mở?', 'Hôm nay nên đi đâu?'],
      };
    }
  }

  // Mức 3 — không xếp được theo khoảng cách. Nói rõ VÌ SAO, vì hai lý do rất
  // khác nhau: hoặc di tích chưa quy được về khu phố, hoặc khu phố đó chưa có
  // cơ sở nào trong dữ liệu.
  const reason = place?.khuPho
    ? `**${place.name}** thuộc **khu phố ${place.khuPho}**, nhưng dữ liệu chưa ghi nhận ${KIND_LABEL[kind]} nào ở khu phố này`
    : `Hồ sơ **${place?.name ?? 'điểm này'}** chưa có toạ độ và cũng chưa quy được về khu phố mới`;
  const list = [...pool].sort(byRating).slice(0, 5);

  return {
    intent: 'near',
    reply:
      `${reason} nên mình không dám xếp theo khoảng cách 🙏\n\n` +
      `Dưới đây là ${KIND_LABEL[kind]} được đánh giá tốt trong phường — phường không rộng nên đi lại đều khá thuận tiện:\n\n` +
      bullets(list.map((x) => placeLine(x, minutes) + `\n   📍 ${x.address}`)),
    links: [page, ...mapsLink(list[0])],
    suggestions: ['Quán nào đánh giá cao nhất?', 'Giờ này còn quán nào mở?', 'Hôm nay nên đi đâu?'],
  };
}

// ─── Khu phố ───────────────────────────────────────────────────────────────

/** "Ăn gì ở khu phố Nguyễn Bình", "nhà nghỉ khu Đạm Thuỷ". */
function answerByKhuPho(corpus, kp, kind = 'restaurant') {
  const { minutes } = nowVN();
  const list = poolOf(corpus, kind).filter((x) => x.khuPho === kp.ten && isGood(x)).sort(byRating);

  if (list.length === 0) {
    return {
      intent: 'khu_pho_list',
      matched: false,
      reply:
        `Trong dữ liệu của mình chưa có ${KIND_LABEL[kind]} nào ghi nhận ở **khu phố ${kp.ten}** 😔\n\n` +
        `Khu phố ${kp.ten} gồm ${kp.gom.toLowerCase()}. Bạn thử hỏi một khu phố khác, hoặc xem toàn bộ danh sách nhé.`,
      links: [KIND_PAGE[kind]],
      suggestions: ['Ăn gì ở Đông Triều?', 'Phường có bao nhiêu khu phố?', 'Hôm nay nên đi đâu?'],
    };
  }

  const shown = list.slice(0, 6);
  const allEstimated = list.every((x) => x.khuPhoEstimated);
  const label = KIND_LABEL[kind].charAt(0).toUpperCase() + KIND_LABEL[kind].slice(1);
  return {
    intent: 'khu_pho_list',
    reply:
      `📍 **${label} ở khu phố ${kp.ten}** (${list.length} cơ sở):\n\n` +
      bullets(shown.map((x) => placeLine(x, minutes))) +
      (list.length > shown.length ? `\n\n…và ${list.length - shown.length} cơ sở khác.` : '') +
      (allEstimated
        ? '\n\n⚠️ Khu phố của các cơ sở này là **ước tính** từ tên đường và toạ độ, chưa đối chiếu sơ đồ khu phố chính thức.'
        : list.some((x) => x.khuPhoEstimated)
          ? `\n\n⚠️ ${list.filter((x) => x.khuPhoEstimated).length}/${list.length} mục có khu phố là **ước tính**, chưa đối chiếu sơ đồ chính thức.`
          : ''),
    links: [KIND_PAGE[kind], ...mapsLink(list[0])],
    suggestions: ['Phường có bao nhiêu khu phố?', 'Quán nào đánh giá cao nhất?', 'Hôm nay nên đi đâu?'],
  };
}

/** "Phường có bao nhiêu khu phố", "khu phố Mỹ Cụ gồm những khu nào". */
function answerKhuPhoInfo(corpus, kp = null) {
  const table = corpus.khuPho;
  if (!table?.danhSach?.length) {
    return {
      intent: 'khu_pho_info',
      matched: false,
      reply: 'Mình chưa có dữ liệu về cơ cấu khu phố của phường 🙏',
      links: [{ label: 'Giới thiệu phường', url: '/gioi-thieu' }],
      suggestions: ['Giới thiệu về Đông Triều', 'Hôm nay nên đi đâu?'],
    };
  }

  // Hỏi riêng một khu phố
  if (kp) {
    return {
      intent: 'khu_pho_info',
      reply:
        `📍 **Khu phố ${kp.ten}** (khu phố số ${kp.so}/${table.tongSo} của phường Đông Triều)\n\n` +
        bullets([
          `Gộp từ: ${kp.gom}`,
          `Diện tích ${String(kp.dienTichKm2).replace('.', ',')} km²`,
          `${kp.soHo.toLocaleString('vi-VN')} hộ · ${kp.nhanKhau.toLocaleString('vi-VN')} nhân khẩu`,
          `Nhà văn hoá: ${kp.nhaVanHoa}`,
        ]) +
        `\n\nSố liệu theo phương án sắp xếp đơn vị hành chính 2025.`,
      links: [{ label: 'Giới thiệu phường', url: '/gioi-thieu' }],
      suggestions: [`Ăn gì ở khu phố ${kp.ten}?`, 'Phường có bao nhiêu khu phố?', 'Hôm nay nên đi đâu?'],
    };
  }

  const list = table.danhSach;
  const totalHo = list.reduce((s, k) => s + (k.soHo ?? 0), 0);
  const totalNk = list.reduce((s, k) => s + (k.nhanKhau ?? 0), 0);
  return {
    intent: 'khu_pho_info',
    reply:
      `📍 Sau sắp xếp năm 2025, phường Đông Triều tổ chức lại 36 khu phố cũ thành **${table.tongSo} khu phố**:\n\n` +
      bullets(list.map((k) => `**${k.ten}** — ${k.soHo.toLocaleString('vi-VN')} hộ, ${k.nhanKhau.toLocaleString('vi-VN')} nhân khẩu`)) +
      `\n\nTổng cộng **${totalHo.toLocaleString('vi-VN')} hộ** với **${totalNk.toLocaleString('vi-VN')} nhân khẩu**.\n\n` +
      'Địa chỉ mới có dạng: _<số nhà, đường>, Khu phố <tên>, phường Đông Triều, tỉnh Quảng Ninh_.',
    links: [{ label: 'Giới thiệu phường', url: '/gioi-thieu' }],
    suggestions: ['Khu phố Nguyễn Bình có gì?', 'Ăn gì ở khu phố Mỹ Cụ?', 'Giới thiệu về Đông Triều'],
  };
}

// ─── Bối cảnh vùng đất (khoá cài đặt `vungDat`) ────────────────────────────
//
// ── MỘT CÂU PHẢI NÓI RÕ, NẾU KHÔNG LÀ TRẢ LỜI SAI ──────────────────────────
// "Đông Triều" trỏ tới HAI thứ khác nhau, chênh nhau gần mười lần:
//
//   · thành phố Đông Triều — 395,95 km², 248.896 người, ĐÃ GIẢI THỂ 01/7/2025
//   · phường Đông Triều    —  40,41 km²,  42.454 người, đơn vị hiện nay
//
// Khách hỏi "Đông Triều rộng bao nhiêu" mà bot trả 395,95 km² thì vừa sai vừa
// mâu thuẫn với chính trang Khu phố của cổng. Nên mọi câu trả lời có số của
// thành phố cũ đều phải đặt cạnh số của phường và ghi rõ mốc 01/7/2025.

/** Số liệu của phường, cộng từ bảng khu phố — không ghi cứng ở đây. */
function soLieuPhuong(corpus) {
  const list = corpus.khuPho?.danhSach ?? [];
  if (!list.length) return null;
  return {
    soKhu: list.length,
    dienTich: list.reduce((s, k) => s + (k.dienTichKm2 ?? 0), 0),
    nhanKhau: list.reduce((s, k) => s + (k.nhanKhau ?? 0), 0),
    soHo: list.reduce((s, k) => s + (k.soHo ?? 0), 0),
  };
}

const soVN = (n) => Number(n).toLocaleString('vi-VN');

/** Dòng đối chiếu phường ↔ thành phố cũ. Dùng lại ở mọi câu trả lời có số. */
function doiChieuDonVi(corpus, vd) {
  const p = soLieuPhuong(corpus);
  const c = vd?.vungCu;
  if (!p || !c) return '';
  return (
    `\n\n⚠️ Đừng nhầm hai đơn vị:\n` +
    bullets([
      `**Phường Đông Triều** (hiện nay) — ${String(p.dienTich.toFixed(2)).replace('.', ',')} km², ${soVN(p.nhanKhau)} nhân khẩu, ${p.soKhu} khu phố.`,
      `**Thành phố Đông Triều** (đã giải thể 01/7/2025) — ${String(c.dienTichKm2).replace('.', ',')} km², ${soVN(c.danSo)} người năm ${c.namDanSo}, gồm 13 phường và 6 xã.`,
    ])
  );
}

/** "Đông Triều ở đâu", "cách Hà Nội bao xa", "giáp với tỉnh nào". */
function answerViTri(corpus) {
  const vd = corpus.settings?.vungDat;
  const v = vd?.viTri;
  if (!v) return null;
  const giap = (v.giapRanh ?? []).map((g) => `Phía ${g.huong.toLowerCase()} giáp ${g.ten}`);
  return {
    intent: 'about_location',
    reply:
      `📍 **Đông Triều ở đâu?**\n\n${v.moTa}\n\n` +
      bullets([
        `Cách thành phố Hạ Long khoảng **${v.cachHaLongKm} km**`,
        `Cách Hà Nội khoảng **${v.cachHaNoiKm} km**`,
        ...giap,
      ]),
    links: [
      { label: 'Bản đồ số', url: '/ban-do' },
      { label: 'Giới thiệu vùng đất', url: '/gioi-thieu' },
    ],
    suggestions: ['Đi từ Hà Nội tới Đông Triều thế nào?', 'Lịch sử Đông Triều ra sao?', 'Phường có bao nhiêu khu phố?'],
  };
}

/** "Lịch sử Đông Triều", "vì sao gọi là Đông Triều", "khi nào lên thành phố". */
function answerLichSuVungDat(corpus) {
  const vd = corpus.settings?.vungDat;
  const moc = vd?.dongThoiGian ?? [];
  if (!moc.length) return null;
  return {
    intent: 'about_history',
    reply:
      `📜 **Đông Triều qua các thời kỳ**\n\n` +
      bullets(moc.map((m) => `**${m.moc}** — ${m.viec}`)) +
      (vd.nguon ? `\n\nNguồn tham khảo: ${vd.nguon}.` : ''),
    links: [
      { label: 'Giới thiệu vùng đất', url: '/gioi-thieu' },
      { label: '11 khu phố của phường', url: '/khu-pho' },
    ],
    suggestions: ['Vì sao Đông Triều gắn với nhà Trần?', 'Đông Triều ở đâu?', 'Phường có bao nhiêu khu phố?'],
  };
}

/** "Kinh tế Đông Triều", "làm nghề gì", "có mỏ than không". */
function answerKinhTe(corpus) {
  const k = corpus.settings?.vungDat?.kinhTe;
  if (!k?.coCau?.length) return null;
  return {
    intent: 'about_economy',
    reply:
      `🏭 **Kinh tế vùng Đông Triều**\n\n` +
      `Cơ cấu kinh tế năm ${k.nam}:\n` +
      bullets(k.coCau.map((c) => `${c.ten}: **${String(c.phanTram).replace('.', ',')}%**`)) +
      `\n\nCác ngành chủ lực: ${k.nganhChuLuc.join(' · ')}.` +
      `\n\n_Số liệu tính cho toàn vùng Đông Triều trước khi sắp xếp lại đơn vị hành chính ngày 01/7/2025._`,
    links: [{ label: 'Giới thiệu vùng đất', url: '/gioi-thieu' }],
    suggestions: ['Đông Triều ở đâu?', 'Lịch sử Đông Triều ra sao?', 'Đặc sản Đông Triều có gì?'],
  };
}

/** "Đi tới Đông Triều thế nào", "có ga tàu không", "quốc lộ nào chạy qua". */
function answerGiaoThong(corpus) {
  const g = corpus.settings?.vungDat?.giaoThong ?? [];
  const v = corpus.settings?.vungDat?.viTri;
  if (!g.length) return null;
  return {
    intent: 'about_transport',
    reply:
      `🚌 **Đường tới Đông Triều**\n\n` +
      bullets(g) +
      (v ? `\n\nĐông Triều cách Hà Nội khoảng **${v.cachHaNoiKm} km** và cách Hạ Long khoảng **${v.cachHaLongKm} km**.` : ''),
    links: [
      { label: 'Bản đồ số', url: '/ban-do' },
      { label: 'Nơi lưu trú', url: '/luu-tru' },
    ],
    suggestions: ['Đông Triều ở đâu?', 'Có chỗ nghỉ nào không?', 'Hôm nay nên đi đâu?'],
  };
}

/** "Đông Triều rộng bao nhiêu", "bao nhiêu dân" — ca dễ trả lời nhầm nhất. */
function answerQuyMo(corpus) {
  const vd = corpus.settings?.vungDat;
  const p = soLieuPhuong(corpus);
  if (!vd?.vungCu || !p) return null;
  return {
    intent: 'about_size',
    reply:
      `📐 **Diện tích và dân số**\n\n` +
      `Cổng này là của **phường Đông Triều** — đơn vị hành chính hiện nay, rộng ` +
      `**${String(p.dienTich.toFixed(2)).replace('.', ',')} km²** với **${soVN(p.nhanKhau)} nhân khẩu** ` +
      `trong ${soVN(p.soHo)} hộ, chia thành ${p.soKhu} khu phố.` +
      doiChieuDonVi(corpus, vd),
    links: [
      { label: '11 khu phố của phường', url: '/khu-pho' },
      { label: 'Giới thiệu vùng đất', url: '/gioi-thieu' },
    ],
    suggestions: ['Phường có bao nhiêu khu phố?', 'Đông Triều ở đâu?', 'Lịch sử Đông Triều ra sao?'],
  };
}

// ─── “Đông Triều huyện địa chí” 1896 ───────────────────────────────────────
//
// Khoá cài đặt `diaChi1896`: địa chí Hán Nôm do Tri huyện Ngô Sinh chép năm
// Thành Thái thứ 8 (1896), ký hiệu A.1940.
//
// ── ĐÂY LÀ ĐƠN VỊ THỨ BA ──────────────────────────────────────────────────
// Bot đã phải phân biệt phường Đông Triều với thành phố Đông Triều cũ. Nay thêm
// HUYỆN Đông Triều năm 1896 — thuộc tỉnh **Hải Dương**, còn 5 tổng 52 xã thôn,
// trong đó có cả Yên Tử, Mạo Khê, Hồ Thiên. Gần như mọi địa danh trong nguồn
// này KHÔNG nằm trong phường hiện nay, nên mọi câu trả lời lấy từ đây đều phải
// đóng dấu năm và nói rõ phạm vi — nếu không, bot sẽ khiến người hỏi tưởng núi
// Yên Tử nằm trong phường mình.

/** Dòng đóng dấu nguồn, gắn cuối MỌI câu trả lời lấy từ địa chí 1896. */
function dauNguonXua(dc) {
  return (
    `\n\n📜 _Theo **${dc.nguon}** — ${dc.tacGia}, ${dc.nienDai}._` +
    `\n_Địa danh trong sách là của huyện Đông Triều thuộc Hải Dương năm 1896, rộng hơn phường hiện nay rất nhiều._`
  );
}

const LINK_XUA = [
  { label: 'Địa chí 1896 trên trang Giới thiệu', url: '/gioi-thieu#dia-chi-1896' },
  { label: 'Di tích của phường hôm nay', url: '/di-tich' },
];

/**
 * Địa danh 1896 → bản ghi CÓ THẬT trên cổng hôm nay.
 *
 * Đây là chỗ nguồn cổ thành ra dùng được: sách chép “trông sang Đạm Thuỷ có chùa
 * Ngọc Thanh”, mà chùa quán Ngọc Thanh thì vẫn đang có hồ sơ trên cổng. Di tích
 * có trang riêng; điểm đến lân cận thì chưa, nên dẫn về trang danh mục.
 */
function noiDiemXua(corpus, slugs) {
  const dt = new Map(corpus.heritages.map((h) => [h.slug, { label: h.name, url: `/di-tich/${h.slug}` }]));
  const dd = new Map(corpus.attractions.map((a) => [a.slug, { label: a.name, url: '/di-tich' }]));
  return (slugs ?? []).map((s) => dt.get(s) ?? dd.get(s)).filter(Boolean);
}

/**
 * "Đông Triều có núi nào", "núi Quy Sơn ở đâu".
 *
 * `chiKhiGoiTen` — chỉ trả lời khi câu hỏi gọi đích danh một ngọn trong sách.
 * Bật cờ này khi câu hỏi đã nhắc một tên riêng có bản ghi trên cổng: "Ngoạ Vân
 * nằm trên núi nào" phải ra hồ sơ Ngoạ Vân đang có, không phải danh sách núi.
 */
function answerNuiXua(corpus, q, { chiKhiGoiTen = false } = {}) {
  const dc = corpus.settings?.diaChi1896;
  const ds = dc?.nui ?? [];
  if (!ds.length) return null;

  // Hỏi đích danh một ngọn → kể riêng ngọn đó, đầy đủ hơn là liệt kê chung.
  // Khớp TRỌN TỪ chứ không phải chuỗi con: "Núi Độn" bỏ dấu thành "don", mà
  // "don" thì nằm trong "đồn Cao" — khớp chuỗi con sẽ trả nhầm ngọn núi.
  const mot = ds.find((n) => {
    const t = norm(String(n.ten).replace(/^núi\s+/i, ''));
    return t.length >= 3 && has(q, t);
  });
  if (mot) {
    return {
      intent: 'about_nui',
      reply:
        `⛰️ **${mot.ten}** — ${mot.o}\n\n${mot.moTa}` +
        (mot.cauNoi ? `\n\n> _${mot.cauNoi}_` : '') +
        (mot.nayThuoc ? `\n\n📍 Nay: ${mot.nayThuoc}.` : '') +
        dauNguonXua(dc),
      links: [...noiDiemXua(corpus, mot.slug), ...LINK_XUA].slice(0, 4),
      suggestions: ['Địa chí 1896 chép những núi nào?', 'Sông nào chảy qua Đông Triều?', 'Danh nhân Đông Triều xưa là ai?'],
    };
  }

  if (chiKhiGoiTen) return null;

  return {
    intent: 'about_nui',
    reply:
      `⛰️ **${ds.length} ngọn núi được chép trong địa chí 1896**\n\n` +
      bullets(ds.map((n) => `**${n.ten}** (${n.o})${n.nayThuoc ? ' — nay ngoài địa giới phường' : ''}`)) +
      `\n\nHỏi thẳng tên một ngọn (ví dụ “núi Quy Sơn”) để nghe sách chép gì về ngọn đó.` +
      dauNguonXua(dc),
    links: LINK_XUA,
    suggestions: ['Núi Quy Sơn ở đâu?', 'Sông nào chảy qua Đông Triều?', 'Thổ sản Đông Triều xưa có gì?'],
  };
}

/** "Sông nào chảy qua", "có mấy cây cầu", "chợ xưa ở đâu". */
function answerSongChoXua(corpus) {
  const dc = corpus.settings?.diaChi1896;
  const song = dc?.song ?? [];
  if (!song.length) return null;
  const cho = dc.cho ?? [];
  const cau = dc.cau ?? [];

  return {
    intent: 'about_song',
    reply:
      `🌊 **Sông ngòi, cầu và chợ theo địa chí 1896**\n\n` +
      `Huyện khi ấy có **${song.length} con sông**, **${cau.length} cây cầu** và **${cho.length} cái chợ**.\n\n` +
      bullets(song.map((s) => `**${s.ten}** — ${short(s.moTa, 150)}`)) +
      (cho.length ? `\n\n🏮 Chợ: ${cho.map((c) => c.ten).join(' · ')}.` : '') +
      (dc.choGhiChu ? `\n${dc.choGhiChu}` : '') +
      `\n\nCác dòng nước trong huyện cuối cùng đều đổ về **sông Bạch Đằng**.` +
      dauNguonXua(dc),
    links: [{ label: 'Bản đồ số', url: '/ban-do' }, ...LINK_XUA].slice(0, 4),
    suggestions: ['Đông Triều có núi nào?', 'Địa chí 1896 là sách gì?', 'Đường sá Đông Triều xưa thế nào?'],
  };
}

/** "Danh nhân Đông Triều", "ai đỗ tiến sĩ", "người nổi tiếng xưa". */
function answerNhanVatXua(corpus) {
  const dc = corpus.settings?.diaChi1896;
  const nv = dc?.nhanVat ?? [];
  if (!nv.length) return null;

  return {
    intent: 'about_nhanvat',
    reply:
      `👤 **Nhân vật huyện Đông Triều trong địa chí 1896**\n\n` +
      `Sách chép **${nv.length} mục nhân vật**. Mở đầu là gốc tích họ Trần:\n\n` +
      `_${short(nv[0].moTa, 260)}_\n\n` +
      bullets(
        nv.slice(1, 8).map((n) => `**${n.ten}**${n.que ? ` (${n.que})` : ''}${n.thoi ? `, ${n.thoi}` : ''} — ${short(n.moTa, 120)}`),
      ) +
      `\n\n…và ${nv.length - 8} mục nữa — xem đầy đủ ở trang Giới thiệu.` +
      dauNguonXua(dc),
    links: LINK_XUA,
    suggestions: ['Vì sao Đông Triều gắn với nhà Trần?', 'Đông Triều có núi nào?', 'Làng nào xưa nổi tiếng học hành?'],
  };
}

/** "Xưa Đông Triều làm nghề gì", "thổ sản", "có than từ bao giờ". */
function answerThoSanXua(corpus) {
  const dc = corpus.settings?.diaChi1896;
  const ts = dc?.thoSan ?? [];
  if (!ts.length) return null;
  const noi = dc.noiTiepHomNay;

  return {
    intent: 'about_thosan',
    reply:
      `🧺 **Nghề và thổ sản Đông Triều năm 1896**\n\n` +
      (dc.kyNghe ? `${dc.kyNghe}\n\n` : '') +
      `Sách liệt kê **${ts.length} thứ thổ sản**:\n` +
      bullets(ts.map((t) => `**${t.ten}** — ${t.o}`)) +
      (noi ? `\n\n🔗 **${noi.tieuDe}**\n${noi.noiDung}` : '') +
      dauNguonXua(dc),
    links: [{ label: 'Đặc sản Đông Triều hôm nay', url: '/am-thuc' }, ...LINK_XUA].slice(0, 4),
    suggestions: ['Kinh tế Đông Triều thế nào?', 'Đặc sản Đông Triều có gì?', 'Đông Triều có núi nào?'],
  };
}

/**
 * "Mỹ Cụ nghĩa là gì", "làng tôi xưa tên gì", "tên cũ của Mễ Xá".
 *
 * Câu chuyện hay nhất trong cả cuốn sách nằm ở đây: Mỹ Cụ vốn tên Ưu Đà, đổi tên
 * năm 1802 vì "vua Trần qua đây được thôn này dâng thức ăn ngon". Mà chùa Mỹ Cụ
 * và đình Mỹ Cụ thì vẫn đang đứng trong phường, có hồ sơ trên chính cổng này.
 */
function answerTenLangXua(corpus, q, { chiKhiGoiTen = false } = {}) {
  const dc = corpus.settings?.diaChi1896;
  const ds = dc?.doiTen ?? [];
  if (!ds.length) return null;

  const mot = ds.find((d) => has(q, d.xua) || has(q, d.nay));

  if (mot) {
    return {
      intent: 'about_tenlang',
      reply:
        `🏷️ **${mot.xua} → ${mot.nay}**\n\n` +
        `Địa chí 1896 chép: xã **${mot.nay}** vốn tên cũ là **${mot.xua}**` +
        (mot.nam ? `, đổi tên năm ${mot.nam}` : '') +
        `.` +
        (mot.ghiChu ? `\n\n${mot.ghiChu}` : '') +
        dauNguonXua(dc),
      links: [...noiDiemXua(corpus, mot.slug), ...LINK_XUA].slice(0, 4),
      suggestions: ['Còn làng nào từng đổi tên?', 'Đông Triều có núi nào?', 'Danh nhân Đông Triều xưa là ai?'],
    };
  }

  // Câu chỉ có cụm "nghĩa là gì" mà không nhắc làng nào thì đang hỏi chuyện
  // khác ("OCOP nghĩa là gì") — trả về danh sách đổi tên là lạc đề.
  if (chiKhiGoiTen) return null;

  return {
    intent: 'about_tenlang',
    reply:
      `🏷️ **Những làng từng đổi tên, theo địa chí 1896**\n\n` +
      bullets(ds.map((d) => `**${d.xua}** → **${d.nay}**${d.nam ? ` (${d.nam})` : ''}`)) +
      `\n\n${ds.find((d) => d.ghiChu)?.ghiChu ?? ''}` +
      dauNguonXua(dc),
    links: [{ label: '11 khu phố của phường', url: '/khu-pho' }, ...LINK_XUA].slice(0, 4),
    suggestions: ['Mỹ Cụ nghĩa là gì?', 'Phường có bao nhiêu khu phố?', 'Đông Triều có núi nào?'],
  };
}

/**
 * "Khu phố Mỹ Cụ xưa tên gì", "khu phố nào có từ thời xưa".
 *
 * Câu hỏi mà người dân của phường quan tâm nhất ở nguồn này: làng mình có trong
 * sách không. 8/11 khu phố hôm nay mang đúng tên xã sách đã chép.
 */
function answerKhuPhoXua(corpus, q) {
  const dc = corpus.settings?.diaChi1896;
  const ds = dc?.khuPhoXua?.danhSach ?? [];
  if (!ds.length) return null;

  const mot = ds.find((k) => has(q, k.khu));
  if (mot) {
    return {
      intent: 'about_khupho_xua',
      reply: mot.xua
        ? `🏘️ **Khu phố ${mot.khu}** — địa chí 1896 chép là **${mot.xua}**` +
          (mot.chac ? '' : ' _(cổng phỏng đoán, chưa có căn cứ khảo cứu)_') +
          `\n\n${mot.viec}` +
          (mot.trong ? `\n\nSách nhắc tới trong các mục: ${mot.trong}.` : '') +
          dauNguonXua(dc)
        : `🏘️ **Khu phố ${mot.khu}** không có trong địa chí 1896.\n\n${mot.viec}` + dauNguonXua(dc),
      links: [...noiDiemXua(corpus, mot.slug), { label: '11 khu phố của phường', url: '/khu-pho' }].slice(0, 4),
      suggestions: ['Khu phố nào có tên từ thời xưa?', 'Mỹ Cụ nghĩa là gì?', 'Đông Triều có núi nào?'],
    };
  }

  const co = ds.filter((k) => k.xua && k.chac);
  return {
    intent: 'about_khupho_xua',
    reply:
      `🏘️ **${dc.khuPhoXua.tieuDe}**\n\n` +
      bullets(
        ds.map((k) =>
          k.xua
            ? `**${k.khu}** ← ${k.xua}${k.chac ? '' : ' _(phỏng đoán)_'}`
            : `**${k.khu}** — không có trong sách`,
        ),
      ) +
      `\n\n${co.length}/${ds.length} khu phố mang đúng tên xã sách đã chép cách đây ${new Date().getFullYear() - 1896} năm.` +
      `\n\n_${dc.khuPhoXua.moTa}_` +
      dauNguonXua(dc),
    links: [{ label: '11 khu phố của phường', url: '/khu-pho' }, ...LINK_XUA].slice(0, 4),
    suggestions: ['Khu phố Mỹ Cụ xưa tên gì?', 'Phường có bao nhiêu khu phố?', 'Danh nhân Đông Triều xưa là ai?'],
  };
}

/** "Phong tục Đông Triều xưa", "làng nào giỏi võ", "làng nào học giỏi". */
function answerPhongTucXua(corpus) {
  const dc = corpus.settings?.diaChi1896;
  const pt = dc?.phongTuc;
  if (!pt?.lang?.length) return null;

  return {
    intent: 'about_phongtuc',
    reply:
      `🎎 **Phong tục các làng Đông Triều năm 1896**\n\n${pt.moTa}\n\n` +
      `Tri huyện chép rõ làng nào nổi trội việc gì:\n` +
      bullets(pt.lang.map((l) => `**${l.ten}** — ${l.noiTroi}`)) +
      (pt.hocHanh ? `\n\n${pt.hocHanh}` : '') +
      dauNguonXua(dc),
    links: [...noiDiemXua(corpus, pt.lang.flatMap((l) => l.slug ?? [])), ...LINK_XUA].slice(0, 4),
    suggestions: ['Danh nhân Đông Triều xưa là ai?', 'Đông Triều có núi nào?', 'Lễ hội nào sắp diễn ra?'],
  };
}

/** "Chùa cổ Đông Triều", "cổ tích", "đền miếu xưa còn không". */
function answerCoTichXua(corpus, q) {
  const dc = corpus.settings?.diaChi1896;
  const ds = dc?.coTich ?? [];
  if (!ds.length) return null;

  const mot = ds.find((c) => {
    const t = norm(String(c.ten).replace(/^(chùa cổ|chùa|đền|miếu|tượng thần)\s+/i, ''));
    return t.length >= 4 && has(q, t);
  });
  if (mot) {
    return {
      intent: 'about_cotich',
      reply:
        `🏯 **${mot.ten}** — ${mot.o}\n\n${mot.moTa}` +
        (mot.cauNoi ? `\n\n> _${mot.cauNoi}_` : '') +
        (mot.nayThuoc ? `\n\n📍 Nay: ${mot.nayThuoc}.` : '') +
        dauNguonXua(dc),
      links: [...noiDiemXua(corpus, mot.slug), ...LINK_XUA].slice(0, 4),
      suggestions: ['Địa chí 1896 chép những cổ tích nào?', 'Đông Triều có núi nào?', 'Danh nhân Đông Triều xưa là ai?'],
    };
  }

  return {
    intent: 'about_cotich',
    reply:
      `🏯 **${ds.length} cổ tích trong địa chí 1896**\n\n` +
      bullets(ds.map((c) => `**${c.ten}** (${c.o}) — ${short(c.moTa, 110)}`)) +
      `\n\nMột số nơi vẫn còn và đã có hồ sơ trên cổng này; số còn lại năm 1896 đã “hỏng nát hoang tàn lẫn trong cây cỏ”.` +
      dauNguonXua(dc),
    links: [...noiDiemXua(corpus, ds.flatMap((c) => c.slug ?? [])), ...LINK_XUA].slice(0, 4),
    suggestions: ['Chùa Ngọc Thanh có gì?', 'Đông Triều có núi nào?', 'Danh nhân Đông Triều xưa là ai?'],
  };
}

/** "Địa chí 1896 là sách gì", "sách cổ viết về Đông Triều". */
function answerDiaChi(corpus) {
  const dc = corpus.settings?.diaChi1896;
  if (!dc?.nguon) return null;
  const pv = dc.phamVi ?? {};

  return {
    intent: 'about_diachi',
    reply:
      `📜 **${dc.nguon}**\n\n` +
      bullets([
        `Người chép: **${dc.tacGia}**`,
        `Niên đại: **${dc.nienDai}**`,
        `Ký hiệu: ${dc.kyHieu}`,
        `Trích từ: ${dc.trichTu}`,
      ]) +
      (pv.tong
        ? `\n\nKhi ấy huyện Đông Triều thuộc tỉnh **Hải Dương**, còn **${pv.tong} tổng** với **${pv.xaThon} xã thôn** ` +
          `(vốn ${pv.tongCu} tổng ${pv.xaCu} xã).`
        : '') +
      `\n\nSách chép đủ các mục: thành trì, núi sông, cầu chợ, đường sá, diên cách, nhân vật, phong tục, cổ tích, kỹ nghệ và thổ sản.` +
      `\n\n⚠️ ${dc.canhBao}` +
      (dc.luuYVanBan ? `\n\nℹ️ ${dc.luuYVanBan}` : ''),
    links: LINK_XUA,
    suggestions: ['Đông Triều có núi nào?', 'Danh nhân Đông Triều xưa là ai?', 'Thổ sản Đông Triều xưa có gì?'],
  };
}

/** "Đông Triều xưa thuộc tỉnh nào", "khi nào thành huyện", "phủ Đông Triều". */
function answerDienCachXua(corpus) {
  const dc = corpus.settings?.diaChi1896;
  const ds = dc?.dienCach ?? [];
  if (!ds.length) return null;

  return {
    intent: 'about_diencach',
    reply:
      `🏛️ **Đông Triều đổi thay qua các đời, theo địa chí 1896**\n\n` +
      bullets(ds.map((d) => `**${d.moc}** — ${d.viec}`)) +
      `\n\nPhần sau năm 1896 (Đệ Tứ Chiến khu 1945, về Quảng Ninh 1963, lên thành phố 2024, sắp xếp 2025) xem mục Dòng thời gian ở trang Giới thiệu.` +
      dauNguonXua(dc),
    links: [{ label: 'Dòng thời gian đầy đủ', url: '/gioi-thieu#dong-thoi-gian' }, ...LINK_XUA].slice(0, 4),
    suggestions: ['Lịch sử Đông Triều ra sao?', 'Làng nào từng đổi tên?', 'Đông Triều có núi nào?'],
  };
}

// ─── Giới thiệu địa phương ─────────────────────────────────────────────────

function answerAbout(corpus) {
  const sections = corpus.settings?.about?.sections ?? [];
  const intro = sections[0]?.body;
  const nH = corpus.heritages.length;
  const nF = corpus.festivals.length;

  const reply = intro
    ? `📍 **Về phường Đông Triều**\n\n${short(intro, 380)}\n\n` +
      `Trên cổng thông tin có **${nH} cụm di tích đã xếp hạng**, **${nF} lễ hội**, cùng đặc sản, nơi lưu trú và bản đồ để bạn lên kế hoạch.`
    : `📍 **Phường Đông Triều, tỉnh Quảng Ninh** — vùng đất quê gốc và nơi yên nghỉ của các vua Trần, trung tâm Thiền phái Trúc Lâm. Có **${nH} cụm di tích đã xếp hạng** và **${nF} lễ hội** truyền thống.`;

  return {
    intent: 'about',
    reply,
    links: [
      { label: 'Giới thiệu chi tiết', url: '/gioi-thieu' },
      { label: 'Danh sách di tích', url: '/di-tich' },
      { label: 'Bản đồ', url: '/ban-do' },
    ],
    suggestions: ['Di tích nào nổi tiếng nhất?', 'Hôm nay nên đi đâu?', 'Đặc sản Đông Triều có gì?'],
  };
}

// ─── Liên hệ & khẩn cấp ────────────────────────────────────────────────────

function answerContact(corpus, isEmergency) {
  const c = corpus.settings?.contact ?? {};

  if (isEmergency) {
    return {
      intent: 'contact_emergency',
      reply:
        '🆘 **Số điện thoại khẩn cấp** (toàn quốc):\n\n' +
        bullets([
          '**113** — Cảnh sát phản ứng nhanh (Công an)',
          '**114** — Cảnh sát Phòng cháy chữa cháy & Cứu nạn',
          '**115** — Cấp cứu y tế',
        ]) +
        `\n\nTrường hợp cần chính quyền địa phương, liên hệ **${c.name || 'UBND phường Đông Triều'}**` +
        (c.phone ? ` — ☎ ${c.phone}.` : '. Số điện thoại cụ thể xem tại trang Liên hệ.'),
      links: [{ label: 'Trang liên hệ', url: '/lien-he' }],
      suggestions: ['Đường dây nóng của phường?', 'Thời tiết hôm nay', 'Hôm nay nên đi đâu?'],
    };
  }

  const lines = [`🏛️ **${c.name || 'UBND phường Đông Triều'}**`];
  if (c.address) lines.push(`📍 ${c.address}`);
  if (c.phone) lines.push(`☎ ${c.phone}`);
  if (c.email) lines.push(`✉ ${c.email}`);
  const social = corpus.settings?.social ?? {};
  if (social.facebook) lines.push(`📘 Facebook: ${social.facebook}`);
  if (social.zalo) lines.push(`💬 Zalo: ${social.zalo}`);

  const hasContact = c.phone || c.email || social.facebook;
  return {
    intent: 'contact',
    reply:
      lines.join('\n') +
      (hasContact
        ? ''
        : '\n\nThông tin liên hệ chi tiết (điện thoại, email) đang được cập nhật — bạn xem tại trang Liên hệ nhé.') +
      '\n\nSố khẩn cấp: **113** Công an · **114** Cứu hoả · **115** Cấp cứu.',
    links: [{ label: 'Trang liên hệ', url: '/lien-he' }],
    suggestions: ['Số điện thoại khẩn cấp?', 'Hôm nay nên đi đâu?', 'Đi từ Hà Nội thế nào?'],
  };
}

// ─── Vé & giờ mở cửa ───────────────────────────────────────────────────────

function answerTicket() {
  return {
    intent: 'ticket',
    reply:
      '🎟️ **Vé tham quan**\n\n' +
      bullets([
        'Các **di tích, đình, đền, chùa** ở phường Đông Triều **hầu hết mở cửa tự do, không bán vé**.',
        'Vào dịp lễ hội có thể có gửi xe hoặc công đức tuỳ tâm, không bắt buộc.',
        'Một số điểm **lân cận ngoài phường** (như khu Ngoạ Vân có tuyến cáp treo) thì cáp treo tính phí riêng — xem mục Điểm lân cận.',
      ]) +
      '\n\nMình chưa có bảng giá chi tiết trong dữ liệu, nếu cần chính xác bạn nên hỏi trực tiếp ban quản lý di tích.',
    links: [
      { label: 'Danh sách di tích', url: '/di-tich' },
      { label: 'Điểm lân cận', url: '/di-tich' },
    ],
    suggestions: ['Giờ mở cửa thế nào?', 'Hôm nay nên đi đâu?', 'Đi từ Hà Nội thế nào?'],
  };
}

function answerHours() {
  return {
    intent: 'hours',
    reply:
      '🕐 **Giờ tham quan**\n\n' +
      bullets([
        'Các đình, đền, chùa thường **mở cửa ban ngày** (khoảng từ sáng sớm đến chiều tối) và ra vào tự do.',
        'Ngày rằm, mùng một và mùa lễ hội (chủ yếu tháng Giêng âm lịch) thường đông và mở muộn hơn.',
        'Muốn dự lễ hoặc vào ban quản lý, bạn nên tới vào ban ngày.',
      ]) +
      '\n\nGiờ giấc cụ thể từng điểm chưa có trong dữ liệu — nên liên hệ ban quản lý di tích để chắc chắn.',
    links: [{ label: 'Danh sách di tích', url: '/di-tich' }, { label: 'Lịch lễ hội', url: '/le-hoi' }],
    suggestions: ['Vé vào cửa bao nhiêu?', 'Lễ hội nào sắp diễn ra?', 'Hôm nay nên đi đâu?'],
  };
}

// Tiện ích (ATM, xăng, nhà vệ sinh, bãi đỗ) — chưa có trong dữ liệu.
const OUT_OF_SCOPE_FACILITY = {
  intent: 'out_of_scope_facility',
  matched: false,
  reply:
    'Mình chưa có dữ liệu về các tiện ích như ATM, cây xăng, nhà vệ sinh hay bãi đỗ xe trong khu vực 🙏\n\n' +
    'Mình chỉ nắm thông tin về di tích, lễ hội, ẩm thực, lưu trú và thời tiết. Với các tiện ích này, bạn tra trên Google Maps sẽ nhanh hơn.',
  links: [{ label: 'Bản đồ khu vực', url: '/ban-do' }],
  suggestions: ['Hôm nay nên đi đâu?', 'Có khách sạn nào không?', 'Đặc sản Đông Triều có gì?'],
};

// Xếp hạng theo tiêu chí chưa có trong dữ liệu (wifi, độ sạch, bãi đỗ…).
// Dữ liệu chỉ có ĐIỂM SAO TỔNG THỂ của Google Maps, không có điểm cho từng tiêu
// chí. Trả về một danh sách xếp theo sao mà khách lại hỏi "wifi mạnh nhất" thì
// trông như đã trả lời trong khi thực ra chưa — thà nói thẳng.
const OUT_OF_SCOPE_RANKING = {
  intent: 'out_of_scope_ranking',
  matched: false,
  reply:
    'Mình chưa có dữ liệu để xếp hạng theo tiêu chí đó 🙏\n\n' +
    'Dữ liệu của mình chỉ có **điểm sao tổng thể** trên Google Maps, không chấm riêng từng mặt như wifi, độ sạch hay chỗ đậu xe.\n\n' +
    'Bạn có thể hỏi mình _"quán nào đánh giá cao nhất"_, _"giờ này còn quán nào mở"_ hoặc _"quán nào giá mềm"_ — những cái đó mình trả lời được.',
  links: [
    { label: 'Tất cả nơi ăn uống', url: '/am-thuc' },
    { label: 'Nơi lưu trú', url: '/luu-tru' },
  ],
  suggestions: ['Quán nào đánh giá cao nhất?', 'Giờ này còn quán nào mở?', 'Quán nào giá mềm?'],
};

// Thủ tục hành chính — ngoài phạm vi cổng du lịch, chuyển hướng lịch sự.
const OUT_OF_SCOPE_ADMIN = {
  intent: 'out_of_scope_admin',
  matched: false,
  reply:
    'Đây là **cổng thông tin du lịch** của phường nên mình không hỗ trợ thủ tục hành chính (căn cước, hộ khẩu, khai sinh, dịch vụ công…) 🙏\n\n' +
    'Những việc đó bạn liên hệ trực tiếp **UBND phường Đông Triều** hoặc Cổng dịch vụ công quốc gia **dichvucong.gov.vn**. Mình chỉ giúp được về tham quan, lễ hội, ẩm thực, lưu trú và thời tiết thôi nhé.',
  links: [{ label: 'Trang liên hệ', url: '/lien-he' }],
  suggestions: ['Hôm nay nên đi đâu?', 'Đặc sản Đông Triều có gì?', 'Số điện thoại khẩn cấp?'],
};

// ─── Câu xã giao ───────────────────────────────────────────────────────────

const GREETING = {
  intent: 'greeting',
  reply:
    `Xin chào 👋 Mình là ${ASSISTANT_NAME}.\n\nMình trả lời dựa trên **dữ liệu chính thức của phường** — hồ sơ di tích, lịch lễ hội, danh sách lưu trú, ẩm thực — cộng với **số liệu thời tiết và triều cường cập nhật theo giờ**.\n\nBạn muốn hỏi gì nào?`,
  links: [],
  suggestions: ['Hôm nay nên đi đâu?', 'Thời tiết hôm nay thế nào?', 'Lễ hội nào sắp diễn ra?'],
};

const HELP = {
  intent: 'help',
  reply:
    'Mình có thể giúp bạn:\n\n' +
    bullets([
      '**Thời tiết** — hiện tại, ngày mai, 7 ngày tới, và gợi ý nên đi đâu theo thời tiết',
      '**Triều cường** — lịch nước lớn, nước ròng vùng sông Kinh Thầy – Đá Bạc',
      '**Di tích** — 13 cụm di tích xếp hạng: lịch sử, kiến trúc, thờ ai, đường đi',
      '**Lễ hội** — lịch âm quy đổi sang dương, thờ ai, nghi lễ, phần hội và **kinh nghiệm đi lễ**',
      '**Ẩm thực & quán ăn** — đặc sản, quán được **đánh giá cao**, quán giá mềm, cà phê – trà sữa',
      '**Giờ mở cửa** — giờ này còn quán nào mở, chỗ nào mở 24/24, ăn khuya, ăn sáng sớm',
      '**Lưu trú** — khách sạn, nhà nghỉ, homestay kèm số điện thoại và điểm đánh giá',
      '**Tìm quanh một di tích** — quán ăn, chỗ nghỉ gần điểm bạn định tới',
      '**Khu phố** — 11 khu phố mới sau sắp xếp 2025 và cơ sở trong từng khu',
      '**Lộ trình cá nhân hoá** — theo buổi (sáng/chiều), sở thích (tâm linh, lịch sử, gia đình), sức khoẻ (đi nhẹ nhàng) và ngân sách',
      '**Đường đi** — cách tới Đông Triều từ Hà Nội, Hạ Long',
      '**Vé & giờ tham quan, liên hệ, số khẩn cấp** — thông tin tiện ích cơ bản',
    ]) +
    '\n\nMình chỉ trả lời trong phạm vi dữ liệu của phường, không bịa thêm nhé.',
  links: [],
  suggestions: ['Hôm nay nên đi đâu?', 'Đặc sản Đông Triều có gì?', 'Lễ hội nào sắp diễn ra?'],
};

// ─── Bộ điều phối chính ────────────────────────────────────────────────────

// Câu hỏi có nhắc tới một mốc ngày nào không (dùng để nhận ra "thứ bảy trời thế nào")
const DAY_WORDS = [
  'hom nay', 'bay gio', 'hien tai', 'luc nay', 'ngay mai', 'mai', 'ngay kia', 'ngay mot',
  'cuoi tuan', 'tuan nay', 'tuan toi', 'ca tuan', '7 ngay', 'bay ngay', 'nhung ngay toi',
  'may ngay toi', 'thu hai', 'thu ba', 'thu tu', 'thu nam', 'thu sau', 'thu bay', 'chu nhat',
];
// Từ chỉ hiện tượng thời tiết — riêng chúng thì mơ hồ, phải đi kèm mốc ngày
const WEATHER_WORDS = ['troi', 'mua', 'nang', 'nong', 'lanh', 'am', 'gio', 'nhiet', 'thoi tiet'];

/**
 * Câu hỏi có nhắc tới tiền/ngân sách không?
 * Đòi hỏi con số đứng trước đơn vị tiền (\b để không đụng "2 ngày", "2 kg",
 * và món "ngán"), hoặc các cụm nói về chi phí.
 */
function detectBudget(q) {
  if (/(\d+(?:[.,]\d+)?)\s*(trieu|tr|nghin|ngan|k|dong)\b/.test(q)) return true;
  return has(q, 'ngan sach', 'chi phi', 'gia ca', 'bao nhieu tien', 'tiet kiem', 'it tien', 'kinh phi', 'het bao nhieu');
}

/**
 * Khách hỏi về giờ giấc mở cửa theo kiểu nào?
 * @returns {'now'|'late'|'early'|'allday'|null}
 */
function detectOpenMode(q) {
  if (has(q, '24 24', '24h', 'mo 24', 'ca dem', 'suot dem', 'xuyen dem', 'mo ca ngay')) return 'allday';
  if (has(q, 'an khuya', 'an dem', 'khuya', 'toi muon', 'dem muon', 'nua dem', 'mo muon', 'dong cua muon'))
    return 'late';
  if (has(q, 'mo som', 'sang som', 'an sang som', 'som nhat')) return 'early';
  if (
    has(q, 'dang mo', 'con mo', 'mo chua', 'gio nay', 'bay gio con', 'luc nay con', 'hien tai con', 'con ban khong')
  )
    return 'now';
  return null;
}

/** Khu phố được nhắc tới trong câu hỏi (chỉ tính khi có chữ "khu"). */
function detectKhuPho(q, corpus) {
  // Tên khu phố trùng tên nhiều di tích (Mỹ Cụ, An Biên, Bình Lục…), nên bắt
  // buộc phải có chữ "khu"/"khu phố" thì mới coi là hỏi về khu phố. Nếu không,
  // "chùa Mỹ Cụ có gì" sẽ bị hiểu thành hỏi khu phố Mỹ Cụ.
  if (!has(q, 'khu pho', 'khu')) return null;
  const list = corpus.khuPho?.danhSach ?? [];
  // Khớp tên dài trước để "Bình Lục" không nuốt mất tên dài hơn
  return [...list].sort((a, b) => b.ten.length - a.ten.length).find((k) => has(q, k.ten)) ?? null;
}

/** Tháng âm lịch nhắc tới trong câu hỏi, nếu có. */
function detectLunarMonth(q) {
  if (has(q, 'thang gieng')) return 1;
  if (has(q, 'thang chap')) return 12;
  const m = q.match(/thang\s+(\d{1,2})/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 12) return n;
  }
  return null;
}

/**
 * Trả lời một câu hỏi.
 * @param {string} question
 * @returns {Promise<{reply, intent, matched, links, suggestions}>}
 */
export async function ask(question) {
  const raw = String(question ?? '').trim();
  if (!raw) {
    return { ...GREETING, matched: true };
  }

  const q = norm(raw);
  const { corpus, index } = await getSearchIndex();

  // Tra cứu trước để biết câu hỏi có nhắc tên riêng nào không —
  // "đền Yết Kiêu có lễ hội gì" phải trả lời về đền Yết Kiêu, không phải danh sách lễ hội chung.
  // Câu hỏi nghiêng hẳn về lễ hội thì ưu tiên bản ghi lễ hội, còn lại giữ ưu tiên mặc định
  const festivalish = has(q, 'le hoi', 'hoi lang', 'ruoc', 'te le');
  const hits = search(index, raw, { limit: 4, boost: festivalish ? { festival: 1.5, heritage: 1 } : null });
  const top = hits[0];
  // "Người dùng có đang gọi đích danh một mục cụ thể không?"
  const strongName = Boolean(top && (top.exactName || top.titleCoverage >= 0.6));

  // 1. Xã giao
  // Lời chào có thể nằm sau từ đệm ("cho mình hỏi alo nhỉ") nên xét cả has()
  if (
    /^(xin\s+)?(chao|hello|hi|hey|alo)\b/.test(q) ||
    has(q, 'xin chao', 'chao ban', 'chao bot', 'alo', 'hello')
  )
    return { ...GREETING, matched: true };
  if (has(q, 'cam on', 'thanks', 'thank you'))
    return {
      intent: 'thanks',
      matched: true,
      reply: 'Rất vui được giúp bạn 😊 Chúc bạn có chuyến đi Đông Triều thật vui!',
      links: [],
      suggestions: ['Hôm nay nên đi đâu?', 'Ăn gì ở Đông Triều?', 'Thời tiết ngày mai?'],
    };
  if (has(q, 'ban la ai', 'ban lam duoc gi', 'ban biet gi', 'giup duoc gi', 'ho tro gi', 'huong dan', 'help'))
    return { ...HELP, matched: true };

  // 2. Triều cường (kiểm tra trước thời tiết vì "con nước" cũng chứa từ thời tiết)
  if (has(q, 'thuy trieu', 'trieu cuong', 'con nuoc', 'nuoc lon', 'nuoc rong', 'muc nuoc', 'dinh trieu'))
    return { ...(await answerTide()), matched: true };

  // 3. Thời tiết — hỏi thẳng, hỏi kiểu "thứ bảy trời thế nào", hoặc các cụm rõ nghĩa
  //    (tránh dùng bare 'gio' vì trùng "giờ" trong câu hỏi giờ mở cửa).
  if (
    has(q, 'thoi tiet', 'du bao', 'nhiet do', 'bao nhieu do', 'chi so uv', 'do am') ||
    has(q, 'co mua', 'co nang', 'troi nang', 'troi mua', 'nang khong', 'mua khong', 'nong khong', 'lanh khong', 'ret khong', 'troi the nao', 'troi ra sao', 'oi buc', 'am uot') ||
    (has(q, ...DAY_WORDS) && has(q, ...WEATHER_WORDS))
  )
    return { ...(await answerWeather(q, corpus)), matched: true };

  // 3a. Hỏi SÂU về một lễ hội cụ thể (thờ ai, nghi lễ gì, phần hội có gì, đi cần
  //     lưu ý gì) — trả lời đúng khía cạnh thay vì đọc lại đoạn giới thiệu.
  //     Phải xét TRƯỚC mục lộ trình: "đi lễ hội Ngọa Vân cần lưu ý gì" chứa cụm
  //     "đi lễ" nên bị nhánh lộ trình tâm linh nuốt mất. Điều kiện ở đây rất
  //     chặt (đúng một lễ hội gọi đích danh + có từ khoá khía cạnh) nên không
  //     cướp mất câu hỏi lộ trình thật.
  if (top?.doc.kind === 'festival' && (strongName || top.titleCoverage >= 0.5)) {
    const aspect = detectFestivalAspect(q);
    if (aspect) return { matched: true, ...answerFestivalAspect(top.doc.raw, aspect, top.doc.url) };
  }

  // 3b. Lộ trình — vẽ theo ĐÚNG khoảng thời gian khách hỏi (buổi sáng / chiều /
  //     cả ngày / 2 ngày) và cá nhân hoá theo sở thích, sức khoẻ, ngân sách.
  //     Xét trước "nên đi đâu" vì câu lộ trình/ngân sách thường kèm cụm đó.
  {
    const amount = parseAmount(q);
    const routeOpts =
      detectRoute(q, amount) ?? (detectBudget(q) ? { span: amount && amount >= 1_500_000 ? 'two' : 'day', theme: null, easy: false, amount } : null);
    if (routeOpts) return { ...buildRoute(corpus, routeOpts), matched: true };
  }

  // 3c. Khẩn cấp & liên hệ — như trợ lý cổng chính quyền
  if (has(q, 'cap cuu', 'khan cap', 'cong an', 'canh sat', 'cuu hoa', 'chay no', 'so 113', 'so 114', 'so 115', '113', '114', '115', 'benh vien', 'tram y te'))
    return { ...answerContact(corpus, true), matched: true };
  if (
    has(q, 'duong day nong', 'hotline', 'so dien thoai ubnd', 'so dien thoai phuong', 'lien he', 'lien lac', 'ubnd', 'uy ban nhan dan', 'goi cho phuong', 'goi len phuong', 'goi cho ubnd', 'so phuong', 'lien he phuong') ||
    (has(q, 'so dien thoai', 'sdt', 'lien he') && !strongName)
  )
    return { ...answerContact(corpus, false), matched: true };

  // 3d. Thủ tục hành chính — ngoài phạm vi cổng du lịch.
  //
  //     Nhánh này phải chặn được câu hỏi TRƯỚC khi nó rơi xuống mục 9 phía dưới:
  //     ở đó cụm "ở đâu" bị hiểu là hỏi vị trí Đông Triều. Thiếu đúng một từ khoá
  //     là "làm hộ chiếu ở đâu" được đáp lại bằng bài giới thiệu phường cách Hà
  //     Nội bao nhiêu cây số — trông như đã trả lời, mà thật ra là lạc đề.
  if (
    has(
      q, 'thu tuc', 'can cuoc', 'cccd', 'chung minh nhan dan', 'khai sinh', 'ho khau', 'tam tru',
      'tam vang', 'giay phep', 'dich vu cong', 'hanh chinh', 'cong chung', 'so do',
      'dang ky kinh doanh', 'bao hiem', 'ho chieu', 'passport', 'xuat nhap canh', 'ly lich tu phap',
    )
  )
    return { ...OUT_OF_SCOPE_ADMIN };

  // 3e. Tiện ích chưa có dữ liệu (ATM, xăng, nhà vệ sinh, bãi đỗ) — xét trước
  //     nhánh "gần đây" ở mục 8b để "ATM gần đây" không bị hiểu thành điểm lân cận.
  if (has(q, 'atm', 'rut tien', 'cay xang', 'tram xang', 'do xang', 'nha ve sinh', 'bai do xe', 'bai gui xe', 'gui xe', 'do xe o dau'))
    return { ...OUT_OF_SCOPE_FACILITY };

  // 3e2. Xin xếp hạng theo tiêu chí không có trong dữ liệu — xét trước mọi
  //      nhánh gợi ý, nếu không sẽ trả về danh sách xếp theo sao trông như đã
  //      trả lời đúng câu hỏi.
  if (
    has(q, 'nhat', 'hon ca', 'top') &&
    has(q, 'wifi', 'wi fi', 'dieu hoa', 'may lanh', 'sach se', 've sinh', 'cho dau xe', 'bai do xe', 'do xe')
  )
    return { ...OUT_OF_SCOPE_RANKING };

  // 3f. Khu phố — cơ cấu hành chính mới sau sắp xếp 2025.
  //     Xét trước mục 9a vì "ăn gì ở khu phố Nguyễn Bình" vừa là hỏi chỗ ăn vừa
  //     là hỏi khu phố; và trước mục tra cứu tên riêng vì nhiều khu phố trùng
  //     tên di tích (Mỹ Cụ, An Biên, Bình Lục…).
  //     Trừ khi câu hỏi nói rõ là hỏi chuyện XƯA ("khu phố Trạo Hà xưa tên gì"):
  //     lúc đó nhường cho nhánh địa chí 1896 ở 9b-ter, vì `answerKhuPhoInfo` chỉ
  //     có số hộ và diện tích hôm nay, không có tên làng cũ.
  {
    const hoiChuyenXua =
      has(q, 'xua', 'ngay xua', 'thoi xua', 'truoc kia', '1896') &&
      !has(q, 'bao nhieu', 'dien tich', 'dan so', 'nhan khau', 'so ho', 'may khu');
    const kp = hoiChuyenXua ? null : detectKhuPho(q, corpus);
    // Tên khu phố bỏ dấu có thể trùng đúng một từ khoá: "An Biên" → "an bien",
    // mà 'an' ở đây là "ăn". Không gỡ tên khu phố ra khỏi câu thì "khu phố An
    // Biên gồm những khu nào" bị hiểu thành hỏi chỗ ĂN trong khu phố đó, trả về
    // danh sách quán thay vì cơ cấu khu. Cùng một bẫy đã xử ở mục 9a.
    const qKp = kp ? ` ${q} `.replaceAll(` ${norm(kp.ten)} `, ' ').trim() : q;
    const askListInKhuPho = has(qKp, 'an', 'an gi', 'quan', 'nha hang', 'ca phe', 'cafe', 'tra sua', 'khach san', 'nha nghi', 'luu tru', 'ngu', 'o dau', 'co gi');
    if (kp && askListInKhuPho) {
      const kind = has(qKp, 'khach san', 'nha nghi', 'luu tru', 'ngu', 'homestay')
        ? 'lodging'
        : has(q, 'ca phe', 'cafe', 'tra sua')
          ? 'cafe'
          : 'restaurant';
      return { matched: true, ...answerByKhuPho(corpus, kp, kind) };
    }
    if (kp) return { matched: true, ...answerKhuPhoInfo(corpus, kp) };
    if (
      has(q, 'khu pho') &&
      has(q, 'bao nhieu', 'gom nhung', 'co nhung', 'danh sach', 'la gi', 'nhung khu nao', 'co may', 'ke ten', 'liet ke', 'ten cac', 'gom may', 'nhung gi')
    )
      return { matched: true, ...answerKhuPhoInfo(corpus, null) };
  }

  // 3g. Giờ giấc mở cửa của quán ăn / cà phê / lưu trú — năng lực mới nhờ
  //     trường openHours. Xét TRƯỚC mục 8 (giờ mở cửa di tích) và mục 9a (danh
  //     mục), vì "quán nào mở 24/24" chứa cả chữ "quán" lẫn chữ "mở cửa".
  {
    const mode = detectOpenMode(q);
    // Câu hỏi về giờ vào di tích thì để mục 8 trả lời theo lệ chung
    const aboutHeritage = has(q, 'di tich', 'chua', 'den', 'dinh', 'mieu', 'tham quan', 'le chua', 'le phat');
    if (mode && !aboutHeritage) {
      const kind = has(q, 'khach san', 'nha nghi', 'luu tru', 'homestay', 'ngu', 'nhan phong')
        ? 'lodging'
        : has(q, 'ca phe', 'cafe', 'tra sua', 'do uong')
          ? 'cafe'
          : 'restaurant';
      return { matched: true, ...answerOpenNow(corpus, mode, kind) };
    }
  }

  // 3h. Gợi ý dịch vụ chất lượng / giá hợp lý — trước "nên đi đâu" vì có chữ "gợi ý".
  //     Đòi hỏi có từ chỉ ĂN UỐNG/LƯU TRÚ để không nuốt "di tích nào nổi tiếng nhất".
  {
    const svc = has(q, 'nha hang', 'quan', 'quan an', 'quan nao', 'khach san', 'dich vu', 'an uong', 'luu tru', 'cho an', 'an ngon', 'mon an', 'do an', 'an gi', 'ca phe', 'cafe', 'tra sua', 'cho nghi', 'nha nghi');
    const priceHint = has(q, 'gia hop ly', 'hop ly', 'gia tot', 'gia re', 'binh dan', 'ngon re', 'ngon bo re', 'tiet kiem', 'gia mem', 're nhat');
    const qualHint = has(q, 'chat luong', 'dich vu tot', 'uy tin', 'ngon nhat', 'tot nhat', 'noi tieng nhat', 'nen chon', 'chon quan nao', 'quan ngon', 'danh gia cao', 'nhieu sao', 'may sao', 'danh gia tot', 'duoc danh gia', 'xep hang', 'dep nhat', 'review tot');
    // `!strongName`: "Chùa quán Ngọc Thanh được xếp hạng gì" chứa chữ "quán"
    // (trong tên di tích) lẫn "xếp hạng" nên từng bị hiểu thành xin gợi ý quán ăn.
    // Gọi đích danh một mục thì luôn ưu tiên tra cứu mục đó.
    if (!strongName && ((priceHint && (svc || has(q, 'an', 'ngon'))) || (qualHint && svc))) {
      const kind = has(q, 'khach san', 'nha nghi', 'luu tru', 'cho nghi', 'homestay')
        ? 'lodging'
        : has(q, 'ca phe', 'cafe', 'tra sua', 'do uong')
          ? 'cafe'
          : 'restaurant';
      return { matched: true, ...answerRecommend(corpus, { mode: priceHint ? 'cheap' : 'quality', kind }) };
    }
  }

  // 4. Nên đi đâu (chung chung, gợi ý theo thời tiết) — lộ trình cụ thể đã xử lý ở 3b
  if (has(q, 'nen di dau', 'di dau', 'choi o dau', 'tham quan o dau', 'goi y', 'nen den dau', 'dau dep', 'co gi choi'))
    return { ...(await answerWhereToGo(corpus)), matched: true };

  // 6. Đường đi
  if (
    has(q, 'di lai', 'duong di', 'di the nao', 'den bang gi', 'bao xa', 'cach ha noi', 'cach bao nhieu km', 'xe khach', 'di bang gi', 'cach den', 'toi day', 'den do', 'phuong tien') ||
    (has(q, 'ha noi', 'ha long', 'hai phong', 'quang ninh') && has(q, 'the nao', 'di', 'sao', 'bao xa', 'bao lau'))
  )
    return { ...answerDirections(corpus, strongName ? top : null), matched: true };

  // 7. Lễ hội
  if (has(q, 'le hoi', 'hoi lang', 'hoi nao')) {
    if (has(q, 'sap dien ra', 'sap toi', 'gan nhat', 'sap co', 'con bao lau', 'khi nao'))
      return { ...answerUpcomingFestivals(corpus), matched: true };
    const month = detectLunarMonth(q);
    if (month) return { ...answerFestivalsInMonth(corpus, month), matched: true };
    // Hỏi đích danh một hội ("hội làng Vân Động là gì") → trả lời riêng hội đó
    if (top?.doc.kind === 'festival' && top.titleCoverage >= 0.4) {
      const aspect = detectFestivalAspect(q);
      if (aspect) return { matched: true, ...answerFestivalAspect(top.doc.raw, aspect, top.doc.url) };
      return { ...describeDoc(top.doc), intent: 'lookup_festival', matched: true };
    }
    if (!strongName) return { ...answerListFestivals(corpus), matched: true };
  }

  // 8. Vé & giờ mở cửa — xét TRƯỚC nhánh liệt kê di tích, nếu không "giờ tham quan
  //    di tích" sẽ bị hiểu thành danh sách di tích. Dữ liệu chưa có giờ/giá cụ thể
  //    nên trả lời trung thực theo lệ chung (di tích Đông Triều hầu hết miễn phí).
  if (has(q, 've vao', 've tham quan', 'phi vao cua', 'phi tham quan', 'mat ve', 'ban ve', 'gia ve vao', 'vao cua co mat', 'co mat phi', 'co ton phi', 'mua ve'))
    return { ...answerTicket(), matched: true };
  if (has(q, 'gio mo cua', 'may gio mo', 'mo cua luc', 'mo cua khi nao', 'gio tham quan', 'gio dong cua', 'dong cua luc', 'mo cua may gio', 'gio mo', 'gio lam viec'))
    return { ...answerHours(), matched: true };

  // 9a. Danh mục rõ ràng (khách sạn/nhà hàng/ẩm thực) — các từ này KHÔNG trùng tên
  //     di tích/lễ hội nên ưu tiên hơn tên riêng khác loại: "khách sạn gần Miếu Hậu"
  //     phải ra danh sách KHÁCH SẠN, không phải hồ sơ Miếu Hậu. Ngoại lệ: nếu tên
  //     riêng mạnh ở top đúng bằng loại đang hỏi ("nhà hàng Xuân Viên có gì") thì
  //     để mục tra cứu riêng cơ sở đó.
  // "chỗ nghỉ" / "nơi nghỉ" phải nằm ở đây: nhánh khu phố phía trên đã coi chúng
  // là từ chỉ lưu trú, riêng chỗ này bỏ quên, nên "chỗ nghỉ gần chùa Mỹ Cụ" rơi
  // xuống nhánh tên riêng và trả về hồ sơ CHÙA thay vì danh sách nhà nghỉ.
  const wantKind = has(q, 'khach san', 'nha nghi', 'luu tru', 'homestay', 'cho nghi', 'noi nghi', 'ngu o dau', 'o dau qua dem', 'dat phong')
    ? 'lodging'
    : // Cà phê / trà sữa tách riêng khỏi nhà hàng — trước đây lẫn vào nhau nên
      // "quán cà phê nào đẹp" ra danh sách nhà hàng.
      has(q, 'ca phe', 'cafe', 'tra sua', 'quan nuoc', 'do uong', 'sinh to', 'coffee')
      ? 'cafe'
      : has(q, 'nha hang', 'quan an', 'quan nao', 'an o dau', 'an trua o dau', 'an toi o dau', 'an sang o dau', 'dia diem an', 'cho an', 'hai san', 'an uong', 'lau', 'nuong', 'buffet', 'an ngon')
        ? 'restaurant'
        : has(q, 'dac san', 'am thuc', 'an gi', 'mon gi', 'mon ngon', 'do an', 'qua gi', 'mua gi ve')
          ? 'cuisine'
          : // "ăn ... ở đâu" (động từ ăn) — chỉ khi KHÔNG phải tên riêng, để "Đền An Biên ở đâu"
            // (token 'an' trong tên) không bị hiểu thành hỏi chỗ ăn
            !strongName && has(q, 'an') && has(q, 'o dau')
            ? 'restaurant'
            : null;
  // Quán cà phê nằm chung bảng Restaurant (type = CAFE), nên khi đối chiếu
  // "khách có đang gọi đích danh một cơ sở cùng loại không" phải quy về đúng
  // loại tài liệu, nếu không "Nhớ Coffee ở đâu" sẽ ra danh sách cà phê.
  const DOC_KIND = { lodging: 'lodging', cafe: 'restaurant', restaurant: 'restaurant', cuisine: 'cuisine' };
  if (wantKind && wantKind !== 'cuisine' && !(strongName && top?.doc.kind === DOC_KIND[wantKind])) {
    // Khách hỏi "gần <di tích>" → nay tính được khoảng cách thật hoặc xếp theo
    // cùng khu phố, thay vì chỉ liệt kê chung như trước.
    const place =
      strongName && ['heritage', 'attraction'].includes(top?.doc.kind) ? top.doc.raw : null;
    if (place && has(q, 'gan', 'canh', 'quanh', 'ke ben', 'sat', 'lan can'))
      return { matched: true, ...answerNear(corpus, place, wantKind) };

    if (wantKind === 'lodging') return { ...answerListLodgings(corpus, place?.name ?? null), matched: true };
    if (wantKind === 'cafe') return { ...answerListCafes(corpus), matched: true };
    return { ...answerListRestaurants(corpus, place?.name ?? null), matched: true };
  }
  // "Thanh Lan Palace có món gì" chứa "món gì" nên rơi vào nhóm đặc sản, nhưng
  // khách đang hỏi thực đơn của MỘT cơ sở cụ thể → để mục tra cứu trả lời.
  if (
    wantKind === 'cuisine' &&
    !(strongName && ['cuisine', 'restaurant', 'lodging'].includes(top?.doc.kind))
  )
    return { ...answerListCuisines(corpus), matched: true };

  // 9b. Nhóm rộng/mơ hồ — chỉ khi câu hỏi KHÔNG nhắc tên riêng cụ thể, vì
  //     "chùa Mỹ Cụ có những gì" phải là tra cứu di tích chứ không phải danh sách.
  if (!strongName) {
    if (has(q, 'diem lan can', 'gan day', 'xung quanh', 'lan can', 'ngoai phuong'))
      return { ...answerListAttractions(corpus), matched: true };
    if (has(q, 'di tich', 'bao nhieu di tich', 'danh sach di tich', 'co nhung gi', 'thang canh', 'danh lam'))
      return { ...answerListHeritages(corpus), matched: true };
  }

  // 9b-bis. Bối cảnh vùng đất — ĐẶT TRƯỚC câu giới thiệu chung ở 9c.
  //
  // Bốn nhánh dưới đây đều cụ thể hơn "giới thiệu về Đông Triều", nên phải được
  // xét trước; để sau thì 9c nuốt hết và mọi câu đều nhận cùng một đoạn giới
  // thiệu chung. Mỗi nhánh tự trả `null` khi chưa có dữ liệu `vungDat`, lúc đó
  // câu hỏi rơi tiếp xuống 9c như cũ.
  // Vài cụm chỉ có một nghĩa duy nhất, xét cả khi câu có nhắc tên riêng.
  //
  // "Đông Triều có ga tàu không" từng ra món **Gà đồi Đông Triều**: bỏ dấu xong
  // thì "ga tau" đụng "ga doi", đủ để đặt cờ `strongName` và nuốt luôn cả nhánh
  // giao thông bên dưới. Ba cụm này thì không món ăn hay di tích nào mang tên.
  if (has(q, 'ga tau', 'duong sat', 'quoc lo')) {
    const a = answerGiaoThong(corpus);
    if (a) return { ...a, matched: true };
  }

  // 9b-ter. “Đông Triều huyện địa chí” 1896 — nguồn Hán Nôm, khoá `diaChi1896`.
  //
  // ĐẶT TRƯỚC 9b-bis: nhánh vị trí ở dưới bắt cụm "ở đâu", mà "núi Quy Sơn ở
  // đâu" thì phải ra ngọn núi chứ không phải toạ độ của cả phường. Ngược lại
  // "lịch sử Đông Triều" vẫn ra dòng thời gian hiện đại ở 9b-bis, vì không từ
  // khoá nào dưới đây chạm tới nó — nguồn 1896 chỉ nhận phần mà không nguồn nào
  // khác trên cổng có: núi sông, cầu chợ, tên làng cũ, khoa bảng, thổ sản.
  //
  // ── BA CỤM TỪNG BỊ ĐỤNG NGHĨA SAU KHI BỎ DẤU ──────────────────────────────
  // Không được dùng làm từ khoá, dù nghe rất hợp:
  //   'dia chi'  ≡ **địa chỉ** → "địa chỉ chùa Mỹ Cụ" hoá ra hỏi sách địa chí
  //   'chua co'  ≡ **chưa có** → "chưa có thông tin" hoá ra hỏi ngôi chùa cổ
  //   'den co'   ≡ **đến có**  → "đi đến có xa không" hoá ra hỏi ngôi đền cổ
  // Cùng một lớp lỗi với "ga tàu" ↔ "gà đồi" ở ngay trên.
  {
    const namXua = has(q, 'xua', 'ngay xua', 'thoi xua', 'truoc kia', 'ngay truoc', '1896', 'thoi phong kien', 'dia chi 1896');

    if (has(q, 'dia chi 1896', 'huyen dia chi', 'sach dia chi', 'ngo sinh', 'sach co', 'han nom', 'thanh thai')) {
      const a = answerDiaChi(corpus);
      if (a) return { ...a, matched: true };
    }
    // Gọi đích danh một ngọn núi trong sách — xét cả khi câu nhắc tên riêng,
    // vì "núi Quy Sơn" không trùng tên bản ghi nào đang có trên cổng.
    if (has(q, 'nui', 'nui non', 'ngon nui', 'son xuyen')) {
      const a = answerNuiXua(corpus, q, { chiKhiGoiTen: strongName });
      if (a) return { ...a, matched: true };
    }
    // "Mỹ Cụ nghĩa là gì" khớp tên **chùa Mỹ Cụ** đủ mạnh để đặt cờ
    // `strongName`, nhưng người hỏi đang hỏi CÁI TÊN, không hỏi ngôi chùa.
    if (has(q, 'ten cu', 'ten xua', 'ten goi cu', 'xua ten gi', 'truoc goi la', 'nghia la gi', 'vi sao co ten', 'goc ten')) {
      const a = answerTenLangXua(corpus, q, { chiKhiGoiTen: !has(q, 'ten cu', 'ten xua', 'doi ten', 'ten goi cu') });
      if (a) return { ...a, matched: true };
    }
    // Khu phố hôm nay ↔ xã cũ trong sách: 8/11 khu mang đúng tên sách đã chép.
    if (has(q, 'khu pho') && namXua) {
      const a = answerKhuPhoXua(corpus, q);
      if (a) return { ...a, matched: true };
    }
    if (has(q, 'tho san', 'san vat')) {
      const a = answerThoSanXua(corpus);
      if (a) return { ...a, matched: true };
    }
    if (has(q, 'danh nhan', 'tien si', 'trang nguyen', 'bang nhan', 'tham hoa', 'khoa bang', 'nguoi tai', 'ai do dat', 'nhan vat')) {
      const a = answerNhanVatXua(corpus);
      if (a) return { ...a, matched: true };
    }
    if (has(q, 'co tich', 'dau tich xua', 'thanh tri', 'ngoi chua co')) {
      const a = answerCoTichXua(corpus, q);
      if (a) return { ...a, matched: true };
    }
    if (has(q, 'phong tuc', 'tap tuc', 'dau vat', 'lang nao noi tieng', 'lang nao hoc gioi', 'lang nao gioi vo')) {
      const a = answerPhongTucXua(corpus);
      if (a) return { ...a, matched: true };
    }
    if (has(q, 'phu dong trieu', 'phu hay huyen', 'dien cach', 'gia long', 'tu duc', 'canh hung', 'la mot dao', 'khi nao thanh huyen')) {
      const a = answerDienCachXua(corpus);
      if (a) return { ...a, matched: true };
    }
    if (!strongName && namXua) {
      if (has(q, 'song nao', 'con song', 'song ngoi', 'may con song', 'cay cau', 'ben do', 'cho nao', 'cho phien')) {
        const a = answerSongChoXua(corpus);
        if (a) return { ...a, matched: true };
      }
      // "Đông Triều xưa thế nào" — câu hỏi mở, đưa về giới thiệu cuốn sách.
      if (has(q, 'dong trieu xua', 'the nao', 'ra sao', 'nhu the nao', 'co gi')) {
        const a = answerDiaChi(corpus);
        if (a) return { ...a, matched: true };
      }
    }
  }

  if (!strongName) {
    // Diện tích / dân số xét ĐẦU TIÊN trong nhóm: đây là chỗ dễ trả lời nhầm
    // nhất, vì số của thành phố cũ và số của phường chênh nhau gần mười lần.
    if (has(q, 'rong bao nhieu', 'dien tich', 'bao nhieu km', 'bao nhieu dan', 'dan so', 'bao nhieu nguoi', 'bao nhieu nhan khau', 'mat do')) {
      const a = answerQuyMo(corpus);
      if (a) return { ...a, matched: true };
    }
    // Cụm "ở đâu" đứng một mình bắt quá rộng: mọi câu "làm <việc gì> ở đâu" chưa
    // có nhánh riêng đều rơi vào đây và được đáp lại bằng bài "Đông Triều ở đâu"
    // — trông như đã trả lời, thật ra lạc đề. Nên "ở đâu" chỉ tính khi câu có
    // nhắc tới chính vùng đất này; các cụm còn lại vốn đã tự nói rõ chủ ngữ.
    const hoiVungDat = has(q, 'dong trieu', 'phuong nay', 'phuong minh', 'noi nay', 'vung nay', 'o day');
    if (
      has(q, 'giap', 'cach ha noi', 'cach ha long', 'bao xa', 'nam o dau', 'vi tri', 'thuoc tinh nao', 'o tinh nao', 'thuoc dau') ||
      (has(q, 'o dau') && hoiVungDat)
    ) {
      const a = answerViTri(corpus);
      if (a) return { ...a, matched: true };
    }
    if (has(q, 'lich su dong trieu', 'lich su vung', 'an sinh', 'doi ten', 'vi sao goi', 'tai sao goi', 'truoc day thuoc', 'thanh lap thi xa', 'len thanh pho', 'giai the', 'sap xep don vi', 'qua cac thoi ky', 'nguon goc ten')) {
      const a = answerLichSuVungDat(corpus);
      if (a) return { ...a, matched: true };
    }
    if (has(q, 'kinh te', 'lam nghe gi', 'nghe chinh', 'mo than', 'khai thac than', 'xi mang', 'nhiet dien', 'cong nghiep', 'thu nhap')) {
      const a = answerKinhTe(corpus);
      if (a) return { ...a, matched: true };
    }
    if (has(q, 'quoc lo', 'ga tau', 'duong sat', 'di tau', 'di tu ha noi', 'den dong trieu the nao', 'toi dong trieu the nao', 'phuong tien', 'xe khach', 'giao thong')) {
      const a = answerGiaoThong(corpus);
      if (a) return { ...a, matched: true };
    }
  }


  // 9c. Giới thiệu địa phương — chỉ khi không nhắc tên riêng cụ thể
  if (
    !strongName &&
    (has(q, 'gioi thieu', 'tong quan', 'noi tieng ve', 'noi tieng gi', 'noi tieng khong', 'thuoc tinh nao', 'o tinh nao', 'thuoc dau', 'nam o dau', 'la vung dat', 'lich su dong trieu', 'gia tri gi') ||
      (has(q, 'dong trieu') && has(q, 'o dau', 'la gi', 'the nao', 'nhu the nao', 'co gi dac biet')))
  )
    return { ...answerAbout(corpus), matched: true };

  // 9. Tra cứu tự do trên toàn bộ dữ liệu.
  //    Đòi hỏi độ phủ đủ cao: câu "thủ đô nước Pháp là gì" tuy khớp chữ "Pháp"
  //    trong hồ sơ Đồn Cao nhưng chỉ phủ 1/4 từ khoá → coi như ngoài phạm vi,
  //    thà nói không biết còn hơn trả lời lạc đề.
  // Điều kiện: hoặc gọi đúng tên, hoặc câu hỏi phủ gần hết tên, hoặc chạm được
  // ÍT NHẤT HAI từ trong tên. Yêu cầu hai từ để loại các va chạm ngẫu nhiên —
  // "tỷ giá đô la hôm nay" từng khớp "Phở Bò Xuân Tỵ" chỉ nhờ đúng một tiếng
  // "tỵ/tỷ" và cho ra một câu trả lời hoàn toàn lạc đề.
  if (
    top &&
    top.score >= 2 &&
    (top.exactName || top.titleCoverage >= 0.75 || (top.titleHits >= 2 && top.titleCoverage >= 0.4))
  ) {
    const answer = describeDoc(top.doc);
    const others = hits.slice(1, 3).map((h) => ({ label: h.doc.title, url: h.doc.url }));
    return {
      ...answer,
      intent: `lookup_${top.doc.kind}`,
      matched: true,
      links: [...answer.links, ...others].slice(0, 4),
    };
  }

  // 10. Không tìm thấy — nói thật, không bịa
  const nearby = hits.slice(0, 3).map((h) => ({ label: h.doc.title, url: h.doc.url }));
  return {
    intent: 'fallback',
    matched: false,
    reply:
      'Xin lỗi, mình chưa có thông tin này trong dữ liệu của phường 😔\n\n' +
      'Mình chỉ trả lời dựa trên hồ sơ di tích, lịch lễ hội, danh sách lưu trú – ẩm thực của Đông Triều và số liệu thời tiết, nên có những câu mình đành chịu.\n\n' +
      (nearby.length ? 'Có thể bạn đang tìm một trong những mục dưới đây?' : 'Bạn thử hỏi theo cách khác xem sao nhé.'),
    links: nearby,
    suggestions: ['Hôm nay nên đi đâu?', 'Thời tiết hôm nay', 'Đặc sản Đông Triều có gì?', 'Lễ hội nào sắp diễn ra?'],
  };
}
