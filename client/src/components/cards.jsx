import { Link } from 'react-router-dom';
import { MapPin, CalendarDays, Phone, Tag, Info, Navigation } from 'lucide-react';
import HeritageCover, { IllustrativeBadge } from './HeritageCover.jsx';
import { Badge } from './ui.jsx';
import { HERITAGE_TYPES, RANK_LEVELS, FESTIVAL_SCALES, LUNAR_MONTH_LABELS, LODGING_TYPES, RESTAURANT_TYPES } from '../lib/constants.js';
import { truncate, phoneHref } from '../lib/format.js';

export function HeritageCard({ item }) {
  const rank = RANK_LEVELS[item.rankLevel];
  const type = HERITAGE_TYPES[item.type];
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
        <div className="mb-2 flex items-center gap-2 text-xs text-jade-500">
          <Badge tone={type?.color}>{type?.label}</Badge>
          {item.wardOld && <span className="text-jade-400">· {item.wardOld} (cũ)</span>}
        </div>
        <h3 className="font-serif text-lg font-semibold leading-snug text-jade-900 group-hover:text-jade-600 dark:text-jade-50">
          {item.name}
        </h3>
        <p className="mt-2 flex-1 text-sm text-jade-600/90 dark:text-jade-300">{truncate(item.summary, 120)}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-jade-500">
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-700 dark:bg-gold-800/30 dark:text-gold-200">
          <CalendarDays size={13} />
          {item.lunarMonth ? LUNAR_MONTH_LABELS[item.lunarMonth] : 'Âm lịch'}
        </span>
        <Badge tone={scale?.color}>{scale?.label}</Badge>
      </div>
      <h3 className="font-serif text-lg font-semibold leading-snug text-jade-900 group-hover:text-jade-600 dark:text-jade-50">
        {item.name}
      </h3>
      <p className="mt-1.5 text-sm font-medium text-jade-600">{item.lunarTimeText}</p>
      <p className="mt-2 flex-1 text-sm text-jade-600/90 dark:text-jade-300">{truncate(item.intro, 130)}</p>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-jade-500">
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
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-terra-600">
            {item.priceRange}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-lg font-semibold text-jade-900 group-hover:text-jade-600 dark:text-jade-50">{item.name}</h3>
        <p className="mt-2 flex-1 text-sm text-jade-600/90 dark:text-jade-300">{truncate(item.summary, 120)}</p>
      </div>
    </Link>
  );
}

export function LodgingCard({ item }) {
  const type = LODGING_TYPES[item.type];
  return (
    <div className="card flex flex-col p-5">
      <div className="mb-2 flex items-center justify-between">
        <Badge tone={item.type === 'KHACH_SAN' ? 'gold' : 'jade'}>{type?.label}</Badge>
      </div>
      <h3 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">{item.name}</h3>
      <p className="mt-2 flex items-start gap-1.5 text-sm text-jade-600 dark:text-jade-300">
        <MapPin size={15} className="mt-0.5 shrink-0 text-jade-400" />
        {item.address}
      </p>
      {item.owner && <p className="mt-1 text-sm text-jade-500">Đại diện: {item.owner}</p>}
      {item.phones?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.phones.map((p) => (
            <a key={p} href={phoneHref(p)} className="btn-ghost !px-3 !py-1.5 text-xs">
              <Phone size={13} /> {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function RestaurantCard({ item }) {
  const type = RESTAURANT_TYPES[item.type];
  return (
    <div className="card flex flex-col p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge tone="terra">{type?.label}</Badge>
        {item.area && <span className="text-[11px] text-jade-400">{item.area}</span>}
      </div>
      <h3 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">{item.name}</h3>
      {item.description && <p className="mt-2 text-sm text-jade-600/90 dark:text-jade-300">{truncate(item.description, 130)}</p>}
      <p className="mt-3 flex items-start gap-1.5 text-sm text-jade-500">
        <MapPin size={15} className="mt-0.5 shrink-0 text-jade-400" />
        {item.address}
      </p>
      {item.phone && (
        <a href={phoneHref(item.phone)} className="btn-ghost mt-3 self-start !px-3 !py-1.5 text-xs">
          <Phone size={13} /> {item.phone}
        </a>
      )}
      {item.specialties?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.specialties.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-jade-50 px-2.5 py-1 text-[11px] text-jade-600 dark:bg-jade-800/50 dark:text-jade-200">
              <Tag size={11} /> {s}
            </span>
          ))}
        </div>
      )}
      {(item.openHours || item.priceRange) && (
        <p className="mt-3 text-xs text-jade-500">
          {item.openHours && <>🕒 {item.openHours}</>} {item.priceRange && <> · {item.priceRange}</>}
        </p>
      )}
      {!item.isVerified && item.sourceNote && (
        <p
          className="mt-3 flex items-start gap-1.5 rounded-lg bg-gold-50 px-2.5 py-1.5 text-[11px] text-gold-700 dark:bg-gold-900/20 dark:text-gold-200"
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
        <p className="mt-2 flex-1 text-sm text-jade-600/90 dark:text-jade-300">{truncate(item.excerpt, 110)}</p>
      </div>
    </Link>
  );
}

const ATTRACTION_TYPES = {
  TAM_LINH: { label: 'Tâm linh', tone: 'jade' },
  LICH_SU: { label: 'Lịch sử', tone: 'terra' },
  SINH_THAI: { label: 'Sinh thái', tone: 'gold' },
};

/** Điểm đến lân cận — nằm ngoài phường Đông Triều nhưng nên kết hợp tham quan. */
export function AttractionCard({ item }) {
  const type = ATTRACTION_TYPES[item.type] ?? ATTRACTION_TYPES.TAM_LINH;
  const dest = item.mapQuery || item.address || item.name;
  return (
    <div className="card-hover flex flex-col overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden">
        <HeritageCover
          src={item.coverUrl}
          name={item.name}
          type="CUM_DI_TICH"
          rounded="rounded-none"
          illustrative={item.coverIsIllustrative}
        />
        <div className="absolute left-3 top-3">
          <Badge tone={type.tone}>{type.label}</Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-lg font-semibold leading-snug text-jade-900 dark:text-jade-50">{item.name}</h3>
        <p className="mt-1 text-xs text-jade-400">
          {item.ward}
          {item.distanceKm ? ` · cách trung tâm phường ~${item.distanceKm} km` : ''}
        </p>
        <p className="mt-2 flex-1 text-sm text-jade-600/90 dark:text-jade-300">{truncate(item.summary, 130)}</p>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost mt-4 self-start !px-3 !py-1.5 text-xs"
        >
          <Navigation size={13} /> Chỉ đường
        </a>
      </div>
    </div>
  );
}
