import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  ExternalLink,
  FileText,
  Landmark,
  MapPin,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import PageHero from '../components/PageHero.jsx';
import Seo from '../components/Seo.jsx';
import { EmptyState, SectionHeading } from '../components/ui.jsx';
import { useSettings } from '../hooks/useSettings.js';

/**
 * `/hanh-chinh` — căn cước hành chính của phường Đông Triều.
 *
 * ── VÌ SAO TÁCH RA THÀNH TRANG RIÊNG ────────────────────────────────────────
 * Dữ liệu này (khoá cài đặt `hanhChinh`) trước nay chỉ trợ lý AI đọc tới, rồi
 * được rút gọn thành một khối trên trang chủ chế độ Người dân. Cả hai chỗ đều
 * không đủ cho việc thật: người đi làm giấy tờ cần chép lại số hiệu nghị quyết,
 * cần biết chính xác đơn vị cũ nào nhập vào đâu, cần một đường dẫn gửi được cho
 * người khác. Một khối trên trang chủ thì không dẫn tới được.
 *
 * Trang này cũng là chỗ đặt nền cho một trợ lý riêng của mảng chính quyền sau
 * này: mọi thứ nó cần trả lời đều nằm ở đây, dưới dạng dữ liệu chứ không phải
 * chữ gõ tay trong mã.
 *
 * ── NGUYÊN TẮC XUYÊN SUỐT: NÓI RÕ ĐỘ CHẮC CHẮN ─────────────────────────────
 * Đây là trang người dân mang đi làm giấy tờ, nên chỗ nào cổng chưa đối chiếu
 * được bản gốc thì phải nói thẳng ra, thay vì trình bày mọi thứ với cùng một
 * giọng chắc nịch. Ba chỗ trang này tự nhận chưa chắc:
 *   · số hiệu nghị quyết  — cờ `vanBan.canDoiSoat`
 *   · số liệu của nguồn ngoài — lệch với bảng khu phố, có ghi rõ lệch bao nhiêu
 *   · phần trang tra cứu không có — liệt kê thẳng trong `khongLayDuoc`
 */

/** Ô số liệu nhỏ, dùng lại ở dải căn cước. */
function O({ icon: Icon, nhan, giaTri, phu }) {
  if (!giaTri) return null;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-subtle">
        {Icon && <Icon size={15} aria-hidden="true" />}
        <span className="text-[11px] font-semibold uppercase tracking-wide">{nhan}</span>
      </div>
      <p className="mt-1.5 font-serif text-xl font-bold text-jade-900 dark:text-jade-50">{giaTri}</p>
      {phu && <p className="mt-0.5 text-xs text-muted">{phu}</p>}
    </div>
  );
}

const gonUrl = (u) => String(u).replace(/^https?:\/\//, '').replace(/\/$/, '');
const soVN = (n) => Number(n).toLocaleString('vi-VN');

export default function Administration() {
  const settings = useSettings();
  const hc = settings.hanhChinh;
  const list = settings.khuPho?.danhSach ?? [];

  if (!hc) {
    return (
      <>
        <Seo title="Hành chính phường Đông Triều" />
        <PageHero title="Hành chính phường" breadcrumb={[{ label: 'Hành chính' }]} />
        <div className="container-page py-16">
          <EmptyState
            icon={Landmark}
            title="Chưa có dữ liệu hành chính"
            description="Khoá cài đặt `hanhChinh` chưa được nạp. Chạy `npm run db:seed` rồi tải lại trang."
          />
        </div>
      </>
    );
  }

  // Số liệu của phường luôn cộng từ bảng khu phố — cùng nguồn với trang /khu-pho.
  // Xem khối "đối chiếu" bên dưới để biết vì sao không lấy số của trang tra cứu.
  const dienTich = list.reduce((s, k) => s + (k.dienTichKm2 ?? 0), 0);
  const nhanKhau = list.reduce((s, k) => s + (k.nhanKhau ?? 0), 0);
  const soHo = list.reduce((s, k) => s + (k.soHo ?? 0), 0);

  const donVi = hc.hopThanhTu?.danhSach ?? [];
  const sl = hc.soLieuTheoNguon;

  return (
    <>
      <Seo
        title="Hành chính phường Đông Triều"
        description="Mã bưu chính, mã đơn vị hành chính, các đơn vị cũ hợp thành, trụ sở và cổng thông tin của phường Đông Triều, tỉnh Quảng Ninh."
      />
      <PageHero
        title="Hành chính phường Đông Triều"
        description="Căn cước hành chính của phường: mã số, văn bản thành lập, các đơn vị cũ hợp thành, trụ sở và cổng thông tin chính thức."
        breadcrumb={[{ label: 'Hành chính' }]}
      />

      <div className="container-page py-12">
        {/* ── Dải căn cước ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <O icon={FileText} nhan="Mã bưu chính" giaTri={hc.maBuuChinh} phu="Dùng khi ghi địa chỉ nhận thư" />
          <O icon={ScrollText} nhan="Mã đơn vị hành chính" giaTri={hc.maDinhDanh} phu="Mã tra cứu trên hệ thống" />
          <O icon={Landmark} nhan="Cấp hành chính" giaTri={hc.capHanhChinh} phu="Trực thuộc tỉnh Quảng Ninh" />
          <O icon={Building2} nhan="Hoạt động từ" giaTri={hc.hieuLucTu} phu={hc.vungKinhTe} />
        </div>

        <div className="card mt-4 p-5">
          <p className="text-sm text-muted">
            <strong className="text-jade-900 dark:text-jade-50">Ghi địa chỉ theo mẫu:</strong>{' '}
            <em>số nhà, tên đường, Khu phố …, phường Đông Triều, tỉnh Quảng Ninh</em>. Không còn cấp huyện —
            thành phố Đông Triều đã giải thể ngày 01/7/2025.{' '}
            <Link to="/khu-pho" className="font-medium text-jade-700 underline dark:text-jade-200">
              Tra khu phố của bạn
            </Link>
            .
          </p>
        </div>

        {/* ── Các đơn vị cũ hợp thành ── */}
        {donVi.length > 0 && (
          <section className="mt-14">
            <SectionHeading
              eyebrow="Sắp xếp 2025"
              title={`Hợp thành từ ${hc.hopThanhTu?.tongSo ?? donVi.length} đơn vị hành chính cũ`}
              description={`Từ ngày ${hc.hieuLucTu}, các đơn vị dưới đây không còn là đơn vị hành chính riêng.`}
            />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {donVi.map((d) => (
                <li key={d.ten} className="card flex items-start gap-3 p-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-jade-100 text-jade-700 dark:bg-jade-800/60 dark:text-jade-200">
                    <MapPin size={17} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold text-jade-900 dark:text-jade-50">{d.ten}</span>
                    <span className="mt-0.5 block text-sm text-muted">
                      Nhập {d.phan === 'phần còn lại' ? 'phần còn lại' : 'toàn bộ'} vào phường Đông Triều
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {hc.hopThanhTu?.doiSoat && (
              <p className="mt-4 flex items-start gap-2 text-sm text-subtle">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-jade-600 dark:text-jade-300" aria-hidden="true" />
                <span>{hc.hopThanhTu.doiSoat}</span>
              </p>
            )}
            {hc.hopThanhTu?.luuY && <p className="mt-1.5 pl-6 text-sm text-subtle">{hc.hopThanhTu.luuY}</p>}
          </section>
        )}

        {/* ── Văn bản thành lập ── */}
        {hc.vanBan?.nghiQuyet && (
          <section className="mt-14">
            <SectionHeading eyebrow="Căn cứ pháp lý" title="Văn bản thành lập phường" />
            <div className="card p-6">
              <p className="font-medium text-jade-900 dark:text-jade-50">{hc.vanBan.nghiQuyet}</p>
              {hc.vanBan.deAn && <p className="mt-1.5 text-sm text-muted">Theo {hc.vanBan.deAn}.</p>}
              {hc.vanBan.nguonDoiSoat && <p className="mt-3 text-sm text-subtle">{hc.vanBan.nguonDoiSoat}</p>}

              {/* Cờ `canDoiSoat` = cổng chưa đọc được bản công báo gốc. Người dân
                  mang số hiệu này đi trích dẫn thì phải biết mức chắc chắn của nó. */}
              {hc.vanBan.canDoiSoat && (
                <p className="mt-4 flex items-start gap-2 rounded-md bg-gold-50 p-3 text-sm ring-1 ring-inset ring-gold-500/25 dark:bg-gold-500/10">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" />
                  <span className="text-muted">
                    Cổng <strong className="text-jade-900 dark:text-jade-50">chưa đối chiếu được bản công báo gốc</strong>.
                    Cần trích dẫn trong hồ sơ thì xin xác nhận lại tại UBND phường.
                  </span>
                </p>
              )}
              {hc.vanBan.ghiChuSaiLech && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-medium text-jade-700 dark:text-jade-200">
                    Vì sao cổng không dùng số hiệu ghi trên trang tra cứu?
                  </summary>
                  <p className="mt-2 text-muted">{hc.vanBan.ghiChuSaiLech}</p>
                </details>
              )}
            </div>
          </section>
        )}

        {/* ── Trụ sở & cổng thông tin ── */}
        <section className="mt-14">
          <SectionHeading
            eyebrow="Liên hệ chính thức"
            title="Trụ sở & cổng thông tin"
            description="Cổng này là cổng thông tin — việc nộp hồ sơ, tra cứu tiến độ, thanh toán đều thực hiện ở các địa chỉ dưới."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {hc.truSo && (
              <div className="card p-6">
                <h3 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">
                  {hc.truSo.ten ?? 'UBND phường Đông Triều'}
                </h3>
                {hc.truSo.diaDiem && (
                  <p className="mt-1.5 flex items-start gap-2 text-sm text-muted">
                    <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {hc.truSo.diaDiem}
                  </p>
                )}
                {hc.truSo.ghiChu && <p className="mt-3 text-sm text-subtle">{hc.truSo.ghiChu}</p>}
                <Link to="/lien-he" className="btn-ghost mt-4">
                  Xem thông tin liên hệ
                </Link>
              </div>
            )}

            {hc.cong?.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {hc.cong.map((c) => (
                  <li key={c.url}>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-hover group flex items-center justify-between gap-3 p-4"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium text-jade-900 group-hover:text-jade-600 dark:text-jade-50">
                          {c.ten}
                        </span>
                        <span className="block truncate text-sm text-muted">{gonUrl(c.url)}</span>
                      </span>
                      <ExternalLink size={15} className="shrink-0 text-subtle" aria-hidden="true" />
                      <span className="sr-only">(mở ra tab mới)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Đối chiếu số liệu: chỗ dễ nói dối nhất, nên bày cả hai bộ số ── */}
        {list.length > 0 && (
          <section className="mt-14">
            <SectionHeading
              eyebrow="Số liệu"
              title="Diện tích, dân số — và vì sao có hai con số"
              description="Cổng dùng tổng cộng từ bảng 11 khu phố, vì đó là con số duy nhất khớp với từng trang khu phố."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card p-6 ring-2 ring-jade-600/30">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-jade-700 dark:text-jade-200">
                  Cổng này dùng — cộng từ bảng 11 khu phố
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-subtle">Diện tích</dt><dd className="font-serif text-lg font-bold text-jade-900 dark:text-jade-50">{dienTich.toFixed(2).replace('.', ',')} km²</dd></div>
                  <div><dt className="text-subtle">Nhân khẩu</dt><dd className="font-serif text-lg font-bold text-jade-900 dark:text-jade-50">{soVN(nhanKhau)}</dd></div>
                  <div><dt className="text-subtle">Hộ dân</dt><dd className="font-serif text-lg font-bold text-jade-900 dark:text-jade-50">{soVN(soHo)}</dd></div>
                  <div><dt className="text-subtle">Khu phố</dt><dd className="font-serif text-lg font-bold text-jade-900 dark:text-jade-50">{list.length}</dd></div>
                </dl>
              </div>

              {sl && (
                <div className="card p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                    Trang tra cứu ngoài ghi
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-subtle">Diện tích</dt><dd className="font-serif text-lg font-bold text-muted">{String(sl.dienTichKm2).replace('.', ',')} km²</dd></div>
                    <div><dt className="text-subtle">Dân số {sl.namDanSo}</dt><dd className="font-serif text-lg font-bold text-muted">{soVN(sl.danSo)}</dd></div>
                  </dl>
                  {sl.doiChieuVoiBangKhuPho && <p className="mt-3 text-sm text-muted">{sl.doiChieuVoiBangKhuPho}</p>}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Nguồn & giới hạn ── */}
        <section className="mt-14">
          <div className="card p-6">
            <h2 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">Nguồn dữ liệu & giới hạn</h2>
            {hc.canhBaoNguon && <p className="mt-2 text-sm text-muted">{hc.canhBaoNguon}</p>}
            {hc.khongLayDuoc?.length > 0 && (
              <>
                <p className="mt-4 text-sm font-medium text-jade-900 dark:text-jade-50">Những gì trang này chưa có:</p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted">
                  {hc.khongLayDuoc.map((k, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden="true">•</span>
                      <span>{k}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-4 text-xs text-subtle">
              {hc.nguon ? `Nguồn: ${hc.nguon}. ` : ''}
              {hc.capNhat ? `Cập nhật: ${hc.capNhat}. ` : ''}
              Thông tin hành chính nên đối chiếu với UBND phường trước khi dùng vào giấy tờ.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
