import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import PagodaMotif from './PagodaMotif.jsx';
import { cx } from '../lib/format.js';
import { useDoiTuong } from '../hooks/useDoiTuong.jsx';

/**
 * Tiêu đề trang phụ (không phải trang chủ) + breadcrumb.
 *
 * `image` — ảnh bìa của chính nội dung đang xem, dùng làm nền. Trang chi tiết
 * di tích, lễ hội, đặc sản đều đã có ảnh bìa nhưng trước đây bỏ không: mọi trang
 * con đều nhận cùng một thanh xanh phẳng như nhau.
 *
 * Không có ảnh thì rơi về nền chuyển sắc + hoạ tiết mái đình. Bản trước có lớp
 * hoa văn nhưng bị lớp chuyển sắc đục phủ kín ngay bên trên, nên nó chưa từng
 * hiện ra lần nào — nay xếp lại đúng thứ tự.
 */
export default function PageHero({ title, description, breadcrumb = [], image, illustrative = false }) {
  // Mắt đầu tiên của breadcrumb là trang chủ CỦA CỔNG ĐANG XEM, và mang tên
  // cổng đó chứ không phải chữ "Trang chủ" chung chung: logo trên đầu trang đã
  // dẫn về `/` (cửa vào chung) rồi, nên hai chỗ mà cùng gọi là "Trang chủ" thì
  // người dùng không biết cái nào đi đâu.
  const { trangChu, tenCong } = useDoiTuong();

  return (
    <div className={cx('relative overflow-hidden bg-jade-800 text-white', image && 'min-h-[19rem] sm:min-h-[23rem]')}>
      {image ? (
        <>
          <img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
          {/* Hai lớp phủ: dọc để chữ ở đáy luôn đọc được, ngang để breadcrumb ở
              trên cũng không chìm khi ảnh sáng đều. */}
          <div className="absolute inset-0 bg-gradient-to-t from-jade-950 via-jade-950/65 to-jade-950/20" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-jade-700 via-jade-800 to-jade-950" />
          <PagodaMotif className="text-jade-100" opacity={0.09} scale={120} />
        </>
      )}

      <div className={cx('container-page relative', image ? 'flex min-h-[19rem] flex-col justify-end py-10 sm:min-h-[23rem] sm:py-12' : 'py-12 sm:py-16')}>
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-jade-100/80">
          <Link to={trangChu} className="hover:text-gold-300">{tenCong}</Link>
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={14} />
              {b.to ? (
                <Link to={b.to} className="hover:text-gold-300">{b.label}</Link>
              ) : (
                <span className="text-white">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="display-2 max-w-3xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-jade-100/85">{description}</p>}
        {image && illustrative && (
          <p className="mt-3 text-xs italic text-jade-100/60">Ảnh minh hoạ, không chụp tại chính địa điểm này.</p>
        )}
      </div>
    </div>
  );
}
