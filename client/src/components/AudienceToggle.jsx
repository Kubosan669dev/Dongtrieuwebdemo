import { Link } from 'react-router-dom';
import { Landmark, TreePalm } from 'lucide-react';
import { cx } from '../lib/format.js';
import { DU_KHACH, NGUOI_DAN, TRANG_CHU, useDoiTuong } from '../hooks/useDoiTuong.jsx';

/**
 * Cửa đi lại giữa hai cổng: "Tôi là du khách" ↔ "Tôi là người dân".
 *
 * ── ĐÂY LÀ LIÊN KẾT, KHÔNG PHẢI CÔNG TẮC ───────────────────────────────────
 * Từ khi hai bên tách thành hai đường dẫn thật, việc chuyển bên là ĐỔI TRANG.
 * Nên phải là `<Link>` chứ không phải `<button>`: bấm giữa chuột mở tab mới
 * được, chuột phải chép địa chỉ được, và trình đọc màn hình đọc ra "liên kết"
 * đúng như việc nó làm. Một cái nút thì mất cả ba, mà chẳng được gì.
 *
 * Vì thế nó cũng dùng `aria-current="page"` thay cho `aria-pressed`: bên đang
 * xem là trang hiện tại, không phải một lựa chọn đang bật.
 *
 * Nhãn rút gọn dưới 640px — đầu trang còn phải chứa tên cổng và nút menu.
 */
const BEN = [
  { id: DU_KHACH, icon: TreePalm, dai: 'Tôi là du khách', ngan: 'Du khách' },
  { id: NGUOI_DAN, icon: Landmark, dai: 'Tôi là người dân', ngan: 'Người dân' },
];

export default function AudienceToggle({ className, onChoose }) {
  const { doiTuong } = useDoiTuong();

  return (
    <nav
      aria-label="Chuyển giữa cổng du lịch và cổng người dân"
      className={cx(
        'inline-flex shrink-0 rounded-full bg-jade-50 p-0.5 ring-1 ring-inset ring-jade-900/[0.12]',
        'dark:bg-jade-800/60 dark:ring-white/10',
        className,
      )}
    >
      {BEN.map(({ id, icon: Icon, dai, ngan }) => {
        const dangXem = doiTuong === id;
        return (
          <Link
            key={id}
            to={TRANG_CHU[id]}
            aria-current={dangXem ? 'page' : undefined}
            onClick={() => onChoose?.(id)}
            className={cx(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade-400',
              dangXem
                ? 'bg-jade-700 text-white shadow-soft'
                : 'text-jade-700 hover:bg-jade-100 dark:text-jade-200 dark:hover:bg-jade-800',
            )}
          >
            <Icon size={16} className="shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{dai}</span>
            <span className="sm:hidden">{ngan}</span>
          </Link>
        );
      })}
    </nav>
  );
}
