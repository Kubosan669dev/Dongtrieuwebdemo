import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Moon, Sun, MapPin } from 'lucide-react';
import { cx } from '../lib/format.js';

const NAV = [
  { to: '/di-tich', label: 'Di tích' },
  { to: '/le-hoi', label: 'Lễ hội' },
  { to: '/am-thuc', label: 'Ẩm thực' },
  { to: '/luu-tru', label: 'Lưu trú' },
  { to: '/ban-do', label: 'Bản đồ' },
  { to: '/thoi-tiet', label: 'Thời tiết' },
  { to: '/tin-tuc', label: 'Tin tức' },
  { to: '/gioi-thieu', label: 'Giới thiệu' },
];

export default function Header({ theme, onToggleTheme }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

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
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-jade-600 text-white shadow-soft">
            <MapPin size={20} />
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-lg font-bold text-jade-900 dark:text-jade-50">Đông Triều</span>
            <span className="block text-[11px] uppercase tracking-wide text-gold-600">Du lịch · Di sản</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cx(
                  'rounded-full px-3.5 py-2 text-sm font-medium transition',
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
          <button
            onClick={onToggleTheme}
            aria-label="Đổi giao diện sáng/tối"
            className="grid h-10 w-10 place-items-center rounded-full text-jade-700 hover:bg-jade-100 dark:text-jade-200 dark:hover:bg-jade-800/50"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="grid h-10 w-10 place-items-center rounded-full text-jade-700 hover:bg-jade-100 lg:hidden dark:text-jade-200 dark:hover:bg-jade-800/50"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="border-t border-jade-900/5 bg-paper/95 backdrop-blur-md lg:hidden dark:bg-jade-950/95">
          <nav className="container-page grid gap-1 py-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cx(
                    'rounded-xl px-4 py-3 text-sm font-medium',
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
