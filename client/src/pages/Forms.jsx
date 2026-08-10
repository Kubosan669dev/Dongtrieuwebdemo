import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Download, FileSignature, Info, Landmark, Search, X } from 'lucide-react';
import PageHero from '../components/PageHero.jsx';
import Seo from '../components/Seo.jsx';
import { EmptyState, SectionHeading } from '../components/ui.jsx';
import { useSettings } from '../hooks/useSettings.js';
import { deaccentLower } from '../lib/format.js';

/**
 * `/mau-don` — mẫu đơn, mẫu tờ khai của 19 thủ tục đất đai cấp xã.
 *
 * ── LÝ DO TỒN TẠI CỦA TRANG NÀY LÀ MỘT PHÉP TRỪ ────────────────────────────
 * Văn bản gốc, ở mỗi thủ tục, liệt kê chung một danh sách "mẫu đơn, mẫu tờ khai"
 * trộn lẫn hai loại giấy hoàn toàn khác nhau:
 *
 *   · giấy NGƯỜI DÂN phải viết  — đơn đề nghị, tờ khai thuế, danh sách thửa đất
 *   · giấy CƠ QUAN tự làm       — tờ trình, dự thảo quyết định, phiếu chuyển
 *                                 thông tin, biên bản bàn giao, thông báo
 *
 * Đọc thẳng danh sách ấy, người dân đếm ra mười mấy tờ phải chuẩn bị và bỏ cuộc,
 * hoặc đi hỏi cán bộ những tờ vốn không phải việc của mình. Thực tế mỗi thủ tục
 * chỉ cần điền một tới bốn tờ.
 *
 * Vì vậy trang này KHÔNG bày một danh sách phẳng. Nhóm "bạn phải điền" đứng
 * trước, đầy đủ; nhóm "cơ quan tự làm" thu lại phía sau, để ai muốn hiểu đường
 * đi của hồ sơ thì mở ra xem — chứ không đặt ngang hàng.
 *
 * ── CHƯA TÁCH ĐƯỢC TỪNG MẪU THÀNH MỘT TỆP RIÊNG ────────────────────────────
 * Thân các mẫu nằm lẫn trong hai phụ lục .docx dài hàng nghìn trang, không phải
 * tệp rời. Cổng nói thẳng điều đó và chỉ đúng tệp chứa mẫu, thay vì hứa một nút
 * "tải mẫu 18" rồi đưa ra cả quyển phụ lục.
 */

const RONG = [];

const TEP = {
  'Phu-luc-II-cap-xa-noi-dung-chi-tiet.docx': 'Phụ lục II — nội dung chi tiết TTHC cấp xã',
  'Phu-luc-I-cap-tinh-noi-dung-chi-tiet-va-mau-don.docx': 'Phụ lục I — nội dung chi tiết & mẫu đơn',
};

function TheMau({ m, nhan }) {
  return (
    <li className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-serif text-base font-bold text-jade-900 dark:text-jade-50">Mẫu số {m.so}</span>
          {nhan}
        </p>
        <p className="mt-1 text-sm text-body">{m.ten}</p>
        {m.tep && (
          <p className="mt-1.5 text-xs text-subtle">
            Nằm trong: {TEP[m.tep] ?? m.tep}
          </p>
        )}
      </div>
      {m.tep && (
        <a href={`/tthc/${m.tep}`} download className="btn-ghost shrink-0">
          <Download size={15} aria-hidden="true" />
          Tải tệp chứa mẫu
          <span className="sr-only"> Mẫu số {m.so} — {m.ten}</span>
        </a>
      )}
    </li>
  );
}

export default function Forms() {
  const settings = useSettings();
  const md = settings.tthcMauDon;
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';

  const danhSach = md?.danhSach ?? RONG;

  const loc = useMemo(() => {
    const tim = deaccentLower(q).trim();
    if (!tim) return danhSach;
    return danhSach.filter((m) => {
      const kho = deaccentLower(`${m.so} ${m.ten}`);
      return tim.split(/\s+/).every((x) => kho.includes(x));
    });
  }, [danhSach, q]);

  const cuaDan = loc.filter((m) => m.aiDien === 'dan');
  const cuaCoQuan = loc.filter((m) => m.aiDien !== 'dan');

  if (!md) {
    return (
      <>
        <Seo title="Mẫu đơn thủ tục đất đai" />
        <PageHero title="Mẫu đơn" breadcrumb={[{ label: 'Mẫu đơn' }]} />
        <div className="container-page py-16">
          <EmptyState
            icon={FileSignature}
            title="Chưa có dữ liệu mẫu đơn"
            description="Chạy `npm run extract-tthc` rồi `npm run db:seed`, sau đó tải lại trang."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Seo
        title="Mẫu đơn thủ tục đất đai"
        description="Mẫu đơn, mẫu tờ khai kèm theo các thủ tục hành chính đất đai tại phường Đông Triều — tách rõ mẫu người dân phải điền và giấy tờ cơ quan tự làm."
      />
      <PageHero
        title="Mẫu đơn &amp; tờ khai"
        description="Mẫu kèm theo các thủ tục đất đai làm tại phường — tách rõ tờ bạn phải điền với tờ cơ quan tự làm."
        breadcrumb={[{ label: 'Mẫu đơn' }]}
      />

      <div className="container-page py-12">
        {/* ── Điều quan trọng nhất, nói trước khi bày danh sách ── */}
        <div className="card p-6 ring-2 ring-jade-600/30">
          <p className="flex items-start gap-2.5">
            <Info size={18} className="mt-0.5 shrink-0 text-jade-600 dark:text-jade-300" aria-hidden="true" />
            <span className="text-body">
              Trong <strong className="text-jade-900 dark:text-jade-50">{md.tongSo?.tatCa ?? danhSach.length} mẫu</strong>{' '}
              kèm theo các thủ tục đất đai, bạn chỉ phải điền{' '}
              <strong className="text-jade-900 dark:text-jade-50">{md.tongSo?.danDien ?? cuaDan.length} mẫu</strong>.
              {' '}Số còn lại là giấy tờ cơ quan tự lập trong quá trình giải quyết — bạn không cần chuẩn bị.
            </span>
          </p>
          {md.viSaoTachHaiNhom && <p className="mt-3 pl-7 text-sm text-muted">{md.viSaoTachHaiNhom}</p>}
        </div>

        {/* ── Tìm ── */}
        <div className="relative mt-8">
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
            placeholder="Tìm theo số mẫu hoặc tên: 18, biến động, lệ phí trước bạ…"
            aria-label="Tìm mẫu đơn"
            className="w-full rounded-md border border-jade-900/[0.12] bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-jade-500 focus:ring-2 focus:ring-jade-500/20 dark:border-white/10 dark:bg-jade-900/50"
          />
        </div>
        {q && (
          <div className="mt-3 flex items-center gap-3 text-sm text-muted">
            <span>{loc.length} / {danhSach.length} mẫu</span>
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              className="inline-flex items-center gap-1 font-medium text-jade-700 hover:underline dark:text-jade-200"
            >
              <X size={14} aria-hidden="true" />
              Bỏ tìm
            </button>
          </div>
        )}

        {loc.length === 0 ? (
          <div className="mt-10">
            <EmptyState icon={Search} title="Không có mẫu nào khớp" description="Thử số mẫu như “18”, “15”, hoặc tên như “gia hạn”." />
          </div>
        ) : (
          <>
            <section className="mt-12">
              <SectionHeading
                eyebrow="Việc của bạn"
                title={`${cuaDan.length} mẫu bạn phải tự điền`}
                description="Mỗi thủ tục chỉ dùng một vài mẫu trong số này — xem đúng thủ tục của bạn ở trang Thủ tục đất đai."
              />
              {cuaDan.length === 0 ? (
                <p className="text-muted">Không có mẫu nào khớp trong nhóm này.</p>
              ) : (
                <ul className="grid gap-3">
                  {cuaDan.map((m) => (
                    <TheMau
                      key={m.so}
                      m={m}
                      nhan={
                        <span className="chip bg-jade-600 text-white">Bạn điền</span>
                      }
                    />
                  ))}
                </ul>
              )}
            </section>

            {cuaCoQuan.length > 0 && (
              <section className="mt-14">
                <SectionHeading
                  eyebrow="Không phải việc của bạn"
                  title={`${cuaCoQuan.length} giấy tờ cơ quan tự lập`}
                  description="Liệt kê ở đây để bạn nhận ra khi thấy chúng trong hồ sơ, chứ không phải để chuẩn bị."
                />
                <details className="card p-6">
                  <summary className="cursor-pointer font-medium text-jade-700 dark:text-jade-200">
                    Xem {cuaCoQuan.length} giấy tờ nội bộ
                  </summary>
                  <ul className="mt-4 space-y-2.5 text-sm">
                    {cuaCoQuan.map((m) => (
                      <li key={m.so} className="flex gap-3">
                        <span className="shrink-0 font-medium text-subtle">Mẫu {m.so}</span>
                        <span className="text-body">{m.ten}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            )}
          </>
        )}

        {/* ── Văn bản gốc ── */}
        <section className="mt-16">
          <SectionHeading eyebrow="Văn bản gốc" title="Tải bộ văn bản đầy đủ" />
          <ul className="grid gap-3 lg:grid-cols-2">
            {[
              ['QD-cong-bo-TTHC-dat-dai.docx', 'Quyết định công bố TTHC đất đai', 'Danh mục 32 thủ tục cấp tỉnh và 19 thủ tục cấp xã, kèm thời hạn, lệ phí, nơi nộp.'],
              ['Phu-luc-II-cap-xa-noi-dung-chi-tiet.docx', 'Phụ lục II — nội dung chi tiết TTHC cấp xã', 'Trình tự, hồ sơ, điều kiện của 19 thủ tục làm tại phường. Đây là nguồn của trang Thủ tục đất đai.'],
              ['Phu-luc-II-cap-xa-quy-trinh-noi-bo.docx', 'Phụ lục II — quy trình nội bộ cấp xã', 'Các bước xử lý bên trong cơ quan và thời gian từng bước.'],
              ['Phu-luc-I-cap-tinh-noi-dung-chi-tiet-va-mau-don.docx', 'Phụ lục I — nội dung chi tiết & mẫu đơn', 'Phụ lục cấp tỉnh, nhưng là nơi chứa thân đầy đủ của phần lớn mẫu đơn.'],
            ].map(([tep, ten, mo]) => (
              <li key={tep} className="card p-5">
                <p className="font-medium text-jade-900 dark:text-jade-50">{ten}</p>
                <p className="mt-1 text-sm text-muted">{mo}</p>
                <a href={`/tthc/${tep}`} download className="btn-ghost mt-3">
                  <Download size={15} aria-hidden="true" />
                  Tải về (.docx)
                  <span className="sr-only"> {ten}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <div className="card p-6">
            <p className="flex items-start gap-2.5 text-sm">
              <AlertTriangle size={17} className="mt-0.5 shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" />
              <span className="text-muted">
                {md.luuY} Xem thủ tục nào cần mẫu nào tại{' '}
                <Link to="/thu-tuc" className="font-medium text-jade-700 underline dark:text-jade-200">
                  trang Thủ tục đất đai
                </Link>
                .
              </span>
            </p>
            <p className="mt-4 flex items-start gap-2 text-xs text-subtle">
              <Landmark size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                {md.nguon}
                {md.capNhat ? ` · Cập nhật: ${md.capNhat}` : ''}
              </span>
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
