import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, CalendarDays, Phone, Tag, Info, Navigation, Images } from 'lucide-react';
import HeritageCover, { IllustrativeBadge } from './HeritageCover.jsx';
import PlaceDetail from './PlaceDetail.jsx';
import { Badge } from './ui.jsx';
import { HERITAGE_TYPES, RANK_LEVELS, FESTIVAL_SCALES, LUNAR_MONTH_LABELS, LODGING_TYPES, RESTAURANT_TYPES } from '../lib/constants.js';
import { truncate, phoneHref, cx } from '../lib/format.js';

/**
 * Nút mở cửa sổ chi tiết trên thẻ nhà hàng / điểm lân cận / lưu trú.
 *
 * Ba loại này không có trang riêng (nhà hàng và lưu trú còn không có slug), nên
 * chi tiết hiện dạng modal — cũng là chỗ đặt thư viện ảnh minh hoạ kèm chú thích.
 *
 * `stopPropagation` vì thẻ lưu trú bấm được cả mảng: không chặn thì một cú bấm
 * chạy `onClick` hai lần.
 */
function DetailButton({ onClick, hasImages, className = 'mt-3 self-start' }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cx('btn-ghost btn-sm', className)}
    >
      {hasImages ? <Images size={13} /> : <Info size={13} />} Xem chi tiết
    </button>
  );
}

/**
 * Thẻ di tích.
 *
 * `featured` là biến thể lớn dùng cho di tích dẫn đầu trên trang chủ: chữ nằm
 * đè lên ảnh thay vì xếp dưới. Có biến thể này để trang chủ thôi cảnh sáu ô
 * bằng nhau — mắt cần một chỗ để dừng lại trước.
 */
export function HeritageCard({ item, featured = false }) {
  const rank = RANK_LEVELS[item.rankLevel];
  const type = HERITAGE_TYPES[item.type];

  if (featured) {
    return (
      <Link
        to={`/di-tich/${item.slug}`}
        className="card-hover group relative flex h-full min-h-[19rem] flex-col justify-end overflow-hidden sm:min-h-[26rem]"
      >
        <div className="absolute inset-0 transition duration-700 group-hover:scale-105">
          <HeritageCover
            src={item.coverUrl}
            name={item.name}
            type={item.type}
            rounded="rounded-none"
            illustrative={item.coverIsIllustrative}
            showBadge={false}
          />
        </div>
        {/* Nền tối dưới đáy để chữ luôn đọc được, dù ảnh bìa sáng hay tối */}
        <div className="absolute inset-0 bg-gradient-to-t from-jade-950 via-jade-950/55 to-transparent" />
        <div className="relative p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={rank?.color}>{rank?.short}</Badge>
            <Badge tone={type?.color}>{type?.label}</Badge>
          </div>
          <h3 className="mt-3 font-serif text-2xl font-bold leading-[1.2] tracking-[-0.01em] text-white sm:text-3xl">
            {item.name}
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-jade-50/85">{truncate(item.summary, 170)}</p>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-jade-50/70">
            <MapPin size={14} className="shrink-0" />
            <span className="line-clamp-1">{item.address}</span>
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/di-tich/${item.slug}`} className="card-hover group flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="h-full w-full transition duration-500 group-hover:scale-105">
          <HeritageCover
            src={item.coverUrl}
            name={item.name}
            type={item.type}
            rounded="rounded-none"
            illustrative={item.coverIsIllustrative}
          />
        </div>
        <div className="absolute left-3 top-3">
          <Badge tone={rank?.color}>{rank?.short}</Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted">
          <Badge tone={type?.color}>{type?.label}</Badge>
          {item.wardOld && <span className="text-subtle">· {item.wardOld} (cũ)</span>}
        </div>
        <h3 className="font-serif text-lg font-semibold leading-snug text-jade-900 group-hover:text-jade-600 dark:text-jade-50">
          {item.name}
        </h3>
        <p className="mt-2 flex-1 text-sm text-muted">{truncate(item.summary, 120)}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <MapPin size={14} className="shrink-0" />
          <span className="line-clamp-1">{item.address}</span>
        </p>
      </div>
    </Link>
  );
}

export function FestivalCard({ item }) {
  const scale = FESTIVAL_SCALES[item.scale];
  return (
    <Link to={`/le-hoi/${item.slug}`} className="card-hover group flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-700 dark:bg-gold-800/30 dark:text-gold-200">
          <CalendarDays size={13} />
          {item.lunarMonth ? LUNAR_MONTH_LABELS[item.lunarMonth] : 'Âm lịch'}
        </span>
        <Badge tone={scale?.color}>{scale?.label}</Badge>
      </div>
      <h3 className="font-serif text-lg font-semibold leading-snug text-jade-900 group-hover:text-jade-600 dark:text-jade-50">
        {item.name}
      </h3>
      <p className="mt-1.5 text-sm font-medium text-jade-600">{item.lunarTimeText}</p>
      <p className="mt-2 flex-1 text-sm text-muted">{truncate(item.intro, 130)}</p>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <MapPin size={14} className="shrink-0" />
        <span className="line-clamp-1">{item.location}</span>
      </p>
    </Link>
  );
}

export function CuisineCard({ item }) {
  return (
    <Link to={`/am-thuc/${item.slug}`} className="card-hover group flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-terra-400 to-terra-600">
        {item.coverUrl ? (
          <>
            <img src={item.coverUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            {item.coverIsIllustrative && <IllustrativeBadge />}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center">
            <span className="font-serif text-xl font-semibold text-white drop-shadow">{item.name}</span>
          </div>
        )}
        {item.priceRange && (
          <span className="absolute bottom-3 left-3 rounded-md bg-white/90 px-3 py-1 text-xs font-semibold text-jade-900">
            {item.priceRange}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-lg font-semibold text-jade-900 group-hover:text-jade-600 dark:text-jade-50">{item.name}</h3>
        <p className="mt-2 flex-1 text-sm text-muted">{truncate(item.summary, 120)}</p>
      </div>
    </Link>
  );
}

/**
 * Thẻ cơ sở lưu trú.
 *
 * Cả thẻ bấm được bằng chuột, nhưng KHÔNG đặt `role="button"` lên thẻ bọc: bên
 * trong có sẵn các liên kết gọi điện, mà một nút chứa liên kết là cấu trúc
 * không hợp lệ — trình đọc màn hình đọc sai, người dùng bàn phím Tab vào giữa
 * "nút" rồi mắc kẹt. Thay vào đó là một `<button>` thật ở cuối thẻ, đúng thứ
 * trước đây chỉ được vẽ giả bằng `<span>` nên nhìn như bấm được mà không bấm được.
 */
export function LodgingCard({ item, onClick }) {
  const type = LODGING_TYPES[item.type];
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="card-hover flex cursor-pointer flex-col p-5" onClick={onClick}>
      <div className="mb-2 flex items-center justify-between">
        <Badge tone={item.type === 'KHACH_SAN' ? 'line-gold' : 'line-jade'}>{type?.label}</Badge>
        {item.priceRange && <span className="text-xs font-medium text-muted">{item.priceRange}</span>}
      </div>
      <h3 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">{item.name}</h3>
      <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
        <MapPin size={15} className="mt-0.5 shrink-0 text-subtle" />
        {item.address}
      </p>
      {item.owner && <p className="mt-1 text-sm text-muted">Đại diện: {item.owner}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {item.phones?.map((p) => (
          <a
            key={p}
            href={phoneHref(p)}
            onClick={(e) => e.stopPropagation()}
            className="btn-ghost btn-sm"
          >
            <Phone size={13} /> {p}
          </a>
        ))}
        <DetailButton onClick={onClick} hasImages={item.images?.length > 0} className="ml-auto" />
      </div>
    </div>
  );
}

export function RestaurantCard({ item }) {
  const type = RESTAURANT_TYPES[item.type];
  const [open, setOpen] = useState(false);
  return (
    <div className="card-hover flex flex-col p-5">
      {open && <PlaceDetail item={item} kind="restaurant" typeLabel={type?.label} onClose={() => setOpen(false)} />}
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge tone="line-terra">{type?.label}</Badge>
        {item.area && <span className="text-[11px] text-subtle">{item.area}</span>}
      </div>
      <h3 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">{item.name}</h3>
      {item.description && <p className="mt-2 text-sm text-muted">{truncate(item.description, 130)}</p>}
      <p className="mt-3 flex items-start gap-1.5 text-sm text-muted">
        <MapPin size={15} className="mt-0.5 shrink-0 text-subtle" />
        {item.address}
      </p>
      {item.phone && (
        <a href={phoneHref(item.phone)} className="btn-ghost btn-sm mt-3 self-start">
          <Phone size={13} /> {item.phone}
        </a>
      )}
      {item.specialties?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.specialties.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-md bg-jade-50 px-2.5 py-1 text-[11px] text-jade-600 dark:bg-jade-800/50 dark:text-jade-200">
              <Tag size={11} /> {s}
            </span>
          ))}
        </div>
      )}
      {(item.openHours || item.priceRange) && (
        <p className="mt-3 text-xs text-muted">
          {item.openHours && <>🕒 {item.openHours}</>} {item.priceRange && <> · {item.priceRange}</>}
        </p>
      )}
      <DetailButton onClick={() => setOpen(true)} hasImages={item.images?.length > 0} />
      {!item.isVerified && item.sourceNote && (
        <p
          className="mt-3 flex items-start gap-1.5 rounded-md bg-gold-50 px-2.5 py-1.5 text-[11px] text-gold-700 dark:bg-gold-900/20 dark:text-gold-200"
          title="Vui lòng gọi xác nhận trước khi đến"
        >
          <Info size={12} className="mt-0.5 shrink-0" />
          {item.sourceNote}
        </p>
      )}
    </div>
  );
}

export function ArticleCard({ item }) {
  return (
    <Link to={`/tin-tuc/${item.slug}`} className="card-hover group flex flex-col overflow-hidden">
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-jade-500 to-jade-800">
        {item.coverUrl ? (
          <img src={item.coverUrl} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="pattern-bg flex h-full w-full items-center justify-center p-5 text-center">
            <span className="font-serif text-lg font-semibold text-white/95 drop-shadow">{truncate(item.title, 60)}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-base font-semibold leading-snug text-jade-900 group-hover:text-jade-600 dark:text-jade-50">
          {item.title}
        </h3>
        <p className="mt-2 flex-1 text-sm text-muted">{truncate(item.excerpt, 110)}</p>
      </div>
    </Link>
  );
}

const ATTRACTION_TYPES = {
  TAM_LINH: { label: 'Tâm linh', tone: 'line-jade' },
  LICH_SU: { label: 'Lịch sử', tone: 'line-terra' },
  SINH_THAI: { label: 'Sinh thái', tone: 'line-gold' },
};

/** Điểm đến lân cận — nằm ngoài phường Đông Triều nhưng nên kết hợp tham quan. */
export function AttractionCard({ item }) {
  const type = ATTRACTION_TYPES[item.type] ?? ATTRACTION_TYPES.TAM_LINH;
  const dest = item.mapQuery || item.address || item.name;
  const [open, setOpen] = useState(false);
  return (
    <div className="card-hover group flex flex-col overflow-hidden">
      {open && <PlaceDetail item={item} kind="attraction" typeLabel={type.label} onClose={() => setOpen(false)} />}
      <div className="relative aspect-[16/10] overflow-hidden">
        <div className="h-full w-full transition duration-500 group-hover:scale-105">
          <HeritageCover
            src={item.coverUrl}
            name={item.name}
            type="CUM_DI_TICH"
            rounded="rounded-none"
            illustrative={item.coverIsIllustrative}
          />
        </div>
        <div className="absolute left-3 top-3">
          <Badge tone={type.tone}>{type.label}</Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-lg font-semibold leading-snug text-jade-900 dark:text-jade-50">{item.name}</h3>
        <p className="mt-1 text-xs text-subtle">
          {item.ward}
          {item.distanceKm ? ` · cách trung tâm phường ~${item.distanceKm} km` : ''}
        </p>
        <p className="mt-2 flex-1 text-sm text-muted">{truncate(item.summary, 130)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <DetailButton onClick={() => setOpen(true)} hasImages={item.images?.length > 0} className="" />
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost btn-sm"
          >
            <Navigation size={13} /> Chỉ đường
          </a>
        </div>
      </div>
    </div>
  );
}
