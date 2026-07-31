import { useState } from 'react';
import { Star } from 'lucide-react';
import { cx } from '../lib/format.js';

/**
 * Dãy sao chỉ để đọc.
 *
 * Nhận điểm thập phân (4,3 sao) và tô nửa sao bằng cách chồng một lớp bị cắt
 * bớt, không làm tròn về sao nguyên: làm tròn 4,4 thành 4 là bỏ mất chính phần
 * người đọc muốn thấy.
 *
 * `aria-hidden` trên phần hình, còn con số thật thì đặt trong `<span>` chỉ dành
 * cho trình đọc màn hình — năm hình ngôi sao không nói được điều gì cho người
 * không nhìn thấy chúng.
 */
export function Stars({ value, size = 15, className }) {
  const phanTram = Math.max(0, Math.min(100, (Number(value) / 5) * 100));
  return (
    <span className={cx('relative inline-flex shrink-0 align-middle', className)}>
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} size={size} className="text-jade-200 dark:text-jade-700" fill="currentColor" />
        ))}
      </span>
      <span
        className="pointer-events-none absolute inset-0 inline-flex gap-0.5 overflow-hidden"
        style={{ width: `${phanTram}%` }}
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} size={size} className="shrink-0 text-gold-400" fill="currentColor" />
        ))}
      </span>
      <span className="sr-only">{String(value).replace('.', ',')} trên 5 sao</span>
    </span>
  );
}

/**
 * Ô chọn số sao trong biểu mẫu.
 *
 * Dùng `<input type="radio">` thật, chỉ ẩn đi bằng `sr-only` và tô hình ở nhãn.
 * Năm cái `<button>` thì trông cũng vậy nhưng mất hết những gì trình duyệt cho
 * không: mũi tên trái/phải chọn được, trình đọc màn hình đọc ra "1 trong 5", và
 * biểu mẫu báo thiếu khi chưa chọn.
 */
export function StarPicker({ value, onChange, name = 'rating', error }) {
  const [hover, setHover] = useState(0);
  const sang = hover || value || 0;

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-jade-700 dark:text-jade-200">
        Bạn cho mấy sao? <span className="text-terra-600">*</span>
      </legend>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            onMouseEnter={() => setHover(n)}
            className="cursor-pointer rounded-md p-0.5 focus-within:ring-2 focus-within:ring-jade-400"
            title={NHAN_SAO[n]}
          >
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <Star
              size={28}
              className={cx('transition', n <= sang ? 'text-gold-400' : 'text-jade-200 dark:text-jade-700')}
              fill="currentColor"
            />
            <span className="sr-only">{n} sao — {NHAN_SAO[n]}</span>
          </label>
        ))}
        {sang > 0 && (
          <span className="ml-2 text-sm text-jade-600 dark:text-jade-300">{NHAN_SAO[sang]}</span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-terra-600">{error}</p>}
    </fieldset>
  );
}

/** Đặt tên cho từng mức: "3 sao" không nói lên điều gì, "Bình thường" thì có. */
const NHAN_SAO = { 1: 'Không hài lòng', 2: 'Tạm được', 3: 'Bình thường', 4: 'Hài lòng', 5: 'Rất hài lòng' };
