#!/usr/bin/env node
/**
 * Trích xuất dữ liệu từ các file .docx trong thư mục "Ly lich di tich phuong Dong Trieu"
 * thành JSON có cấu trúc để seed vào database.
 *
 * Nguồn chính: "Dữ liệu chatbot du lịch Đông Triều.docx" — tài liệu đã được biên soạn
 * sạch với 5 phần (di tích / lễ hội / lưu trú / ẩm thực / câu hỏi mẫu).
 *
 * Chạy:  npm run extract
 * Kết quả: server/prisma/seed-data/*.json  +  server/data/knowledge_base.md
 */
import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DOCX_DIR = path.join(ROOT, 'Ly lich di tich phuong Dong Trieu');
const OUT_DIR = path.join(ROOT, 'server/prisma/seed-data');
const KB_DIR = path.join(ROOT, 'server/data');

const MAIN_DOC = 'Dữ liệu chatbot du lịch Đông Triều.docx';
const FESTIVAL_DOC = 'Lich_Le_Hoi_Dong_Trieu.docx';

// ── Tiện ích ────────────────────────────────────────────────────────────────

/** Đọc .docx → mảng dòng văn bản (mỗi <w:p> và mỗi ô bảng là một dòng). */
function docxToLines(filePath) {
  const zip = new AdmZip(filePath);
  const xml = zip.readAsText('word/document.xml');
  const withBreaks = xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br\s*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n');
  const text = decodeEntities(withBreaks.replace(/<[^>]+>/g, ''));
  return text
    .split('\n')
    .map((l) => l.replace(/ /g, ' ').trim())
    .filter((l) => l.length > 0);
}

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&');
}

/** Chuyển tiếng Việt có dấu → slug ASCII. */
function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Cắt danh sách theo dấu phân cách, bỏ phần tử rỗng. */
function splitList(value, separators = /[;·]/) {
  if (!value) return [];
  return value
    .split(separators)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Trả về chỉ số dòng đầu tiên khớp predicate, bắt đầu từ `from`. */
function indexOfLine(lines, predicate, from = 0) {
  for (let i = from; i < lines.length; i++) if (predicate(lines[i], i)) return i;
  return -1;
}

// ── Bảng ánh xạ sang enum của Prisma ────────────────────────────────────────

const HERITAGE_TYPE = {
  Chùa: 'CHUA',
  Đền: 'DEN',
  Đình: 'DINH',
  Miếu: 'MIEU',
};

function mapHeritageType(raw) {
  if (!raw) return 'CUM_DI_TICH';
  const t = raw.trim();
  if (HERITAGE_TYPE[t]) return HERITAGE_TYPE[t];
  if (/cách mạng|lịch sử/i.test(t)) return 'LICH_SU_CACH_MANG';
  if (/cụm di tích/i.test(t)) return 'CUM_DI_TICH';
  return 'CUM_DI_TICH';
}

function mapRankLevel(raw) {
  if (/đặc biệt/i.test(raw)) return 'QUOC_GIA_DAC_BIET';
  if (/quốc gia/i.test(raw)) return 'QUOC_GIA';
  return 'CAP_TINH';
}

function mapScale(raw) {
  if (/lớn/i.test(raw)) return 'LON';
  if (/vừa/i.test(raw)) return 'VUA';
  return 'HOI_LANG';
}

const LUNAR_MONTHS = { giêng: 1, chạp: 12, một: 11, 'mười một': 11 };

/**
 * Rút tháng/ngày âm lịch bắt đầu từ chuỗi mô tả thời gian.
 * "Mùng 10 – 12 tháng Giêng âm lịch" → { month: 1, day: 10 }
 */
function parseLunarStart(text) {
  if (!text) return { month: null, day: null };
  // Chỉ xét phần trước dấu ";" hoặc "(" — phần sau thường là kỳ lễ phụ.
  const head = text.split(/[;(]/)[0];
  const m = head.match(
    /(?:mùng\s*)?(\d{1,2})\s*(?:[–\-—]\s*(?:mùng\s*)?\d{1,2}\s*)?tháng\s+(giêng|chạp|\d{1,2})/i,
  );
  if (!m) return { month: null, day: null };
  const day = Number(m[1]);
  const monthRaw = m[2].toLowerCase();
  const month = LUNAR_MONTHS[monthRaw] ?? Number(monthRaw);
  return {
    month: Number.isFinite(month) ? month : null,
    day: Number.isFinite(day) ? day : null,
  };
}

/** "phường Đông Triều (xã Thủy An cũ)" → "Thủy An" */
function parseWardOld(address) {
  const m = address?.match(/\((?:xã|phường|thị trấn)\s+(.+?)\s+cũ\)/i);
  return m ? m[1].trim() : null;
}

/**
 * "Di tích quốc gia ĐẶC BIỆT — QĐ số 2383/QĐ-TTg ngày 09/12/2013 — Thủ tướng Chính phủ (ghi chú)"
 * → { rankLevel, rankDecision, rankAuthority, rankNote }
 */
function parseRank(raw) {
  // Tách phần ghi chú trong ngoặc ở cuối TRƯỚC khi cắt theo dấu "—", vì ghi chú
  // có thể chứa cả dấu "—" lẫn ngoặc lồng nhau:
  //   "... — Thủ tướng Chính phủ (Điểm di tích thuộc ... — ... (đợt 4))"
  const noteMatch = raw.match(/^(.*?)\s*\((.*)\)\s*$/s);
  const head = (noteMatch ? noteMatch[1] : raw).trim();
  const rankNote = noteMatch ? noteMatch[2].trim() : null;

  const [levelText = head, decision = '', authority = ''] = head
    .split(/\s+—\s+/)
    .map((s) => s.trim());

  return {
    rankLevel: mapRankLevel(levelText),
    rankLevelText: levelText,
    rankDecision: decision || null,
    rankAuthority: authority || null,
    rankNote,
  };
}

/**
 * Chuỗi tìm kiếm cho Google Maps. Bỏ phần "(xã ... cũ)" vì tên đơn vị hành chính
 * cũ làm Google tra sai vị trí sau khi sáp nhập.
 */
function buildMapQuery(name, address) {
  const clean = address
    .replace(/\((?:xã|phường|thị trấn)\s+.+?\s+cũ\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
  return `${name}, ${clean}`;
}

// ── PHẦN I — 13 cụm di tích ─────────────────────────────────────────────────

const HERITAGE_LABELS = new Set([
  'Tên gọi khác',
  'Loại hình',
  'Xếp hạng',
  'Địa chỉ',
  'Thờ phụng',
  'Lễ hội',
  'Từ khóa',
]);
const PROSE_PREFIXES = ['Tóm tắt:', 'Lịch sử:', 'Kiến trúc và hiện vật:'];

function parseHeritages(lines) {
  const start = indexOfLine(lines, (l) => /^PHẦN I\./.test(l));
  const end = indexOfLine(lines, (l) => /^PHẦN II\./.test(l), start + 1);
  const section = lines.slice(start + 1, end);

  // Ranh giới mỗi di tích: dòng dạng "1. Chùa quán Ngọc Thanh"
  const starts = [];
  section.forEach((l, i) => {
    if (/^\d{1,2}\.\s+\S/.test(l)) starts.push(i);
  });

  return starts.map((s, idx) => {
    const block = section.slice(s, starts[idx + 1] ?? section.length);
    const name = block[0].replace(/^\d{1,2}\.\s+/, '').trim();

    // Cặp nhãn/giá trị
    const fields = {};
    for (let i = 1; i < block.length; i++) {
      if (HERITAGE_LABELS.has(block[i]) && block[i + 1] !== undefined) {
        fields[block[i]] = block[i + 1];
        i++;
      }
    }

    // Các đoạn văn xuôi
    const prose = { 'Tóm tắt:': [], 'Lịch sử:': [], 'Kiến trúc và hiện vật:': [] };
    let current = null;
    const highlights = [];
    let inHighlights = false;
    for (const line of block) {
      if (line === 'Điểm nhấn:') {
        inHighlights = true;
        current = null;
        continue;
      }
      if (inHighlights) {
        highlights.push(line);
        continue;
      }
      const hit = PROSE_PREFIXES.find((p) => line.startsWith(p));
      if (hit) {
        current = hit;
        prose[hit].push(line.slice(hit.length).trim());
      } else if (current) {
        prose[current].push(line);
      }
    }

    const address = fields['Địa chỉ'] ?? '';
    const rank = parseRank(fields['Xếp hạng'] ?? '');

    return {
      order: idx + 1,
      slug: slugify(name),
      name,
      altNames: splitList(fields['Tên gọi khác']),
      type: mapHeritageType(fields['Loại hình']),
      typeText: fields['Loại hình'] ?? null,
      ...rank,
      address,
      wardOld: parseWardOld(address),
      mapQuery: buildMapQuery(name, address),
      // Toạ độ được bổ sung thủ công bên dưới; còn lại admin nhập dần.
      lat: null,
      lng: null,
      worship: splitList(fields['Thờ phụng']),
      festivalNote: fields['Lễ hội'] ?? null,
      keywords: splitList(fields['Từ khóa'], /,/),
      summary: prose['Tóm tắt:'].join('\n\n'),
      history: prose['Lịch sử:'].join('\n\n'),
      architecture: prose['Kiến trúc và hiện vật:'].join('\n\n'),
      highlights,
      featured: idx < 6,
      published: true,
    };
  });
}

/**
 * Toạ độ GPS. Chỉ hồ sơ "Đền, chùa Kênh Giang" ghi toạ độ chính xác
 * (21°04'08.3"N 106°27'22.3"E). Các điểm còn lại để admin ghim dần —
 * bản đồ tạm dùng địa chỉ chữ để Google tự tra.
 */
const KNOWN_COORDS = {
  'den-chua-kenh-giang-den-yet-kieu': { lat: 21.06897, lng: 106.45619 },
};

// ── PHẦN II — 17 lễ hội ─────────────────────────────────────────────────────

function parseFestivals(lines) {
  const start = indexOfLine(lines, (l) => /^PHẦN II\./.test(l));
  const end = indexOfLine(lines, (l) => /^PHẦN III\./.test(l), start + 1);
  const section = lines.slice(start + 1, end);

  const detailAt = indexOfLine(section, (l) => l === 'Chi tiết từng lễ hội');
  const tablePart = section.slice(0, detailAt);
  const detailPart = section.slice(detailAt + 1);

  // Bảng tổng hợp: 5 cột lặp lại sau dòng tiêu đề "Quy mô"
  const headerEnd = indexOfLine(tablePart, (l) => l === 'Quy mô');
  const rows = tablePart.slice(headerEnd + 1);
  const summaries = [];
  for (let i = 0; i + 4 < rows.length + 1; i += 5) {
    const [name, lunar, solar, location, scale] = rows.slice(i, i + 5);
    if (!name || !lunar) break;
    summaries.push({ name, lunar, solar, location, scale });
  }

  // Phần chi tiết: cắt theo tên lễ hội đã biết từ bảng
  const nameSet = new Map(summaries.map((s, i) => [s.name, i]));
  const cuts = [];
  detailPart.forEach((l, i) => {
    if (nameSet.has(l)) cuts.push({ index: i, name: l });
  });

  const details = new Map();
  cuts.forEach((cut, i) => {
    const block = detailPart.slice(cut.index + 1, cuts[i + 1]?.index ?? detailPart.length);
    const intro = block.find((l) => l.startsWith('Giới thiệu:'))?.slice('Giới thiệu:'.length).trim() ?? '';
    const ritualAt = block.indexOf('Nghi lễ và hoạt động:');
    const rituals = ritualAt >= 0 ? block.slice(ritualAt + 1) : [];
    details.set(cut.name, { intro, rituals });
  });

  return summaries.map((s, idx) => {
    const { month, day } = parseLunarStart(s.lunar);
    const detail = details.get(s.name) ?? { intro: '', rituals: [] };
    return {
      order: idx + 1,
      slug: slugify(s.name),
      name: s.name,
      lunarMonth: month,
      lunarDay: day,
      lunarTimeText: s.lunar,
      solarEstimate: s.solar,
      location: s.location,
      scale: mapScale(s.scale),
      intro: detail.intro,
      rituals: detail.rituals,
      published: true,
    };
  });
}

// ── PHẦN III — 15 cơ sở lưu trú ─────────────────────────────────────────────

function parseLodgings(lines) {
  const start = indexOfLine(lines, (l) => /^PHẦN III\./.test(l));
  const end = indexOfLine(lines, (l) => /^PHẦN IV\./.test(l), start + 1);
  const section = lines.slice(start + 1, end);

  const headerEnd = indexOfLine(section, (l) => l === 'Điện thoại');
  const rows = section.slice(headerEnd + 1);

  const out = [];
  let i = 0;
  while (i < rows.length) {
    if (!/^\d{1,3}$/.test(rows[i])) break;
    const [, name, address, owner, phone] = rows.slice(i, i + 5);
    if (!name) break;
    out.push({
      order: out.length + 1,
      name: name.trim(),
      type: /khách sạn/i.test(name) ? 'KHACH_SAN' : /homestay/i.test(name) ? 'HOMESTAY' : 'NHA_NGHI',
      address: address?.trim() ?? '',
      owner: owner?.trim() ?? null,
      phones: splitList(phone, /[–\-—]/).map((p) => p.trim()),
      lat: null,
      lng: null,
      published: true,
    });
    i += 5;
  }
  return out;
}

// ── PHẦN IV — 8 đặc sản ─────────────────────────────────────────────────────

function parseCuisines(lines) {
  const start = indexOfLine(lines, (l) => /^PHẦN IV\./.test(l));
  const end = indexOfLine(lines, (l) => /^PHẦN V\./.test(l), start + 1);
  const section = lines.slice(start + 1, end);

  // Mỗi món bắt đầu bằng dòng tên, theo sau là "Tóm tắt: ..."
  const starts = [];
  section.forEach((l, i) => {
    if (section[i + 1]?.startsWith('Tóm tắt:')) starts.push(i);
  });

  return starts.map((s, idx) => {
    const block = section.slice(s, starts[idx + 1] ?? section.length);
    const name = block[0];
    const get = (prefix) =>
      block.find((l) => l.startsWith(prefix))?.slice(prefix.length).trim() ?? '';
    const labelValue = (label) => {
      const i = block.indexOf(label);
      return i >= 0 ? block[i + 1] : '';
    };
    return {
      order: idx + 1,
      slug: slugify(name),
      name,
      summary: get('Tóm tắt:'),
      description: get('Giới thiệu:'),
      priceRange: labelValue('Giá tham khảo') || null,
      whereToBuy: splitList(labelValue('Mua/thưởng thức tại')),
      published: true,
    };
  });
}

// ── Giới thiệu chung (từ file lịch lễ hội) ──────────────────────────────────

function parseAbout(lines) {
  const start = indexOfLine(lines, (l) => /^Tổng quan về Đông Triều$/.test(l));
  const end = indexOfLine(lines, (l) => /^Phần 2\./.test(l), start + 1);
  if (start < 0) return { sections: [] };

  const block = lines.slice(start, end < 0 ? lines.length : end);
  const headings = ['Tổng quan về Đông Triều', 'Vai trò của Đông Triều trong lịch sử nhà Trần', 'Giá trị văn hóa, tâm linh và du lịch'];
  const sections = [];
  let current = null;
  for (const line of block) {
    if (headings.includes(line)) {
      current = { title: line, body: [] };
      sections.push(current);
    } else if (current) {
      current.body.push(line);
    }
  }
  return {
    sections: sections.map((s) => ({
      title: s.title,
      // Các gạch đầu dòng bị dính liền trong file gốc — tách lại cho dễ đọc
      body: s.body.join('\n\n').replace(/\s*-\s+(?=[A-ZĐÀ-Ỹ])/g, '\n\n- ').trim(),
    })),
  };
}

// ── Nhà hàng / quán ăn mẫu ──────────────────────────────────────────────────
// Dữ liệu gốc KHÔNG có danh sách nhà hàng. Các mục dưới đây suy ra từ trường
// "Mua/thưởng thức tại" của 8 đặc sản, đánh dấu isPlaceholder=true để quản trị
// viên thay bằng cơ sở thật qua trang admin.

function buildPlaceholderRestaurants(cuisines) {
  const byName = (n) => cuisines.find((c) => c.name.includes(n));
  const specialtiesOf = (...names) => names.map((n) => byName(n)?.name).filter(Boolean);

  return [
    {
      order: 1,
      name: 'Nhà hàng trung tâm phường Đông Triều',
      type: 'NHA_HANG',
      address: 'Khu trung tâm phường Đông Triều, tỉnh Quảng Ninh',
      openHours: '09:00 – 22:00',
      priceRange: '150.000 – 400.000đ/người',
      specialties: specialtiesOf('Gà đồi', 'Ngán', 'Rươi'),
      description:
        'Cụm nhà hàng khu trung tâm phường phục vụ gà đồi Đông Triều, hải sản tươi đưa từ Quảng Yên – Hạ Long và các món rươi theo mùa.',
      isPlaceholder: true,
      published: true,
    },
    {
      order: 2,
      name: 'Quán ăn dọc Quốc lộ 18',
      type: 'QUAN_AN',
      address: 'Dọc Quốc lộ 18, đoạn qua phường Đông Triều, tỉnh Quảng Ninh',
      openHours: '06:00 – 21:00',
      priceRange: '50.000 – 200.000đ/người',
      specialties: specialtiesOf('Gà đồi', 'Ngán'),
      description:
        'Chuỗi quán ăn bình dân ven Quốc lộ 18 — điểm dừng chân quen thuộc của khách đi tuyến Hà Nội – Hạ Long.',
      isPlaceholder: true,
      published: true,
    },
    {
      order: 3,
      name: 'Chợ trung tâm Đông Triều',
      type: 'DIEM_DUNG_CHAN',
      address: 'Chợ trung tâm phường Đông Triều, tỉnh Quảng Ninh',
      openHours: '05:00 – 18:00',
      priceRange: 'Theo mặt hàng',
      specialties: specialtiesOf('Na dai', 'Nếp cái hoa vàng', 'Khoai lang', 'Bưởi'),
      description:
        'Nơi mua đặc sản mang về: na dai, nếp cái hoa vàng, khoai lang làng Trạo, bưởi Đông Triều theo mùa.',
      isPlaceholder: true,
      published: true,
    },
    {
      order: 4,
      name: 'Làng nghề gốm sứ Đông Triều',
      type: 'DIEM_DUNG_CHAN',
      address: 'Các cơ sở gốm sứ dọc Quốc lộ 18, phường Đông Triều, tỉnh Quảng Ninh',
      openHours: '08:00 – 17:30',
      priceRange: '30.000đ – vài triệu đồng',
      specialties: specialtiesOf('Gốm sứ'),
      description:
        'Xem nghệ nhân chuốt gốm, tự tay thử làm sản phẩm và chọn mua quà lưu niệm men lam, men rạn.',
      isPlaceholder: true,
      published: true,
    },
    {
      order: 5,
      name: 'Nhà vườn sinh thái na – bưởi Đông Triều',
      type: 'DIEM_DUNG_CHAN',
      address: 'Vùng đồi bán sơn địa phường Đông Triều, tỉnh Quảng Ninh',
      openHours: 'Theo mùa vụ (tháng 7 – 12)',
      priceRange: '25.000 – 70.000đ',
      specialties: specialtiesOf('Na dai', 'Bưởi'),
      description:
        'Trải nghiệm hái na (tháng 7–9) và hái bưởi (tháng 8–12) tại vườn, phù hợp gia đình có trẻ nhỏ.',
      isPlaceholder: true,
      published: true,
    },
  ];
}

// ── Bài viết mẫu ────────────────────────────────────────────────────────────

function buildSeedArticles(heritages, festivals) {
  const byslug = (s) => heritages.find((h) => h.slug === s);
  const donCao = heritages.find((h) => h.type === 'LICH_SU_CACH_MANG');
  const ngocThanh = heritages.find((h) => h.rankLevel === 'QUOC_GIA_DAC_BIET');
  const springFestivals = festivals.filter((f) => f.lunarMonth === 1);

  return [
    {
      slug: 'cam-nang-du-lich-dong-trieu-mot-ngay',
      title: 'Cẩm nang: Một ngày khám phá di tích phường Đông Triều',
      category: 'CAM_NANG',
      excerpt:
        'Gợi ý lịch trình một ngày trọn vẹn qua các di tích tiêu biểu của phường Đông Triều — từ chùa quán Ngọc Thanh, đền An Biên đến Đồn Cao.',
      contentHtml: `
<p><strong>Phường Đông Triều</strong> hiện có <strong>13 cụm di tích đã được xếp hạng</strong>, trong đó có 1 điểm thuộc Di tích quốc gia đặc biệt, 3 di tích cấp quốc gia và 9 di tích cấp tỉnh. Với quãng đường di chuyển ngắn, du khách hoàn toàn có thể khám phá những điểm tiêu biểu nhất trong một ngày.</p>
<h2>Buổi sáng — Cụm di tích Đạm Thủy</h2>
<p>Khởi hành sớm tới <strong>${ngocThanh?.name ?? 'chùa quán Ngọc Thanh'}</strong> — điểm di tích hiếm có vừa là chùa Phật giáo vừa là đạo quán Đạo giáo, thuộc Khu di tích lịch sử nhà Trần tại Đông Triều. Ngay gần đó là <strong>Miếu Hậu (Từ Vũ miếu)</strong> với tấm bia – phù điêu liền tượng bằng đá xanh thế kỷ XVII thuộc loại cực hiếm ở Việt Nam.</p>
<h2>Giữa trưa — Đền An Biên và làng Vẻn</h2>
<p>Di chuyển tới <strong>Đền An Biên</strong> thờ nữ tướng Lê Chân ngay trên quê gốc của bà, rồi lên núi Vàn viếng <strong>chùa An Biên (Báo Ân tự)</strong> — tương truyền do Đệ Tam Tổ Trúc Lâm, Thiền sư Huyền Quang khởi dựng. Dùng bữa trưa với gà đồi Đông Triều tại các quán ven Quốc lộ 18.</p>
<h2>Buổi chiều — Về trung tâm phường</h2>
<p>Ghé <strong>${donCao?.name ?? 'Đồn Cao Đông Triều'}</strong> — "địa chỉ đỏ" gắn với Đệ tứ Chiến khu, nơi rạng sáng 8/6/1945 nghĩa quân đánh chiếm đồn Pháp, giải phóng huyện lỵ Đông Triều. Kết thúc hành trình tại <strong>đình Trạo Hà – đền Di Ái</strong> ngay sát Quốc lộ 18, nơi còn nguyên vẹn 3 sắc phong của 3 vua Tây Sơn khắc trên thành mộ.</p>
<h2>Trước khi về</h2>
<p>Đừng quên mua đặc sản: na dai (tháng 7–9), nếp cái hoa vàng, khoai lang làng Trạo và gốm sứ Đông Triều làm quà.</p>`.trim(),
      author: 'Ban Biên tập',
      tags: ['cẩm nang', 'lịch trình', 'di tích'],
      published: true,
      publishedAt: new Date().toISOString(),
    },
    {
      slug: 'mua-le-hoi-xuan-dong-trieu',
      title: `Mùa lễ hội xuân Đông Triều: ${springFestivals.length} lễ hội trong tháng Giêng`,
      category: 'TIN_TUC',
      excerpt:
        'Từ mùng 9 tháng Giêng, hàng loạt lễ hội truyền thống nối nhau diễn ra trên địa bàn phường Đông Triều và vùng phụ cận.',
      contentHtml: `
<p>Tháng Giêng âm lịch là cao điểm mùa lễ hội của Đông Triều với <strong>${springFestivals.length} lễ hội</strong> diễn ra liên tiếp, từ hội làng quy mô thôn xóm đến những lễ hội lớn thu hút hàng vạn lượt khách hành hương.</p>
<h2>Các lễ hội tiêu biểu</h2>
<ul>
${springFestivals
  .map((f) => `  <li><strong>${f.name}</strong> — ${f.lunarTimeText}, tại ${f.location}.</li>`)
  .join('\n')}
</ul>
<h2>Lưu ý cho du khách</h2>
<p>Nên đến sớm buổi sáng ngày khai hội để dự đầy đủ phần lễ; trang phục lịch sự, trang nghiêm khi vào khu vực thờ tự. Thời tiết tháng Giêng ở Đông Triều thường lạnh và ẩm — du khách nên theo dõi <a href="/thoi-tiet">trang dự báo thời tiết</a> trước khi khởi hành.</p>`.trim(),
      author: 'Ban Biên tập',
      tags: ['lễ hội', 'tháng Giêng', 'mùa xuân'],
      published: true,
      publishedAt: new Date().toISOString(),
    },
    {
      slug: 'ruoi-dong-trieu-loc-troi-cuoi-thu',
      title: 'Rươi Đông Triều — "lộc trời" của vùng nước lợ ven sông Kinh Thầy',
      category: 'PHONG_SU',
      excerpt:
        'Mỗi năm chỉ vài con nước ngắn ngủi, con rươi vùng bãi triều Kinh Thầy – Đá Bạc làm nên món chả rươi trứ danh của Đông Triều.',
      contentHtml: `
<p>Dân gian có câu <em>"tháng chín đôi mươi, tháng mười mùng năm"</em> để chỉ những ngày con rươi nổi. Vùng bãi triều nước lợ ven sông Kinh Thầy, Đá Bạc thuộc khu vực Hồng Phong, Nguyễn Huệ là nơi con rươi xuất hiện mỗi độ cuối thu.</p>
<h2>Vì sao gọi là "lộc trời"</h2>
<p>Rươi không nuôi được, không đoán trước được sản lượng. Người dân chỉ có thể canh con nước theo lịch triều — đây cũng là lý do <a href="/thoi-tiet">trang dự báo triều cường</a> của cổng thông tin luôn hiển thị giờ nước lớn, nước ròng để bà con và du khách tiện theo dõi.</p>
<h2>Thưởng thức thế nào</h2>
<p>Chả rươi trứng thơm béo ăn kèm vỏ quýt là món phổ biến nhất. Ngoài ra còn có rươi kho niêu đất, mắm rươi, nem rươi. Giá rươi tươi dao động 300.000 – 500.000đ/kg tùy con nước.</p>
<h2>Đi khi nào</h2>
<p>Mùa rươi rơi vào khoảng tháng 9 – 11 âm lịch. Du khách có thể kết hợp thưởng thức rươi với hành trình viếng các di tích ven sông như <strong>đền, chùa Kênh Giang</strong> (đền Yết Kiêu) và <strong>đình, chùa Triều Khê</strong>.</p>`.trim(),
      author: 'Ban Biên tập',
      tags: ['ẩm thực', 'rươi', 'đặc sản'],
      published: true,
      publishedAt: new Date().toISOString(),
    },
  ];
}

// ── Kho tri thức cho chatbot (giai đoạn sau) ────────────────────────────────

function buildKnowledgeBase({ heritages, festivals, lodgings, cuisines }) {
  const lines = [
    '# Kho tri thức — Du lịch phường Đông Triều, tỉnh Quảng Ninh',
    '',
    `> Tự động sinh từ "${MAIN_DOC}" bằng \`npm run extract\`. Không sửa tay file này.`,
    '',
    '## I. Di tích đã xếp hạng',
    '',
  ];

  for (const h of heritages) {
    lines.push(`### ${h.order}. ${h.name}`);
    if (h.altNames.length) lines.push(`- **Tên gọi khác:** ${h.altNames.join(' · ')}`);
    lines.push(`- **Loại hình:** ${h.typeText}`);
    lines.push(`- **Xếp hạng:** ${h.rankLevelText}${h.rankDecision ? ` — ${h.rankDecision}` : ''}${h.rankAuthority ? ` — ${h.rankAuthority}` : ''}`);
    lines.push(`- **Địa chỉ:** ${h.address}`);
    if (h.worship.length) lines.push(`- **Thờ phụng:** ${h.worship.join('; ')}`);
    if (h.festivalNote) lines.push(`- **Lễ hội:** ${h.festivalNote}`);
    lines.push('', `**Tóm tắt.** ${h.summary}`, '');
    if (h.history) lines.push(`**Lịch sử.** ${h.history}`, '');
    if (h.architecture) lines.push(`**Kiến trúc và hiện vật.** ${h.architecture}`, '');
    if (h.highlights.length) {
      lines.push('**Điểm nhấn:**');
      h.highlights.forEach((x) => lines.push(`- ${x}`));
      lines.push('');
    }
  }

  lines.push('## II. Lịch lễ hội', '');
  lines.push('| Lễ hội | Âm lịch | Dương lịch | Địa điểm | Quy mô |');
  lines.push('|---|---|---|---|---|');
  festivals.forEach((f) =>
    lines.push(`| ${f.name} | ${f.lunarTimeText} | ${f.solarEstimate} | ${f.location} | ${f.scale} |`),
  );
  lines.push('');
  festivals.forEach((f) => {
    lines.push(`### ${f.name}`, `- **Thời gian:** ${f.lunarTimeText} (${f.solarEstimate})`, `- **Địa điểm:** ${f.location}`, '', f.intro, '');
    if (f.rituals.length) {
      lines.push('**Nghi lễ và hoạt động:**');
      f.rituals.forEach((r) => lines.push(`- ${r}`));
      lines.push('');
    }
  });

  lines.push('## III. Cơ sở lưu trú', '');
  lines.push('| # | Tên cơ sở | Địa chỉ | Người đại diện | Điện thoại |');
  lines.push('|---|---|---|---|---|');
  lodgings.forEach((l) =>
    lines.push(`| ${l.order} | ${l.name} | ${l.address} | ${l.owner ?? ''} | ${l.phones.join(' – ')} |`),
  );
  lines.push('');

  lines.push('## IV. Ẩm thực — đặc sản', '');
  cuisines.forEach((c) => {
    lines.push(`### ${c.name}`, '', `${c.summary}`, '', c.description, '');
    if (c.priceRange) lines.push(`- **Giá tham khảo:** ${c.priceRange}`);
    if (c.whereToBuy.length) lines.push(`- **Mua/thưởng thức tại:** ${c.whereToBuy.join('; ')}`);
    lines.push('');
  });

  return lines.join('\n');
}

// ── Chạy ────────────────────────────────────────────────────────────────────

function writeJson(name, data) {
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  const count = Array.isArray(data) ? data.length : Object.keys(data).length;
  console.log(`  ✓ ${name.padEnd(20)} ${String(count).padStart(3)} mục`);
}

function main() {
  const mainPath = path.join(DOCX_DIR, MAIN_DOC);
  if (!fs.existsSync(mainPath)) {
    console.error(`✗ Không tìm thấy: ${mainPath}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(KB_DIR, { recursive: true });

  console.log(`\n▸ Đọc ${MAIN_DOC}`);
  const lines = docxToLines(mainPath);

  const heritages = parseHeritages(lines);
  heritages.forEach((h) => Object.assign(h, KNOWN_COORDS[h.slug] ?? {}));
  const festivals = parseFestivals(lines);
  const lodgings = parseLodgings(lines);
  const cuisines = parseCuisines(lines);
  const restaurants = buildPlaceholderRestaurants(cuisines);
  const articles = buildSeedArticles(heritages, festivals);

  let about = { sections: [] };
  const festivalDocPath = path.join(DOCX_DIR, FESTIVAL_DOC);
  if (fs.existsSync(festivalDocPath)) {
    console.log(`▸ Đọc ${FESTIVAL_DOC}`);
    about = parseAbout(docxToLines(festivalDocPath));
  }

  console.log(`\n▸ Ghi ${path.relative(ROOT, OUT_DIR)}`);
  writeJson('heritages.json', heritages);
  writeJson('festivals.json', festivals);
  writeJson('lodgings.json', lodgings);
  writeJson('cuisines.json', cuisines);
  writeJson('restaurants.json', restaurants);
  writeJson('articles.json', articles);
  writeJson('about.json', about);

  const kbPath = path.join(KB_DIR, 'knowledge_base.md');
  fs.writeFileSync(kbPath, buildKnowledgeBase({ heritages, festivals, lodgings, cuisines }), 'utf8');
  console.log(`  ✓ ${path.relative(ROOT, kbPath)}`);

  // ── Kiểm tra tính toàn vẹn ──
  const expect = { heritages: 13, festivals: 17, lodgings: 15, cuisines: 8 };
  const actual = { heritages: heritages.length, festivals: festivals.length, lodgings: lodgings.length, cuisines: cuisines.length };
  const problems = [];
  for (const [k, v] of Object.entries(expect)) {
    if (actual[k] !== v) problems.push(`${k}: mong đợi ${v}, nhận ${actual[k]}`);
  }
  heritages.forEach((h) => {
    if (!h.summary) problems.push(`${h.name}: thiếu tóm tắt`);
    if (!h.history) problems.push(`${h.name}: thiếu lịch sử`);
    if (!h.rankDecision) problems.push(`${h.name}: thiếu số quyết định xếp hạng`);
  });
  festivals.forEach((f) => {
    if (!f.intro) problems.push(`Lễ hội "${f.name}": thiếu phần giới thiệu`);
    if (f.lunarMonth == null) problems.push(`Lễ hội "${f.name}": không đọc được tháng âm lịch`);
  });

  if (problems.length) {
    console.error('\n✗ Phát hiện vấn đề:');
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
  console.log('\n✓ Trích xuất hoàn tất — dữ liệu đầy đủ.\n');
}

main();
