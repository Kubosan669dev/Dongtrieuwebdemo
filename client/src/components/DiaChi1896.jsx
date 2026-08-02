import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ScrollText, Search, X } from 'lucide-react';
import { SectionHeading } from './ui.jsx';
import { cx, deaccentLower } from '../lib/format.js';

/**
 * “Đông Triều huyện địa chí” — Tri huyện Ngô Sinh chép năm Thành Thái thứ 8
 * (1896), ký hiệu A.1940. Dữ liệu ở khoá cài đặt `diaChi1896`.
 *
 * ── ĐÂY LÀ ĐƠN VỊ THỨ BA, PHẢI NÓI RÕ NGAY TỪ ĐẦU ───────────────────────────
 * Trang này đã phải phân biệt phường Đông Triều với thành phố Đông Triều cũ
 * (xem VungDat.jsx). Nguồn 1896 thêm một đơn vị nữa: HUYỆN Đông Triều thuộc
 * tỉnh **Hải Dương**, còn 5 tổng 52 xã thôn, trong đó có cả núi Yên Tử, Mạo
 * Khê, Hồ Thiên — nay thuộc Uông Bí và các phường xã khác. Người đọc lướt qua
 * rất dễ tưởng Yên Tử nằm trong phường mình, nên câu cảnh báo đứng NGAY DƯỚI
 * tiêu đề chứ không nằm ở chân trang.
 *
 * ── VĂN BẢN QUA OCR ─────────────────────────────────────────────────────────
 * Nguồn là bản scan trích xuất bằng OCR. Mục Hiệu đính ở cuối liệt kê từng chỗ
 * đã sửa kèm lý do (niên hiệu sai, tên vua sai). Đây là cổng thông tin chính
 * thức của phường, nên chỗ nào sửa của người khác thì phải nói ra.
 *
 * ── PHẦN ĐÁNG GIÁ NHẤT ──────────────────────────────────────────────────────
 * Không phải chín ngọn núi hay mười lăm thứ thổ sản, mà là bảng đối chiếu KHU
 * PHỐ HÔM NAY ↔ XÃ CŨ TRONG SÁCH: 8 trong 11 khu phố mang đúng tên sách đã
 * chép. Đó là thứ khiến một cuốn địa chí 130 năm tuổi thành ra có việc với
 * người đang sống ở đây. Nên nó đứng đầu, trước cả núi sông.
 */

/** Bỏ lớp vỏ chung để tên riêng đứng một mình cho dễ đọc trong ô tra. */
const chuanTen = (s) => String(s ?? '').replace(/^(núi|sông|chùa cổ|chùa|đền|miếu|chợ|cầu)\s+/i, '');

/**
 * Một mục có thể mở ra — dùng `<details>` của trình duyệt.
 *
 * Chín ngọn núi và bảy cổ tích, mỗi mục một đoạn dài, mà bày hết ra thì thành
 * bức tường chữ. `<details>` gập lại được, chạy cả khi tắt JavaScript, và bàn
 * phím dùng được sẵn — không cần viết lại phần đóng mở.
 */
function MucGap({ ten, phu, moTa, cauNoi, nayThuoc, lienKet, moSan = false }) {
  return (
    <details open={moSan} className="group card overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="shrink-0 text-gold-600 transition-transform group-open:rotate-180 motion-reduce:transition-none dark:text-gold-400"
        />
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-lg font-bold leading-snug text-jade-900 dark:text-jade-50">{ten}</span>
          {phu && <span className="mt-0.5 block text-xs text-subtle">{phu}</span>}
        </span>
      </summary>
      <div className="border-t border-jade-900/[0.12] px-4 pb-4 pt-3 dark:border-white/10">
        <p className="leading-relaxed text-muted">{moTa}</p>
        {cauNoi && (
          <blockquote className="mt-3 border-l-2 border-gold-400 pl-3 font-serif italic text-body">{cauNoi}</blockquote>
        )}
        {nayThuoc && <p className="mt-3 text-sm text-subtle">Nay: {nayThuoc}.</p>}
        {lienKet?.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="text-subtle">Còn trên cổng:</span>
            {lienKet.map((l) => (
              <Link key={l.url + l.label} to={l.url} className="font-medium text-jade-700 underline dark:text-jade-200">
                {l.label}
              </Link>
            ))}
          </p>
        )}
      </div>
    </details>
  );
}

/** Tiêu đề một mục của sách, đặt đúng tên mà nguyên bản dùng. */
function TieuDeMuc({ children, ghiChu }) {
  return (
    <div className="mb-4 mt-10 flex items-baseline gap-3 border-b border-jade-900/[0.12] pb-2 dark:border-white/10">
      <h3 className="font-serif text-sm font-bold uppercase tracking-[0.2em] text-jade-900 dark:text-jade-50">
        {children}
      </h3>
      {ghiChu && <span className="text-xs text-subtle">{ghiChu}</span>}
    </div>
  );
}

export default function DiaChi1896({ diaChi, heritages = [], attractions = [] }) {
  const [tim, setTim] = useState('');

  // Địa danh 1896 → bản ghi CÓ THẬT trên cổng hôm nay. Di tích có trang riêng;
  // điểm đến lân cận thì chưa, nên dẫn về trang danh mục.
  const banDo = useMemo(() => {
    const m = new Map();
    for (const h of heritages) m.set(h.slug, { label: h.name, url: `/di-tich/${h.slug}` });
    for (const a of attractions) if (!m.has(a.slug)) m.set(a.slug, { label: a.name, url: '/di-tich' });
    return m;
  }, [heritages, attractions]);
  const noi = (slugs) => (slugs ?? []).map((s) => banDo.get(s)).filter(Boolean);

  const khoa = deaccentLower(tim.trim());
  const loc = (ds, ...truong) =>
    !khoa
      ? ds
      : ds.filter((x) => deaccentLower(truong.map((t) => x[t] ?? '').join(' ')).includes(khoa));

  if (!diaChi?.nguon) return null;
  const { nui = [], song = [], cau = [], cho = [], coTich = [], nhanVat = [], thoSan = [], doiTen = [] } = diaChi;
  const khuXua = diaChi.khuPhoXua?.danhSach ?? [];

  const nuiLoc = loc(nui, 'ten', 'o', 'moTa');
  const coTichLoc = loc(coTich, 'ten', 'o', 'moTa');
  const nhanVatLoc = loc(nhanVat, 'ten', 'que', 'moTa');
  const thoSanLoc = loc(thoSan, 'ten', 'o');
  const songLoc = loc(song, 'ten', 'moTa');
  const soKhop = nuiLoc.length + coTichLoc.length + nhanVatLoc.length + thoSanLoc.length + songLoc.length;

  return (
    <section data-vao id="dia-chi-1896" className="mt-16 scroll-mt-24">
      <SectionHeading
        eyebrow="Tư liệu Hán Nôm"
        title="Đông Triều huyện địa chí, năm 1896"
        description="Tri huyện đương nhiệm chép lại toàn bộ huyện mình: thành trì, núi sông, cầu chợ, đường sá, nhân vật, phong tục, cổ tích và thổ sản."
      />

      {/* ── Trang bìa: xuất xứ + hai câu cảnh báo ──
          Câu trích của Phạm Sư Mạnh mở đầu vì đó là câu đặc trưng nhất trong cả
          cuốn sách — một lời khen vùng đất từ thế kỷ 14, được dẫn lại năm 1896. */}
      <div className="card border-l-4 border-gold-400 p-6">
        <blockquote className="font-serif text-xl italic leading-relaxed text-jade-900 dark:text-jade-50">
          “Đông Triều là nơi có nhiều sông núi tự nhiên rất đẹp.”
          <footer className="mt-2 font-sans text-sm not-italic text-subtle">
            — Phạm Sư Mạnh, được dẫn lại trong sách
          </footer>
        </blockquote>

        <dl className="mt-6 grid gap-x-6 gap-y-3 border-t border-jade-900/[0.12] pt-5 text-sm sm:grid-cols-2 dark:border-white/10">
          {[
            ['Người chép', diaChi.tacGia],
            ['Niên đại', diaChi.nienDai],
            ['Ký hiệu', diaChi.kyHieu],
            ['Trích từ', diaChi.trichTu],
          ]
            .filter(([, v]) => v)
            .map(([nhan, gt]) => (
              <div key={nhan} className="flex gap-2">
                <dt className="shrink-0 text-subtle">{nhan}:</dt>
                <dd className="text-body">{gt}</dd>
              </div>
            ))}
        </dl>

        {diaChi.canhBao && (
          <p className="mt-5 rounded-md bg-gold-400/15 p-3 text-sm text-body">⚠️ {diaChi.canhBao}</p>
        )}
        {diaChi.luuYVanBan && <p className="mt-3 text-sm text-subtle">ℹ️ {diaChi.luuYVanBan}</p>}
      </div>

      {/* ── Khu phố hôm nay ↔ xã cũ trong sách ──
          Phần đáng giá nhất của cả khối, nên đứng trước núi sông. Cột “chắc” cố
          ý hiện rõ: hai dòng phỏng đoán không được trông giống tám dòng chắc. */}
      {khuXua.length > 0 && (
        <div className="mt-10">
          <TieuDeMuc ghiChu="đối chiếu do cổng tự làm">Khu phố hôm nay trong sách</TieuDeMuc>
          <p className="mb-4 text-lg font-medium text-body">{diaChi.khuPhoXua.tieuDe}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {khuXua.map((k) => (
              <li
                key={k.khu}
                data-khu-xua={k.khu}
                className={cx('card p-4', k.xua && k.chac && 'border-l-4 border-jade-600')}
              >
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-serif text-lg font-bold text-jade-900 dark:text-jade-50">{k.khu}</span>
                  {k.xua ? (
                    <>
                      <span aria-hidden="true" className="text-subtle">
                        ←
                      </span>
                      <span className="font-serif text-lg text-gold-700 dark:text-gold-400">{k.xua}</span>
                    </>
                  ) : (
                    <span className="text-sm text-subtle">— không có trong sách</span>
                  )}
                  {k.xua && !k.chac && (
                    <span className="chip bg-white text-jade-900 ring-1 ring-inset ring-jade-300 dark:bg-jade-900 dark:text-jade-50 dark:ring-jade-700">
                      phỏng đoán
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{k.viec}</p>
                {k.trong && <p className="mt-2 text-xs text-subtle">Sách nhắc ở mục: {k.trong}</p>}
                {noi(k.slug).length > 0 && (
                  <p className="mt-2 flex flex-wrap gap-2 text-sm">
                    {noi(k.slug).map((l) => (
                      <Link key={l.url + l.label} to={l.url} className="font-medium text-jade-700 underline dark:text-jade-200">
                        {l.label}
                      </Link>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-subtle">{diaChi.khuPhoXua.moTa}</p>
          <Link to="/khu-pho" className="btn-ghost mt-3">
            Xem 11 khu phố hôm nay
          </Link>
        </div>
      )}

      {/* ── Ô tra tên trong sách ── */}
      <div className="mt-12">
        <label htmlFor="tim-dia-chi" className="eyebrow">
          Tra một cái tên trong sách
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-md bg-white px-4 ring-1 ring-inset ring-jade-900/[0.12] focus-within:ring-2 focus-within:ring-jade-500 dark:bg-jade-900/50 dark:ring-white/10">
          <Search size={18} className="shrink-0 text-subtle" aria-hidden="true" />
          <input
            id="tim-dia-chi"
            value={tim}
            onChange={(e) => setTim(e.target.value)}
            placeholder="Gõ tên làng, tên núi, tên người… ví dụ: Mỹ Cụ, Quy Sơn, Yên Lâm"
            className="w-full bg-transparent py-3.5 text-sm outline-none"
          />
          {tim && (
            <button
              type="button"
              onClick={() => setTim('')}
              aria-label="Xoá ô tra"
              className="grid h-7 w-7 shrink-0 place-items-center rounded text-subtle hover:bg-jade-100 dark:hover:bg-jade-800"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted" role="status">
          {khoa
            ? `Tìm thấy ${soKhop} mục khớp với “${tim.trim()}”.`
            : `Sách chép ${nui.length} ngọn núi, ${song.length} con sông, ${cau.length} cây cầu, ${cho.length} cái chợ, ${coTich.length} cổ tích, ${nhanVat.length} mục nhân vật và ${thoSan.length} thứ thổ sản.`}
        </p>
      </div>

      {/* ── Diên cách ── */}
      {diaChi.dienCach?.length > 0 && !khoa && (
        <>
          <TieuDeMuc ghiChu="mục Diên cách">Đông Triều đổi thay qua các đời</TieuDeMuc>
          <ol id="dien-cach-1896" className="ml-3 space-y-3 border-l-2 border-jade-100 pl-6 dark:border-jade-800">
            {diaChi.dienCach.map((d) => (
              <li key={d.moc} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[1.72rem] top-4 h-2.5 w-2.5 rounded-full bg-gold-400 ring-4 ring-paper dark:ring-jade-950"
                />
                <div className="card p-4">
                  <p className="font-serif font-bold text-jade-900 dark:text-jade-50">{d.moc}</p>
                  <p className="mt-1 leading-relaxed text-muted">{d.viec}</p>
                </div>
              </li>
            ))}
          </ol>
          {diaChi.thanhTri && (
            <div className="card mt-4 p-5">
              <p className="eyebrow">Thành trì</p>
              <p className="mt-2 leading-relaxed text-muted">{diaChi.thanhTri.moTa}</p>
              <p className="mt-2 leading-relaxed text-muted">{diaChi.thanhTri.thanhDat}</p>
            </div>
          )}
        </>
      )}

      {/* ── Sơn xuyên ── */}
      {nuiLoc.length > 0 && (
        <>
          <TieuDeMuc ghiChu={`mục Sơn xuyên · ${nuiLoc.length}/${nui.length} ngọn`}>Núi non</TieuDeMuc>
          <div className="grid gap-3 lg:grid-cols-2">
            {nuiLoc.map((n) => (
              <MucGap
                key={n.ten}
                ten={n.ten}
                phu={n.o}
                moTa={n.moTa}
                cauNoi={n.cauNoi}
                nayThuoc={n.nayThuoc}
                lienKet={noi(n.slug)}
                moSan={Boolean(khoa)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Sông ngòi, cầu, chợ ── */}
      {songLoc.length > 0 && (
        <>
          <TieuDeMuc ghiChu="mục Sông ngòi">Sông, cầu và chợ</TieuDeMuc>
          <div className="grid gap-3 lg:grid-cols-2">
            {songLoc.map((s) => (
              <MucGap key={s.ten} ten={s.ten} moTa={s.moTa} moSan={Boolean(khoa)} />
            ))}
          </div>
          {!khoa && (
            <div className="card mt-3 grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs text-subtle">{cau.length} cây cầu</p>
                <p className="mt-1.5 leading-relaxed text-body">{cau.map(chuanTen).join(' · ')}</p>
              </div>
              <div>
                <p className="text-xs text-subtle">{cho.length} cái chợ</p>
                <p className="mt-1.5 leading-relaxed text-body">{cho.map((c) => chuanTen(c.ten)).join(' · ')}</p>
                {diaChi.choGhiChu && <p className="mt-2 text-sm text-subtle">{diaChi.choGhiChu}</p>}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Cổ tích ── */}
      {coTichLoc.length > 0 && (
        <>
          <TieuDeMuc ghiChu={`mục Cổ tích · ${coTichLoc.length}/${coTich.length} nơi`}>Cổ tích</TieuDeMuc>
          <div className="grid gap-3 lg:grid-cols-2">
            {coTichLoc.map((c) => (
              <MucGap
                key={c.ten}
                ten={c.ten}
                phu={c.o}
                moTa={c.moTa}
                cauNoi={c.cauNoi}
                nayThuoc={c.nayThuoc}
                lienKet={noi(c.slug)}
                moSan={Boolean(khoa)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Nhân vật ──
          Bày dạng sổ bộ (tên · quê · thời) chứ không phải thẻ ảnh: nguyên bản là
          một bản kê, và phần lớn các mục chỉ còn tên với chức tước. */}
      {nhanVatLoc.length > 0 && (
        <>
          <TieuDeMuc ghiChu={`mục Nhân vật · ${nhanVatLoc.length}/${nhanVat.length} mục`}>Nhân vật</TieuDeMuc>
          <ul id="nhan-vat-1896" className="card divide-y divide-jade-900/[0.12] dark:divide-white/10">
            {nhanVatLoc.map((n) => (
              <li key={n.ten} className="p-4">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-serif text-lg font-bold text-jade-900 dark:text-jade-50">{n.ten}</span>
                  {n.que && <span className="text-sm text-subtle">{n.que}</span>}
                  {n.thoi && (
                    <span className="chip bg-white text-jade-900 ring-1 ring-inset ring-jade-300 dark:bg-jade-900 dark:text-jade-50 dark:ring-jade-700">
                      {n.thoi}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 leading-relaxed text-muted">{n.moTa}</p>
                {noi(n.slug).length > 0 && (
                  <p className="mt-2 flex flex-wrap gap-2 text-sm">
                    {noi(n.slug).map((l) => (
                      <Link key={l.url + l.label} to={l.url} className="font-medium text-jade-700 underline dark:text-jade-200">
                        {l.label}
                      </Link>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* ── Phong tục ── */}
      {diaChi.phongTuc?.lang?.length > 0 && !khoa && (
        <>
          <TieuDeMuc ghiChu="mục Phong tục">Phong tục các làng</TieuDeMuc>
          <p className="leading-relaxed text-muted">{diaChi.phongTuc.moTa}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {diaChi.phongTuc.lang.map((l) => (
              <li key={l.ten} className="card p-4">
                <p className="font-serif font-bold text-jade-900 dark:text-jade-50">{l.ten}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{l.noiTroi}</p>
              </li>
            ))}
          </ul>
          {diaChi.phongTuc.hocHanh && <p className="mt-4 text-sm text-subtle">{diaChi.phongTuc.hocHanh}</p>}
        </>
      )}

      {/* ── Kỹ nghệ & thổ sản ── */}
      {thoSanLoc.length > 0 && (
        <>
          <TieuDeMuc ghiChu={`mục Thổ sản · ${thoSanLoc.length}/${thoSan.length} thứ`}>Kỹ nghệ và thổ sản</TieuDeMuc>
          {!khoa && diaChi.kyNghe && <p className="mb-4 leading-relaxed text-muted">{diaChi.kyNghe}</p>}
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {thoSanLoc.map((t) => (
              <li key={t.ten} className="card p-3.5">
                <p className="font-medium text-body">{t.ten}</p>
                <p className="mt-0.5 text-xs text-subtle">{t.o}</p>
                {t.moTa && <p className="mt-1.5 text-sm text-muted">{t.moTa}</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* ── Sợi dây nối tới hôm nay ──
          Không phải trang trí: mục Thổ sản đã chép than ở Mạo Khê và Trường Bạch
          từ 1896, mà khối Kinh tế ngay trên trang này vẫn lấy than làm ngành chủ
          lực. Đặt hai điều đó cạnh nhau là việc mà chỉ trang này làm được. */}
      {diaChi.noiTiepHomNay && !khoa && (
        <div className="card mt-10 border-l-4 border-jade-600 p-6">
          <p className="eyebrow">Nối tới hôm nay</p>
          <h4 className="mt-2 font-serif text-xl font-bold text-jade-900 dark:text-jade-50">
            {diaChi.noiTiepHomNay.tieuDe}
          </h4>
          <p className="mt-2 leading-relaxed text-muted">{diaChi.noiTiepHomNay.noiDung}</p>
        </div>
      )}

      {/* ── Hiệu đính ──
          Gập lại vì ít người cần, nhưng KHÔNG được bỏ: cổng đã sửa chữ của một
          văn bản gốc thì phải nói rõ sửa chỗ nào và vì sao. */}
      {diaChi.hieuDinh?.length > 0 && !khoa && (
        <details className="group mt-6">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-subtle [&::-webkit-details-marker]:hidden">
            <ChevronDown
              size={16}
              aria-hidden="true"
              className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
            <ScrollText size={16} aria-hidden="true" />
            {diaChi.hieuDinh.length} chỗ cổng đã hiệu đính so với bản OCR
          </summary>
          <ul id="hieu-dinh-1896" className="mt-3 space-y-2">
            {diaChi.hieuDinh.map((h) => (
              <li key={h.chua} className="card p-4 text-sm">
                <p className="text-body">
                  <span className="text-subtle line-through">{h.chua}</span>
                  <span aria-hidden="true" className="mx-2 text-subtle">
                    →
                  </span>
                  <strong>{h.sua}</strong>
                </p>
                <p className="mt-1 text-muted">{h.vi}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Không có mục nào khớp ô tra — nói thẳng thay vì để một khoảng trắng. */}
      {khoa && soKhop === 0 && (
        <p className="card mt-6 p-6 text-center text-muted">
          Không có mục nào trong sách khớp với “{tim.trim()}”. Thử gõ ít chữ hơn, hoặc gõ tên làng cũ — ví dụ “Đạm
          Thuỷ”, “Mễ Xá”, “Yên Lâm”.
        </p>
      )}

      {doiTen.length > 0 && !khoa && (
        <p className="mt-6 text-sm text-subtle">
          Sách còn chép {doiTen.length} làng từng đổi tên: {doiTen.map((d) => `${d.xua} → ${d.nay}`).join(' · ')}.
        </p>
      )}
    </section>
  );
}
