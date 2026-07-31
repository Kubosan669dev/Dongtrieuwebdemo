import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Quote } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';
import { Stars } from '../Stars.jsx';
import { SectionHeading } from '../ui.jsx';

/**
 * Đánh giá mới nhất của du khách.
 *
 * Chỉ lấy mục ĐÃ DUYỆT — `/api/reviews/recent` không có tham số nào cho phép xem
 * mục đang chờ, nên khối này không thể vô tình lộ hàng chờ ra trang chủ.
 *
 * Chưa có đánh giá nào đã duyệt thì **không hiện gì cả**: một mục "Đánh giá du
 * khách" trống rỗng trên trang chủ nói rằng chưa ai tới đây, tệ hơn là không có
 * mục đó. Khác với khối đánh giá ở trang chi tiết — chỗ đó cần lời mời gửi vì
 * khách đang đọc đúng địa điểm mình muốn nhận xét.
 */
export default function HomeReviews() {
  const q = useQuery({ queryKey: ['reviews', 'recent'], queryFn: () => api.get('/reviews/recent?limit=6') });
  const items = q.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section data-vao className="container-page mt-16">
      <SectionHeading
        eyebrow="Cảm nhận"
        title="Du khách nói gì"
        description="Đánh giá do du khách gửi trên cổng này, đã được ban quản trị duyệt."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => (
          <figure key={r.id} className="card flex flex-col p-5">
            <Quote size={20} className="mb-3 shrink-0 text-gold-400" aria-hidden="true" />
            {/* Văn bản thuần, cắt còn 4 dòng cho các thẻ cao bằng nhau. Toàn văn
                nằm ở trang chi tiết của địa điểm. */}
            <blockquote className="line-clamp-4 flex-1 leading-relaxed text-jade-800 dark:text-jade-100">
              {r.comment}
            </blockquote>
            <figcaption className="mt-4 border-t border-jade-900/5 pt-3 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Stars value={r.rating} size={13} />
                <span className="text-sm font-medium text-jade-900 dark:text-jade-50">{r.authorName}</span>
              </div>
              <p className="mt-1 text-xs text-jade-500 dark:text-jade-400">
                {/* Nói rõ đánh giá này về cái gì — một lời khen không gắn với địa
                    điểm nào thì trang chủ hiện ra cũng vô nghĩa. */}
                {r.targetPath ? (
                  <Link to={r.targetPath} className="font-medium text-jade-700 underline decoration-dotted dark:text-jade-200">
                    {r.targetName}
                  </Link>
                ) : (
                  <span className="font-medium">{r.targetName}</span>
                )}
                {' · '}
                <time dateTime={r.createdAt}>{formatDate(r.createdAt)}</time>
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
