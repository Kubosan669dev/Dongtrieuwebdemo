import { Link } from 'react-router-dom';
import { MapPin, Navigation, Phone, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { cx, mapDirectionsUrl } from '../../lib/format.js';
import { MAP_KINDS } from '../../lib/mapKinds.js';

/**
 * Khung thông tin của điểm đang chọn.
 *
 * Nổi trên bản đồ bằng HTML của chính trang, KHÔNG dùng popup do thư viện bản đồ
 * dựng. Hai lý do: (1) hai bộ máy bản đồ dùng chung đúng một khung này, không
 * phải viết hai lần; (2) popup của thư viện nằm ngoài cây React nên `<Link>` mất
 * điều hướng phía máy khách và cả trang tải lại từ đầu khi bấm "Xem chi tiết".
 */
export default function MapPopup({ point: p, onClose }) {
  const kind = MAP_KINDS[p.kind] ?? MAP_KINDS.heritage;
  // Chỉ nhóm có trang chi tiết riêng mới dựng liên kết. Ba nhóm kia hiện chi tiết
  // bằng cửa sổ trong trang danh sách nên thay bằng liên kết về danh sách.
  const duongDan = kind.hasPage && p.slug ? `${kind.basePath}/${p.slug}` : null;
  const duongDanDanhSach = !kind.hasPage && kind.basePath ? kind.basePath : null;

  return (
    <div className="absolute inset-x-3 bottom-3 z-[500] sm:inset-x-auto sm:left-3 sm:max-w-sm">
      <div className="card overflow-hidden shadow-lift">
        <div className="flex items-start gap-3 p-3">
          {p.thumb ? (
            <img src={p.thumb} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className={cx('grid h-16 w-16 shrink-0 place-items-center rounded-xl', kind.tintClass)}>
              <MapPin size={22} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className={cx('text-[11px] font-semibold uppercase tracking-wide', kind.textClass)}>{kind.label}</p>
            <p className="font-serif text-base font-semibold leading-snug text-jade-900 dark:text-jade-50">{p.name}</p>
            {p.address && <p className="mt-0.5 line-clamp-2 text-xs text-jade-500">{p.address}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng thông tin điểm"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-jade-500 hover:bg-jade-100 dark:hover:bg-jade-800"
          >
            <X size={15} />
          </button>
        </div>

        {p.coordsEstimated && (
          <p className="flex items-start gap-1.5 bg-gold-50 px-3 py-2 text-[11px] leading-snug text-gold-800 dark:bg-gold-900/25 dark:text-gold-200">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            Vị trí ước tính theo địa chỉ, chưa được xác minh tại thực địa.
          </p>
        )}

        <div className="flex flex-wrap gap-2 border-t border-jade-900/5 p-3 dark:border-white/5">
          {duongDan ? (
            <Link to={duongDan} className="btn-primary btn-sm">
              <ExternalLink size={13} /> Xem chi tiết
            </Link>
          ) : duongDanDanhSach ? (
            <Link to={duongDanDanhSach} className="btn-ghost btn-sm">
              <ExternalLink size={13} /> Mở danh sách {kind.label.toLowerCase()}
            </Link>
          ) : null}
          {p.phone && (
            <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`} className="btn-ghost btn-sm">
              <Phone size={13} /> {p.phone}
            </a>
          )}
          <a
            href={mapDirectionsUrl({ lat: p.lat, lng: p.lng, query: p.name })}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost btn-sm ml-auto"
          >
            <Navigation size={13} /> Chỉ đường
          </a>
        </div>
      </div>
    </div>
  );
}
