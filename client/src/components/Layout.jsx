import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import ChatWidget from './ChatWidget.jsx';
import ThemePicker from './ThemePicker.jsx';
import { useTheme } from '../hooks/useTheme.js';
import { useReveal } from '../hooks/useReveal.js';
import { useDoiTuong } from '../hooks/useDoiTuong.jsx';

export default function Layout() {
  // Bảng màu đi theo cổng đang xem, và mỗi cổng nhớ lựa chọn riêng của mình —
  // đổi màu bên du lịch không kéo theo cổng người dân. Xem hooks/useTheme.js.
  const { doiTuong, laChung, laNguoiDan } = useDoiTuong();
  const { theme, mode, setTheme, setMode } = useTheme(doiTuong);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { pathname } = useLocation();

  // Cuộn lên đầu khi đổi trang
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  // Một observer cho cả trang, quét lại mỗi lần đổi trang. Xem hooks/useReveal.js
  // để biết vì sao phần ẩn khối phụ thuộc vào việc hook này chạy được.
  useReveal([pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── TRANG CHỌN CỔNG KHÔNG CÓ ĐẦU TRANG, CHÂN TRANG, LIÊN KẾT NHẢY ────
          `/` không phải một trang của cổng nào; nó là màn hình đứng TRƯỚC cả hai
          cổng, chỉ để chọn một bên. Mà đầu trang ở đó vốn đã trống rỗng — không
          cổng nào được chọn thì không có thanh điều hướng nào để hiện (xem
          `hooks/useDoiTuong.jsx`), nên nó chỉ còn cái logo dẫn về đúng trang
          đang đứng. Chân trang thì bày sơ đồ của cả hai cổng cùng lúc, tức là
          trả lời sẵn câu hỏi mà trang này đang đặt ra.

          Bỏ cả hai thì màn hình đầu chiếm trọn khung nhìn thật, không còn dải
          trắng cao 4rem của đầu trang trong suốt đè lên trên.

          Liên kết nhảy cũng đi theo: nó tồn tại để vượt qua khối điều hướng lặp
          lại ở mọi trang (WCAG 2.4.1). Ở đây không còn khối nào để vượt, giữ lại
          chỉ thêm một chặng Tab dẫn tới chính chỗ đang đứng. */}
      {!laChung && (
        <>
          {/* Liên kết nhảy tới nội dung — chỉ hiện khi Tab tới.
              Đầu trang có 8 mục điều hướng cộng nút bảng màu, nên người dùng bàn
              phím hoặc trình đọc màn hình phải bấm Tab mười lần trên MỌI trang
              trước khi tới nội dung. Đây là mục 2.4.1 của WCAG. */}
          {/* Ẩn bằng cách đẩy ra ngoài khung nhìn với `translate`, thay cho cặp
              `sr-only` + `focus:not-sr-only`.

              Cả hai cách đều chạy. Chọn cách này vì nó không dựa vào việc một
              tiện ích gỡ bỏ tiện ích kia: `sr-only` đặt cùng lúc `position`,
              `width`, `height`, `clip`, `overflow`, `white-space`, và
              `not-sr-only` phải hoàn nguyên đúng cả sáu. Ở đây phần tử luôn giữ
              kích thước thật, luôn nằm trong thứ tự Tab và cây trợ năng — chỉ là
              đang ở ngoài màn hình. */}
          <a
            href="#noi-dung"
            className="fixed left-4 top-4 z-[100] -translate-y-[200%] rounded-md bg-jade-600 px-5 py-3 text-sm font-semibold text-white shadow-lift focus:translate-y-0"
          >
            Nhảy tới nội dung chính
          </a>
          <Header onOpenThemes={() => setPickerOpen(true)} />
        </>
      )}
      {/* `tabIndex={-1}`: đích của liên kết nhảy phải nhận được hội tụ, nếu không
          thì trình duyệt cuộn tới đây nhưng hội tụ vẫn nằm ở đầu trang và lần Tab
          tiếp theo lại quay về thanh điều hướng. */}
      <main id="noi-dung" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      {!laChung && <Footer />}
      {/* ── TRANG CHỦ CHUNG KHÔNG CÓ KHUNG CHAT ──────────────────────────────
          Hai cổng có hai trợ lý riêng, mỗi trợ lý chỉ trả lời trong phạm vi cổng
          mình (xem `server/src/services/phamvi.js`). Trên trang chưa chọn cổng
          thì không có trợ lý nào là đúng của trang đó: gắn đại một bên vào là
          người vào hỏi thủ tục đất đai sẽ được trợ lý du lịch mời sang cổng
          khác, ngay tại trang mà lẽ ra họ chỉ cần bấm một tấm thẻ. */}
      {!laChung && <ChatWidget />}
      {/* Bảng màu cũng theo đầu trang mà đi: nút mở nó nằm trong `Header`, mà
          trang chọn cổng không còn đầu trang, nên `pickerOpen` ở đó không bao giờ
          bật lên được. `useTheme` phía trên vẫn chạy như thường — trang này vẫn
          đúng bảng màu người dùng đã chọn, chỉ là không đổi được ngay tại đây. */}
      {!laChung && (
        <ThemePicker
          open={pickerOpen}
          theme={theme}
          mode={mode}
          tenCong={laNguoiDan ? 'cổng người dân' : 'cổng du khách'}
          onPick={setTheme}
          onMode={setMode}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
