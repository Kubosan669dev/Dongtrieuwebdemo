import { HERITAGE_TYPES } from '../lib/constants.js';
import { cx } from '../lib/format.js';

// Bảng màu gradient theo loại hình di tích (dùng khi chưa có ảnh thật).
const GRADIENTS = {
  CHUA: ['#0e7c5e', '#0b4134'],
  DEN: ['#b4543a', '#63371f'],
  DINH: ['#cc8c2e', '#754121'],
  MIEU: ['#6d5590', '#3b2c56'],
  CUM_DI_TICH: ['#1f9a6d', '#0b634c'],
  LICH_SU_CACH_MANG: ['#b23a3a', '#5f1d1d'],
};

/**
 * Ảnh bìa di tích. Nếu có `src` (ảnh admin upload) thì hiển thị ảnh;
 * nếu không, vẽ placeholder SVG gradient + hoa văn + tên di tích.
 */
export default function HeritageCover({ src, name, type = 'CHUA', className, rounded = 'rounded-2xl' }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={cx('h-full w-full object-cover', rounded, className)}
      />
    );
  }

  const [from, to] = GRADIENTS[type] ?? GRADIENTS.CHUA;
  const typeLabel = HERITAGE_TYPES[type]?.label ?? 'Di tích';

  return (
    <div className={cx('relative h-full w-full overflow-hidden', rounded, className)}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <defs>
          <linearGradient id={`g-${type}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
          <pattern id={`p-${type}`} width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="rgba(255,255,255,0.10)" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill={`url(#g-${type})`} />
        <rect width="400" height="300" fill={`url(#p-${type})`} />
        {/* Mái đình/chùa cách điệu */}
        <g opacity="0.22" fill="none" stroke="#faf7f0" strokeWidth="2.5">
          <path d="M120 150 L200 108 L280 150" />
          <path d="M110 156 L200 100 L290 156" />
          <line x1="150" y1="160" x2="150" y2="205" />
          <line x1="200" y1="160" x2="200" y2="205" />
          <line x1="250" y1="160" x2="250" y2="205" />
          <line x1="140" y1="205" x2="260" y2="205" />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/90 backdrop-blur-sm">
          {typeLabel}
        </span>
        <p className="mt-3 font-serif text-lg font-semibold leading-snug text-white drop-shadow sm:text-xl">
          {name}
        </p>
      </div>
    </div>
  );
}
