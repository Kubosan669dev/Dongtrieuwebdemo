// Lớp nền phủ của hộp thoại đóng được bằng cách bấm ra ngoài. Cố ý KHÔNG gắn
// thêm xử lý bàn phím lên lớp nền: bàn phím đã có hai lối thoát đúng chuẩn là
// phím Esc và nút đóng có thể Tab tới. Biến lớp nền thành phần tử hội tụ được
// chỉ thêm một chặng Tab vô nghĩa trước khi tới nội dung thật của hộp thoại.
/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Sun, Moon } from 'lucide-react';
import { THEMES } from '../lib/themes.js';
import { cx } from '../lib/format.js';
import { useScrollLock } from '../hooks/useScrollLock.js';

/**
 * Ô xem trước một bảng màu.
 *
 * Mẹo ở đây: gắn thẳng `data-theme` lên phần tử này. Biến CSS đổ xuống theo cây
 * DOM nên `bg-paper`, `bg-jade-600`, `bg-gold-400` bên trong tự lấy màu của bảng
 * đó — không phải khai báo lại mã màu trong JavaScript, và thêm bảng màu mới chỉ
 * cần sửa hai file (themes.css + themes.js) là ô xem trước đúng ngay.
 *
 * `dark` bọc ngoài để bảng nào ưa nền tối thì xem trước cũng ra nền tối.
 */
function Swatch({ theme }) {
  return (
    <span
      data-theme={theme.id}
      className={cx('block w-14 shrink-0 overflow-hidden rounded-md ring-1 ring-black/10', theme.mode === 'dark' && 'dark')}
    >
      <span className="flex h-7">
        <span className="w-1/2 bg-paper dark:bg-jade-950" />
        <span className="w-[30%] bg-jade-600" />
        <span className="w-[20%] bg-gold-400" />
      </span>
    </span>
  );
}

/**
 * Hộp chọn bảng màu — thay cho nút bật/tắt nền tối trước đây.
 *
 * Chín bảng màu là chín dải màu chủ đạo; sáng/tối là một trục riêng, nên bảng nào
 * cũng dùng được ở cả hai chế độ.
 *
 * ── HAI TRỤC NÀY CÓ PHẠM VI KHÁC NHAU, VÀ PHẢI NÓI RA ──────────────────────
 * Bảng màu chỉ đổi cho CỔNG đang xem, còn nền sáng/tối đổi cho cả hai. Người
 * dùng không tự đoán được điều đó, và nếu không nói thì họ đổi màu ở cổng du
 * lịch, bước sang cổng người dân thấy vẫn nâu, rồi kết luận là nút bị hỏng.
 * Vì thế `tenCong` là chữ hiện thẳng trên nhãn, không phải chú thích nhỏ.
 */
export default function ThemePicker({ open, theme, mode, tenCong, onPick, onMode, onClose }) {
  // Hộp này render cả khi đóng (khác các modal kia), nên phải truyền `open` vào
  // để hook biết lúc nào mới khoá.
  useScrollLock(open);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* `role="dialog"` thuộc về khung nội dung chứ không phải lớp nền phủ.
          Đặt nhầm lên nền thì trình đọc màn hình coi cả màn hình tối là hộp thoại. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chọn bảng màu website"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-md bg-white shadow-lift dark:bg-jade-900 sm:rounded-md"
      >
        <div className="flex items-center justify-between gap-3 border-b border-jade-900/5 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="font-serif text-lg font-bold text-jade-900 dark:text-jade-50">Bảng màu</h2>
            <p className="text-xs text-muted/70">
              {tenCong ? `Áp dụng cho ${tenCong} — cổng bên kia giữ màu riêng` : 'Chọn tông màu bạn thấy dễ nhìn nhất'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng bảng màu"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-jade-600 transition hover:bg-jade-100 dark:text-jade-200 dark:hover:bg-jade-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((t) => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                onClick={() => onPick(t.id)}
                aria-pressed={active}
                className={cx(
                  'flex items-center gap-3 rounded-md border p-3 text-left transition',
                  active
                    ? 'border-jade-500 bg-jade-50 ring-2 ring-jade-500/40 dark:bg-jade-800/60'
                    : 'border-jade-900/10 hover:border-jade-400 hover:bg-jade-50/60 dark:border-white/10 dark:hover:bg-jade-800/40',
                )}
              >
                <Swatch theme={t} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-semibold text-jade-900 dark:text-jade-50">
                    {t.name}
                  </span>
                  <span className="block truncate text-xs text-muted/70">{t.desc}</span>
                </span>
                {active && <Check size={16} className="shrink-0 text-jade-600 dark:text-jade-300" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-jade-900/5 px-5 py-4 dark:border-white/10">
          <span className="text-sm font-medium text-body">
            Nền trang
            <span className="ml-1.5 font-normal text-muted/70">(dùng chung cho cả hai cổng)</span>
          </span>
          <div className="flex rounded-md bg-jade-100 p-1 dark:bg-jade-800">
            {[
              { id: 'light', label: 'Sáng', Icon: Sun },
              { id: 'dark', label: 'Tối', Icon: Moon },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => onMode(id)}
                aria-pressed={mode === id}
                className={cx(
                  'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition',
                  mode === id
                    ? 'bg-white text-jade-900 shadow-soft dark:bg-jade-600 dark:text-white'
                    : 'text-jade-600 hover:text-body dark:hover:text-white',
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
