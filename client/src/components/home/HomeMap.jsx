import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Map as MapIcon } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useTheme } from '../../hooks/useTheme.js';
import { SectionHeading, ErrorNote } from '../ui.jsx';
import { MAP_KINDS, MAP_KIND_ORDER } from '../../lib/mapKinds.js';
import { cx } from '../../lib/format.js';

/**
 * Nạp trễ Leaflet. Bắt buộc: gói Leaflet nặng ~150KB (43KB nén) mà phần lớn khách
 * vào trang chủ không cuộn xuống tới đây. Cùng một `lazy` với trang /ban-do nên
 * hai nơi dùng chung một gói đã tách.
 */
const DigitalMap = lazy(() => import('../DigitalMap.jsx'));

/**
 * Bản đồ số trên trang chủ.
 *
 * THAY cho khối "Lên kế hoạch cho chuyến đi của bạn" ở cuối trang bản trước: khối
 * đó là một ô màu xanh có hai nút, hứa một bản đồ mà không cho xem gì — đúng kiểu
 * lời mời rỗng. Ở đây bản đồ thật nằm ngay trên trang, khách thấy được mật độ điểm
 * trước khi quyết định bấm vào.
 *
 * Chỉ hiện bản đồ + chú giải, không có ô tìm kiếm và danh sách bên cạnh: đó là
 * việc của trang /ban-do, nhồi vào trang chủ chỉ làm loãng.
 */
export default function HomeMap() {
  const { mode } = useTheme();
  const [chon, setChon] = useState(null);
  const q = useQuery({ queryKey: ['map-points'], queryFn: () => api.get('/map-points') });

  const points = q.data?.points ?? [];
  const groups = q.data?.groups ?? [];
  const thieu = groups.reduce((s, g) => s + (g.missing ?? 0), 0);

  return (
    <section data-vao className="container-page mt-16">
      <SectionHeading
        eyebrow="Bản đồ số"
        title="Toàn bộ điểm đến trên một bản đồ"
        description="Di tích, điểm lân cận, cơ sở lưu trú và quán ăn — cùng hiện trên một bản đồ, bấm vào ghim để xem thông tin và chỉ đường."
        action={
          <Link to="/ban-do" className="btn-ghost">
            Mở bản đồ đầy đủ <ArrowRight size={16} />
          </Link>
        }
      />

      {q.isError ? (
        <ErrorNote message="Không tải được dữ liệu bản đồ." onRetry={q.refetch} />
      ) : (
        <>
          {/* Chú giải kiêm số lượng từng nhóm. Vừa nói màu nào là gì, vừa cho biết
              bản đồ đang có bao nhiêu điểm mỗi loại — hai câu hỏi đầu tiên khi
              nhìn một bản đồ đầy ghim. */}
          <div className="mb-4 flex flex-wrap gap-2">
            {MAP_KIND_ORDER.map((k) => {
              const kind = MAP_KINDS[k];
              const g = groups.find((x) => x.kind === k);
              return (
                <span key={k} className={cx('chip', kind.tintClass)}>
                  {/* Chấm màu cần viền: hai nhóm Di tích (jade-700) và Lưu trú
                      (jade-500) cùng họ màu với nền chip nên không có viền là chấm
                      chìm hẳn. Cùng cách làm với bộ lọc ở trang /ban-do. */}
                  <span
                    aria-hidden="true"
                    className={cx('h-2.5 w-2.5 shrink-0 rounded-full bg-current ring-1 ring-black/15 dark:ring-white/30', kind.pinClass)}
                  />
                  <kind.icon size={14} />
                  {kind.label} <strong className="font-semibold tabular-nums">{g?.count ?? 0}</strong>
                </span>
              );
            })}
          </div>

          <Suspense
            fallback={
              <div className="grid h-[420px] place-items-center rounded-3xl bg-jade-100 text-sm text-jade-500 dark:bg-jade-900/50">
                <span className="flex items-center gap-2"><MapIcon size={18} /> Đang tải bản đồ…</span>
              </div>
            }
          >
            <DigitalMap
              points={points}
              selectedId={chon}
              onSelect={(p) => setChon(p?.id ?? null)}
              mode={mode}
              height={420}
            />
          </Suspense>

          {/* Nói thẳng phần còn thiếu. Khách thấy bản đồ ít ghim thì phải biết là
              dữ liệu đang được bổ sung, chứ không nghĩ phường chỉ có mấy điểm đó. */}
          {thieu > 0 && (
            <p className="mt-3 text-xs text-jade-500 dark:text-jade-400">
              Còn <strong className="font-semibold">{thieu}</strong> địa điểm chưa có toạ độ nên chưa lên bản đồ.
              Ghim vẽ <span className="font-medium">nét đứt</span> là vị trí ước tính theo địa chỉ, đang được xác
              minh dần tại thực địa.
            </p>
          )}
        </>
      )}
    </section>
  );
}
