import { Compass, Factory, TrainFront } from 'lucide-react';
import { SectionHeading } from './ui.jsx';
import { cx } from '../lib/format.js';

/**
 * Bối cảnh vùng đất Đông Triều — vị trí, dòng thời gian hành chính, kinh tế,
 * giao thông. Dữ liệu ở khoá cài đặt `vungDat` (xem server/src/routes/settings.js).
 *
 * ── HAI BỘ SỐ KHÔNG ĐƯỢC ĐỨNG CẠNH NHAU MÀ KHÔNG GIẢI THÍCH ─────────────────
 * "Đông Triều" trỏ tới hai đơn vị hành chính khác nhau, chênh nhau gần mười lần:
 * thành phố Đông Triều (395,95 km² · 248.896 người) đã GIẢI THỂ ngày 01/7/2025,
 * còn phường Đông Triều hiện nay rộng 40,41 km² với 42.454 nhân khẩu.
 *
 * Cổng này là của PHƯỜNG. Nên khối số liệu thành phố cũ luôn đi kèm câu cảnh báo
 * và một lối dẫn sang trang Khu phố — nếu không, người đọc sẽ mang con số của cả
 * vùng cũ gán cho phường, và cổng tự mâu thuẫn với chính trang Khu phố của mình.
 */

const soVN = (n) => Number(n).toLocaleString('vi-VN');
const soLe = (n) => String(n).replace('.', ',');

function Muc({ icon: Icon, tieuDe, children }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-jade-600 text-white">
          <Icon size={18} aria-hidden="true" />
        </span>
        <h3 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">{tieuDe}</h3>
      </div>
      {children}
    </div>
  );
}

export default function VungDat({ vungDat }) {
  if (!vungDat) return null;
  const { viTri, vungCu, kinhTe, giaoThong, dongThoiGian, nguon, nguonUrl, capNhat } = vungDat;

  return (
    <>
      {/* ── Vị trí · kinh tế · giao thông ── */}
      {(viTri || kinhTe || giaoThong?.length) && (
        <section data-vao className="mt-14">
          <SectionHeading
            eyebrow="Bối cảnh"
            title="Vùng đất Đông Triều"
            description="Vị trí, cơ cấu kinh tế và các tuyến đường chính của vùng Đông Triều."
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {viTri && (
              <Muc icon={Compass} tieuDe="Vị trí">
                <p className="text-muted">{viTri.moTa}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-body">
                  {viTri.cachHaNoiKm && <li>Cách Hà Nội khoảng <strong>{viTri.cachHaNoiKm} km</strong></li>}
                  {viTri.cachHaLongKm && <li>Cách Hạ Long khoảng <strong>{viTri.cachHaLongKm} km</strong></li>}
                  {(viTri.giapRanh ?? []).map((g) => (
                    <li key={g.huong}>
                      Phía {g.huong.toLowerCase()} giáp {g.ten}
                    </li>
                  ))}
                </ul>
              </Muc>
            )}

            {kinhTe?.coCau?.length > 0 && (
              <Muc icon={Factory} tieuDe="Kinh tế">
                <p className="text-sm text-muted">Cơ cấu kinh tế năm {kinhTe.nam}</p>
                <ul className="mt-3 space-y-2">
                  {kinhTe.coCau.map((c) => (
                    <li key={c.ten}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-body">{c.ten}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-jade-900 dark:text-jade-50">
                          {soLe(c.phanTram)}%
                        </span>
                      </div>
                      {/* Thanh tỉ lệ là hình trang trí lặp lại con số ngay bên
                          cạnh, nên ẩn khỏi trình đọc màn hình. */}
                      <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-jade-100 dark:bg-jade-800">
                        <div className="h-full rounded-full bg-jade-600" style={{ width: `${c.phanTram}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
                {kinhTe.nganhChuLuc?.length > 0 && (
                  <p className="mt-3 text-sm text-muted">Chủ lực: {kinhTe.nganhChuLuc.join(' · ')}</p>
                )}
              </Muc>
            )}

            {giaoThong?.length > 0 && (
              <Muc icon={TrainFront} tieuDe="Giao thông">
                <ul className="space-y-2 text-sm text-body">
                  {giaoThong.map((g) => (
                    <li key={g} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </Muc>
            )}
          </div>
        </section>
      )}

      {/* ── Dòng thời gian hành chính ── */}
      {dongThoiGian?.length > 0 && (
        <section data-vao className="mt-14">
          <SectionHeading
            eyebrow="Dòng thời gian"
            title="Đông Triều qua các thời kỳ"
            description="Từ tên gọi An Sinh thời Trần đến phường Đông Triều sau sắp xếp năm 2025."
          />
          <ol id="dong-thoi-gian" className="ml-3 space-y-4 border-l-2 border-jade-100 pl-6 dark:border-jade-800">
            {dongThoiGian.map((m) => (
              <li key={m.moc} className="relative">
                <span
                  aria-hidden="true"
                  className={cx(
                    'absolute -left-[1.72rem] top-5 h-3 w-3 rounded-full ring-4 ring-paper dark:ring-jade-950',
                    m.nay ? 'bg-jade-600' : 'bg-gold-400',
                  )}
                />
                <div className={cx('card p-5', m.nay && 'ring-2 ring-jade-600 dark:ring-jade-400')}>
                  <p className="font-serif text-lg font-bold text-jade-900 dark:text-jade-50">{m.moc}</p>
                  <p className="mt-1.5 leading-relaxed text-muted">{m.viec}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Số liệu thành phố cũ ──
          Khối này bắt buộc phải có câu cảnh báo đi kèm, xem chú thích đầu tệp. */}
      {vungCu && (
        <section data-vao className="mt-14">
          <div className="card border-l-4 border-gold-400 p-6">
            <p className="eyebrow">Đối chiếu số liệu</p>
            <h3 className="mt-2 font-serif text-xl font-bold text-jade-900 dark:text-jade-50">
              {vungCu.ten} — {vungCu.hieuLuc}
            </h3>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ['Diện tích', `${soLe(vungCu.dienTichKm2)} km²`],
                ['Dân số', soVN(vungCu.danSo)],
                ['Năm số liệu', vungCu.namDanSo],
                ['Mật độ', `${soVN(vungCu.matDo)} người/km²`],
              ].map(([nhan, gt]) => (
                <div key={nhan}>
                  <dt className="text-xs text-subtle">{nhan}</dt>
                  <dd className="font-serif text-xl font-bold tabular-nums text-jade-900 dark:text-jade-50">{gt}</dd>
                </div>
              ))}
            </dl>
            {vungCu.canhBao && (
              <p className="mt-4 rounded-md bg-gold-400/15 p-3 text-sm text-body">⚠️ {vungCu.canhBao}</p>
            )}
          </div>

          {(nguon || capNhat) && (
            <p className="mt-4 text-sm text-subtle">
              {nguon && (
                <>
                  Nguồn tham khảo:{' '}
                  {nguonUrl ? (
                    <a href={nguonUrl} target="_blank" rel="noreferrer" className="underline hover:text-jade-600">
                      {nguon}
                    </a>
                  ) : (
                    nguon
                  )}
                  .
                </>
              )}
              {capNhat && ` Cập nhật ${capNhat}.`}
            </p>
          )}
        </section>
      )}
    </>
  );
}
