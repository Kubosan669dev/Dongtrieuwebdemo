import { cx } from '../lib/format.js';

// Bảng lớp màu cho chip/badge
const TONES = {
  jade: 'bg-jade-100 text-jade-800 dark:bg-jade-800/40 dark:text-jade-100',
  gold: 'bg-gold-100 text-gold-800 dark:bg-gold-800/30 dark:text-gold-200',
  terra: 'bg-terra-500/15 text-terra-600 dark:text-terra-400',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  gray: 'bg-jade-50 text-jade-600 dark:bg-jade-900/40 dark:text-jade-300',
};

export function Badge({ tone = 'jade', children, className }) {
  return <span className={cx('chip', TONES[tone] ?? TONES.jade, className)}>{children}</span>;
}

export function SectionHeading({ eyebrow, title, description, action, center }) {
  return (
    <div className={cx('mb-8 flex flex-col gap-3', center ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between')}>
      <div className={center ? 'max-w-2xl' : ''}>
        {eyebrow && (
          <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-gold-500">{eyebrow}</p>
        )}
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

export function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-jade-200 bg-white/60 py-16 text-center dark:border-jade-700 dark:bg-jade-900/30">
      {icon && <div className="mb-3 text-jade-400">{icon}</div>}
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
