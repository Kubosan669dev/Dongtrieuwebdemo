import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchList } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import Seo from '../components/Seo.jsx';
import { Badge, Spinner, ErrorNote } from '../components/ui.jsx';
import { cx } from '../lib/format.js';
import { LUNAR_MONTH_LABELS } from '../lib/constants.js';
import { TEN_THU, khoaNgay, leHoiTrongThang, thangLich } from '../lib/lichLeHoi.js';
import { lunarYearName } from '../../../shared/lunar.js';

/**
 * LỊCH ÂM – DƯƠNG KÈM LỄ HỘI.
 *
 * ── VÌ SAO CẦN, KHI ĐÃ CÓ TRANG LỄ HỘI ────────────────────────────────────
 * Trang `/le-hoi` xếp theo tháng ÂM, đúng như hồ sơ ghi. Nhưng người tính đi
 * chơi thì nghĩ bằng lịch dương: họ có mấy ngày nghỉ vào cuối tháng 2, và câu
 * hỏi thật là "mấy hôm đó ở Đông Triều có gì". Đọc "13 tháng Giêng âm lịch"
 * không trả lời được câu ấy nếu trong đầu không sẵn phép quy đổi.
 *
 * Trang này lật ngược lại: bày ra tháng dương, mỗi ô ghi kèm ngày âm, và cắm
 * lễ hội vào đúng ô của nó. Cùng bộ dữ liệu, khác lối vào.
 *
 * ── MỌI THỨ TÍNH TẠI MÁY KHÁCH ────────────────────────────────────────────
 * Phép đổi âm–dương dùng `shared/lunar.js` — chính bộ mà trợ lý AI dùng để trả
 * lời "lễ hội nào sắp diễn ra". Không thêm điểm cuối API nào: đổi tháng là tính
 * lại tại chỗ, không chờ mạng. Phần tính nằm ở `lib/lichLeHoi.js` và có bộ kiểm
 * riêng, vì chỗ sai được ở đây là logic chứ không phải màu sắc.
 */
export default function Calendar() {
  const homNay = useMemo(() => new Date(), []);
  const [moc, setMoc] = useState(() => new Date(homNay.getFullYear(), homNay.getMonth(), 1));
  const [chon, setChon] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['festivals', 'lich'],
    queryFn: () => fetchList('festivals', { limit: 100 }),
  });

  // `useMemo` chứ không phải một biểu thức trần: nhánh `: []` dựng một mảng MỚI
  // mỗi lần vẽ, nên `thangLich` bên dưới sẽ tính lại toàn bộ lưới ở mọi lần vẽ
  // dù không có gì đổi — kể cả khi người dùng chỉ bấm chọn một ngày.
  const danhSach = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const nam = moc.getFullYear();
  const thang = moc.getMonth() + 1;

  const tuan = useMemo(() => thangLich(nam, thang, danhSach, homNay), [nam, thang, danhSach, homNay]);
  const trongThang = useMemo(() => leHoiTrongThang(tuan), [tuan]);

  const doiThang = (b) => {
    setMoc(new Date(nam, thang - 1 + b, 1));
    setChon(null);
  };
  const veHomNay = () => {
    setMoc(new Date(homNay.getFullYear(), homNay.getMonth(), 1));
    setChon(khoaNgay(homNay));
  };

  // Dải tháng âm mà tháng dương này vắt qua — gần như tháng nào cũng qua hai
  // tháng âm, nên ghi một cái là sai một nửa số ngày trên lưới.
  const daiAm = useMemo(() => {
    const o = tuan.flat().filter((x) => x.trongThang);
    if (!o.length) return '';
    const dau = o[0].am;
    const cuoi = o[o.length - 1].am;
    const ten = (a) => `${LUNAR_MONTH_LABELS[a.month] ?? `Tháng ${a.month}`}${a.leap ? ' (nhuận)' : ''}`;
    return dau.month === cuoi.month && dau.leap === cuoi.leap
      ? `${ten(dau)} ${lunarYearName(dau.year)}`
      : `${ten(dau)} – ${ten(cuoi)} ${lunarYearName(cuoi.year)}`;
  }, [tuan]);

  const oDangChon = chon ? tuan.flat().find((x) => khoaNgay(x.ngay) === chon) : null;

  if (isLoading) return <Spinner className="min-h-[60vh]" />;
  if (isError)
    return (
      <div className="container-page py-16">
        <ErrorNote onRetry={refetch} />
      </div>
    );

  return (
    <div>
      <Seo
        title="Lịch âm – dương và lễ hội"
        description="Lịch tháng có cả ngày dương và ngày âm, đánh dấu sẵn 17 lễ hội truyền thống của phường Đông Triều vào đúng ngày diễn ra."
      />
      <PageHero
        title="Lịch âm – dương và lễ hội"
        description="Xem theo tháng dương lịch, mỗi ngày kèm ngày âm, lễ hội của phường cắm sẵn vào đúng ngày."
        breadcrumb={[{ label: 'Lịch' }]}
      />

      <div className="container-page py-10">
        {/* ── Thanh chuyển tháng ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-bold text-jade-900 dark:text-jade-50">
              Tháng {thang} / {nam}
            </h2>
            <p className="text-sm text-muted">{daiAm}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => doiThang(-1)} className="btn-ghost px-3" aria-label="Tháng trước">
              <ChevronLeft size={18} />
            </button>
            <button onClick={veHomNay} className="btn-ghost text-sm">
              Hôm nay
            </button>
            <button onClick={() => doiThang(1)} className="btn-ghost px-3" aria-label="Tháng sau">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* ── Lưới lịch ── */}
        <div className="mt-5 overflow-hidden rounded-lg ring-1 ring-inset ring-jade-900/[0.12] dark:ring-white/10">
          <div className="grid grid-cols-7 border-b border-jade-900/[0.08] bg-jade-50 dark:border-white/10 dark:bg-jade-900/40">
            {TEN_THU.map((t) => (
              <div
                key={t}
                className={cx(
                  'py-2 text-center text-xs font-semibold uppercase tracking-wide',
                  t === 'CN' ? 'text-danger' : 'text-subtle',
                )}
              >
                {t}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {tuan.flat().map((o) => {
              const khoa = khoaNgay(o.ngay);
              const coLe = o.leHoi.length > 0;
              return (
                <button
                  key={khoa}
                  type="button"
                  onClick={() => setChon(chon === khoa ? null : khoa)}
                  aria-pressed={chon === khoa}
                  className={cx(
                    'relative flex min-h-[4.5rem] flex-col items-center justify-start gap-0.5 border-b border-r border-jade-900/[0.06] p-1.5 text-center transition last:border-r-0 dark:border-white/[0.06] sm:min-h-[5.5rem]',
                    o.trongThang ? 'hover:bg-jade-50 dark:hover:bg-jade-800/40' : 'bg-jade-50/40 dark:bg-jade-950/40',
                    chon === khoa && 'bg-jade-100 dark:bg-jade-800/70',
                  )}
                >
                  <span
                    className={cx(
                      'grid h-7 w-7 place-items-center rounded-full text-sm font-semibold',
                      o.laHomNay && 'bg-jade-600 text-white',
                      !o.laHomNay && !o.trongThang && 'text-subtle',
                      !o.laHomNay && o.trongThang && 'text-jade-900 dark:text-jade-50',
                    )}
                  >
                    {o.ngay.getDate()}
                  </span>
                  {/* Ngày âm: hiện mùng 1 kèm tên tháng vì đó là mốc người đọc
                      dùng để định vị, còn lại chỉ số ngày cho đỡ rối. */}
                  <span className={cx('text-[11px] leading-none', o.trongThang ? 'text-muted' : 'text-subtle')}>
                    {o.am.day === 1 ? `1/${o.am.month}${o.am.leap ? 'N' : ''}` : o.am.day}
                  </span>
                  {coLe && (
                    <span className="mt-0.5 flex flex-wrap items-center justify-center gap-0.5">
                      {o.leHoi.slice(0, 3).map((f) => (
                        <span
                          key={f.id}
                          className={cx(
                            'block h-1.5 w-1.5 rounded-full',
                            f.khaiHoi ? 'bg-gold-500' : 'bg-gold-300 dark:bg-gold-400/60',
                          )}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chú giải ── */}
        <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-subtle">
          <span className="flex items-center gap-1.5">
            <span className="block h-1.5 w-1.5 rounded-full bg-gold-500" /> ngày khai hội
          </span>
          <span className="flex items-center gap-1.5">
            <span className="block h-1.5 w-1.5 rounded-full bg-gold-300 dark:bg-gold-400/60" /> ngày trong kỳ hội
          </span>
          <span>Số nhỏ dưới mỗi ngày là ngày âm; {'"1/2"'} nghĩa là mùng 1 tháng 2 âm.</span>
        </p>

        {/* ── Ngày đang chọn ── */}
        {oDangChon && (
          <div className="mt-6 rounded-lg bg-jade-50 p-5 ring-1 ring-inset ring-jade-900/[0.12] dark:bg-jade-900/40 dark:ring-white/10">
            <p className="text-sm font-semibold text-jade-900 dark:text-jade-50">
              {oDangChon.ngay.getDate()}/{oDangChon.ngay.getMonth() + 1}/{oDangChon.ngay.getFullYear()}
              <span className="font-normal text-muted">
                {' · '}
                {oDangChon.am.day} {LUNAR_MONTH_LABELS[oDangChon.am.month]?.toLowerCase() ?? `tháng ${oDangChon.am.month}`}
                {oDangChon.am.leap ? ' (nhuận)' : ''} {lunarYearName(oDangChon.am.year)}
              </span>
            </p>
            {oDangChon.leHoi.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Không có lễ hội nào của phường trong ngày này.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {oDangChon.leHoi.map((f) => (
                  <li key={f.id}>
                    <Link
                      to={`/le-hoi/${f.slug}`}
                      className="group flex items-start gap-2 text-sm font-semibold text-jade-900 hover:text-jade-700 dark:text-jade-50 dark:hover:text-jade-200"
                    >
                      <Sparkles size={15} className="mt-0.5 shrink-0 text-gold-500" aria-hidden="true" />
                      <span>
                        {f.name}
                        {f.khaiHoi && <Badge className="ml-2 align-middle">Khai hội</Badge>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Lễ hội trong tháng ── */}
        <div className="mt-10">
          <h3 className="flex items-center gap-2 font-serif text-xl font-bold text-jade-900 dark:text-jade-50">
            <CalendarDays size={20} className="text-jade-600 dark:text-jade-300" aria-hidden="true" />
            Lễ hội trong tháng {thang}
          </h3>

          {trongThang.length === 0 ? (
            <p className="mt-3 text-muted">
              Tháng này không có lễ hội nào. Lễ hội của phường dồn vào{' '}
              <strong className="font-semibold">tháng Giêng và tháng Hai âm lịch</strong> — xem{' '}
              <Link to="/le-hoi" className="font-semibold text-jade-700 underline dark:text-jade-200">
                toàn bộ 17 lễ hội
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {trongThang.map((f) => (
                <li key={f.id}>
                  <Link
                    to={`/le-hoi/${f.slug}`}
                    className="card group flex h-full flex-col p-4 transition hover:shadow-lift"
                  >
                    {/* Cặp ngày dương ↔ ngày âm phải cùng trỏ MỘT ngày, nên lấy
                        `ngayKhai` chứ không phải ô đầu tiên thấy trong tháng —
                        xem `lib/lichLeHoi.js`. Lễ hội mở từ tháng trước thì ghi
                        rõ, đừng để người đọc tưởng nó bắt đầu trong tháng này. */}
                    <span className="flex items-baseline gap-2">
                      <span className="font-serif text-lg font-bold text-jade-700 dark:text-jade-200">
                        {f.ngayKhai.getDate()}/{f.ngayKhai.getMonth() + 1}
                      </span>
                      <span className="text-xs text-subtle">
                        {f.lunarDay} {LUNAR_MONTH_LABELS[f.lunarMonth]?.toLowerCase()} âm
                      </span>
                      {!f.khaiTrongThang && <Badge className="ml-auto">Đã mở từ tháng trước</Badge>}
                    </span>
                    <span className="mt-1 font-semibold text-jade-900 dark:text-jade-50">{f.name}</span>
                    {/* Nguyên văn hồ sơ, không phải chuỗi tự dựng: khoảng ngày ở
                        đây có khi kèm ngày phụ ở tháng khác mà lưới cố ý không
                        đánh dấu (xem `lib/lichLeHoi.js`), nên phải cho đọc đủ. */}
                    <span className="mt-1 text-xs text-muted">{f.lunarTimeText}</span>
                    {f.location && (
                      <span className="mt-2 flex items-center gap-1.5 text-xs text-subtle">
                        <MapPin size={13} aria-hidden="true" /> {f.location}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
