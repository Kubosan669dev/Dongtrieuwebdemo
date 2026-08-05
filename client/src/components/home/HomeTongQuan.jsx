import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings.js';
import PagodaMotif from '../PagodaMotif.jsx';

/**
 * "Tổng quan phường" — khối mở đầu của chế độ Người dân.
 *
 * ── MỌI SỐ Ở ĐÂY ĐỀU CỘNG TỪ DỮ LIỆU, KHÔNG GÕ TAY ─────────────────────────
 * Diện tích và nhân khẩu cộng từ bảng 11 khu phố (khoá `khuPho`), đúng như
 * trang `/khu-pho` đang hiện. Cổng từng suýt tự mâu thuẫn ở chỗ này: trang tra
 * cứu bên ngoài ghi 40,42 km² · 43.712 người, còn cộng bảng khu phố ra 40,41 km²
 * · 42.454 nhân khẩu. Nếu khối này lấy số của trang ngoài thì hai trang của cùng
 * một cổng nói hai con số khác nhau — nên nó lấy đúng nguồn mà `/khu-pho` lấy.
 *
 * ── VÌ SAO NHẮC SỐ NGHỊ QUYẾT ──────────────────────────────────────────────
 * Đây là câu hỏi người dân thật sự cần khi làm giấy tờ: căn cứ pháp lý nào lập
 * ra phường mình. Cờ `canDoiSoat` trong dữ liệu nghĩa là chưa đọc được bản công
 * báo gốc — lúc đó khối này nói thẳng ra thay vì im lặng để người đọc tưởng đã
 * chắc chắn.
 */
export default function HomeTongQuan() {
  const settings = useSettings();
  const hc = settings.hanhChinh;
  const khuPho = settings.khuPho;
  const list = khuPho?.danhSach ?? [];

  // Chưa chạy seed thì chưa có khoá nào — ẩn hẳn thay vì hiện một khung rỗng.
  if (!hc && !list.length) return null;

  const dienTich = list.reduce((s, k) => s + (k.dienTichKm2 ?? 0), 0);
  const nhanKhau = list.reduce((s, k) => s + (k.nhanKhau ?? 0), 0);
  const soHo = list.reduce((s, k) => s + (k.soHo ?? 0), 0);

  const so = (n) => Number(n).toLocaleString('vi-VN');
  const chiSo = [
    list.length ? { nhan: 'Diện tích tự nhiên', giaTri: `${dienTich.toFixed(2).replace('.', ',')} km²` } : null,
    list.length ? { nhan: 'Nhân khẩu', giaTri: so(nhanKhau) } : null,
    list.length ? { nhan: 'Hộ dân', giaTri: so(soHo) } : null,
    list.length ? { nhan: 'Khu phố', giaTri: String(list.length) } : null,
  ].filter(Boolean);

  const donVi = hc?.hopThanhTu?.danhSach ?? [];

  return (
    <section data-vao className="container-page mt-10">
      <div className="relative overflow-hidden rounded-md bg-jade-800 p-7 text-white sm:p-9">
        <PagodaMotif className="text-white" opacity={0.1} scale={120} />
        <div className="relative grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-300">Tổng quan</p>
            <h2 className="mt-1 font-serif text-2xl font-bold tracking-[-0.01em] sm:text-3xl">
              Phường Đông Triều, tỉnh Quảng Ninh
            </h2>

            {donVi.length > 0 && (
              <p className="mt-3 text-sm leading-relaxed text-jade-50/90">
                Phường Đông Triều hiện nay hoạt động từ <strong>{hc.hieuLucTu}</strong>, được lập trên cơ sở sắp xếp{' '}
                {donVi.length} đơn vị hành chính cũ:{' '}
                {donVi.map((d, i) => (
                  <span key={d.ten}>
                    <strong>{d.ten}</strong>
                    {d.phan === 'phần còn lại' ? ' (phần còn lại)' : ''}
                    {i < donVi.length - 2 ? ', ' : i === donVi.length - 2 ? ' và ' : '.'}
                  </span>
                ))}
              </p>
            )}

            {hc?.vanBan?.nghiQuyet && (
              <p className="mt-3 text-sm leading-relaxed text-jade-50/75">
                Căn cứ: {hc.vanBan.nghiQuyet}.
                {hc.vanBan.canDoiSoat && (
                  <em className="opacity-80"> Cổng chưa đối chiếu được bản công báo gốc, bà con cần trích dẫn thì xác nhận lại với UBND phường.</em>
                )}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/hanh-chinh" className="btn-primary bg-white text-jade-900 hover:bg-jade-50">
                Trang hành chính phường <ChevronRight size={16} />
              </Link>
              <Link to="/khu-pho" className="btn-ghost border-white/30 text-white hover:bg-white/10">
                Tra khu phố của tôi
              </Link>
            </div>
          </div>

          {chiSo.length > 0 && (
            <dl className="grid grid-cols-2 gap-3">
              {chiSo.map((c) => (
                <div key={c.nhan} className="rounded-md bg-white/10 p-4 ring-1 ring-inset ring-white/15">
                  <dt className="text-[11px] uppercase tracking-wide text-jade-50/70">{c.nhan}</dt>
                  <dd className="mt-1 font-serif text-2xl font-bold">{c.giaTri}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {(hc?.maBuuChinh || hc?.maDinhDanh) && (
          <p className="relative mt-6 border-t border-white/15 pt-4 text-xs text-jade-50/70">
            {hc.maBuuChinh && <>Mã bưu chính <strong className="text-white">{hc.maBuuChinh}</strong></>}
            {hc.maBuuChinh && hc.maDinhDanh && ' · '}
            {hc.maDinhDanh && <>Mã đơn vị hành chính <strong className="text-white">{hc.maDinhDanh}</strong></>}
            {' · '}Địa chỉ ghi theo mẫu: <em>số nhà, đường, Khu phố …, phường Đông Triều, tỉnh Quảng Ninh</em>
          </p>
        )}
      </div>
    </section>
  );
}
