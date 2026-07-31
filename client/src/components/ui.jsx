import { cx } from '../lib/format.js';

// Bảng lớp màu cho chip/badge
const TONES = {
  jade: 'bg-jade-100 text-jade-800 dark:bg-jade-800/40 dark:text-jade-100',
  gold: 'bg-gold-100 text-gold-800 dark:bg-gold-800/30 dark:text-gold-200',
  terra: 'bg-terra-500/15 text-terra-600 dark:text-terra-400',
  // Hai tone này trước dùng màu Tailwind thô nên đứng nguyên màu tím/đỏ ở cả 8
  // bảng màu, lạc hẳn khỏi phần còn lại. Nay đưa về dải màu đất của bảng đang dùng.
  violet: 'bg-terra-400/15 text-terra-600 dark:bg-terra-400/20 dark:text-terra-400',
  red: 'bg-terra-600/15 text-terra-600 dark:bg-terra-600/25 dark:text-terra-400',
  gray: 'bg-jade-50 text-jade-600 dark:bg-jade-900/40 dark:text-jade-300',
};

export function Badge({ tone = 'jade', children, className }) {
  return <span className={cx('chip', TONES[tone] ?? TONES.jade, className)}>{children}</span>;
}

/** Màu khi chip lọc đang được chọn. */
const FILTER_ACTIVE = {
  jade: 'bg-jade-600 text-white',
  gold: 'bg-gold-400 text-jade-950',
  terra: 'bg-terra-500 text-white',
};

/**
 * Chip lọc trên các trang danh sách.
 *
 * Ba trang Di tích, Lưu trú, Ẩm thực trước đây mỗi trang tự khai một component
 * gần như giống hệt nhau, khác đúng màu lúc được chọn — nên sửa một chỗ là hai
 * chỗ kia lệch theo. Gộp về đây.
 *
 * `aria-pressed` để trình đọc màn hình biết bộ lọc nào đang bật; bản cũ chỉ đổi
 * màu nền, người dùng bàn phím không nhận ra trạng thái.
 */
export function FilterChip({ active, onClick, children, tone = 'jade' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'rounded-full px-4 py-2 text-sm font-medium transition',
        active
          ? FILTER_ACTIVE[tone] ?? FILTER_ACTIVE.jade
          : 'bg-white text-jade-700 ring-1 ring-jade-200 hover:bg-jade-50 dark:bg-jade-900/50 dark:text-jade-100 dark:ring-jade-700',
      )}
    >
      {children}
    </button>
  );
}

export function SectionHeading({ eyebrow, title, description, action, center }) {
  return (
    <div className={cx('mb-8 flex flex-col gap-3', center ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between')}>
      <div className={center ? 'max-w-2xl' : ''}>
        {/* Dùng lớp `.eyebrow` trong index.css chứ không tự khai class ở đây.
            Trước đây chỗ này ghi tay một kiểu khác hẳn (text-sm, tracking-wide,
            gold-500) so với `.eyebrow` (text-xs, tracking rộng hơn, gold-600),
            nên nhãn nhỏ trên dải "Mùa lễ hội" và nhãn trên mọi mục còn lại của
            trang không cùng một dáng. */}
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h2 className="section-title">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-jade-700/80 dark:text-jade-200/70">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Spinner({ className }) {
  return (
    <div className={cx('flex items-center justify-center py-16', className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-jade-200 border-t-jade-600" />
    </div>
  );
}

/**
 * Trạng thái rỗng.
 *
 * `icon` nhận **thành phần** biểu tượng (vd `icon={Star}`), không phải phần tử đã
 * dựng sẵn — đúng như mọi nơi gọi trong dự án vẫn truyền, và cùng lối với
 * `{ icon: Icon }` ở `SectionHeading`, `Dashboard`, `AdminLayout`.
 *
 * Bản trước dựng thẳng `{icon}` làm con của một thẻ. Biểu tượng lucide là đối
 * tượng `forwardRef`, nên React ném "Objects are not valid as a React child" và
 * ĐỔ CẢ ỨNG DỤNG, không phải chỉ hỏng một khối. Lỗi này nằm im từ trước vì chỉ
 * nổ khi danh sách rỗng: `ChatLogsAdmin` đã mang nó sẵn — mở trang Trợ lý AI lúc
 * chưa có câu hỏi nào là trắng màn hình.
 */
export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-jade-200 bg-white/60 py-16 text-center dark:border-jade-700 dark:bg-jade-900/30">
      {Icon && (
        <div className="mb-3 text-jade-400">
          <Icon size={32} aria-hidden="true" />
        </div>
      )}
      <p className="font-serif text-lg font-semibold text-jade-800 dark:text-jade-100">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-jade-600 dark:text-jade-300">{description}</p>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[4/3] animate-pulse bg-jade-100 dark:bg-jade-800/50" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-jade-100 dark:bg-jade-800/50" />
        <div className="h-3 w-full animate-pulse rounded bg-jade-100 dark:bg-jade-800/50" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-jade-100 dark:bg-jade-800/50" />
      </div>
    </div>
  );
}

export function ErrorNote({ message = 'Đã có lỗi khi tải dữ liệu.', onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-3">
          Thử lại
        </button>
      )}
    </div>
  );
}
