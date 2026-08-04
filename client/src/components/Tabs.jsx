import { useId, useRef, useState } from 'react';
import { cx } from '../lib/format.js';

/**
 * Thanh tab của các trang chi tiết — di tích, lễ hội, ẩm thực.
 *
 * Tách ra từ `HeritageDetail` khi lễ hội và ẩm thực cũng cần tab: ba trang cùng
 * một kiểu thanh tab mà chép làm ba bản thì sớm muộn lệch nhau, và lệch ở đây là
 * du khách thấy mỗi trang một khác.
 *
 * `items` là mảng `{ key, label, icon, content }`. Phần tử falsy bị bỏ qua, nên
 * chỗ gọi viết thẳng `dieuKien && { … }` để ẩn tab không có gì bên trong. Đây là
 * chuyện thường ở cổng thông tin phường: hồ sơ di tích nào cũng thiếu vài mục,
 * mà một tab bấm vào ra trang trắng thì du khách tưởng web hỏng.
 *
 * Tab đang chọn giữ trong state chứ không đưa lên URL — giữ đúng nếp cũ của
 * trang di tích, mở lại là về tab đầu.
 */
export default function Tabs({ items, className, label = 'Nội dung chi tiết' }) {
  const shown = items.filter(Boolean);
  const [key, setKey] = useState(null);
  const buttons = useRef({});
  const uid = useId();

  if (shown.length === 0) return null;

  // Còn đúng một mục thì thanh tab chỉ là tiếng ồn — một cái tab không chuyển đi
  // đâu được. Trường hợp này rất thật: 6/8 món ẩm thực chưa có ảnh nào, nếu vẫn
  // vẽ thanh tab thì trang nào cũng có một nút "Giới thiệu" bấm mãi không đổi.
  if (shown.length === 1) return <div className={className}>{shown[0].content}</div>;

  // Không đồng bộ `key` với danh sách bằng effect: cứ tra lại mỗi lần vẽ. Tab
  // đang chọn mà biến mất (dữ liệu tải xong, mục rỗng bị ẩn) thì tự rơi về tab
  // đầu, không có khoảnh khắc nào hiện ra trang trắng.
  const active = shown.find((t) => t.key === key) ?? shown[0];

  /** Mũi tên trái/phải chuyển tab — đúng thông lệ bàn phím của `role="tablist"`. */
  const move = (step) => {
    const i = shown.indexOf(active);
    const next = shown[(i + step + shown.length) % shown.length];
    setKey(next.key);
    buttons.current[next.key]?.focus();
  };

  return (
    <div className={className}>
      {/* Các tab nằm sát nhau, KHÔNG có `gap`. Phần đệm `px-4` của chính mỗi tab
          đã là khoảng cách rồi; thêm gap nữa là sinh ra một quãng trống không
          thuộc về tab nào, khiến nhịp thành 16 + 8 + 16 và vạch chân của tab đang
          chọn bắt đầu trước chữ của nó một đoạn dài — nhìn như tab bị thụt vào.
          Bỏ gap thì mỗi tab là một ô đều nhau, vạch chân phủ đúng một ô. */}
      <div
        role="tablist"
        aria-label={label}
        className="no-scrollbar flex overflow-x-auto border-b border-jade-900/5 dark:border-white/10"
      >
        {shown.map((t) => {
          const on = t.key === active.key;
          return (
            <button
              key={t.key}
              ref={(el) => { buttons.current[t.key] = el; }}
              type="button"
              role="tab"
              id={`${uid}-tab-${t.key}`}
              aria-selected={on}
              aria-controls={`${uid}-panel-${t.key}`}
              // Cả thanh tab chỉ chiếm MỘT chặng Tab; vào rồi thì đi bằng mũi tên.
              tabIndex={on ? 0 : -1}
              onClick={() => setKey(t.key)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
                if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
              }}
              className={cx(
                'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition',
                // Cả thanh chỉ có một nút nhận được Tab, nên nút đó bắt buộc phải
                // nhìn thấy được viền hội tụ — không thì đi bàn phím là mất dấu.
                'focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-jade-400',
                on
                  ? 'border-jade-600 text-jade-700 dark:text-jade-200'
                  : 'border-transparent text-muted hover:text-jade-700',
              )}
            >
              {/* Nhãn bọc trong <span>, và không để dấu cách rời giữa hai phần tử:
                  dấu cách trong JSX là một nút văn bản thật, nó cộng thêm vào
                  `gap` một quãng không đo được. Có bọc thì khoảng cách icon–chữ
                  đúng bằng `gap-2` ở mọi tab. */}
              {t.icon && <t.icon size={15} className="shrink-0" />}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${uid}-panel-${active.key}`}
        aria-labelledby={`${uid}-tab-${active.key}`}
        // Nhiều tab chỉ có chữ, không có gì hội tụ được bên trong. Cho chính khung
        // nội dung nhận được hội tụ để người đi bàn phím đọc và cuộn được nó.
        tabIndex={0}
        className="mt-6 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-400"
      >
        {active.content}
      </div>
    </div>
  );
}
