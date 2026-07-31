import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import ChatWidget from './ChatWidget.jsx';
import ThemePicker from './ThemePicker.jsx';
import { useTheme } from '../hooks/useTheme.js';
import { useReveal } from '../hooks/useReveal.js';

export default function Layout() {
  const { theme, mode, setTheme, setMode } = useTheme();
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
      {/* Liên kết nhảy tới nội dung — chỉ hiện khi Tab tới.
          Đầu trang có 8 mục điều hướng cộng nút bảng màu, nên người dùng bàn phím
          hoặc trình đọc màn hình phải bấm Tab mười lần trên MỌI trang trước khi
          tới nội dung. Đây là mục 2.4.1 của WCAG. */}
      {/* Ẩn bằng cách đẩy ra ngoài khung nhìn với `translate`, thay cho cặp
          `sr-only` + `focus:not-sr-only`.

          Cả hai cách đều chạy. Chọn cách này vì nó không dựa vào việc một tiện
          ích gỡ bỏ tiện ích kia: `sr-only` đặt cùng lúc `position`, `width`,
          `height`, `clip`, `overflow`, `white-space`, và `not-sr-only` phải hoàn
          nguyên đúng cả sáu. Ở đây phần tử luôn giữ kích thước thật, luôn nằm
          trong thứ tự Tab và cây trợ năng — chỉ là đang ở ngoài màn hình. */}
      <a
        href="#noi-dung"
        className="fixed left-4 top-4 z-[100] -translate-y-[200%] rounded-full bg-jade-600 px-5 py-3 text-sm font-semibold text-white shadow-lift focus:translate-y-0"
      >
        Nhảy tới nội dung chính
      </a>
      <Header onOpenThemes={() => setPickerOpen(true)} />
      {/* `tabIndex={-1}`: đích của liên kết nhảy phải nhận được hội tụ, nếu không
          thì trình duyệt cuộn tới đây nhưng hội tụ vẫn nằm ở đầu trang và lần Tab
          tiếp theo lại quay về thanh điều hướng. */}
      <main id="noi-dung" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
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
