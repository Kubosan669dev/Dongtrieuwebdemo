import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Palette } from 'lucide-react';
import Brand from './Brand.jsx';
import AudienceToggle from './AudienceToggle.jsx';
import { cx } from '../lib/format.js';
import { SITE_NAME, SITE_SHORT, SITE_TAGLINE } from '../lib/site.js';
import { NGUOI_DAN, useDoiTuong } from '../hooks/useDoiTuong.jsx';

/**
 * Hai thanh điều hướng, một cho mỗi cổng. Chọn theo ĐƯỜNG DẪN đang xem.
 *
 * ── HAI DANH SÁCH KHÔNG ĐƯỢC CÓ MỤC NÀO TRÙNG NHAU ─────────────────────────
 * Đây là ràng buộc, không phải sở thích. Vai của một trang suy ra từ chính
 * đường dẫn của nó (xem `vaiCuaDuong`), nên nếu thanh nav người dân chứa một
 * mục thuộc cổng du lịch thì bấm vào đó là cả đầu trang đổi sang bên kia — người
 * dùng chỉ định xem lịch hội mà tự dưng thấy mình đứng ở một cổng khác.
 *
 * Vì thế Lễ hội · Bản đồ · Thời tiết · Giới thiệu nằm hẳn bên du lịch, còn Tin
 * tức · Liên hệ nằm hẳn bên người dân. Bên nào cần trỏ sang bên kia thì trỏ qua
 * chân trang hoặc qua nút chuyển cổng, tức là đi qua một cái cửa thấy được, chứ
 * không phải trượt sang lúc nào không biết.
 */
const NAV_DU_KHACH = [
  { to: '/di-tich', label: 'Di tích' },
  { to: '/le-hoi', label: 'Lễ hội' },
  { to: '/am-thuc', label: 'Ẩm thực' },
  { to: '/luu-tru', label: 'Lưu trú' },
  { to: '/ban-do', label: 'Bản đồ' },
  { to: '/thoi-tiet', label: 'Thời tiết' },
  { to: '/gioi-thieu', label: 'Giới thiệu' },
];

const NAV_NGUOI_DAN = [
  { to: '/khu-pho', label: 'Khu phố' },
  { to: '/hanh-chinh', label: 'Hành chính' },
  { to: '/van-ban', label: 'Văn bản' },
  { to: '/phan-anh', label: 'Phản ánh' },
  { to: '/tin-tuc', label: 'Tin tức' },
  { to: '/lien-he', label: 'Liên hệ' },
];

export default function Header({ onOpenThemes }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { doiTuong, trangChu } = useDoiTuong();
  const laNguoiDan = doiTuong === NGUOI_DAN;
  const NAV = laNguoiDan ? NAV_NGUOI_DAN : NAV_DU_KHACH;

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
        {/* Logo dẫn về trang chủ CỦA CỔNG ĐANG XEM. Trỏ cứng về `/` thì người
            dân bấm logo là bị đẩy sang cổng du lịch — mất chỗ đang đứng. */}
        <Link to={trangChu}>
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
            /* Dòng phụ nói rõ đang đứng ở cổng nào. Đây là tín hiệu rẻ nhất mà
               chắc nhất: người dùng liếc một cái là biết mình ở đâu, không phải
               suy ra từ việc thanh nav có mục gì. */
            subtitle={laNguoiDan ? 'Cổng người dân' : SITE_TAGLINE}
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
                  // px hẹp lại ở đúng mức lg: thanh nav giờ phải chia chỗ với nút
                  // chuyển vai trò, để nguyên 3.5 thì 7 mục tràn dòng ở 1024px.
                  'rounded-md px-2.5 py-2 text-sm font-medium transition xl:px-3.5',
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
          {/* Nút chuyển vai trò. Dưới 640px nó chuyển vào trong menu ba gạch —
              đầu trang ở khổ đó chỉ vừa tên cổng và hai nút tròn. */}
          <AudienceToggle className="hidden sm:inline-flex" />
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
            {/* Bản dành cho khổ hẹp — bấm xong đóng luôn menu, vì nội dung phía
                sau đã đổi hẳn, để menu che mất thì không thấy mình vừa đổi gì. */}
            <AudienceToggle className="mb-2 justify-center sm:hidden" onChoose={() => setOpen(false)} />
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
