import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Building2, ChevronDown, ClipboardList, Clock, ExternalLink,
  FileCheck2, FileText, Landmark, Search, Users, X,
} from 'lucide-react';
import PageHero from '../components/PageHero.jsx';
import Seo from '../components/Seo.jsx';
import { EmptyState, SectionHeading } from '../components/ui.jsx';
import { useSettings } from '../hooks/useSettings.js';
import { cx, deaccentLower } from '../lib/format.js';

/**
 * `/thu-tuc` — 19 thủ tục hành chính đất đai làm tại phường.
 *
 * ── TRANG NÀY TRẢ LỜI BỐN CÂU, THEO ĐÚNG THỨ TỰ NGƯỜI TA HỎI ───────────────
 * Người dân đến đây không đọc từ đầu tới cuối; họ có một việc và cần biết:
 * mất bao lâu · phải mang giấy gì · nộp ở đâu · hết bao nhiêu tiền. Bốn thứ đó
 * nằm ngay trên thẻ, trước cả phần trình tự các bước — vốn dài và chủ yếu mô tả
 * việc NỘI BỘ của cơ quan, không phải việc của người nộp hồ sơ.
 *
 * ── VÌ SAO CHỈ CÓ 19 THỦ TỤC CẤP XÃ ────────────────────────────────────────
 * Bộ văn bản gốc có 32 thủ tục cấp tỉnh nữa. Đưa hết lên đây thì người dân đọc
 * một danh sách 51 mục mà quá nửa là việc phường không nhận hồ sơ. Phần cấp tỉnh
 * vẫn liệt kê ở cuối trang, chỉ tên và thời hạn, kèm câu chỉ đúng nơi phải đến.
 */

const RONG = [];

/** Mục nào trong một thủ tục là việc của NGƯỜI DÂN, mục nào của cơ quan. */
const KHOI = [
  { khoa: 'hoSo', nhan: 'Giấy tờ phải nộp', icon: ClipboardList, cua: 'dan' },
  { khoa: 'yeuCau', nhan: 'Điều kiện để được giải quyết', icon: FileCheck2, cua: 'dan' },
  { khoa: 'trinhTu', nhan: 'Trình tự các bước', icon: Landmark, cua: 'chung' },
  { khoa: 'coQuan', nhan: 'Cơ quan giải quyết', icon: Building2, cua: 'chung' },
  { khoa: 'ketQua', nhan: 'Kết quả nhận được', icon: FileText, cua: 'chung' },
  { khoa: 'canCu', nhan: 'Căn cứ pháp lý', icon: FileText, cua: 'chung' },
];

const gonThoiHan = (s) => String(s || '').split('(')[0].trim();

function Muc({ nhan, icon: Icon, dong }) {
  if (!dong?.length) return null;
  return (
    <div className="mt-5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">
        <Icon size={14} aria-hidden="true" />
        {nhan}
      </p>
      <ul className="mt-2 space-y-1.5 text-sm text-body">
        {dong.map((d, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-jade-500" aria-hidden="true" />
            <span>{d}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TheThuTuc({ t, mo, onMo }) {
  const ten = t.ten.replace(/^Trình tự,?\s*thủ tục\s*/i, '');
  const tieuDe = ten.charAt(0).toUpperCase() + ten.slice(1);

  return (
    <li className="card overflow-hidden">
      {/* Cả thẻ là một nút mở/đóng: phần tóm tắt luôn thấy, phần chi tiết dài
          (trình tự, căn cứ pháp lý) chỉ mở khi cần. Mười chín thủ tục mở sẵn hết
          thì trang dài hơn hai vạn chữ, không ai cuộn tới cuối. */}
      <button
        type="button"
        onClick={onMo}
        aria-expanded={mo}
        className="flex w-full items-start gap-3 p-5 text-left transition hover:bg-jade-50/60 dark:hover:bg-jade-800/30 sm:p-6"
      >
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-jade-600 text-sm font-bold text-white">
          {t.stt}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-base font-semibold text-jade-900 dark:text-jade-50">{tieuDe}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {t.thoiHanDanhMuc && (
              <span className="flex items-center gap-1.5 font-medium text-jade-700 dark:text-jade-200">
                <Clock size={14} aria-hidden="true" />
                {gonThoiHan(t.thoiHanDanhMuc)}
              </span>
            )}
            {t.doiTuong?.[0] && (
              <span className="flex items-center gap-1.5 text-muted">
                <Users size={14} aria-hidden="true" />
                {t.doiTuong[0].replace(/\.$/, '')}
              </span>
            )}
          </span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={cx('mt-1 shrink-0 text-subtle transition-transform', mo && 'rotate-180')}
        />
      </button>

      {mo && (
        <div className="border-t border-jade-900/[0.07] px-5 pb-6 dark:border-white/10 sm:px-6">
          {/* Thời hạn ở vùng khó khăn khác thời hạn thường — bản gốc ghi rõ, nên
              hiện cả hai chứ không rút gọn thành một con số. */}
          {t.thoiHan?.length > 0 && (
            <p className="mt-5 rounded-md bg-jade-50 p-3 text-sm text-body dark:bg-jade-800/40">
              {t.thoiHan.join(' ')}
            </p>
          )}

          {t.phiLePhi?.length > 0 && (
            <p className="mt-3 text-sm">
              <span className="font-semibold text-jade-900 dark:text-jade-50">Phí, lệ phí: </span>
              <span className="text-body">{t.phiLePhi.join(' ')}</span>
            </p>
          )}

          {t.mucCon?.length > 0 && (
            <div className="mt-5 rounded-md ring-1 ring-inset ring-gold-500/25">
              <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-subtle">
                Thủ tục này chia thành {t.mucCon.length} trường hợp, thời hạn khác nhau
              </p>
              <ul className="space-y-1.5 px-4 pb-3 pt-2 text-sm">
                {t.mucCon.map((c) => (
                  <li key={c.stt} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium text-jade-900 dark:text-jade-50">{c.ten}</span>
                    <span className="text-muted">— {gonThoiHan(c.thoiHan)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {KHOI.map((k) => (
            <Muc key={k.khoa} nhan={k.nhan} icon={k.icon} dong={t[k.khoa]} />
          ))}

          {t.mauNhacToi?.length > 0 && (
            <p className="mt-5 text-sm">
              <span className="text-subtle">Mẫu đơn kèm theo: </span>
              {t.mauNhacToi.map((m, i) => (
                <span key={m}>
                  {i > 0 && ', '}
                  <Link to={`/mau-don?q=${encodeURIComponent(m)}`} className="font-medium text-jade-700 underline dark:text-jade-200">
                    Mẫu {m}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export default function Procedures() {
  const settings = useSettings();
  const tt = settings.tthcDatDai;
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [mo, setMo] = useState(null);

  const capXa = tt?.capXa ?? RONG;

  const loc = useMemo(() => {
    const tim = deaccentLower(q).trim();
    if (!tim) return capXa;
    return capXa.filter((t) => {
      const kho = deaccentLower(
        [t.ten, ...(t.hoSo ?? []), ...(t.doiTuong ?? []), ...(t.ketQua ?? []), ...(t.mauNhacToi ?? [])].join(' '),
      );
      return tim.split(/\s+/).every((x) => kho.includes(x));
    });
  }, [capXa, q]);

  if (!tt) {
    return (
      <>
        <Seo title="Thủ tục đất đai" />
        <PageHero title="Thủ tục đất đai" breadcrumb={[{ label: 'Thủ tục' }]} />
        <div className="container-page py-16">
          <EmptyState
            icon={ClipboardList}
            title="Chưa có dữ liệu thủ tục"
            description="Chạy `npm run extract-tthc` rồi `npm run db:seed`, sau đó tải lại trang."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Seo
        title="Thủ tục đất đai làm tại phường"
        description="19 thủ tục hành chính lĩnh vực đất đai giải quyết tại phường Đông Triều: thời hạn, giấy tờ phải nộp, nơi nộp, phí lệ phí và mẫu đơn kèm theo."
      />
      <PageHero
        title="Thủ tục đất đai làm tại phường"
        description={`${capXa.length} thủ tục hành chính lĩnh vực đất đai mà người dân nộp hồ sơ ngay tại phường Đông Triều.`}
        breadcrumb={[{ label: 'Thủ tục đất đai' }]}
      />

      <div className="container-page py-12">
        {/* ── Nơi nộp: câu hỏi đầu tiên của mọi người, nên đặt trên cùng ── */}
        {tt.noiNop?.length > 0 && (
          <section className="card p-6">
            <h2 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">Nộp hồ sơ ở đâu</h2>
            <ul className="mt-3 space-y-2 text-sm text-body">
              {tt.noiNop.map((n, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-jade-500" aria-hidden="true" />
                  <span>{n}</span>
                </li>
              ))}
            </ul>
            <a
              href="https://dichvucong.gov.vn/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost mt-4"
            >
              Cổng Dịch vụ công quốc gia
              <ExternalLink size={14} aria-hidden="true" />
              <span className="sr-only">(mở ra tab mới)</span>
            </a>
          </section>
        )}

        {tt.luuY && (
          <p className="card mt-4 flex items-start gap-2.5 p-5 text-sm ring-2 ring-gold-500/25">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" />
            <span className="text-muted">
              <strong className="text-jade-900 dark:text-jade-50">Đây là bản tóm lược.</strong> {tt.luuY}
            </span>
          </p>
        )}

        {/* ── Tìm ── */}
        <div className="relative mt-10">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set('q', e.target.value);
              else next.delete('q');
              setParams(next, { replace: true });
            }}
            placeholder="Tìm: sổ đỏ, đính chính, chuyển mục đích, tách thửa…"
            aria-label="Tìm thủ tục"
            className="w-full rounded-md border border-jade-900/[0.12] bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-jade-500 focus:ring-2 focus:ring-jade-500/20 dark:border-white/10 dark:bg-jade-900/50"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>{loc.length === capXa.length ? `${capXa.length} thủ tục` : `${loc.length} / ${capXa.length} thủ tục`}</span>
          {q && (
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              className="inline-flex items-center gap-1 font-medium text-jade-700 hover:underline dark:text-jade-200"
            >
              <X size={14} aria-hidden="true" />
              Bỏ tìm
            </button>
          )}
          <Link to="/mau-don" className="ml-auto font-medium text-jade-700 hover:underline dark:text-jade-200">
            Xem mẫu đơn phải điền →
          </Link>
        </div>

        {loc.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={Search}
              title="Không có thủ tục nào khớp"
              description="Thử từ khác, ví dụ “giấy chứng nhận”, “gia hạn”, “tặng cho”."
            />
          </div>
        ) : (
          <ul className="mt-6 grid gap-3">
            {loc.map((t) => (
              <TheThuTuc key={t.stt} t={t} mo={mo === t.stt} onMo={() => setMo(mo === t.stt ? null : t.stt)} />
            ))}
          </ul>
        )}

        {/* ── Việc phải lên tỉnh ── */}
        {tt.capTinh?.length > 0 && (
          <section className="mt-16">
            <SectionHeading
              eyebrow="Không làm ở phường"
              title={`${tt.capTinh.length} thủ tục thuộc thẩm quyền cấp tỉnh`}
              description={tt.vichSaoChiCapXa}
            />
            <details className="card p-6">
              <summary className="cursor-pointer font-medium text-jade-700 dark:text-jade-200">
                Xem danh mục {tt.capTinh.length} thủ tục cấp tỉnh
              </summary>
              <ol className="mt-4 space-y-2.5 text-sm">
                {tt.capTinh.map((c) => (
                  <li key={c.stt} className="flex gap-3">
                    <span className="shrink-0 text-subtle">{c.stt}.</span>
                    <span>
                      <span className="text-body">{c.ten}</span>
                      {c.thoiHan && <span className="block text-muted">{gonThoiHan(c.thoiHan)}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          </section>
        )}

        <section className="mt-16">
          <div className="card p-6">
            <h2 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">Nguồn</h2>
            <p className="mt-2 text-sm text-muted">{tt.nguon}</p>
            {tt.nguoiKy && <p className="mt-1.5 text-sm text-subtle">Ký bởi: {tt.nguoiKy}.</p>}
            <p className="mt-3 text-xs text-subtle">
              Lĩnh vực: {tt.linhVuc} · Cơ quan quản lý: {tt.coQuanQuanLy}
              {tt.capNhat ? ` · Cập nhật: ${tt.capNhat}` : ''}
            </p>
            <Link to="/mau-don" className="btn-ghost mt-4">
              Tải mẫu đơn &amp; văn bản gốc
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
