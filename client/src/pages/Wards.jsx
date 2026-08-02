import { useMemo, useState } from 'react';
import { Home, Landmark, Ruler, Search, Users, X } from 'lucide-react';
import PageHero from '../components/PageHero.jsx';
import Seo from '../components/Seo.jsx';
import { EmptyState } from '../components/ui.jsx';
import { useSettings } from '../hooks/useSettings.js';
import { cx, deaccentLower } from '../lib/format.js';

/**
 * 11 khu phố của phường Đông Triều.
 *
 * ── VÌ SAO CÓ TRANG NÀY ─────────────────────────────────────────────────────
 * Dữ liệu 11 khu phố đã nằm sẵn trong cơ sở dữ liệu (khoá cài đặt `khuPho`, do
 * `build-dataset` sinh ra) và đã công khai qua `GET /api/settings` — nhưng trước
 * nay CHỈ trợ lý AI đọc tới. Người vào trang không thấy một chữ nào.
 *
 * Đó lại đúng là thứ chỉ người dân mới cần: sau sắp xếp, 36 khu phố cũ gộp thành
 * 11 khu mới, nên câu hỏi thật của bà con là "khu tôi ở giờ tên gì, nhà văn hoá
 * ở đâu, ghi địa chỉ thế nào cho đúng". Cả ba câu đều trả lời được bằng dữ liệu
 * đang có, không phải nhập thêm gì và không phải sửa máy chủ một dòng nào.
 *
 * Ô tìm cố ý khớp CẢ tên khu cũ: gõ "Thủ Dương" hay "Mỹ Cụ 2" — những cái tên bà
 * con vẫn quen gọi — phải ra được khu mới. Tìm theo tên mới thì đã chẳng cần tra.
 */

/** Số kiểu Việt: dấu chấm ngăn hàng nghìn, dấu phẩy ngăn thập phân. */
const soVN = new Intl.NumberFormat('vi-VN');
const soLe = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

/**
 * Tách chuỗi `gom` thành danh sách tên khu cũ.
 *
 * Dữ liệu có hai lối viết tắt phải xử lý, nếu không thì tra cứu sai:
 *
 *  · "Nguyễn Huệ 3 + 4 + 5 + 6 + 7 + 8 + 9" — các phần sau lược mất tiền tố. Cắt
 *    thô ra là được sáu cái nhãn "4", "5", "6"… vô nghĩa, và bà con ở Nguyễn Huệ 7
 *    gõ đúng tên khu mình thì KHÔNG tìm thấy gì. Nên phải mượn lại tiền tố của
 *    phần liền trước.
 *  · "Giữ nguyên khu Đạm Thuỷ" — một câu chứ không phải danh sách. Khu này không
 *    gộp với ai, và vẫn tính là một khu cũ (11 khu ứng với 36 khu cũ chỉ đúng khi
 *    đếm cả nó).
 */
function tachKhuCu(gom) {
  const tho = String(gom ?? '')
    .split('+')
    .map((s) => s.trim())
    .filter(Boolean);
  let tienTo = '';
  return tho.map((phan) => {
    if (/^\d+$/.test(phan)) return tienTo ? `${tienTo} ${phan}` : phan;
    const co = phan.match(/^(.*\S)\s+\d+$/);
    tienTo = co ? co[1] : '';
    return phan;
  });
}

/** Khu không gộp với ai — `gom` là một câu, không phải danh sách tên. */
const laGiuNguyen = (gom) => /^\s*giữ nguyên/i.test(String(gom ?? ''));

function DongSo({ icon: Icon, so, nhan }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={18} className="shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" />
      <span>
        <span className="block font-serif text-xl font-bold leading-none tabular-nums text-jade-900 dark:text-jade-50">
          {so}
        </span>
        <span className="mt-1 block text-xs text-muted">{nhan}</span>
      </span>
    </div>
  );
}

/**
 * Một khu phố.
 *
 * `khopVoi` là tên khu cũ đang khớp với ô tìm — được tô nổi để mắt bắt được ngay
 * dòng mình cần, thay vì phải đọc lại cả danh sách vừa lọc xong.
 */
function TheKhuPho({ kp, khopVoi }) {
  return (
    <li className="card flex flex-col p-5" data-khu={kp.ten}>
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-sm font-bold tabular-nums text-subtle">
          {String(kp.so).padStart(2, '0')}
        </span>
        <h2 className="font-serif text-xl font-bold leading-snug text-jade-900 dark:text-jade-50">
          Khu phố {kp.ten}
        </h2>
      </div>

      <div className="mt-3">
        {kp.giuNguyen ? (
          <p className="text-xs text-muted">Giữ nguyên, không gộp với khu nào.</p>
        ) : (
          <>
            <p className="text-xs text-subtle">Gộp từ {kp.khuCu.length} khu cũ</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {kp.khuCu.map((ten) => {
                const dangKhop = khopVoi && deaccentLower(ten).includes(khopVoi);
                return (
                  <li
                    key={ten}
                    className={cx(
                      'chip ring-1 ring-inset',
                      dangKhop
                        ? 'bg-gold-400 text-jade-950 ring-gold-500'
                        : 'text-jade-800 ring-jade-900/[0.12] dark:text-jade-100 dark:ring-white/10',
                    )}
                  >
                    {ten}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-2 border-t border-jade-900/[0.12] pt-4 text-sm dark:border-white/10">
        <div>
          <dt className="text-xs text-subtle">Số hộ</dt>
          <dd className="tabular-nums text-body">{soVN.format(kp.soHo ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-xs text-subtle">Nhân khẩu</dt>
          <dd className="tabular-nums text-body">{soVN.format(kp.nhanKhau ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-xs text-subtle">Diện tích</dt>
          <dd className="tabular-nums text-body">{soLe.format(kp.dienTichKm2 ?? 0)} km²</dd>
        </div>
        <div>
          <dt className="text-xs text-subtle">Nhà văn hoá</dt>
          <dd className="text-body">{kp.nhaVanHoa || '—'}</dd>
        </div>
      </dl>
    </li>
  );
}

export default function Wards() {
  const settings = useSettings();
  const bang = settings.khuPho;
  const [tim, setTim] = useState('');

  // Mở rộng một lần rồi dùng lại cho cả hiển thị lẫn tìm kiếm. Nếu tìm trên chuỗi
  // `gom` gốc thì "Nguyễn Huệ 7" không bao giờ khớp — chuỗi gốc chỉ có "Nguyễn
  // Huệ 3 + 4 + … + 9", không hề chứa cụm đó.
  const danhSach = useMemo(
    () =>
      (bang?.danhSach ?? []).map((k) => {
        const khuCu = tachKhuCu(k.gom);
        return { ...k, khuCu, giuNguyen: laGiuNguyen(k.gom), tim: deaccentLower([k.ten, ...khuCu, k.nhaVanHoa].join(' ')) };
      }),
    [bang],
  );

  // Cộng từ chính dữ liệu, không gõ tay: thêm hay tách khu phố thì các con số ở
  // đầu trang tự đúng theo, không sinh ra một chỗ nữa để lệch.
  const tong = useMemo(
    () =>
      danhSach.reduce(
        (a, k) => ({
          khuCu: a.khuCu + k.khuCu.length,
          soHo: a.soHo + (k.soHo ?? 0),
          nhanKhau: a.nhanKhau + (k.nhanKhau ?? 0),
          dienTich: a.dienTich + (k.dienTichKm2 ?? 0),
        }),
        { khuCu: 0, soHo: 0, nhanKhau: 0, dienTich: 0 },
      ),
    [danhSach],
  );

  const khoa = deaccentLower(tim.trim());
  const loc = useMemo(
    () => (khoa ? danhSach.filter((k) => k.tim.includes(khoa)) : danhSach),
    [danhSach, khoa],
  );

  return (
    <div>
      <Seo
        title="Khu phố Đông Triều"
        description="Danh sách 11 khu phố của phường Đông Triều sau sắp xếp: tên khu mới, các khu cũ đã gộp vào, số hộ, nhân khẩu, diện tích và nhà văn hoá của từng khu."
      />
      <PageHero
        title="11 khu phố của phường"
        description="Sau sắp xếp, 36 khu phố cũ được tổ chức lại thành 11 khu phố. Gõ tên khu cũ mà bà con vẫn quen gọi để biết nay thuộc khu nào."
        breadcrumb={[{ label: 'Khu phố' }]}
      />

      <div className="container-page py-10">
        {danhSach.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="Chưa có danh sách khu phố"
            description="Danh sách 11 khu phố sẽ hiện ở đây ngay khi được cập nhật trong phần Cài đặt của trang quản trị."
          />
        ) : (
          <>
            {/* ── Dải số liệu ── */}
            <div data-vao className="card grid grid-cols-2 gap-5 p-5 sm:grid-cols-4 sm:p-6">
              <DongSo icon={Landmark} so={danhSach.length} nhan={`khu phố · từ ${tong.khuCu} khu cũ`} />
              <DongSo icon={Home} so={soVN.format(tong.soHo)} nhan="hộ dân" />
              <DongSo icon={Users} so={soVN.format(tong.nhanKhau)} nhan="nhân khẩu" />
              {/* Đơn vị nằm ở nhãn chứ không ghép vào con số: ở khổ 360px thì
                  "40,41 km²" xuống dòng đúng giữa, bỏ lại "km²" đứng một mình
                  bằng cỡ chữ của con số. */}
              <DongSo icon={Ruler} so={soLe.format(tong.dienTich)} nhan="km² diện tích tự nhiên" />
            </div>

            {/* ── Ô tìm ──
                Đây là lý do trang này tồn tại, nên nó đứng riêng một hàng và to
                hơn ô tìm ở các trang danh sách khác. */}
            <div className="mt-8">
              <label htmlFor="tim-khu-pho" className="eyebrow">
                Tra cứu khu phố
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-md bg-white px-4 ring-1 ring-inset ring-jade-900/[0.12] focus-within:ring-2 focus-within:ring-jade-500 dark:bg-jade-900/50 dark:ring-white/10">
                <Search size={18} className="shrink-0 text-subtle" aria-hidden="true" />
                <input
                  id="tim-khu-pho"
                  value={tim}
                  onChange={(e) => setTim(e.target.value)}
                  placeholder="Gõ tên khu cũ, ví dụ: Thủ Dương, Mỹ Cụ 2, Bến Triều…"
                  className="w-full bg-transparent py-3.5 text-sm outline-none"
                />
                {tim && (
                  <button
                    type="button"
                    onClick={() => setTim('')}
                    aria-label="Xoá ô tìm"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded text-subtle hover:bg-jade-100 dark:hover:bg-jade-800"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-muted" role="status">
                {khoa
                  ? `Tìm thấy ${loc.length} khu phố khớp với “${tim.trim()}”.`
                  : `Đang hiện đủ ${danhSach.length} khu phố.`}
              </p>
            </div>

            {/* ── Danh sách ── */}
            {loc.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  icon={Search}
                  title="Không có khu phố nào khớp"
                  description="Thử gõ ít chữ hơn, hoặc gõ tên khu cũ trước khi sắp xếp — ví dụ “Mễ Xá”, “Vị Thuỷ”, “Nguyễn Huệ”."
                />
              </div>
            ) : (
              <ul id="danh-sach-khu-pho" className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {loc.map((kp) => (
                  <TheKhuPho key={kp.so ?? kp.ten} kp={kp} khopVoi={khoa} />
                ))}
              </ul>
            )}

            {/* ── Ghi chú nguồn ──
                Câu về dạng địa chỉ mới là phần hữu dụng nhất của cả khối này: bà
                con ghi hồ sơ, đơn từ đều cần đúng dạng đó. */}
            {(bang?.ghiChu || bang?.capNhat) && (
              <div className="mt-10 border-l-2 border-gold-400 bg-white p-5 text-sm dark:bg-jade-900/40">
                {bang.ghiChu && <p className="text-body">{bang.ghiChu}</p>}
                {bang.capNhat && <p className="mt-2 text-subtle">Số liệu cập nhật ngày {bang.capNhat}.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
