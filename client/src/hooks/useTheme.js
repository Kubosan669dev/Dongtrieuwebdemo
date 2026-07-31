import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_THEME, THEMES, isTheme } from '../lib/themes.js';

const THEME_KEY = 'dt-theme'; // id bảng màu
const MODE_KEY = 'dt-mode'; // 'light' | 'dark', chỉ ghi khi khách tự bấm đổi

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

/**
 * Bản trước chỉ lưu 'light'/'dark' vào `dt-theme`. Khách đã dùng site từ trước
 * sẽ có giá trị cũ đó — dời sang khoá `dt-mode` ngay khi nạp trang.
 *
 * Phải dời hẳn chứ không chỉ đọc tạm: hiệu ứng bên dưới sẽ ghi đè `dt-theme`
 * bằng id bảng màu, nên nếu không lưu lại thì lựa chọn nền tối của khách biến
 * mất ở lần tải trang kế tiếp.
 */
(function migrateLegacyStorage() {
  const legacy = read(THEME_KEY);
  if (legacy === 'light' || legacy === 'dark') {
    write(MODE_KEY, legacy);
    write(THEME_KEY, DEFAULT_THEME);
  }
})();

const initialTheme = () => {
  const saved = read(THEME_KEY);
  return isTheme(saved) ? saved : DEFAULT_THEME;
};

const initialMode = () => {
  const saved = read(MODE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return preferredMode(initialTheme());
};

/**
 * Bảng màu + chế độ sáng/tối của toàn site.
 *
 * Bảng màu ghi vào `data-theme` trên thẻ <html>, chế độ tối ghi bằng class `dark`
 * (Tailwind cấu hình `darkMode: 'class'`). Hai thứ độc lập nhau nên tám bảng màu
 * đều dùng được ở cả hai chế độ.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(initialTheme);
  const [mode, setModeState] = useState(initialMode);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', mode === 'dark');
    write(THEME_KEY, theme);

    // Màu thanh trạng thái trên trình duyệt di động phải theo bảng màu đang dùng,
    // nếu không phần chrome của máy sẽ lệch tông với trang.
    const bar = document.querySelector('meta[name="theme-color"]');
    if (bar) {
      const varName = mode === 'dark' ? '--c-jade-950' : '--c-jade-600';
      const rgb = getComputedStyle(root).getPropertyValue(varName).trim();
      if (rgb) bar.setAttribute('content', `rgb(${rgb.replace(/\s+/g, ', ')})`);
    }
  }, [theme, mode]);

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
