import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Landmark, CalendarDays, BedDouble, UtensilsCrossed, Store,
  Newspaper, Images, GalleryHorizontal, Settings, LogOut, Menu, X, ExternalLink, Mountain, Bot, Palette,
  MessageSquare, ChevronRight,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useTheme } from '../../hooks/useTheme.js';
import ThemePicker from '../../components/ThemePicker.jsx';
import Brand from '../../components/Brand.jsx';
import { cx } from '../../lib/format.js';
import { SITE_NAME } from '../../lib/site.js';

/**
 * Thanh bên chia nhóm.
 *
 * Bản trước là 13 dòng phẳng nối nhau, không có chỗ nào cho mắt nghỉ, nên tìm
 * một mục phải đọc cả danh sách. Bốn nhóm dưới đây theo đúng cách công việc thực
 * tế diễn ra: soạn nội dung → quản địa điểm → xử phản hồi → sửa cấu hình.
 *
 * "Tổng quan" cố ý đứng ngoài mọi nhóm: nó không phải một loại nội dung mà là
 * điểm khởi đầu.
 *
 * `badge` là khoá lấy số việc chờ từ `/api/admin/stats`. Chỉ mục Phản hồi cần
 * nhãn đếm — đó là mục duy nhất có việc đến từ bên ngoài mà quản trị viên không
 * tự biết là đang có.
 */
const NHOM = [
  {
    ten: 'Nội dung',
    muc: [
      { to: '/admin/di-tich', icon: Landmark, label: 'Di tích' },
      { to: '/admin/le-hoi', icon: CalendarDays, label: 'Lễ hội' },
      { to: '/admin/am-thuc', icon: UtensilsCrossed, label: 'Ẩm thực' },
      { to: '/admin/bai-viet', icon: Newspaper, label: 'Bài viết' },
    ],
  },
  {
    ten: 'Địa điểm',
    muc: [
      { to: '/admin/diem-lan-can', icon: Mountain, label: 'Điểm lân cận' },
      { to: '/admin/luu-tru', icon: BedDouble, label: 'Lưu trú' },
      { to: '/admin/nha-hang', icon: Store, label: 'Nhà hàng' },
    ],
  },
  {
    ten: 'Tương tác',
    muc: [
      { to: '/admin/phan-hoi', icon: MessageSquare, label: 'Phản hồi', badge: 'feedback' },
      { to: '/admin/tro-ly-ai', icon: Bot, label: 'Trợ lý AI' },
    ],
  },
  {
    ten: 'Hệ thống',
    muc: [
      { to: '/admin/slider', icon: GalleryHorizontal, label: 'Slider' },
      { to: '/admin/thu-vien', icon: Images, label: 'Thư viện ảnh' },
      { to: '/admin/cai-dat', icon: Settings, label: 'Cài đặt' },
    ],
  },
];

/** Nhãn breadcrumb theo đường dẫn. Dựng từ NHOM để không phải khai hai lần. */
const NHAN_DUONG_DAN = Object.fromEntries(
  NHOM.flatMap((n) => n.muc.map((m) => [m.to, { label: m.label, nhom: n.ten }])),
);

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, mode, setTheme, setMode } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Nhãn đếm việc chờ trên thanh bên. Dùng chung queryKey với trang Tổng quan nên
  // một lời gọi phục vụ cả hai, và duyệt xong ở trang Phản hồi là số ở đây đổi theo.
  const { data: stats } = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api.get('/admin/stats') });
  const badges = {
    feedback: (stats?.todo?.reviewsPending ?? 0) + (stats?.todo?.contactsPending ?? 0),
  };

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
        <div className="flex h-16 items-center border-b border-jade-800 px-5">
          <Brand size={36} title="Quản trị" subtitle={SITE_NAME} titleClass="text-base" subtitleClass="text-[10px] uppercase tracking-wide text-jade-300" />
        </div>
        {/* Thanh bên cuộn được riêng: 13 mục cộng bốn tiêu đề nhóm vượt chiều cao
            màn hình laptop 13 inch, và `fixed inset-y-0` thì phần dưới bị cắt mất
            chứ không tự cuộn. */}
        <nav className="flex h-[calc(100vh-4rem)] flex-col gap-1 overflow-y-auto p-3">
          <MucNav to="/admin" end icon={LayoutDashboard} label="Tổng quan" onNavigate={() => setOpen(false)} />

          {NHOM.map((nhom) => (
            <div key={nhom.ten} className="mt-4 first:mt-2">
              <p className="mb-1 px-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
                {nhom.ten}
              </p>
              {nhom.muc.map((m) => (
                <MucNav
                  key={m.to}
                  to={m.to}
                  icon={m.icon}
                  label={m.label}
                  badge={m.badge && badges[m.badge]}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Lớp mờ sau thanh bên trên điện thoại. Bấm ra ngoài để đóng là tiện ích
          cho ngón tay; bàn phím đóng bằng chính nút ba gạch đã Tab tới được, nên
          không gắn thêm xử lý bàn phím ở đây. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-jade-900/5 bg-white/90 px-4 backdrop-blur dark:border-white/5 dark:bg-jade-900/90">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Đóng thanh điều hướng' : 'Mở thanh điều hướng'}
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-md text-jade-600 hover:bg-jade-100 lg:hidden dark:hover:bg-jade-800"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Breadcrumb — trước đây đầu trang chỉ có một nút ba gạch và tên người
              dùng, không có chỗ nào nói đang ở đâu. Trên màn hình hẹp thì ẩn đi,
              vì tiêu đề `h1` của chính trang đã nằm ngay bên dưới. */}
          <Breadcrumb pathname={pathname} />

          <div className="ml-auto flex items-center gap-3">
            <Link to="/" target="_blank" className="btn-ghost !py-2 text-xs"><ExternalLink size={14} /> Xem website</Link>
            <span className="hidden text-sm text-jade-600 sm:block dark:text-jade-300">{user?.name}</span>
            <button
              onClick={() => setPickerOpen(true)}
              aria-label="Đổi bảng màu website"
              title="Đổi bảng màu"
              className="grid h-10 w-10 place-items-center rounded-md text-jade-600 hover:bg-jade-100 dark:text-jade-300 dark:hover:bg-jade-800"
            >
              <Palette size={18} />
            </button>
            <button onClick={doLogout} className="grid h-10 w-10 place-items-center rounded-md text-jade-600 hover:bg-red-50 hover:text-red-600" title="Đăng xuất">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Cùng bảng màu với trang công khai — quản trị viên xem nội dung đúng
          tông màu mà khách sẽ thấy. Lựa chọn lưu chung một khoá localStorage. */}
      <ThemePicker
        open={pickerOpen}
        theme={theme}
        mode={mode}
        onPick={setTheme}
        onMode={setMode}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}

/** Một dòng trong thanh bên. Tách ra vì nay có hai chỗ gọi: "Tổng quan" đứng riêng và các mục trong nhóm. */
function MucNav({ to, end, icon: Icon, label, badge, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-3 rounded-md px-3.5 py-2.5 text-sm font-medium transition',
          isActive ? 'bg-jade-600 text-white' : 'text-jade-200 hover:bg-jade-800',
        )
      }
    >
      <Icon size={17} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {/* Chỉ hiện khi CÒN việc: một vòng tròn số 0 vẫn đập vào mắt như việc chưa
          làm, trong khi nó có nghĩa là đã xong. */}
      {badge > 0 && (
        <span className="shrink-0 rounded-md bg-terra-500 px-1.5 text-[11px] font-bold tabular-nums text-white">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

function Breadcrumb({ pathname }) {
  const muc = NHAN_DUONG_DAN[pathname];
  return (
    <nav aria-label="Đường dẫn" className="ml-3 hidden items-center gap-1.5 text-sm text-muted md:flex">
      <Link to="/admin" className="hover:text-jade-700 dark:hover:text-jade-200">Quản trị</Link>
      {muc && (
        <>
          <ChevronRight size={14} aria-hidden="true" className="shrink-0" />
          <span>{muc.nhom}</span>
          <ChevronRight size={14} aria-hidden="true" className="shrink-0" />
          <span className="font-medium text-body">{muc.label}</span>
        </>
      )}
    </nav>
  );
}
