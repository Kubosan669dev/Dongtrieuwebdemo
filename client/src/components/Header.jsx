import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Palette } from 'lucide-react';
import Brand from './Brand.jsx';
import { cx } from '../lib/format.js';
import { SITE_NAME, SITE_SHORT, SITE_TAGLINE } from '../lib/site.js';

/**
 * Thanh điều hướng chính — 8 mục, sắp theo thứ tự người dân trong phường cần.
 *
 * "Khu phố" đứng đầu vì đó là câu hỏi thường gặp nhất sau sắp xếp: 36 khu cũ nay
 * là 11 khu, ghi địa chỉ thế nào cho đúng.
 *
 * "Lưu trú" rời khỏi đây — nó là mục dành cho khách tới thăm, không phải cho
 * người sống ở phường. Trang `/luu-tru` vẫn chạy, vẫn có lối vào từ trang chủ và
 * chân trang; chỉ là nó không còn chiếm một trong tám chỗ đắt nhất của cổng.
 */
const NAV = [
  { to: '/khu-pho', label: 'Khu phố' },
  { to: '/di-tich', label: 'Di tích' },
  { to: '/le-hoi', label: 'Lễ hội' },
  { to: '/am-thuc', label: 'Ẩm thực' },
  { to: '/ban-do', label: 'Bản đồ' },
  { to: '/thoi-tiet', label: 'Thời tiết' },
  { to: '/tin-tuc', label: 'Tin tức' },
  { to: '/gioi-thieu', label: 'Giới thiệu' },
];

export default function Header({ onOpenThemes }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Đổi trang thì đóng menu. Dùng mẫu "state phái sinh từ prop" của React thay
  // cho useEffect: đặt state ngay trong lúc render tránh được một nhịp vẽ thừa
  // mà người dùng thấy được — menu vẫn còn mở một khung hình sau khi trang đã đổi.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setOpen(false);
  }

  return (
    <header
      className={cx(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled
          ? 'border-b border-jade-900/5 bg-paper/85 backdrop-blur-md shadow-soft dark:bg-jade-950/85'
          : 'bg-transparent',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/">
          <Brand
            /* Tên đầy đủ ở đầu trang — đây là chỗ dễ thấy nhất, để trống tên mới
               ở đây thì việc đổi tên coi như không xảy ra với người vào trang.
               Dưới 640px thì rút về tên ngắn: "Khám phá Đông Triều" hai dòng chen
               với nút ba gạch làm đầu trang chật cứng. */
            title={
              <>
                <span className="sm:hidden">{SITE_SHORT}</span>
                <span className="hidden sm:inline">{SITE_NAME}</span>
              </>
            }
            subtitle={SITE_TAGLINE}
            titleClass="text-lg text-jade-900 dark:text-jade-50"
            subtitleClass="text-[11px] uppercase tracking-wide text-gold-600 dark:text-gold-400"
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cx(
                  'rounded-md px-3.5 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-jade-600 text-white shadow-soft'
                    : 'text-jade-800 hover:bg-jade-100 dark:text-jade-100 dark:hover:bg-jade-800/50',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Mở hộp chọn bảng màu — bên trong có cả chuyển nền sáng/tối */}
          <button
            onClick={onOpenThemes}
            aria-label="Đổi bảng màu website"
            title="Đổi bảng màu"
            className="grid h-10 w-10 place-items-center rounded-full text-jade-700 hover:bg-jade-100 dark:text-jade-200 dark:hover:bg-jade-800/50"
          >
            <Palette size={18} />
          </button>
          {/* `aria-expanded` + `aria-controls`: trước đây nút chỉ có `aria-label="Menu"`,
              nên trình đọc màn hình đọc ra "Menu, nút" mà không cho biết menu
              đang mở hay đang đóng — người dùng bấm rồi không biết đã xảy ra gì.
              `aria-label` cũng đổi theo trạng thái để nói rõ việc nút sẽ làm. */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={open}
            aria-controls="menu-dien-thoai"
            className="grid h-10 w-10 place-items-center rounded-full text-jade-700 hover:bg-jade-100 lg:hidden dark:text-jade-200 dark:hover:bg-jade-800/50"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {open && (
        <div id="menu-dien-thoai" className="border-t border-jade-900/5 bg-paper/95 backdrop-blur-md lg:hidden dark:bg-jade-950/95">
          <nav className="container-page grid gap-1 py-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cx(
                    'rounded-md px-4 py-3 text-sm font-medium',
                    isActive ? 'bg-jade-600 text-white' : 'text-jade-800 hover:bg-jade-100 dark:text-jade-100 dark:hover:bg-jade-800/50',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
