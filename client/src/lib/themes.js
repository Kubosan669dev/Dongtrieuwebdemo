/**
 * Danh mục bảng màu hiển thị trong hộp chọn màu.
 *
 * Mã màu thật nằm ở [`src/styles/themes.css`](../styles/themes.css) — ở đây chỉ
 * có `id` trùng với `[data-theme=...]` bên đó. Ô xem trước trong hộp chọn tự gắn
 * `data-theme` lên chính nó nên lấy màu thẳng từ CSS, không phải chép lại mã màu
 * sang JavaScript (chép là sớm muộn cũng lệch nhau).
 *
 * `mode` là chế độ sáng/tối hợp với bảng màu đó nhất, dùng khi khách chọn bảng
 * màu lần đầu. Khách vẫn tự đổi sáng/tối sau đó được.
 */
export const THEMES = [
  { id: 'heritage', name: 'Paper Heritage', desc: 'Ngọc lục bảo, vàng son', mode: 'light' },
  { id: 'coral', name: 'Coral Sunrise', desc: 'San hô ấm, năng động', mode: 'light' },
  { id: 'teal', name: 'Teal Paradise', desc: 'Xanh ngọc tươi', mode: 'light' },
  { id: 'halong', name: 'Hạ Long Blue', desc: 'Xanh biển trong logo phường', mode: 'light' },
  { id: 'forest', name: 'Forest Zen', desc: 'Xanh rừng thiền', mode: 'light' },
  { id: 'lotus', name: 'Rose Lotus', desc: 'Hồng sen mềm', mode: 'light' },
  { id: 'zen', name: 'Zen Neutral', desc: 'Trung tính, tối giản', mode: 'light' },
  { id: 'crimson', name: 'Midnight Crimson', desc: 'Nền tối, đỏ trầm', mode: 'dark' },
];

export const DEFAULT_THEME = 'heritage';

export const isTheme = (id) => THEMES.some((t) => t.id === id);
