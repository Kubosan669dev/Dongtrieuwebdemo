import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Palette } from 'lucide-react';
import Brand from './Brand.jsx';
import { cx } from '../lib/format.js';
import { SITE_NAME, SITE_SHORT, SITE_TAGLINE } from '../lib/site.js';
import { CHUNG, DU_KHACH, NGUOI_DAN, TRANG_CHU, useDoiTuong } from '../hooks/useDoiTuong.jsx';

/**
 * Hai thanh điều hướng, một cho mỗi cổng — cộng một trạng thái thứ ba: TRỐN HẲN.
 *
 * ── HAI DANH SÁCH KHÔNG ĐƯỢC CÓ MỤC NÀO TRÙNG NHAU ─────────────────────────
 * Đây là ràng buộc, không phải sở thích. Vai của một trang suy ra từ chính
 * đường dẫn của nó (xem `vaiCuaDuong`), nên nếu thanh nav người dân chứa một
 * mục thuộc cổng du lịch thì bấm vào đó là cả đầu trang đổi sang bên kia — người
 * dùng chỉ định xem lịch hội mà tự dưng thấy mình đứng ở một cổng khác.
 *
 * Vì thế Lễ hội · Bản đồ · Thời tiết · Giới thiệu nằm hẳn bên du lịch, còn Tin
 * tức · Liên hệ nằm hẳn bên người dân. Bên nào cần trỏ sang bên kia thì trỏ qua
 * chân trang hoặc qua trang chủ chung, tức là đi qua một cái cửa thấy được, chứ
 * không phải trượt sang lúc nào không biết.
 *
 * ── TRANG CHỦ CHUNG (`/`) KHÔNG CÓ THANH ĐIỀU HƯỚNG NÀO ────────────────────
 * Nó chưa thuộc bên nào, nên hiện thanh của bên nào cũng là chọn hộ người dùng.
 * `NAV` rỗng ở đó là lớp phòng thủ thứ hai: thực tế `Layout` không dựng cả đầu
 * trang lẫn chân trang cho `/` nữa, việc chọn lối đi để cho hai tấm thẻ to giữa
 * trang lo (xem `components/Layout.jsx` và `pages/Portal.jsx`).
 */
/**
 * Mục đầu của cả hai thanh: đường về trang chủ CỦA CHÍNH CỔNG ĐANG ĐỨNG.
 *
 * ── VÌ SAO KHÔNG PHẢI `/` ─────────────────────────────────────────────────
 * Thanh điều hướng này là của một cổng: bảy mục còn lại đều nằm trong cổng đó.
 * Đang xem Di tích mà bấm "Trang chủ" thì điều người ta chờ là quay về đầu cổng
 * du khách — chỗ có mấy mục vừa đi ra. Trỏ về `/` là ném họ ra ngoài cả cổng,
 * về màn hình chọn lại từ đầu, và thanh điều hướng vừa dùng cũng biến mất theo.
 * Không ai bấm "Trang chủ" để mất luôn cái thanh đang dùng.
 *
 * ── VẬY ĐƯỜNG RA CỬA CHUNG NẰM Ở ĐÂU ──────────────────────────────────────
 * Ở logo. Hai lối này khác nghĩa nhau nên để tách ra là đúng: "Trang chủ" là về
 * đầu cổng, logo là bước hẳn ra ngoài để chọn cổng khác. Breadcrumb "Cổng du
 * khách" ở đầu mỗi trang con cũng dẫn về cùng chỗ với mục này (xem `PageHero`).
 *
 * ── VÌ SAO VẪN GIỮ `end` ──────────────────────────────────────────────────
 * `NavLink` mặc định coi mọi đường dẫn con là "đang xem" nếu chúng bắt đầu bằng
 * `to`. Hiện chưa có tuyến nào nằm dưới `/du-khach` hay `/nguoi-dan`, nhưng thêm
 * một tuyến như vậy là mục Trang chủ sáng đèn cùng lúc với mục kia — giữ sẵn
 * `end` thì việc đó không bao giờ xảy ra.
 */
const veTrangChu = (cong) => ({ to: TRANG_CHU[cong], label: 'Trang chủ', end: true });

const NAV_DU_KHACH = [
  veTrangChu(DU_KHACH),
  { to: '/di-tich', label: 'Di tích' },
  { to: '/le-hoi', label: 'Lễ hội' },
  // "Lịch" chứ không phải "Lịch lễ hội": thanh này đã chín mục, mà `nav` mang
  // `shrink-0` nên chỗ thiếu bị trừ vào tên site chứ không phải vào đây. Nhãn dài
  // thêm bảy chữ là tên site cụt sớm hơn một mốc màn hình. Đứng ngay sau "Lễ hội"
  // nên nghĩa của nó đọc ra được từ vị trí.
  { to: '/lich', label: 'Lịch' },
  { to: '/am-thuc', label: 'Ẩm thực' },
  { to: '/luu-tru', label: 'Lưu trú' },
  { to: '/ban-do', label: 'Bản đồ' },
  { to: '/thoi-tiet', label: 'Thời tiết' },
  { to: '/gioi-thieu', label: 'Giới thiệu' },
];

const NAV_NGUOI_DAN = [
  veTrangChu(NGUOI_DAN),
  { to: '/khu-pho', label: 'Khu phố' },
  { to: '/hanh-chinh', label: 'Hành chính' },
  { to: '/van-ban', label: 'Văn bản' },
  // "Đất đai" chứ không phải "Thủ tục đất đai": bốn chữ giữa một hàng toàn mục
  // một–hai chữ làm lệch nhịp cả thanh nav. Trang đích vẫn mang tên đầy đủ.
  { to: '/thu-tuc', label: 'Đất đai' },
  { to: '/phan-anh', label: 'Phản ánh' },
  { to: '/tin-tuc', label: 'Tin tức' },
  { to: '/lien-he', label: 'Liên hệ' },
];

export default function Header({ onOpenThemes }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { doiTuong } = useDoiTuong();
  const laChung = doiTuong === CHUNG;
  const laNguoiDan = doiTuong === NGUOI_DAN;
  const NAV = laChung ? [] : laNguoiDan ? NAV_NGUOI_DAN : NAV_DU_KHACH;

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

  /**
   * ── MÀU CHỮ ĐI THEO NỀN THẬT, KHÔNG ĐI THEO CHẾ ĐỘ SÁNG/TỐI ───────────────
   * Chưa cuộn thì đầu trang trong suốt, và thứ nằm ngay dưới nó LUÔN LÀ MỘT DẢI
   * TỐI: trang chủ có ảnh bìa, mọi trang con có `PageHero` nền `bg-jade-800`,
   * trang chung có dải chuyển sắc jade. Không có ngoại lệ nào.
   *
   * Bản trước tô `text-jade-800` rồi để `dark:` lo phần còn lại. Ở chế độ nền
   * TỐI thì đúng, vì `dark:text-jade-100` nhảy vào cứu. Ở chế độ nền SÁNG thì
   * chữ sẫm nằm trên dải tối — gần như không đọc được, và đó chính là thứ nhìn
   * thấy trên đầu mọi trang khi vừa mở lên.
   *
   * Nên điều kiện đúng là `scrolled`, không phải chế độ màu: chưa cuộn → chữ
   * sáng (nền dưới chắc chắn tối); đã cuộn → nền giấy/đêm của chính đầu trang,
   * lúc ấy mới tới lượt `dark:` quyết định.
   */
  const chuTrenNen = scrolled
    ? 'text-jade-800 hover:bg-jade-100 dark:text-jade-100 dark:hover:bg-jade-800/50'
    : 'text-white/90 hover:bg-white/15 hover:text-white';
  const nutTron = scrolled
    ? 'text-jade-700 hover:bg-jade-100 dark:text-jade-200 dark:hover:bg-jade-800/50'
    : 'text-white/90 hover:bg-white/15 hover:text-white';

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
        {/* Logo luôn dẫn về TRANG CHỦ CHUNG `/` — đây là đường DUY NHẤT bước ra
            khỏi cổng đang xem để chọn cổng khác, nên đừng đổi nó thành `trangChu`
            cho "thống nhất" với mục nav. Hai lối cố ý khác nghĩa nhau: mục "Trang
            chủ" giữa thanh nav về đầu cổng hiện tại, logo ra hẳn ngoài cửa. Trỏ
            cả hai về một chỗ là mất một trong hai việc.

            `min-w-0` để CHỌN chỗ co lại. Ba khối trong hàng này mặc định đều co
            được, nên khi thiếu chỗ trình duyệt bóp cả ba cùng lúc và mỗi nhãn tự
            xuống dòng giữa chừng. Cho phép co ở đúng đây, cấm co ở hai khối kia:
            thiếu chỗ thì tên site cắt bớt bằng dấu ba chấm — hỏng một cách đọc
            được, thay vì cả thanh nav vỡ vụn. */}
        <Link to="/" className="min-w-0">
          <Brand
            /* Tên đầy đủ ở đầu trang — đây là chỗ dễ thấy nhất, để trống tên mới
               ở đây thì việc đổi tên coi như không xảy ra với người vào trang.
               Dưới 640px thì rút về tên ngắn: "Phường Đông Triều" hai dòng chen
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
            subtitle={laChung ? SITE_TAGLINE : laNguoiDan ? 'Cổng người dân' : 'Cổng du khách'}
            titleClass={cx('truncate text-lg', scrolled ? 'text-jade-900 dark:text-jade-50' : 'text-white')}
            /* Dòng phụ chỉ `whitespace-nowrap`, KHÔNG `truncate`. `truncate` kéo
               theo `overflow:hidden`, mà đây là chữ HOA tiếng Việt có dấu xếp hai
               tầng ("CỔNG": mũ + hỏi) nằm trong khung dòng `leading-tight` vốn đã
               hẹp hơn chiều cao chữ — dấu trên cùng bị cắt cụt. */
            subtitleClass={cx(
              'whitespace-nowrap text-[11px] uppercase tracking-wide',
              scrolled ? 'text-gold-600 dark:text-gold-400' : 'text-gold-300',
            )}
          />
        </Link>

        {NAV.length > 0 && (
          <nav className="hidden shrink-0 items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    // `whitespace-nowrap` là điều kiện, không phải trang trí: thiếu
                    // nó thì lúc chật chỗ mỗi nhãn tự bẻ đôi ("Khu / phố") và cả
                    // hàng thành hai tầng so le. Có nó thì nhãn luôn nguyên vẹn,
                    // phần chật đẩy sang tên site — nơi đã có `truncate` đỡ sẵn.
                    // px bó lại ở lg rồi nới dần: thanh nay có TÁM mục (thêm
                    // "Trang chủ"), ở đúng 1024px thì cả hàng cần ~877 trên 960px
                    // — đủ, nhưng không còn chỗ cho đệm rộng.
                    'whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium transition xl:px-2.5 2xl:px-3.5',
                    // Mục đang xem: viên thuốc jade-600 chữ trắng, đọc được trên
                    // cả nền tối lẫn nền giấy nên không cần tách theo `scrolled`.
                    isActive ? 'bg-jade-600 text-white shadow-soft' : chuTrenNen,
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {/* Mở hộp chọn bảng màu — bên trong có cả chuyển nền sáng/tối */}
          <button
            onClick={onOpenThemes}
            aria-label="Đổi bảng màu website"
            title="Đổi bảng màu"
            className={cx('grid h-10 w-10 place-items-center rounded-full', nutTron)}
          >
            <Palette size={18} />
          </button>
          {/* `aria-expanded` + `aria-controls`: trước đây nút chỉ có `aria-label="Menu"`,
              nên trình đọc màn hình đọc ra "Menu, nút" mà không cho biết menu
              đang mở hay đang đóng — người dùng bấm rồi không biết đã xảy ra gì.
              `aria-label` cũng đổi theo trạng thái để nói rõ việc nút sẽ làm. */}
          {NAV.length > 0 && (
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={open}
              aria-controls="menu-dien-thoai"
              className={cx('grid h-10 w-10 place-items-center rounded-full lg:hidden', nutTron)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Menu mobile */}
      {open && NAV.length > 0 && (
        <div id="menu-dien-thoai" className="border-t border-jade-900/5 bg-paper/95 backdrop-blur-md lg:hidden dark:bg-jade-950/95">
          <nav className="container-page grid gap-1 py-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
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
