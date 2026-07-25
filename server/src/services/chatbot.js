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
import { buildIndex, search } from './retrieval.js';
import { getWeather } from './weather.js';
import { getTide } from './tide.js';
import { norm, has } from '../lib/vitext.js';
import { solarToLunar, nextLunarOccurrence, lunarMonthLabel, lunarYearName } from '../lib/lunar.js';
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

// ─── Chỉ mục tìm kiếm (dựng lại khi kho tri thức đổi) ──────────────────────

let indexCache = { builtAt: 0, index: null };

async function getSearchIndex() {
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
  const list = corpus.lodgings.slice(0, 6);
  const near = placeHint
    ? `Bạn hỏi các cơ sở gần **${placeHint}**. Dữ liệu chưa có khoảng cách tới từng điểm nên mình liệt kê các cơ sở lưu trú trong phường — phường không rộng nên đều khá thuận tiện.\n\n`
    : '';
  return {
    intent: 'list_lodging',
    reply:
      near +
      `🛏️ Phường có **${corpus.lodgings.length} cơ sở lưu trú** trong danh sách:\n\n` +
      bullets(
        list.map(
          (l) =>
            `**${l.name}** (${LODGING_LABEL[l.type] ?? ''}) — ${l.address}${
              l.phones?.length ? `\n   ☎ ${l.phones.join(' · ')}` : ''
            }`,
        ),
      ) +
      (corpus.lodgings.length > list.length ? `\n\n…và ${corpus.lodgings.length - list.length} cơ sở khác.` : ''),
    links: [{ label: 'Xem tất cả nơi lưu trú', url: '/luu-tru' }],
    suggestions: ['Ăn gì ở Đông Triều?', 'Lịch trình 2 ngày 1 đêm?', 'Hôm nay nên đi đâu?'],
  };
}

function answerListRestaurants(corpus, placeHint = null) {
  const list = corpus.restaurants.slice(0, 6);
  const anyUnverified = list.some((r) => !r.isVerified);
  const near = placeHint
    ? `Bạn hỏi quán gần **${placeHint}**. Dữ liệu chưa có khoảng cách tới từng điểm nên mình liệt kê các nơi ăn uống trong vùng — phường không rộng nên đều khá thuận tiện.\n\n`
    : '';
  return {
    intent: 'list_restaurant',
    reply:
      near +
      `🍜 **Nhà hàng, quán ăn và điểm dừng chân** (${corpus.restaurants.length} mục):\n\n` +
      bullets(
        list.map(
          (r) =>
            `**${r.name}** (${RESTAURANT_LABEL[r.type] ?? ''})${r.area ? ` — ${r.area}` : ''}\n   ${r.address}${
              r.phone ? `\n   ☎ ${r.phone}` : ''
            }`,
        ),
      ) +
      (anyUnverified
        ? '\n\n⚠️ Một số thông tin được tổng hợp từ Internet và **chưa được gọi xác minh**, số điện thoại có thể đã thay đổi.'
        : ''),
    links: [{ label: 'Trang ẩm thực', url: '/am-thuc' }],
    suggestions: ['Đặc sản Đông Triều có gì?', 'Có khách sạn nào không?', 'Hôm nay nên đi đâu?'],
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
    const lines = [`📅 ${r.lunarTimeText}${r.solarEstimate ? ` (${r.solarEstimate})` : ''}`, `📍 ${r.location}`];
    const next = r.lunarMonth && r.lunarDay ? nextLunarOccurrence(r.lunarDay, r.lunarMonth) : null;
    if (next) {
      const d = next.date;
      lines.push(
        `⏳ Lần tới: ${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}${
          next.daysAway === 0 ? ' — **hôm nay**' : ` — còn ${next.daysAway} ngày`
        }`,
      );
    }
    const rituals = r.rituals?.length ? `\n\n**Nghi lễ chính:**\n${bullets(r.rituals.slice(0, 4).map((x) => short(x, 120)))}` : '';
    return {
      reply: `🎏 **${r.name}**\n\n${short(r.intro, 300)}\n\n${bullets(lines)}${rituals}`,
      links: [{ label: `Chi tiết ${r.name}`, url: doc.url }, { label: 'Lịch lễ hội', url: '/le-hoi' }],
      suggestions: ['Lễ hội nào sắp diễn ra?', 'Hôm nay nên đi đâu?', 'Ăn gì ở Đông Triều?'],
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
    const lines = [`📍 ${r.address}`];
    if (r.phones?.length) lines.push(`☎ ${r.phones.join(' · ')}`);
    if (r.owner) lines.push(`👤 Chủ cơ sở: ${r.owner}`);
    if (r.priceRange) lines.push(`💰 ${r.priceRange}`);
    return {
      reply: `🛏️ **${r.name}** (${LODGING_LABEL[r.type] ?? ''})\n\n${bullets(lines)}`,
      links: [{ label: 'Tất cả nơi lưu trú', url: '/luu-tru' }],
      suggestions: ['Còn khách sạn nào khác?', 'Ăn gì ở Đông Triều?', 'Lịch trình 2 ngày 1 đêm?'],
    };
  }

  if (doc.kind === 'restaurant') {
    const lines = [`📍 ${r.address}${r.area ? ` (${r.area})` : ''}`];
    if (r.phone) lines.push(`☎ ${r.phone}`);
    if (r.openHours) lines.push(`🕐 ${r.openHours}`);
    if (r.priceRange) lines.push(`💰 ${r.priceRange}`);
    if (r.specialties?.length) lines.push(`⭐ Món nổi bật: ${r.specialties.join(', ')}`);
    return {
      reply:
        `🍜 **${r.name}** (${RESTAURANT_LABEL[r.type] ?? ''})\n\n` +
        (r.description ? `${short(r.description, 220)}\n\n` : '') +
        bullets(lines) +
        (r.isVerified ? '' : '\n\n⚠️ Thông tin tổng hợp từ Internet, **chưa gọi xác minh** — bạn nên gọi trước khi tới.'),
      links: [{ label: 'Trang ẩm thực', url: '/am-thuc' }],
      suggestions: ['Quán nào nữa?', 'Đặc sản Đông Triều có gì?', 'Có khách sạn nào không?'],
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

function answerItinerary(corpus) {
  const guide = corpus.articles.find((a) => norm(a.title).includes('lich trinh'));
  const h = corpus.heritages.slice(0, 3).map((x) => x.name).join(', ');
  return {
    intent: 'itinerary',
    reply:
      `🗺️ **Gợi ý lịch trình**\n\n` +
      bullets([
        `**Nửa ngày:** ${h}`,
        `**Một ngày:** thêm Đồn Cao ngắm toàn cảnh vào chiều muộn, ăn tối tại khu trung tâm`,
        `**Hai ngày một đêm:** ngày 1 đi di tích trong phường, nghỉ đêm tại phường; ngày 2 kết hợp các điểm lân cận như Ngoạ Vân, Quỳnh Lâm, đền An Sinh`,
      ]) +
      (guide ? `\n\nMình có bài cẩm nang chi tiết hơn: **${guide.title}**.` : ''),
    links: [
      ...(guide ? [{ label: guide.title, url: `/tin-tuc/${guide.slug}` }] : []),
      { label: 'Nơi lưu trú', url: '/luu-tru' },
      { label: 'Bản đồ', url: '/ban-do' },
    ],
    suggestions: ['Có khách sạn nào không?', 'Ăn gì ở Đông Triều?', 'Hôm nay nên đi đâu?'],
  };
}

/**
 * Trả lời câu hỏi ngân sách ("tôi có 2 triệu thì nên đi đâu").
 *
 * Hồ sơ gốc gần như không có bảng giá, nên tuyệt đối không bịa con số. Ta nói thật:
 * vào cửa di tích hầu hết miễn phí, liệt kê những mục CÓ ghi giá (nếu có), và gợi ý
 * lịch trình theo mức chi tiêu chung.
 */
function answerBudget(corpus) {
  const guide = corpus.articles.find((a) => norm(a.title).includes('lich trinh'));
  // Chỉ nêu giá với các mục thực sự có trường priceRange trong dữ liệu
  const pricedFood = corpus.cuisines.filter((c) => c.priceRange).slice(0, 3);
  const pricedStay = corpus.lodgings.filter((l) => l.priceRange).slice(0, 3);

  const parts = [
    '💰 **Đi Đông Triều tốn bao nhiêu?**',
    '',
    'Mình chưa có bảng giá chi tiết trong dữ liệu của phường nên không nêu con số chính xác được, nhưng vài điều chắc chắn:',
    bullets([
      'Vào cửa các **di tích, đền, chùa** ở Đông Triều **hầu hết miễn phí** — phần lớn ngân sách là đi lại, ăn ở.',
      'Các di tích nằm gần nhau nên đi xe máy/ô tô cá nhân rất tiết kiệm, ghép được 3–4 điểm trong ngày.',
      'Với ngân sách vừa phải, một chuyến **1–2 ngày** (ngủ 1 đêm, ăn đặc sản địa phương) là hợp lý.',
    ]),
  ];

  if (pricedStay.length)
    parts.push('', '**Lưu trú có ghi giá:**', bullets(pricedStay.map((l) => `${l.name} — ${l.priceRange}`)));
  if (pricedFood.length)
    parts.push('', '**Đặc sản có ghi giá:**', bullets(pricedFood.map((c) => `${c.name} — ${c.priceRange}`)));

  parts.push(
    '',
    'Bạn xem trang **Lưu trú** (có số điện thoại để hỏi giá trực tiếp) và **Ẩm thực** để ước lượng, hoặc mở bài cẩm nang lịch trình để lên kế hoạch cụ thể.',
  );

  return {
    intent: 'budget',
    reply: parts.join('\n'),
    links: [
      { label: 'Nơi lưu trú (kèm SĐT)', url: '/luu-tru' },
      { label: 'Đặc sản Đông Triều', url: '/am-thuc' },
      ...(guide ? [{ label: guide.title, url: `/tin-tuc/${guide.slug}` }] : []),
    ],
    suggestions: ['Lịch trình 2 ngày 1 đêm?', 'Có khách sạn nào không?', 'Ăn gì ở Đông Triều?'],
  };
}

// ─── Câu xã giao ───────────────────────────────────────────────────────────

const GREETING = {
  intent: 'greeting',
  reply:
    'Xin chào 👋 Mình là trợ lý du lịch phường Đông Triều.\n\nMình trả lời dựa trên **dữ liệu chính thức của phường** — hồ sơ di tích, lịch lễ hội, danh sách lưu trú, ẩm thực — cộng với **số liệu thời tiết và triều cường cập nhật theo giờ**.\n\nBạn muốn hỏi gì nào?',
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
      '**Lễ hội** — quy đổi âm lịch sang dương lịch để biết còn bao nhiêu ngày',
      '**Ẩm thực & nhà hàng** — đặc sản, mùa nào có, mua ở đâu',
      '**Lưu trú** — khách sạn, nhà nghỉ kèm số điện thoại',
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
  if (/^(xin\s+)?(chao|hello|hi|hey|alo)\b/.test(q) || has(q, 'chao ban', 'chao bot'))
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

  // 3. Thời tiết — hoặc hỏi thẳng, hoặc hỏi kiểu "thứ bảy trời thế nào"
  if (
    has(q, 'thoi tiet', 'du bao', 'nhiet do', 'bao nhieu do', 'chi so uv', 'do am') ||
    (has(q, ...DAY_WORDS) && has(q, ...WEATHER_WORDS))
  )
    return { ...(await answerWeather(q, corpus)), matched: true };

  // 3b. Ngân sách — xét trước "nên đi đâu" vì câu hỏi tiền thường kèm cụm đó
  //     ("tôi có 2 triệu thì nên đi đâu") và không nên trả về thời tiết.
  if (detectBudget(q)) return { ...answerBudget(corpus), matched: true };

  // 4. Nên đi đâu
  if (has(q, 'nen di dau', 'di dau', 'choi o dau', 'tham quan o dau', 'goi y', 'nen den dau', 'dau dep', 'co gi choi'))
    return { ...(await answerWhereToGo(corpus)), matched: true };

  // 5. Lịch trình
  if (has(q, 'lich trinh', 'di may ngay', 'mot ngay', '2 ngay', 'hai ngay', 'ke hoach di'))
    return { ...answerItinerary(corpus), matched: true };

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
    if (top?.doc.kind === 'festival' && top.titleCoverage >= 0.4)
      return { ...describeDoc(top.doc), intent: 'lookup_festival', matched: true };
    if (!strongName) return { ...answerListFestivals(corpus), matched: true };
  }

  // 8a. Danh mục rõ ràng (khách sạn/nhà hàng/ẩm thực) — các từ này KHÔNG trùng tên
  //     di tích/lễ hội nên ưu tiên hơn tên riêng khác loại: "khách sạn gần Miếu Hậu"
  //     phải ra danh sách KHÁCH SẠN, không phải hồ sơ Miếu Hậu. Ngoại lệ: nếu tên
  //     riêng mạnh ở top đúng bằng loại đang hỏi ("nhà hàng Xuân Viên có gì") thì
  //     để mục 9 tra cứu riêng cơ sở đó.
  const wantKind = has(q, 'khach san', 'nha nghi', 'luu tru', 'homestay', 'ngu o dau', 'o dau qua dem', 'dat phong')
    ? 'lodging'
    : has(q, 'nha hang', 'quan an', 'quan nao', 'an o dau', 'dia diem an', 'cho an')
      ? 'restaurant'
      : has(q, 'dac san', 'am thuc', 'an gi', 'mon gi', 'mon ngon', 'do an', 'qua gi', 'mua gi ve')
        ? 'cuisine'
        : null;
  if (wantKind && !(strongName && top?.doc.kind === wantKind)) {
    // Khách hỏi "gần <di tích>" → truyền tên di tích để ghi chú trung thực
    const placeHint = strongName && top?.doc.kind === 'heritage' ? top.doc.raw.name : null;
    if (wantKind === 'lodging') return { ...answerListLodgings(corpus, placeHint), matched: true };
    if (wantKind === 'restaurant') return { ...answerListRestaurants(corpus, placeHint), matched: true };
    return { ...answerListCuisines(corpus), matched: true };
  }

  // 8b. Nhóm rộng/mơ hồ — chỉ khi câu hỏi KHÔNG nhắc tên riêng cụ thể, vì
  //     "chùa Mỹ Cụ có những gì" phải là tra cứu di tích chứ không phải danh sách.
  if (!strongName) {
    if (has(q, 'diem lan can', 'gan day', 'xung quanh', 'lan can', 'ngoai phuong'))
      return { ...answerListAttractions(corpus), matched: true };
    if (has(q, 'di tich', 'bao nhieu di tich', 'danh sach di tich', 'co nhung gi', 'thang canh', 'danh lam'))
      return { ...answerListHeritages(corpus), matched: true };
  }

  // 9. Tra cứu tự do trên toàn bộ dữ liệu.
  //    Đòi hỏi độ phủ đủ cao: câu "thủ đô nước Pháp là gì" tuy khớp chữ "Pháp"
  //    trong hồ sơ Đồn Cao nhưng chỉ phủ 1/4 từ khoá → coi như ngoài phạm vi,
  //    thà nói không biết còn hơn trả lời lạc đề.
  if (top && top.score >= 2 && (top.exactName || top.titleCoverage >= 0.4)) {
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
