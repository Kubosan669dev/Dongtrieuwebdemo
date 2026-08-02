import { cx } from '../lib/format.js';

/**
 * Nhãn có HAI DÁNG, không phải sáu màu.
 *
 * ── VÌ SAO BỎ LỐI SÁU MÀU ───────────────────────────────────────────────────
 * Bản trước cho mỗi tone một mảng màu nhạt riêng, và hỏng ở ba chỗ:
 *
 *  1. Sáu màu nhưng chỉ có sáu mảng nhạt gần giống nhau, nên đứng cạnh nhau
 *     chúng đọc ra là "nhiễu", không phải "phân loại".
 *  2. `text-terra-600` chỉ đạt 3.56 ở ba bảng màu teal/lotus/crimson — dưới
 *     chuẩn WCAG AA. Và không có màu chữ nào cứu được: `terra` đổi tính hoàn
 *     toàn giữa các bảng (gạch nung sẫm ở heritage, cam tươi ở crimson), nên
 *     chữ trắng trượt ở ba bảng còn chữ đậm trượt ở bốn bảng kia.
 *  3. Hai thang XẾP HẠNG (cấp di tích, quy mô lễ hội) là thang có THỨ TỰ, mà
 *     ba mảng nhạt khác màu không nói được cái nào cao hơn cái nào.
 *
 * Nay thứ tự nằm ở ĐỘ ĐẬM, còn phân loại nằm ở màu ĐƯỜNG VIỀN:
 *
 *   nền đặc vàng  → bậc cao nhất (Di tích Quốc gia đặc biệt, Lễ hội lớn)
 *   nền đặc xanh  → bậc giữa
 *   viền          → bậc thấp và mọi nhãn phân loại
 *
 * Hai nền đặc đều đã được `npm run check-contrast` chứng minh đạt ở cả 8 bảng.
 * Nhãn viền để nền ĐỤC (`bg-white` / `bg-jade-900`) chứ không để trong suốt, vì
 * nhãn còn nằm đè lên ảnh bìa ở thẻ di tích nổi bật — nền trong là chữ chìm mất
 * vào ảnh. `terra` vẫn còn, nhưng chỉ làm đường viền: viền là hình trang trí nên
 * không bị ràng buộc tương phản chữ.
 */
const VIEN = 'bg-white text-jade-900 ring-1 ring-inset dark:bg-jade-900 dark:text-jade-50';

const TONES = {
  // Nền đặc — chỉ dành cho bậc cao của thang có thứ tự.
  gold: 'bg-gold-400 text-jade-950',
  jade: 'bg-jade-600 text-white',
  // Viền — phân loại và bậc thấp. Tên tone chính là màu viền, đọc là biết ngay.
  line: `${VIEN} ring-jade-300 dark:ring-jade-700`,
  'line-jade': `${VIEN} ring-jade-500 dark:ring-jade-400`,
  'line-gold': `${VIEN} ring-gold-500 dark:ring-gold-400`,
  'line-terra': `${VIEN} ring-terra-500 dark:ring-terra-400`,
};

export function Badge({ tone = 'line', children, className }) {
  return <span className={cx('chip', TONES[tone] ?? TONES.line, className)}>{children}</span>;
}

/**
 * Màu khi chip lọc đang được chọn.
 *
 * Bỏ `terra` khỏi đây: chữ trắng trên `terra-500` chỉ đạt 2.80 ở teal/lotus/
 * crimson. Trạng thái "đang lọc" là thông tin thật sự cần đọc được, không phải
 * chỗ để giữ một sắc màu.
 */
const FILTER_ACTIVE = {
  jade: 'bg-jade-600 text-white',
  gold: 'bg-gold-400 text-jade-950',
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
        'rounded-md px-4 py-2 text-sm font-medium transition',
        active
          ? FILTER_ACTIVE[tone] ?? FILTER_ACTIVE.jade
          : 'bg-white text-jade-800 ring-1 ring-inset ring-jade-900/[0.12] hover:bg-jade-50 dark:bg-jade-900/50 dark:text-jade-100 dark:ring-white/10',
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
        {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
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
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-jade-200 bg-white/60 py-16 text-center dark:border-jade-700 dark:bg-jade-900/30">
      {Icon && (
        <div className="mb-3 text-subtle">
          <Icon size={32} aria-hidden="true" />
        </div>
      )}
      <p className="font-serif text-lg font-semibold text-body">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
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
    <div className="rounded-md border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-3">
          Thử lại
        </button>
      )}
    </div>
  );
}
