import { HERITAGE_TYPES } from '../lib/constants.js';
import { cx } from '../lib/format.js';

/**
 * Nhãn cho ảnh không phải chụp chính địa điểm này.
 * Cổng thông tin chính thức của phường nên phải nói rõ để du khách không hiểu nhầm.
 */
export function IllustrativeBadge({ className }) {
  return (
    <span
      title="Ảnh mang tính minh hoạ, không phải ảnh chụp chính địa điểm này"
      className={cx(
        'pointer-events-none absolute bottom-1.5 right-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm',
        className,
      )}
    >
      Ảnh minh hoạ
    </span>
  );
}

/**
 * Nền chuyển sắc theo loại hình di tích, dùng khi chưa có ảnh thật.
 *
 * Trỏ vào biến CSS của bảng màu thay vì mã hex cứng như trước — bản cũ luôn ra
 * màu xanh ngọc và nâu đất kể cả khi khách đã chọn bảng Hạ Long Blue hay Rose
 * Lotus, khiến ảnh thay thế lạc hẳn khỏi phần còn lại của trang.
 *
 * Vẫn giữ khác biệt giữa các loại hình bằng cách lấy các nấc khác nhau trên hai
 * dải màu chủ đạo và màu đất — chùa vẫn khác đền, đình vẫn khác miếu.
 */
const GRADIENTS = {
  CHUA: ['--c-jade-600', '--c-jade-900'],
  DEN: ['--c-terra-500', '--c-gold-900'],
  DINH: ['--c-gold-500', '--c-gold-800'],
  MIEU: ['--c-jade-700', '--c-jade-950'],
  CUM_DI_TICH: ['--c-jade-500', '--c-jade-700'],
  LICH_SU_CACH_MANG: ['--c-terra-600', '--c-jade-950'],
};

/**
 * Ảnh bìa di tích. Nếu có `src` (ảnh admin upload) thì hiển thị ảnh;
 * nếu không, vẽ placeholder SVG gradient + hoa văn + tên di tích.
 */
export default function HeritageCover({
  src,
  name,
  type = 'CHUA',
  className,
  rounded = 'rounded-md',
  illustrative = false,
  // Ảnh thu nhỏ (avatar, gợi ý) quá bé để hiện nhãn — nhãn vẫn còn ở thẻ và trang chi tiết
  showBadge = true,
}) {
  if (src) {
    return (
      <span className={cx('relative block h-full w-full overflow-hidden', rounded)}>
        <img
          src={src}
          alt={illustrative ? `${name} (ảnh minh hoạ)` : name}
          loading="lazy"
          className={cx('h-full w-full object-cover', className)}
        />
        {illustrative && showBadge && <IllustrativeBadge />}
      </span>
    );
  }

  const [from, to] = GRADIENTS[type] ?? GRADIENTS.CHUA;
  const typeLabel = HERITAGE_TYPES[type]?.label ?? 'Di tích';

  return (
    <div className={cx('relative h-full w-full overflow-hidden', rounded, className)}>
      {/* Nền chuyển sắc để ở CSS chứ không trong SVG: thuộc tính SVG không phải
          trình duyệt nào cũng hiểu var(--…), còn ở đây thì chạy khắp nơi. */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `linear-gradient(135deg, rgb(var(${from})), rgb(var(${to})))` }}
      />
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="relative h-full w-full">
        <defs>
          <pattern id={`p-${type}`} width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="rgba(255,255,255,0.10)" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill={`url(#p-${type})`} />
        {/* Mái đình/chùa cách điệu — cùng mô-típ với PagodaMotif.jsx */}
        <g opacity="0.22" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M120 150 L200 108 L280 150" />
          <path d="M110 156 L200 100 L290 156" />
          <line x1="150" y1="160" x2="150" y2="205" />
          <line x1="200" y1="160" x2="200" y2="205" />
          <line x1="250" y1="160" x2="250" y2="205" />
          <line x1="140" y1="205" x2="260" y2="205" />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="rounded-md bg-white/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/90 backdrop-blur-sm">
          {typeLabel}
        </span>
        <p className="mt-3 font-serif text-lg font-semibold leading-snug text-white drop-shadow sm:text-xl">
          {name}
        </p>
      </div>
    </div>
  );
}
