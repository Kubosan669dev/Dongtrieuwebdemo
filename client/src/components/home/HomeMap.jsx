import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../../lib/api.js';
import MapEmbed from '../MapEmbed.jsx';
import { SectionHeading, ErrorNote } from '../ui.jsx';
import { MAP_KINDS, MAP_KIND_ORDER } from '../../lib/mapKinds.js';
import { cx } from '../../lib/format.js';

/**
 * Bản đồ số trên trang chủ.
 *
 * THAY cho khối "Lên kế hoạch cho chuyến đi của bạn" ở bản trước: khối đó là một
 * ô màu xanh có hai nút, hứa một bản đồ mà không cho xem gì — đúng kiểu lời mời
 * rỗng. Ở đây có bản đồ thật của phường ngay trên trang.
 *
 * Bản đồ là `<iframe>` Google nên KHÔNG gắn được ghim của cổng vào (xem
 * `MapPage.jsx` để biết vì sao). Việc "cho biết cổng có những gì" vì thế do dải
 * chip số lượng bên dưới gánh, còn xem từng điểm là việc của trang /ban-do.
 */
export default function HomeMap() {
  const q = useQuery({ queryKey: ['map-points'], queryFn: () => api.get('/map-points') });

  const groups = q.data?.groups ?? [];
  const thieu = groups.reduce((s, g) => s + (g.missing ?? 0), 0);

  return (
    <section data-vao className="container-page mt-16">
      <SectionHeading
        eyebrow="Bản đồ số"
        title="Toàn bộ điểm đến trên một trang"
        description="Di tích, điểm lân cận, cơ sở lưu trú và quán ăn — mở bản đồ đầy đủ để lọc theo nhóm, tìm theo tên và lấy chỉ đường tới từng điểm."
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
          {/* Số lượng từng nhóm. Không còn chấm màu như bản trước: chấm đó là khoá
              màu cho ghim trên bản đồ, mà nền Google nhúng thì ghim là của Google
              nên không còn màu nào để chú giải. Giữ lại chấm là chú giải cho một
              thứ không tồn tại. */}
          <div className="mb-4 flex flex-wrap gap-2">
            {MAP_KIND_ORDER.map((k) => {
              const kind = MAP_KINDS[k];
              const g = groups.find((x) => x.kind === k);
              return (
                <span key={k} className={cx('chip', kind.tintClass)}>
                  <kind.icon size={14} />
                  {kind.label} <strong className="font-semibold tabular-nums">{g?.count ?? 0}</strong>
                </span>
              );
            })}
          </div>

          {/* Mức phóng 13 cho thấy trọn phường; mức 16 mặc định của `MapEmbed` là
              để xem một địa chỉ cụ thể, đặt ở đây thì chỉ thấy vài dãy nhà. */}
          <MapEmbed
            query="Phường Đông Triều, Quảng Ninh"
            title="Bản đồ phường Đông Triều"
            height={420}
            zoom={13}
            showDirections={false}
          />

          {/* Nói thẳng phần còn thiếu. Khách thấy ít điểm thì phải biết là dữ liệu
              đang được bổ sung, chứ không nghĩ phường chỉ có mấy điểm đó. */}
          {thieu > 0 && (
            <p className="mt-3 text-xs text-muted">
              Còn <strong className="font-semibold">{thieu}</strong> địa điểm chưa có toạ độ nên chưa lên bản đồ.
            </p>
          )}
        </>
      )}
    </section>
  );
}
