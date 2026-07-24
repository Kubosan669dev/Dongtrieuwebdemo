import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, Landmark, CalendarDays, BedDouble, UtensilsCrossed, Store,
  Newspaper, Images, GalleryHorizontal, Settings, LogOut, Menu, X, ExternalLink, Mountain,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { cx } from '../../lib/format.js';

const NAV = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Tổng quan' },
  { to: '/admin/di-tich', icon: Landmark, label: 'Di tích' },
  { to: '/admin/le-hoi', icon: CalendarDays, label: 'Lễ hội' },
  { to: '/admin/diem-lan-can', icon: Mountain, label: 'Điểm lân cận' },
  { to: '/admin/luu-tru', icon: BedDouble, label: 'Lưu trú' },
  { to: '/admin/am-thuc', icon: UtensilsCrossed, label: 'Ẩm thực' },
  { to: '/admin/nha-hang', icon: Store, label: 'Nhà hàng' },
  { to: '/admin/bai-viet', icon: Newspaper, label: 'Bài viết' },
  { to: '/admin/slider', icon: GalleryHorizontal, label: 'Slider' },
  { to: '/admin/thu-vien', icon: Images, label: 'Thư viện ảnh' },
  { to: '/admin/cai-dat', icon: Settings, label: 'Cài đặt' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-jade-50 text-ink dark:bg-jade-950 dark:text-jade-50">
      {/* Sidebar */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 w-64 transform bg-jade-900 text-jade-100 transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-jade-800 px-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-jade-600 text-white"><Landmark size={18} /></span>
          <span className="font-serif font-bold">Quản trị</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-jade-600 text-white' : 'text-jade-200 hover:bg-jade-800',
                )
              }
            >
              <n.icon size={17} /> {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-jade-900/5 bg-white/90 px-4 backdrop-blur dark:border-white/5 dark:bg-jade-900/90">
          <button onClick={() => setOpen((v) => !v)} className="grid h-10 w-10 place-items-center rounded-lg text-jade-600 hover:bg-jade-100 lg:hidden dark:hover:bg-jade-800">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/" target="_blank" className="btn-ghost !py-2 text-xs"><ExternalLink size={14} /> Xem website</Link>
            <span className="hidden text-sm text-jade-600 sm:block dark:text-jade-300">{user?.name}</span>
            <button onClick={doLogout} className="grid h-10 w-10 place-items-center rounded-lg text-jade-600 hover:bg-red-50 hover:text-red-600" title="Đăng xuất">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
