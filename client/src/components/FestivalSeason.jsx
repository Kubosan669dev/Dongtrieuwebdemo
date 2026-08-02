import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPin } from 'lucide-react';
import { solarToLunar, nextLunarOccurrence } from '../../../shared/lunar.js';
import { LUNAR_MONTH_LABELS } from '../lib/constants.js';
import PagodaMotif from './PagodaMotif.jsx';
import { cx } from '../lib/format.js';

/**
 * Dải "Mùa lễ hội" — trả lời câu hỏi mà trang chủ trước đây bỏ trống: KHI NÀO nên đi.
 *
 * Đông Triều là điểm đến do lễ hội dẫn dắt, và lịch lễ hội ở đây rất lệch:
 * gần như toàn bộ dồn vào tháng Giêng và tháng Hai âm lịch, tức khoảng 60 ngày
 * sau Tết. Dải này hiển thị đúng sự lệch đó bằng dữ liệu thật chứ không san
 * phẳng cho đẹp — cột tháng Giêng cao vống lên chính là thông tin.
 *
 * Mọi thứ tính tại máy khách từ danh sách lễ hội trang chủ đã tải sẵn, dùng
 * `shared/lunar.js` (cùng bộ chuyển đổi âm–dương mà trợ lý AI đang dùng), nên
 * không phát sinh thêm lời gọi API và số ngày đếm ngược luôn đúng theo hôm nay.
 */
export default function FestivalSeason({ festivals = [] }) {
  const { months, peak, upcoming, todayLunar, total } = useMemo(() => {
    const now = new Date();
    const lunarToday = solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear());

    // Đếm lễ hội theo tháng âm
    const counts = Array.from({ length: 12 }, () => 0);
    for (const f of festivals) {
      if (f.lunarMonth >= 1 && f.lunarMonth <= 12) counts[f.lunarMonth - 1] += 1;
    }
    const max = Math.max(1, ...counts);

    // Lễ hội sắp tới, gần nhất trước. Bỏ qua lễ hội thiếu ngày âm lịch —
    // không đoán ngày cho chúng, thà không hiện còn hơn hiện sai.
    const dated = festivals
      .filter((f) => f.lunarDay >= 1 && f.lunarMonth >= 1)
      .map((f) => ({ f, next: nextLunarOccurrence(f.lunarDay, f.lunarMonth, now) }))
      .filter((x) => x.next)
      .sort((a, b) => a.next.daysAway - b.next.daysAway);

    const peakMonth = counts.indexOf(max) + 1;

    return {
      months: counts.map((count, i) => ({ month: i + 1, count, ratio: count / max })),
      peak: { month: peakMonth, count: max },
      upcoming: dated.slice(0, 3),
      todayLunar: lunarToday,
      total: festivals.length,
    };
  }, [festivals]);

  if (!festivals.length) return null;

  const soonest = upcoming[0];
  const inSeason = soonest && soonest.next.daysAway <= 45;

  return (
    // Giữ jade-900 ở cả hai chế độ: nền trang chế độ tối vốn đã là jade-950, nếu
    // để `dark:bg-jade-950` thì dải này chìm hẳn vào nền, mất tác dụng phân tách.
    <section className="relative mt-14 overflow-hidden bg-jade-900 py-14 text-jade-50">
      {/* Hoạ tiết mái đình thay cho nền chấm bi — xem PagodaMotif.jsx */}
      <PagodaMotif className="text-jade-100" opacity={0.06} scale={110} />

      <div className="container-page relative">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Lịch âm · {total} lễ hội</p>
            <h2 className="display-2 mt-2 text-white">Mùa lễ hội Đông Triều</h2>
            <p className="mt-3 max-w-xl text-jade-100/80">
              Hôm nay là ngày {todayLunar.day} {LUNAR_MONTH_LABELS[todayLunar.month]?.toLowerCase()} âm lịch.
              {' '}
              {peak.count} trong {total} lễ hội của phường diễn ra vào{' '}
              {LUNAR_MONTH_LABELS[peak.month]?.toLowerCase()}.
            </p>
          </div>
          <Link to="/le-hoi" className="btn-ghost shrink-0 !border-white/25 !bg-white/10 !text-white hover:!bg-white/20">
            Toàn bộ lịch lễ hội <ChevronRight size={16} />
          </Link>
        </div>

        {/* Biểu đồ 12 tháng âm. Cột cao thấp phản ánh đúng phân bố thật. */}
        <ol className="mt-9 flex items-end gap-1.5 sm:gap-2.5" aria-label="Số lễ hội theo tháng âm lịch">
          {months.map((m) => {
            const isNow = m.month === todayLunar.month;
            return (
              <li key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <span className={cx('text-[11px] font-semibold tabular-nums', m.count ? 'text-gold-300' : 'text-jade-100/30')}>
                  {m.count || ''}
                </span>
                <span
                  title={`${LUNAR_MONTH_LABELS[m.month]}: ${m.count} lễ hội`}
                  style={{ height: `${12 + m.ratio * 84}px` }}
                  className={cx(
                    'w-full rounded-t-md transition-[height] duration-500',
                    m.count > 0 ? 'bg-jade-400/80' : 'bg-white/10',
                  )}
                />
                {/* Tháng hiện tại đánh dấu bằng gạch chân + số vàng, không tô cột.
                    Tô cột thì tháng nào không có lễ hội (như tháng này) sẽ chẳng
                    có gì để tô — chỉ dẫn sẽ chỉ vào một chỗ trống. */}
                <span className={cx('h-0.5 w-full rounded-full', isNow ? 'bg-gold-400' : 'bg-transparent')} />
                <span
                  className={cx(
                    'text-center text-[10px] leading-tight sm:text-[11px]',
                    isNow ? 'font-bold text-gold-300' : 'text-jade-100/55',
                  )}
                >
                  {m.month}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-center text-[11px] text-jade-100/40">
          Tháng âm lịch · chiều cao cột là số lễ hội · vạch vàng là tháng hiện tại
        </p>

        {/* Lễ hội sắp tới. Ngoài mùa thì nói thẳng còn bao lâu nữa, không để trống. */}
        <div className="mt-9 rounded-md bg-white/[0.07] p-5 ring-1 ring-white/10">
          {soonest ? (
            <>
              <p className="text-sm text-jade-100/70">
                {inSeason ? 'Sắp diễn ra' : 'Đang ngoài mùa lễ hội — lễ hội gần nhất'}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {upcoming.map(({ f, next }) => (
                  <Link
                    key={f.id}
                    to={`/le-hoi/${f.slug}`}
                    className="group rounded-md bg-white/[0.06] p-4 transition hover:bg-white/[0.13]"
                  >
                    <p className="font-serif text-base font-semibold leading-snug text-white group-hover:text-gold-200">
                      {f.name}
                    </p>
                    <p className="mt-1.5 text-sm text-gold-300">
                      {f.lunarDay} {LUNAR_MONTH_LABELS[f.lunarMonth]?.toLowerCase()} âm lịch
                    </p>
                    <p className="mt-0.5 text-xs text-jade-100/60">
                      {next.date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                      {' · '}
                      <span className="tabular-nums">
                        {next.daysAway === 0 ? 'hôm nay' : `còn ${next.daysAway} ngày`}
                      </span>
                    </p>
                    {f.location && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-jade-100/50">
                        <MapPin size={12} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{f.location}</span>
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-jade-100/70">
              Các lễ hội trong dữ liệu chưa ghi ngày âm lịch cụ thể nên chưa tính được ngày diễn ra.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
