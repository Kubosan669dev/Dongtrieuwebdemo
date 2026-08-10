import { solarToLunar } from '../../../shared/lunar.js';

/**
 * Dựng dữ liệu cho lịch tháng: mỗi ô một ngày dương, kèm ngày âm và lễ hội.
 *
 * Tách khỏi trang để kiểm được bằng máy — phần khó ở đây không phải giao diện mà
 * là hai quyết định bên dưới, và cả hai đều sai được một cách âm thầm.
 */

/**
 * ── QUYẾT ĐỊNH 1: DÒ NGÀY KẾT THÚC TỪ VĂN BẢN, MỘT CÁCH DÈ DẶT ─────────────
 *
 * Cơ sở dữ liệu chỉ có `lunarMonth` + `lunarDay` — ngày MỞ hội. Khoảng ngày nằm
 * trong `lunarTimeText`, là nguyên văn hồ sơ nên viết đủ kiểu:
 *
 *   "16 – 18 tháng Giêng âm lịch"                          → 16→18, rõ ràng
 *   "Mùng 1 – mùng 4 tháng 2 âm lịch"                      → 1→4
 *   "13 – 16 tháng Giêng (Lễ Cả: 11 – 15 tháng 11 âm lịch)" → 13→16, KHÔNG phải 11→15
 *   "14 tháng Giêng âm lịch (lệ cũ: 12 – 14 tháng 11)"      → một ngày, KHÔNG phải 12→14
 *   "Mùng 10 tháng Giêng (sinh nhật); 25 tháng Chạp (hóa nhật)" → một ngày
 *
 * Ba hồ sơ cuối là chỗ một bộ dò ngây thơ sẽ bôi lễ hội sang tận tháng 10 hoặc
 * tháng Chạp. Nên quy tắc gồm ba lớp chặn:
 *
 *   1. Chỉ đọc đoạn TRƯỚC dấu `;` hoặc `(` — ngày phụ luôn nằm sau chúng.
 *   2. Ngày đầu của khoảng phải TRÙNG `lunarDay` trong cơ sở dữ liệu. Lệch là
 *      bỏ, vì lúc đó ta đang đọc nhầm một khoảng nào khác.
 *   3. Khoảng phải tiến và không quá 14 ngày.
 *
 * Không khớp thì trả `null` và lịch chỉ đánh dấu ngày mở hội. Thà thiếu còn hơn
 * bôi lễ hội vào những ngày nó không diễn ra — đây là cổng của phường.
 *
 * Đối chiếu trên toàn bộ 17 hồ sơ: 5 lễ hội có trường `duration` để soi chéo thì
 * KHỚP cả 5, không hồ sơ nào lệch. Xem `scripts/test-lich.mjs`.
 */
export function ngayKetThucAm(leHoi) {
  const dau = String(leHoi?.lunarTimeText ?? '').split(/[;(]/)[0];
  const m = dau.match(/(?:mùng\s*)?(\d{1,2})\s*[–—-]\s*(?:mùng\s*)?(\d{1,2})/i);
  if (!m) return null;
  const tu = Number(m[1]);
  const den = Number(m[2]);
  if (tu !== leHoi.lunarDay) return null;
  if (den <= tu || den - tu > 14) return null;
  return den;
}

/** Số ngày của tháng dương. */
const soNgayThang = (nam, thang) => new Date(nam, thang, 0).getDate();

/** Thứ trong tuần với THỨ HAI = 0 — lịch Việt Nam bắt đầu tuần từ thứ Hai. */
const thuBatDauTuHai = (d) => (d.getDay() + 6) % 7;

export const TEN_THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * ── QUYẾT ĐỊNH 2: TRA LỄ HỘI THEO NGÀY ÂM CỦA TỪNG Ô ──────────────────────
 *
 * Cách hiển nhiên là đổi ngày âm của lễ hội sang dương rồi đặt vào ô tương ứng.
 * Nhưng một tháng dương vắt qua HAI tháng âm, và có khi qua cả hai NĂM âm khác
 * nhau (tháng 1 dương thường nằm giữa Chạp năm cũ và Giêng năm mới) — làm theo
 * hướng đó là phải tự tay chọn năm âm cho từng lễ hội, chỗ rất dễ lệch một năm.
 *
 * Nên làm ngược lại: mỗi ô tự tính ngày âm của mình, rồi mới dò xem hôm ấy có
 * lễ hội nào. Không còn phép chọn năm nào cả.
 *
 * `!am.leap` là điều kiện bắt buộc: năm nhuận có hai tháng Giêng, mà lễ hội chỉ
 * diễn ra ở tháng chính. Thiếu nó thì cả mùa lễ hội bị nhân đôi.
 */
export function thangLich(nam, thang, danhSachLeHoi = [], homNay = new Date()) {
  const leHoi = (Array.isArray(danhSachLeHoi) ? danhSachLeHoi : [])
    .filter((f) => f?.lunarMonth >= 1 && f?.lunarMonth <= 12 && f?.lunarDay >= 1)
    .map((f) => ({ ...f, _den: ngayKetThucAm(f) ?? f.lunarDay }));

  const khoaHomNay = khoaNgay(homNay);
  const soNgay = soNgayThang(nam, thang);
  const truoc = thuBatDauTuHai(new Date(nam, thang - 1, 1));

  const o = [];
  // Bù các ô đầu tuần bằng ngày cuối tháng trước, và bù cuối cho đủ tuần: lưới
  // thiếu ô thì các cột lệch nhau, ngày 15 rơi xuống dưới nhãn "T4".
  for (let i = truoc; i > 0; i -= 1) o.push(taoO(new Date(nam, thang - 1, 1 - i), false));
  for (let d = 1; d <= soNgay; d += 1) o.push(taoO(new Date(nam, thang - 1, d), true));
  while (o.length % 7 !== 0) o.push(taoO(new Date(nam, thang - 1, o.length - truoc + 1), false));

  function taoO(ngay, trongThang) {
    const am = solarToLunar(ngay.getDate(), ngay.getMonth() + 1, ngay.getFullYear());
    const cua = am.leap
      ? []
      : leHoi.filter((f) => f.lunarMonth === am.month && am.day >= f.lunarDay && am.day <= f._den);
    return {
      ngay,
      trongThang,
      laHomNay: khoaNgay(ngay) === khoaHomNay,
      am,
      // Ngày MỞ hội được đánh dấu đậm hơn ngày giữa kỳ — người đi hội cần biết
      // hôm khai hội, đó mới là ngày đông và có rước.
      leHoi: cua.map((f) => ({ ...f, khaiHoi: am.day === f.lunarDay })),
    };
  }

  const tuan = [];
  for (let i = 0; i < o.length; i += 7) tuan.push(o.slice(i, i + 7));
  return tuan;
}

/** Khoá so sánh theo NGÀY, bỏ qua giờ — `Date` khác giờ vẫn là cùng một ngày. */
export const khoaNgay = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/**
 * Các lễ hội xuất hiện trong lưới, theo thứ tự thời gian, mỗi lễ hội một lần.
 *
 * Lấy theo ngày ĐẦU TIÊN thấy trong tháng này, không phải riêng ngày khai hội:
 * một lễ hội mở cuối tháng trước mà kéo sang tháng này vẫn có dấu trên lưới, nên
 * cũng phải có mặt trong danh sách bên dưới — thấy dấu mà tra không ra là lỗi.
 *
 * ── VÌ SAO PHẢI TÍNH RIÊNG `ngayKhai` ─────────────────────────────────────
 * Vì hai điều trên đá nhau ở lễ hội vắt qua ranh giới tháng dương. Lễ hội đền An
 * Sinh mở 20 tháng 8 âm = 30/09/2026 và chạy tới 22 tháng 8 = 02/10. Trong danh
 * sách tháng 10, ô đầu tiên thấy nó là 1/10 — mà 1/10 là ngày 21 âm, không phải
 * 20. Ghép thẳng ngày dương của ô ấy với `lunarDay` trong hồ sơ là ra một cặp
 * lệch nhau: "1/10 · 20 tháng 8 âm", hai vế chỉ hai ngày khác nhau.
 *
 * Ngày âm trong một tháng là những ngày dương liên tiếp, nên lùi đúng
 * `am.day − lunarDay` ngày là về ngày khai hội. Thẻ hiển thị cặp `ngayKhai` ↔
 * `lunarDay`, luôn cùng trỏ một ngày.
 */
export function leHoiTrongThang(tuan) {
  const thay = new Map();
  for (const hang of tuan) {
    for (const o of hang) {
      if (!o.trongThang) continue;
      for (const f of o.leHoi) {
        if (thay.has(f.id)) continue;
        const ngayKhai = new Date(o.ngay);
        ngayKhai.setDate(ngayKhai.getDate() - (o.am.day - f.lunarDay));
        thay.set(f.id, { ...f, ngayDuong: o.ngay, ngayKhai, khaiTrongThang: o.am.day === f.lunarDay });
      }
    }
  }
  return [...thay.values()];
}
