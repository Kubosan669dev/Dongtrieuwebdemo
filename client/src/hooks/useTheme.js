import { useCallback, useEffect, useState } from 'react';
import { THEMES, isTheme, themeMacDinh } from '../lib/themes.js';
import { DU_KHACH } from './useDoiTuong.jsx';

/**
 * ── BẢNG MÀU NHỚ RIÊNG TỪNG CỔNG, SÁNG/TỐI THÌ CHUNG ───────────────────────
 * Mỗi cổng có khoá lưu riêng (`dt-theme:du-khach`, `dt-theme:nguoi-dan`) nên đổi
 * màu bên du lịch không kéo theo cổng người dân đổi màu, và ngược lại.
 *
 * Sáng/tối cố ý KHÔNG tách. Bảng màu là chuyện nhận diện của từng cổng, còn
 * sáng/tối là chuyện mắt của người đang ngồi trước máy: ai bật nền tối vì chói
 * mắt thì bật một lần phải ăn cho cả hai cổng, chứ không phải bấm lại mỗi lần
 * bước qua bước lại.
 */
const THEME_KEY = (doiTuong) => `dt-theme:${doiTuong}`;
const MODE_KEY = 'dt-mode'; // 'light' | 'dark', chỉ ghi khi khách tự bấm đổi
const LEGACY_THEME_KEY = 'dt-theme'; // bản cũ: một bảng màu cho cả site

const preferredMode = (id) => THEMES.find((t) => t.id === id)?.mode ?? 'light';

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // trình duyệt chặn localStorage (chế độ ẩn danh) — vẫn chạy bình thường
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* không lưu được thì thôi, đổi màu vẫn có tác dụng trong phiên này */
  }
};

const remove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* trình duyệt chặn localStorage — không có gì để dọn */
  }
};

/**
 * Dọn hai đời khoá cũ, cả hai đều từng nằm ở `dt-theme`:
 *
 *   1. Đời đầu lưu thẳng 'light'/'dark' vào đó — dời sang `dt-mode`.
 *   2. Đời sau lưu id bảng màu dùng chung cho cả site — dời sang khoá của cổng
 *      DU LỊCH. Chỉ cổng du lịch, vì đó là cổng khách đã đứng khi chọn màu; đổ
 *      luôn sang cổng người dân thì bảng màu nâu mới không bao giờ xuất hiện với
 *      những người đã từng vào site.
 *
 * Phải dời hẳn chứ không chỉ đọc tạm: nếu để nguyên `dt-theme` thì lần sau hàm
 * này lại chạy và ghi đè lựa chọn mới của người dùng.
 */
(function donKhoaCu() {
  const legacy = read(LEGACY_THEME_KEY);
  if (!legacy) return;
  if (legacy === 'light' || legacy === 'dark') write(MODE_KEY, legacy);
  else if (isTheme(legacy) && !read(THEME_KEY(DU_KHACH))) write(THEME_KEY(DU_KHACH), legacy);
  remove(LEGACY_THEME_KEY);
})();

const initialTheme = (doiTuong) => {
  const saved = read(THEME_KEY(doiTuong));
  return isTheme(saved) ? saved : themeMacDinh(doiTuong);
};

const initialMode = (doiTuong) => {
  const saved = read(MODE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return preferredMode(initialTheme(doiTuong));
};

/**
 * Bảng màu + chế độ sáng/tối của trang.
 *
 * Bảng màu ghi vào `data-theme` trên thẻ <html>, chế độ tối ghi bằng class `dark`
 * (Tailwind cấu hình `darkMode: 'class'`). Hai thứ độc lập nhau nên chín bảng màu
 * đều dùng được ở cả hai chế độ.
 *
 * @param doiTuong cổng đang xem — quyết định đọc/ghi khoá nào và mở đầu bằng
 *   bảng màu nào. Xem `THEME_MAC_DINH` trong lib/themes.js.
 */
export function useTheme(doiTuong = DU_KHACH) {
  const [theme, setThemeState] = useState(() => initialTheme(doiTuong));
  const [mode, setModeState] = useState(() => initialMode(doiTuong));

  /**
   * Bước qua cổng bên kia thì nạp bảng màu của cổng đó.
   *
   * Dùng mẫu "state phái sinh" của React thay cho useEffect, cùng lý do với
   * Header.jsx: đặt state ngay trong lúc render thì màu cũ không kịp vẽ ra màn
   * hình. Qua useEffect thì người dùng thấy một nháy nâu-rồi-xanh mỗi lần đổi
   * cổng — đúng cái nháy mà việc tách màu này sinh ra để tránh.
   */
  const [cong, setCong] = useState(doiTuong);
  if (cong !== doiTuong) {
    setCong(doiTuong);
    setThemeState(initialTheme(doiTuong));
  }

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', mode === 'dark');
    write(THEME_KEY(doiTuong), theme);

    // Màu thanh trạng thái trên trình duyệt di động phải theo bảng màu đang dùng,
    // nếu không phần chrome của máy sẽ lệch tông với trang.
    const bar = document.querySelector('meta[name="theme-color"]');
    if (bar) {
      const varName = mode === 'dark' ? '--c-jade-950' : '--c-jade-600';
      const rgb = getComputedStyle(root).getPropertyValue(varName).trim();
      if (rgb) bar.setAttribute('content', `rgb(${rgb.replace(/\s+/g, ', ')})`);
    }
  }, [theme, mode, doiTuong]);

  const setTheme = useCallback((id) => {
    if (!isTheme(id)) return;
    setThemeState(id);
    // Chưa từng tự chọn sáng/tối thì đi theo chế độ hợp với bảng màu vừa chọn;
    // đã chọn rồi thì tôn trọng lựa chọn đó, không tự ý lật ngược.
    if (!read(MODE_KEY)) setModeState(preferredMode(id));
  }, []);

  const setMode = useCallback((next) => {
    setModeState(next);
    write(MODE_KEY, next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((m) => {
      const next = m === 'dark' ? 'light' : 'dark';
      write(MODE_KEY, next);
      return next;
    });
  }, []);

  return { theme, mode, setTheme, setMode, toggleMode };
}

/**
 * Màu cho biểu đồ recharts theo bảng màu đang dùng.
 *
 * Recharts đặt màu qua thuộc tính SVG (`stroke`, `fill`), mà thuộc tính SVG thì
 * không phải trình duyệt nào cũng hiểu `var(--…)`. Nên phải đọc giá trị biến ra
 * chuỗi màu thật rồi truyền vào. Theo dõi thẻ <html> để khách đổi bảng màu là
 * biểu đồ đổi theo ngay, không cần tải lại trang.
 */
export function useChartColors() {
  const [colors, setColors] = useState(readChartColors);

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(readChartColors()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}

function readChartColors() {
  const cs = getComputedStyle(document.documentElement);
  /** `--c-jade-600` chứa "14 124 94" nên ghép được cả bản đặc lẫn bản có độ mờ. */
  const c = (name, alpha) => {
    const v = cs.getPropertyValue(name).trim() || '14 124 94';
    return alpha == null ? `rgb(${v})` : `rgb(${v} / ${alpha})`;
  };
  return {
    line: c('--c-jade-600'),
    fill: c('--c-jade-600', 0.35),
    grid: c('--c-jade-600', 0.12),
    zero: c('--c-jade-400', 0.7),
  };
}
