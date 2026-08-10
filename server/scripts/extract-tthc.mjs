#!/usr/bin/env node
/**
 * Tách 19 thủ tục hành chính đất đai CẤP XÃ và các mẫu đơn kèm theo, từ bộ
 * văn bản công bố TTHC của Văn phòng UBND tỉnh Quảng Ninh (tháng 7/2026).
 *
 * Chạy:  npm run extract-tthc
 * Ra:    server/prisma/seed-data/tthc-dat-dai.json
 *        server/prisma/seed-data/tthc-mau-don.json
 *
 * ── VÌ SAO CHỈ LẤY CẤP XÃ ──────────────────────────────────────────────────
 * Bộ văn bản có 32 TTHC cấp tỉnh và 19 TTHC cấp xã. Cổng này là cổng của một
 * PHƯỜNG, và người dân Đông Triều nộp hồ sơ ở Trung tâm Phục vụ hành chính công
 * của phường — tức là nhánh cấp xã. Đưa cả 32 thủ tục cấp tỉnh vào thì trợ lý sẽ
 * trả lời những việc mà phường không nhận hồ sơ, dẫn người ta đi sai cửa.
 *
 * Danh mục cấp tỉnh vẫn được ghi lại ở `capTinh` (chỉ tên + thời hạn) để trợ lý
 * nhận ra và chỉ đúng nơi, chứ không hướng dẫn chi tiết.
 *
 * ── NGUỒN LÀ .docx, KHÔNG PHẢI ẢNH SCAN ────────────────────────────────────
 * Khác bộ quyết định xếp hạng di tích: các tệp này là văn bản máy, lớp chữ đọc
 * ra sạch. Nên ở đây KHÔNG có trường `chuaDocDuoc` — cái gì trích được thì đúng
 * nguyên văn, cái gì không có trong văn bản thì bỏ trống hẳn.
 */
import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'công bố TTHC đặc thù của tỉnh- lĩnh vực đất đai');
const OUT = path.join(ROOT, 'server/prisma/seed-data');

const TEP_CHI_TIET_XA = '294. 576_Cấp xã Phụ lục II. nội dung chi tiết (PH).docx';
const TEP_DANH_MUC = 'QĐ Công bố  TTHC đất đai (PH).docx';
const TEP_MAU = 'Cấp tỉnh Phụ lục I. nội dung chi tiết (PH).docx';

// ── Đọc .docx ───────────────────────────────────────────────────────────────

const ent = (s) =>
  s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&');

/** `.docx` → mảng dòng. Ô bảng thành " | " để còn đọc lại được cấu trúc bảng. */
function docLines(file) {
  const xml = new AdmZip(path.join(SRC, file)).readAsText('word/document.xml');
  return ent(
    xml
      .replace(/<\/w:tc>/g, ' | ')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<w:tab\s*\/>/g, '\t')
      .replace(/<w:br\s*\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    // U+00A0 (dấu cách không ngắt) — Word rải rất nhiều ký tự này. Viết bằng mã
    // thoát chứ không gõ thẳng: gõ thẳng thì trên màn hình nó y hệt dấu cách
    // thường, và người sửa sau sẽ tưởng dòng này không làm gì.
    .replace(/\u00a0/g, ' ')
    // Word rải HYPERLINK "…" quanh mọi liên kết; giữ lại thì mọi câu có link đều
    // lặp địa chỉ hai lần, mà đoạn này còn đem cho trợ lý đọc ra tiếng.
    .replace(/HYPERLINK\s+"[^"]*"\s*/g, '')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((l) => l.trim());
}

// ── Tách 19 TTHC cấp xã ─────────────────────────────────────────────────────

/** Nhãn các mục trong một TTHC, theo đúng thứ tự chúng xuất hiện. */
const MUC = [
  ['trinhTu', /^Trình tự thực hiện/i],
  ['cachThuc', /^Cách thức thực hiện/i],
  ['hoSo', /^Thành phần, số lượng hồ sơ/i],
  ['thoiHan', /^Thời hạn giải quyết/i],
  ['doiTuong', /^Đối tượng thực hiện thủ tục hành chính/i],
  ['coQuan', /^Cơ quan thực hiện thủ tục hành chính/i],
  ['ketQua', /^Kết quả thực hiện thủ tục hành chính/i],
  ['phiLePhi', /^Phí, lệ phí/i],
  ['tenMau', /^Tên mẫu đơn, mẫu tờ khai/i],
  // Dấu phẩy là tuỳ từng thủ tục: bản gốc lúc ghi "Yêu cầu điều kiện", lúc ghi
  // "Yêu cầu, điều kiện". Bỏ sót dấu phẩy thì phần điều kiện chảy ngược vào mục
  // "Tên mẫu đơn" ngay phía trên — người đọc thấy điều kiện được xếp thành tên
  // giấy tờ phải nộp.
  ['yeuCau', /^Yêu cầu,?\s*điều kiện thực hiện thủ tục hành chính/i],
  ['canCu', /^Căn cứ pháp lý của thủ tục hành chính/i],
];

/** Dòng mở đầu một mẫu đơn — dùng để cắt phần mẫu ra khỏi phần quy trình. */
const LA_MAU = /^Mẫu số\s*:?\s*[0-9]/i;

function tachTTHC(lines) {
  // Mỗi TTHC bắt đầu bằng tên thủ tục, ngay trước dòng "Trình tự thực hiện:".
  const moc = [];
  lines.forEach((l, i) => {
    if (/^Trình tự thực hiện/i.test(l)) moc.push(i);
  });

  const ra = [];
  for (let k = 0; k < moc.length; k++) {
    const dau = moc[k];
    const cuoi = k + 1 < moc.length ? moc[k + 1] : lines.length;

    // Tên thủ tục = dòng có chữ gần nhất phía trên "Trình tự thực hiện".
    let ten = '';
    for (let i = dau - 1; i >= 0 && i > dau - 12; i--) {
      const l = lines[i];
      if (l && !LA_MAU.test(l) && !/^B\.|^Phụ lục|^\d+$|^\|/.test(l) && l.length > 25) { ten = l; break; }
    }

    // Cắt phần thân: bỏ mọi thứ từ mẫu đơn đầu tiên trở đi — mẫu đi ra tệp riêng.
    let than = lines.slice(dau, cuoi);
    const iMau = than.findIndex((l) => LA_MAU.test(l));
    const thanQuyTrinh = iMau > 0 ? than.slice(0, iMau) : than;

    const tthc = { ten, ...thu(thanQuyTrinh) };
    // Mẫu mà TTHC này nhắc tới, gom từ CẢ thân (kể cả phần mẫu bị cắt).
    // Mã mẫu có cả dạng "18", "09a", "15c" lẫn "01/LPTB", "03/BĐS-TNCN" — lớp ký
    // tự phải nhận cả gạch nối, nếu không "04/TK-SDDPNN" bị cắt còn "04/TK" và
    // không khớp được với mẫu nào trong danh sách.
    tthc.mauNhacToi = [...new Set(
      than.join('\n').match(/Mẫu số\s*:?\s*[0-9][0-9a-zA-ZĐ/-]*/g) || [],
    )].map((m) => m.replace(/\s+/g, ' ').replace(/Mẫu số\s*:?\s*/i, '').replace(/[-/]$/, '').trim());

    if (ten) ra.push(tthc);
  }
  return ra;
}

/** Gom các dòng của một TTHC vào đúng mục. */
function thu(than) {
  const out = {};
  let khoa = null;
  for (const l of than) {
    if (!l) continue;
    const m = MUC.find(([, re]) => re.test(l));
    if (m) {
      khoa = m[0];
      // Nội dung có thể nằm ngay sau dấu hai chấm trên chính dòng nhãn.
      const sau = l.replace(m[1], '').replace(/^\s*:?\s*/, '').trim();
      out[khoa] = sau ? [sau] : [];
      continue;
    }
    if (khoa) out[khoa].push(l);
  }
  for (const k of Object.keys(out)) {
    out[k] = noiDongGay(out[k].filter(Boolean).map((s) => s.replace(/^[-+•]\s*/, '').trim()).filter(Boolean));
  }
  // `canCu` là mục CUỐI CÙNG có nhãn, nên nó hứng luôn mọi thứ đứng sau cho tới
  // thủ tục kế tiếp: thân mẫu đơn, bảng biểu, phụ lục. Có thủ tục ra 464 dòng
  // "căn cứ pháp lý" trong khi thật ra chỉ có khoảng chục văn bản.
  //
  // Căn cứ pháp lý luôn là tên một văn bản quy phạm kèm số hiệu, nên lọc theo
  // đúng hình dạng đó — chặt chẽ hơn nhiều so với đoán chỗ kết thúc.
  // "Thành phần hồ sơ" là nhãn phụ đứng riêng một dòng bên trong mục hồ sơ; nối
  // dòng xong nó dính vào đầu giấy tờ thứ nhất ("Thành phần hồ sơ Đơn đăng ký
  // biến động…"), đọc ra thành tên một loại giấy không có thật.
  if (out.hoSo) {
    out.hoSo = out.hoSo
      .map((l) => l.replace(/^(?:[a-zđ]\)|\d+[.)])?\s*Thành phần hồ sơ[:\s]*/i, '').trim())
      .filter(Boolean);
  }
  if (out.canCu) {
    out.canCu = out.canCu.filter((l) =>
      /^(Luật|Bộ luật|Nghị định|Nghị quyết|Thông tư|Quyết định|Văn bản|Công văn|Chỉ thị)\b/i.test(l)
      && /\d{2,}\/\d{4}|\d{4}\/QH|số\s*\d/i.test(l));
  }
  return out;
}

/**
 * Nối lại những dòng bị Word ngắt giữa câu.
 *
 * Bản gốc xuống dòng theo bề rộng trang chứ không theo ý, nên mục căn cứ pháp lý
 * ra 88 dòng kiểu "Luật Đất đai số 31/2024/QH15 được sửa đổi, bổ sung bởi Luật
 * số" / "43/2024/QH15, Luật số 47/2024/QH15". Cắt như thế đem cho trợ lý đọc thì
 * mỗi mẩu là một câu cụt, và đường tìm kiếm chấm điểm từng mẩu rời cũng hỏng.
 *
 * Quy tắc: dòng sau là phần tiếp của dòng trước nếu dòng trước KHÔNG kết thúc
 * bằng dấu ngắt câu, và dòng sau không mở đầu như một mục mới.
 */
function noiDongGay(ds) {
  const ra = [];
  for (const l of ds) {
    const truoc = ra[ra.length - 1];
    const moMuc = /^(Bước\s*\d|[a-zđ]\)|\d+[.)]|[-+•]|Trường hợp|Đối với|Số lượng|Thành phần)/i.test(l);
    if (truoc && !/[.;:!?]$/.test(truoc) && !moMuc) ra[ra.length - 1] = `${truoc} ${l}`;
    else ra.push(l);
  }
  return [...new Set(ra)];
}

// ── Tách danh mục (thời hạn, lệ phí, nơi nộp) ───────────────────────────────

function tachDanhMuc(lines) {
  const iA = lines.findIndex((l) => /THỦ TỤC HÀNH CHÍNH CẤP TỈNH/i.test(l));
  const iB = lines.findIndex((l) => /THỦ TỤC HÀNH CHÍNH CẤP XÃ/i.test(l));
  const doan = (tu, den) => lines.slice(tu, den);

  /** Bảng ghi mỗi ô một dòng; số thứ tự đứng riêng một dòng rồi tới tên. */
  const doc = (ds) => {
    const ra = [];
    for (let i = 0; i < ds.length; i++) {
      if (!/^\d+(\.\d+)?$/.test(ds[i])) continue;
      const stt = ds[i];
      // Tên là dòng dài đầu tiên sau số thứ tự (bỏ qua các ô rỗng "|").
      let ten = '';
      let thoiHan = '';
      for (let j = i + 1; j < Math.min(i + 6, ds.length); j++) {
        const l = ds[j].replace(/^\|\s*/, '').trim();
        if (!ten && l.length > 30) { ten = l; continue; }
        if (ten && !thoiHan && /ngày làm việc/i.test(l)) { thoiHan = l; break; }
      }
      if (ten) ra.push({ stt, ten, thoiHan });
    }
    return ra;
  };

  return { capTinh: doc(doan(iA, iB)), capXa: doc(doan(iB, lines.length)) };
}

// ── Tách mẫu đơn ────────────────────────────────────────────────────────────

/**
 * Ai là người điền mẫu này.
 *
 * ── ĐÂY LÀ TRƯỜNG QUAN TRỌNG NHẤT CỦA CẢ TỆP ───────────────────────────────
 * Văn bản liệt kê chung một danh sách "mẫu đơn, mẫu tờ khai" cho mỗi thủ tục,
 * trộn lẫn giấy người dân phải viết (đơn đề nghị, tờ khai thuế) với giấy cơ quan
 * tự làm trong nội bộ (tờ trình, dự thảo quyết định, phiếu chuyển thông tin,
 * biên bản bàn giao). Người dân đọc danh sách đó tưởng phải chuẩn bị đủ 8–13 tờ,
 * trong khi thực tế chỉ phải điền 1–4 tờ.
 *
 * Phân loại theo LOẠI VĂN BẢN chứ không theo số hiệu: số hiệu mẫu đổi theo từng
 * nghị định, còn "tờ trình" thì đời nào cũng là việc của cơ quan.
 */
function aiDien(ten) {
  const t = ten.toLowerCase();
  if (/^đơn |đơn đề nghị|đơn xin|^tờ khai|^bảng kê|^bản vẽ/.test(t)) return 'dan';
  if (/danh sách những người sử dụng chung|danh sách các thửa đất|danh sách tài sản/.test(t)) return 'dan';
  if (/tờ trình|quyết định|phiếu chuyển|thông báo|biên bản|hợp đồng|danh sách công khai|báo cáo kết quả/.test(t)) return 'coquan';
  if (/^văn bản đề nghị/.test(t)) return 'dan';
  return 'khac';
}

/**
 * Dòng khuôn sáo đứng giữa số hiệu mẫu và tên thật của nó.
 *
 * Mọi mẫu tờ khai thuế đều mở đầu bằng quốc hiệu rồi mới tới tên; lấy dòng viết
 * hoa ĐẦU TIÊN thì bốn mẫu thuế đều mang tên "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT
 * NAM" — vô nghĩa với người đi tìm tờ khai lệ phí trước bạ.
 */
// `H[OÒ][ÀA]` chứ không phải `HO[ÀA]`: quốc hiệu được viết cả hai kiểu trong
// cùng bộ văn bản — "CỘNG HOÀ" (dấu trên chữ A) và "CỘNG HÒA" (dấu trên chữ O).
// Bắt sót một kiểu là hai mẫu tờ khai thuế mang luôn tên "Cộng hòa xã hội chủ
// nghĩa Việt Nam" — vô nghĩa với người đang đi tìm tờ khai.
const KHUON_SAO = /^(CỘNG\s*H[OÒ][ÀA]|Độc lập|\(Ban hành|Mẫu số|Ký hiệu|\||\d+$)/i;

function tachMau(lines, tep) {
  const ra = new Map();
  for (let i = 0; i < lines.length; i++) {
    // Lớp ký tự của mã mẫu PHẢI có `đ`: tiếng Việt đánh thứ tự phụ là a, b, c,
    // d, **đ**, e… Thiếu nó thì "Mẫu số 15đ. Báo cáo kết quả rà soát" bị đọc
    // thành mã "15" với tên "đ. Báo cáo kết quả rà soát" — và vì tên đó dài hơn,
    // nó ghi đè mất Mẫu số 15 thật, tức "Đơn đăng ký đất đai, tài sản gắn liền
    // với đất". Đây là tờ đơn chính của sáu thủ tục cấp xã, và người dân sẽ được
    // chỉ đi điền một bản báo cáo rà soát của tổ chức tôn giáo.
    const m = lines[i].match(/^Mẫu số\s*:?\s*([0-9][0-9a-zA-ZđĐ]*(?:\/[A-ZĐ0-9-]+)?)\.?\s*(.*)$/);
    if (!m) continue;
    const so = m[1].trim();
    let ten = m[2].trim();
    // Mẫu tờ khai thuế chỉ ghi số ở góc, tên nằm ở dòng tiêu đề bên dưới.
    if (!ten) {
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        const l = lines[j];
        if (!l || KHUON_SAO.test(l)) continue;
        if (l === l.toUpperCase() && l.length > 8 && /[A-ZĐÀ-Ỹ]/.test(l)) { ten = l; break; }
      }
    }
    ten = ten
      .replace(/^[:.\s]+/, '')
      .replace(/\s*\(kèm theo.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    // Bản gốc hay ghi tên mẫu ở dòng nhãn rồi lặp lại ngay ở dòng tiêu đề in
    // hoa, nên nối lại thành "… trên cùng một thửa đất DANH SÁCH TÀI SẢN GẮN…".
    // Cắt phần lặp đi.
    const lap = ten.match(/^(.+?)\s+([A-ZĐÀ-Ỹ][A-ZĐÀ-Ỹ\s]{8,})$/);
    if (lap && lap[1].toLowerCase().startsWith(lap[2].toLowerCase().slice(0, 12))) ten = lap[1];

    // Chữ hoa toàn bộ đọc mệt mắt trong danh sách; đưa về dạng câu.
    if (ten === ten.toUpperCase() && ten.length > 12) ten = ten[0] + ten.slice(1).toLowerCase();
    if (!ten || ten.length < 6) continue;
    // Giữ bản mô tả DÀI NHẤT: cùng một mẫu xuất hiện lại ở nhiều thủ tục, có chỗ
    // ghi đủ tên, có chỗ bị cắt cụt vì xuống dòng giữa chừng.
    const cu = ra.get(so);
    // `tep` là tên tệp tải về chứa THÂN mẫu này. Không có nó thì trang chỉ nói
    // được "cần Mẫu số 18" mà không chỉ được lấy tờ ấy ở đâu — đúng chỗ bế tắc
    // mà người dân gặp khi tra cứu thủ tục trên mạng.
    if (!cu || ten.length > cu.ten.length) ra.set(so, { so, ten, aiDien: aiDien(ten), tep });
  }
  return ra;
}

// ── Chạy ────────────────────────────────────────────────────────────────────

const dongXa = docLines(TEP_CHI_TIET_XA);
const dongDM = docLines(TEP_DANH_MUC);
const dongMau = docLines(TEP_MAU);

const thuTuc = tachTTHC(dongXa);
const danhMuc = tachDanhMuc(dongDM);
// Gom mẫu từ CẢ HAI phụ lục: bản cấp tỉnh có thân mẫu đầy đủ nhất, bản cấp xã
// có thêm vài mẫu chỉ dùng ở xã (15a–c, 16, 17). Quét bản cấp xã TRƯỚC rồi mới
// tới cấp tỉnh, để mẫu nào có ở cả hai thì trang trỏ vào tệp cấp xã — tệp đúng
// với việc người dân đang làm, và nhẹ hơn bản cấp tỉnh gần bốn lần.
const mauXaMap = tachMau(dongXa, 'Phu-luc-II-cap-xa-noi-dung-chi-tiet.docx');
const mauTinhMap = tachMau(dongMau, 'Phu-luc-I-cap-tinh-noi-dung-chi-tiet-va-mau-don.docx');
const gop = new Map(mauTinhMap);
for (const [so, m] of mauXaMap) {
  const cu = gop.get(so);
  gop.set(so, cu && cu.ten.length > m.ten.length ? { ...cu, tep: m.tep } : m);
}
const mau = [...gop.values()].sort((a, b) => a.so.localeCompare(b.so, 'vi', { numeric: true }));

/**
 * Ghép thời hạn từ danh mục vào từng thủ tục.
 *
 * Bản chi tiết đặt tên là "Trình tự, thủ tục <việc>", bản danh mục chỉ ghi
 * "<việc>" — phải bỏ tiền tố rồi mới so, nếu không khớp được 0/19.
 */
const chuan = (s) =>
  s.toLowerCase()
    .replace(/^trình tự,?\s*thủ tục\s*/i, '')
    .replace(/[.,;]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// Ghép theo VỊ TRÍ, không theo tên. Hai bản liệt kê 19 thủ tục cùng một thứ tự,
// còn ghép theo tên thì thủ tục 8 và 9 dính vào nhau (cùng mở đầu "đăng ký đất
// đai, tài sản gắn liền với đất, cấp Giấy chứng nhận … lần đầu", chỉ khác ở đuôi
// "đối với tổ chức" / "đối với hộ gia đình, cá nhân"), 12 và 16 cũng vậy — kết
// quả là hai thủ tục cùng mang một số thứ tự và hai số khác biến mất.
//
// Vị trí thì ghép đúng, nhưng phải KIỂM chứ không tin suông: nếu bản gốc đổi thứ
// tự ở lần công bố sau mà không ai để ý, cả trang lẫn trợ lý sẽ gán sai thời hạn
// cho từng thủ tục — sai lặng lẽ và không ai phát hiện. Nên lệch là dừng hẳn.
const chinh = danhMuc.capXa.filter((d) => !d.stt.includes('.'));
if (chinh.length !== thuTuc.length) {
  console.error(`✗ Danh mục có ${chinh.length} thủ tục cấp xã, bản chi tiết có ${thuTuc.length} — không ghép được.`);
  process.exit(1);
}
let lech = 0;
thuTuc.forEach((t, i) => {
  const d = chinh[i];
  t.stt = d.stt;
  t.thoiHanDanhMuc = d.thoiHan;
  // 30 ký tự đầu đủ để phát hiện lệch thứ tự, mà vẫn chịu được khác biệt vặt
  // về hoa/thường và dấu câu giữa hai bản.
  const [a, b] = [chuan(t.ten).slice(0, 30), chuan(d.ten).slice(0, 30)];
  if (a !== b) { console.error(`✗ Thứ tự lệch ở mục ${d.stt}:\n   chi tiết: ${a}\n   danh mục: ${b}`); lech++; }
});
if (lech) process.exit(1);

// Mẫu nào thật sự được 19 thủ tục CẤP XÃ nhắc tới. Danh sách mẫu gom từ cả phụ
// lục cấp tỉnh nên có những mẫu chỉ dùng cho thủ tục của Sở — đưa hết lên trang
// của phường là bắt người dân đọc nhầm phần không phải việc của mình.
const dungOXa = new Set(thuTuc.flatMap((t) => t.mauNhacToi));
for (const m of mau) m.dungOCapXa = dungOXa.has(m.so);

const dem = (g) => mau.filter((m) => m.aiDien === g).length;
console.log(`▸ TTHC cấp xã tách được: ${thuTuc.length}`);
console.log(`▸ Danh mục: ${danhMuc.capTinh.filter((x) => !x.stt.includes('.')).length} cấp tỉnh · ${danhMuc.capXa.filter((x) => !x.stt.includes('.')).length} cấp xã (chưa kể mục con)`);
console.log(`▸ Ghép được thời hạn cho: ${thuTuc.filter((t) => t.stt).length}/${thuTuc.length}`);
console.log(`▸ Mẫu đơn: ${mau.length} — dân điền ${dem('dan')}, cơ quan ${dem('coquan')}, chưa rõ ${dem('khac')}`);
console.log(`▸ Trong đó dùng ở cấp xã: ${mau.filter((m) => m.dungOCapXa).length}`);

// ── Ghép mục con vào thủ tục cha ────────────────────────────────────────────
// Thủ tục 6 và 9 không có thời hạn riêng: chúng chia thành 6.1/6.2 và 9.1/9.2,
// mỗi nhánh một thời hạn khác nhau. Bỏ nhánh đi thì hai thủ tục này hiện ra
// không có thời hạn nào cả, mà đó lại đúng là điều người dân đến hỏi.
for (const t of thuTuc) {
  const con = danhMuc.capXa.filter((d) => d.stt.startsWith(`${t.stt}.`));
  if (con.length) t.mucCon = con.map((c) => ({ stt: c.stt, ten: c.ten, thoiHan: c.thoiHan }));
}

const NGUON = 'Quyết định công bố TTHC mới ban hành lĩnh vực đất đai và Quyết định phê duyệt quy trình nội bộ, Văn phòng UBND tỉnh Quảng Ninh, tháng 7/2026 (Tờ trình số 576/TTr-SNN&MT-VP ngày 09/7/2026 của Sở Nông nghiệp và Môi trường)';

const chung = {
  capNhat: '05/8/2026',
  nguon: NGUON,
  nguoiKy: 'Phạm Đức Thắng — Chánh Văn phòng UBND tỉnh Quảng Ninh',
  noiNop: [
    'Trực tiếp: Trung tâm Phục vụ hành chính công tỉnh; Trung tâm Phục vụ hành chính công các xã, phường, đặc khu và điểm tiếp nhận, trả kết quả',
    'Trực tuyến: https://dichvucong.gov.vn/',
    'Qua dịch vụ bưu chính công ích',
  ],
  luuY: 'Đây là bản tóm lược để tra cứu, không thay thế văn bản gốc. Trước khi đi nộp hồ sơ nên gọi hỏi lại Trung tâm Phục vụ hành chính công phường Đông Triều, vì thành phần hồ sơ có thể đổi theo từng trường hợp cụ thể.',
  vichSaoChiCapXa:
    'Bộ văn bản gốc có 32 thủ tục cấp tỉnh và 19 thủ tục cấp xã. Cổng này chỉ hướng dẫn chi tiết 19 thủ tục cấp xã, vì đó là những việc người dân Đông Triều nộp hồ sơ ngay tại phường. Danh mục cấp tỉnh vẫn liệt kê ở dưới để biết việc nào phải lên tỉnh.',
};

fs.writeFileSync(
  path.join(OUT, 'tthc-dat-dai.json'),
  `${JSON.stringify({
    ...chung,
    linhVuc: 'Đất đai',
    coQuanQuanLy: 'Sở Nông nghiệp và Môi trường tỉnh Quảng Ninh',
    tongSo: { capXa: thuTuc.length, capTinh: danhMuc.capTinh.filter((x) => !x.stt.includes('.')).length },
    capXa: thuTuc,
    capTinh: danhMuc.capTinh.filter((x) => !x.stt.includes('.')),
  }, null, 2)}\n`,
  'utf8',
);

const mauXa = mau.filter((m) => m.dungOCapXa);
fs.writeFileSync(
  path.join(OUT, 'tthc-mau-don.json'),
  `${JSON.stringify({
    ...chung,
    gioiThieu: 'Các mẫu đơn, mẫu tờ khai kèm theo 19 thủ tục hành chính đất đai cấp xã.',
    viSaoTachHaiNhom:
      'Văn bản gốc liệt kê chung một danh sách "mẫu đơn, mẫu tờ khai" cho mỗi thủ tục, trộn lẫn giấy người dân phải viết với giấy cơ quan tự làm trong nội bộ (tờ trình, dự thảo quyết định, phiếu chuyển thông tin, biên bản bàn giao). Đọc thẳng danh sách đó, người dân tưởng phải chuẩn bị hơn chục tờ giấy, trong khi thực tế chỉ phải điền một tới bốn tờ. Vì vậy trang này tách rõ hai nhóm.',
    tongSo: {
      tatCa: mauXa.length,
      danDien: mauXa.filter((m) => m.aiDien === 'dan').length,
      coQuanLam: mauXa.filter((m) => m.aiDien === 'coquan').length,
    },
    danhSach: mauXa,
  }, null, 2)}\n`,
  'utf8',
);

fs.rmSync(path.join(OUT, '_tthc-raw.json'), { force: true });
console.log('\n→ server/prisma/seed-data/tthc-dat-dai.json');
console.log('→ server/prisma/seed-data/tthc-mau-don.json');
