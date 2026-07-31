/**
 * Bộ SINH KỊCH BẢN tự động cho trợ lý du lịch Đông Triều.
 *
 * Thay vì viết tay hàng nghìn câu, ta ghép:
 *     MẪU CÂU  ×  DỮ LIỆU THẬT (di tích, lễ hội, đặc sản… lấy từ database)  ×  BIẾN THỂ
 *
 * → sinh ra ~1000+ câu hỏi sát thực tế, tự đồng bộ khi thêm dữ liệu, và bộc lộ
 *   chỗ bot định tuyến sai ở quy mô lớn.
 *
 * Mỗi câu gắn kỳ vọng:
 *   'answer'   → bot phải trả lời được (matched = true)
 *   'graceful' → bot phải từ chối trung thực (matched = false)
 * Kèm `accept` (tuỳ chọn) = tập ý định hợp lệ; sai khác chỉ CẢNH BÁO, không tính trượt.
 *
 * Dùng chung cho gen-scenarios (in ra) và test-scenarios-bulk (chấm điểm).
 */

import { deaccent } from '../src/lib/vitext.js';

// ── Biến thể văn bản (xoay vòng theo chỉ số cho ổn định giữa các lần chạy) ──
const PREFIX = ['', 'cho mình hỏi ', 'bạn ơi ', 'cho hỏi ', ''];
const SUFFIX = ['', ' ạ', ' vậy', ' với', ' nhỉ', ' thế', ''];

/** Sinh 1–3 biến thể của một câu (gốc, không dấu, thêm từ đệm). */
function variants(q, i) {
  const out = [q];
  if (i % 2 === 0) out.push(deaccent(q)); // không dấu
  if (i % 3 === 0) out.push((PREFIX[i % PREFIX.length] + q + SUFFIX[i % SUFFIX.length]).trim());
  return out;
}

/**
 * Dựng toàn bộ kịch bản từ corpus.
 * @returns {Array<{q, expect, accept?, group}>}
 */
export function buildBulkScenarios(corpus) {
  const rows = [];
  let seq = 0;
  const add = (list, expect, group, accept) => {
    for (const base of list) {
      for (const v of variants(base, seq++)) rows.push({ q: v, expect, accept, group });
    }
  };

  const names = (arr) => arr.map((x) => x.name);
  const hNames = names(corpus.heritages);
  const fNames = names(corpus.festivals);
  const cNames = names(corpus.cuisines);
  const lNames = names(corpus.lodgings);
  const rNames = names(corpus.restaurants);
  const aNames = names(corpus.attractions);

  // ── Di tích ──
  add(
    hNames.flatMap((n) => [`${n} ở đâu`, `${n} thờ ai`, `${n} có gì đặc biệt`, `giới thiệu về ${n}`, `kể cho tôi về ${n}`, `${n} được xếp hạng gì`]),
    'answer',
    'Di tích',
    ['lookup_heritage', 'lookup_festival', 'directions', 'about'],
  );
  add(['Đông Triều có bao nhiêu di tích', 'kể tên các di tích', 'di tích nào nổi tiếng nhất', 'di tích quốc gia đặc biệt ở đâu', 'danh sách di tích Đông Triều'], 'answer', 'Di tích', ['list_heritage', 'lookup_heritage']);

  // ── Đường đi tới di tích ──
  add(hNames.flatMap((n) => [`đường đến ${n}`, `đi ${n} thế nào`, `${n} cách Hà Nội bao xa`]), 'answer', 'Đường đi', ['directions', 'lookup_heritage']);

  // ── Lễ hội ──
  add(fNames.flatMap((n) => [`${n} là gì`, `${n} tổ chức khi nào`, `${n} diễn ra ở đâu`, `giới thiệu ${n}`]), 'answer', 'Lễ hội', ['lookup_festival', 'list_festival', 'festival_upcoming', 'lookup_heritage']);
  add(['lễ hội nào sắp diễn ra', 'Đông Triều có những lễ hội gì', 'lễ hội tháng Giêng', 'lễ hội tháng 2', 'lễ hội tháng 3', 'còn bao lâu tới lễ hội', 'hội làng nào sắp tới'], 'answer', 'Lễ hội', ['festival_upcoming', 'festival_month', 'list_festival']);

  // ── Ẩm thực & đặc sản ──
  add(cNames.flatMap((n) => [`${n} là gì`, `${n} mua ở đâu`, `${n} mùa nào`, `giới thiệu ${n}`, `${n} giá bao nhiêu`]), 'answer', 'Ẩm thực', ['lookup_cuisine', 'list_cuisine', 'budget', 'route']);
  add(['ăn gì ở Đông Triều', 'đặc sản Đông Triều', 'món ngon Đông Triều', 'mua quà gì về', 'đặc sản mua làm quà', 'Đông Triều có món gì ngon'], 'answer', 'Ẩm thực', ['list_cuisine', 'lookup_cuisine']);

  // ── Lưu trú ──
  add(lNames.flatMap((n) => [`${n} ở đâu`, `số điện thoại ${n}`, `${n} giá phòng bao nhiêu`]), 'answer', 'Lưu trú', ['lookup_lodging', 'list_lodging']);
  add(['khách sạn ở đâu', 'có nhà nghỉ nào không', 'ngủ ở đâu qua đêm', 'có homestay không', 'đặt phòng ở đâu', 'khách sạn nào tốt', 'nhà nghỉ giá rẻ'], 'answer', 'Lưu trú', ['list_lodging', 'recommend']);
  // Nay đã xếp được theo khoảng cách thật hoặc theo cùng khu phố → ý định `near`
  add(hNames.slice(0, 8).map((n) => `khách sạn gần ${n}`), 'answer', 'Lưu trú', ['near', 'list_lodging']);

  // ── Nhà hàng ──
  add(rNames.flatMap((n) => [`${n} ở đâu`, `${n} có món gì`, `${n} giá bao nhiêu`]), 'answer', 'Nhà hàng', ['lookup_restaurant', 'list_restaurant', 'lookup_cuisine']);
  add(['nhà hàng nào ngon', 'quán ăn ở đâu', 'ăn hải sản ở đâu', 'quán lẩu nướng', 'ăn trưa ở đâu', 'quán ăn bình dân'], 'answer', 'Nhà hàng', ['list_restaurant']);
  add(hNames.slice(0, 6).map((n) => `quán ăn gần ${n}`), 'answer', 'Nhà hàng', ['near', 'list_restaurant']);

  // ── Điểm lân cận ──
  add(aNames.flatMap((n) => [`${n} ở đâu`, `${n} đi thế nào`, `giới thiệu ${n}`, `${n} cách bao xa`]), 'answer', 'Điểm lân cận', ['lookup_attraction', 'directions', 'list_attraction']);
  add(['gần Đông Triều có gì chơi', 'điểm tham quan lân cận', 'xung quanh có gì', 'ngoài phường đi đâu được'], 'answer', 'Điểm lân cận', ['list_attraction']);

  // ── Vé & giờ mở cửa ──
  add(
    ['vé vào cửa bao nhiêu', 'tham quan có mất phí không', 'có bán vé không', 'giá vé tham quan', ...hNames.slice(0, 6).map((n) => `vé vào ${n} bao nhiêu`)],
    'answer',
    'Vé',
    ['ticket'],
  );
  add(['mấy giờ mở cửa', 'giờ tham quan thế nào', 'mở cửa lúc nào', 'giờ đóng cửa', ...hNames.slice(0, 6).map((n) => `${n} mấy giờ mở cửa`)], 'answer', 'Giờ mở cửa', ['hours', 'lookup_heritage']);

  // ── Thời tiết & triều cường ──
  const days = ['hôm nay', 'ngày mai', 'ngày kia', 'thứ hai', 'thứ ba', 'thứ tư', 'thứ năm', 'thứ sáu', 'thứ bảy', 'chủ nhật', 'cuối tuần', '7 ngày tới'];
  add(days.flatMap((d) => [`thời tiết ${d}`, `${d} có mưa không`, `${d} nóng không`]), 'answer', 'Thời tiết', ['weather_now', 'weather_day', 'weather_range']);
  add(['nhiệt độ bây giờ', 'trời có nắng không', 'chỉ số uv hôm nay', 'độ ẩm bao nhiêu'], 'answer', 'Thời tiết', ['weather_now', 'weather_day']);
  add(['triều cường hôm nay', 'con nước lên xuống giờ nào', 'khi nào nước lớn', 'thuỷ triều thế nào', 'mực nước sông'], 'answer', 'Triều cường', ['tide']);

  // ── Lộ trình cá nhân hoá ──
  const spans = ['buổi sáng', 'buổi chiều', 'cả ngày', 'trong ngày', '2 ngày 1 đêm'];
  const themes = ['tâm linh', 'lịch sử', 'ngắm cảnh', 'kiến trúc'];
  const whos = ['người lớn tuổi', 'gia đình có trẻ nhỏ', 'người sức khoẻ yếu', 'nhóm bạn trẻ'];
  const amounts = ['500k', '1 triệu', '2 triệu', '3 triệu'];
  add(spans.map((s) => `lộ trình ${s}`), 'answer', 'Lộ trình', ['route']);
  add(spans.map((s) => `${s} đi đâu`), 'answer', 'Lộ trình', ['route', 'where_today']);
  add(themes.map((t) => `lộ trình thiên về ${t}`), 'answer', 'Lộ trình', ['route']);
  add(whos.map((w) => `lịch trình cho ${w}`), 'answer', 'Lộ trình', ['route']);
  add(amounts.map((a) => `tôi có ${a} thì vạch lộ trình tham quan và ăn uống`), 'answer', 'Lộ trình', ['route']);
  add(amounts.map((a) => `tôi có ${a} thì nên đi đâu`), 'answer', 'Lộ trình', ['route']);
  add(['lộ trình buổi sáng cho người lớn tuổi', 'lộ trình cả ngày thiên về tâm linh', '2 triệu lộ trình lịch sử', 'gia đình có trẻ nhỏ nên đi đâu', 'đi nhẹ nhàng ít leo trèo'], 'answer', 'Lộ trình', ['route']);
  add(['gợi ý nhà hàng giá hợp lý', 'quán nào ngon bổ rẻ', 'gợi ý dịch vụ chất lượng tốt', 'nhà hàng nào uy tín'], 'answer', 'Gợi ý dịch vụ', ['recommend', 'list_restaurant']);

  // ── Đánh giá & xếp hạng (bộ dữ liệu khảo sát 2026) ──
  add(
    ['quán nào đánh giá cao nhất', 'nhà hàng nào ngon nhất', 'khách sạn nào đánh giá tốt', 'quán ăn nào nhiều sao nhất', 'chỗ ăn nào uy tín nhất', 'quán nào được review tốt'],
    'answer',
    'Đánh giá',
    ['recommend', 'list_restaurant', 'list_lodging'],
  );
  add(
    ['quán nào giá mềm', 'ăn ngon bổ rẻ ở đâu', 'quán ăn bình dân giá rẻ', 'chỗ nghỉ giá rẻ'],
    'answer',
    'Đánh giá',
    ['recommend', 'list_restaurant', 'list_lodging'],
  );

  // ── Giờ mở cửa (trường openHours) ──
  add(
    ['giờ này còn quán nào mở không', 'quán nào đang mở cửa', 'chỗ nào mở 24/24', 'quán nào mở cả đêm', 'ăn khuya ở đâu', 'ăn đêm ở đâu', 'quán nào mở sớm', 'ăn sáng sớm ở đâu', 'quán cà phê nào đang mở', 'nhà nghỉ nào mở 24h'],
    'answer',
    'Giờ mở cửa cơ sở',
    ['open_now', 'open_late', 'open_early', 'open_allday'],
  );

  // ── Cà phê & trà sữa (nhóm CAFE tách riêng) ──
  add(
    ['quán cà phê nào đẹp', 'cà phê ở đâu', 'trà sữa ở đâu ngon', 'quán nước nào view đẹp', 'cafe nào có chỗ đậu xe', 'quán cà phê để làm việc'],
    'answer',
    'Cà phê',
    ['list_cafe', 'recommend', 'lookup_restaurant', 'open_now'],
  );

  // ── Khu phố (cơ cấu hành chính 2025) ──
  const kpNames = (corpus.khuPho?.danhSach ?? []).map((k) => k.ten);
  add(
    ['phường có bao nhiêu khu phố', 'kể tên các khu phố', 'danh sách khu phố Đông Triều', 'khu phố là gì'],
    'answer',
    'Khu phố',
    ['khu_pho_info', 'about'],
  );
  add(kpNames.map((n) => `khu phố ${n} gồm những khu nào`), 'answer', 'Khu phố', ['khu_pho_info']);

  // Kỳ vọng bám DỮ LIỆU THẬT: khu phố nào chưa có cơ sở nào thì bot PHẢI từ chối
  // trung thực ("chưa ghi nhận quán ăn nào ở khu phố này"), không được bịa.
  // Bộ lọc phải khớp đúng bộ lọc trong answerByKhuPho (chỉ nhà hàng/quán ăn, và
  // chỉ cơ sở từ 3,5★ trở lên).
  const usable = (x) => x.rating == null || x.rating >= 3.5;
  const hasFood = (n) =>
    corpus.restaurants.some((r) => r.khuPho === n && ['NHA_HANG', 'QUAN_AN'].includes(r.type) && usable(r));
  const hasStay = (n) => corpus.lodgings.some((l) => l.khuPho === n && usable(l));

  add(kpNames.filter(hasFood).map((n) => `ăn gì ở khu phố ${n}`), 'answer', 'Khu phố', ['khu_pho_list']);
  add(kpNames.filter((n) => !hasFood(n)).map((n) => `ăn gì ở khu phố ${n}`), 'graceful', 'Khu phố');
  add(kpNames.filter(hasStay).map((n) => `nhà nghỉ khu phố ${n}`), 'answer', 'Khu phố', ['khu_pho_list']);
  add(kpNames.filter((n) => !hasStay(n)).map((n) => `nhà nghỉ khu phố ${n}`), 'graceful', 'Khu phố');

  // ── Tìm quanh một di tích (toạ độ / khu phố) ──
  add(hNames.map((n) => `quán ăn gần ${n}`), 'answer', 'Gần di tích', ['near', 'list_restaurant']);
  add(hNames.slice(0, 8).map((n) => `chỗ nghỉ gần ${n}`), 'answer', 'Gần di tích', ['near', 'list_lodging']);

  // ── Lễ hội: hồ sơ chi tiết (6 lễ hội lớn) ──
  // Chỉ 6 lễ hội có hồ sơ chi tiết; các hội làng khác phải từ chối trung thực,
  // nên ở đây chấp nhận cả hai kết quả và để kỳ vọng ở mức 'answer' cho 6 hội lớn.
  const bigFestivals = corpus.festivals.filter((f) => f.visitorTips?.length).map((f) => f.name);
  add(bigFestivals.map((n) => `${n} thờ ai`), 'answer', 'Lễ hội chi tiết', ['festival_aspect', 'lookup_festival']);
  add(bigFestivals.map((n) => `${n} có nghi lễ gì`), 'answer', 'Lễ hội chi tiết', ['festival_aspect', 'lookup_festival']);
  add(bigFestivals.map((n) => `đi ${n} cần lưu ý gì`), 'answer', 'Lễ hội chi tiết', ['festival_aspect', 'lookup_festival']);
  add(bigFestivals.map((n) => `${n} phần hội có gì`), 'answer', 'Lễ hội chi tiết', ['festival_aspect', 'lookup_festival']);
  add(bigFestivals.map((n) => `${n} có ý nghĩa gì`), 'answer', 'Lễ hội chi tiết', ['festival_aspect', 'lookup_festival']);

  // ── Giới thiệu địa phương ──
  add(['giới thiệu về Đông Triều', 'Đông Triều ở đâu', 'Đông Triều thuộc tỉnh nào', 'Đông Triều nổi tiếng về gì', 'Đông Triều có gì đặc biệt', 'lịch sử Đông Triều', 'Đông Triều là vùng đất thế nào'], 'answer', 'Giới thiệu', ['about']);

  // ── Liên hệ & khẩn cấp ──
  add(['số điện thoại UBND phường', 'đường dây nóng của phường', 'liên hệ với ai', 'gọi cho phường thế nào'], 'answer', 'Liên hệ', ['contact']);
  add(['gọi cấp cứu số mấy', 'số điện thoại công an', 'số cứu hoả', 'số khẩn cấp', 'gọi 115 khi nào'], 'answer', 'Khẩn cấp', ['contact_emergency']);

  // ── Xã giao ──
  add(['xin chào', 'chào bạn', 'alo', 'hi', 'bạn là ai', 'bạn giúp được gì', 'bạn làm được gì', 'cảm ơn', 'cảm ơn bạn nhé'], 'answer', 'Xã giao', ['greeting', 'help', 'thanks']);

  // ── Ngoài phạm vi — phải từ chối trung thực ──
  const docs = ['căn cước công dân', 'căn cước', 'hộ chiếu', 'khai sinh', 'hộ khẩu', 'giấy phép kinh doanh', 'sổ đỏ', 'đăng ký tạm trú', 'bảo hiểm y tế'];
  add(docs.map((d) => `làm ${d} ở đâu`), 'graceful', 'Ngoài phạm vi: hành chính');
  add(docs.map((d) => `thủ tục ${d} thế nào`), 'graceful', 'Ngoài phạm vi: hành chính');
  const facs = ['ATM', 'cây xăng', 'nhà vệ sinh', 'bãi đỗ xe', 'trạm xăng', 'chỗ rút tiền', 'chỗ gửi xe'];
  add(facs.flatMap((f) => [`${f} gần đây`, `${f} ở đâu`]), 'graceful', 'Ngoài phạm vi: tiện ích');
  add(['giá vé máy bay đi Đà Nẵng', 'thủ đô nước Pháp là gì', 'tỷ giá đô la hôm nay', 'kết quả xổ số', 'giá vàng hôm nay', 'lịch chiếu phim', 'đặt vé xem phim'], 'graceful', 'Ngoài phạm vi: khác');
  // Dữ liệu chỉ có điểm sao TỔNG THỂ, không chấm riêng từng tiêu chí
  add(
    ['quán nào wifi mạnh nhất', 'khách sạn nào sạch sẽ nhất', 'quán nào có bãi đỗ xe rộng nhất', 'chỗ nào điều hoà mát nhất'],
    'graceful',
    'Ngoài phạm vi: xếp hạng',
  );

  return rows;
}
