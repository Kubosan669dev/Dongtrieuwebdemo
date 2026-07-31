// Lớp nền phủ của hộp thoại đóng được bằng cách bấm ra ngoài. Cố ý KHÔNG gắn
// thêm xử lý bàn phím lên lớp nền: bàn phím đã có hai lối thoát đúng chuẩn là
// phím Esc và nút đóng có thể Tab tới. Biến lớp nền thành phần tử hội tụ được
// chỉ thêm một chặng Tab vô nghĩa trước khi tới nội dung thật của hộp thoại.
/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Phone, Clock, Tag, Wallet, Route, ExternalLink } from 'lucide-react';
import { phoneHref } from '../lib/format.js';
import { useScrollLock } from '../hooks/useScrollLock.js';
import MapEmbed from './MapEmbed.jsx';
import Gallery from './Gallery.jsx';
import Reviews from './Reviews.jsx';
import { Badge } from './ui.jsx';

/** `kind` của modal → loại đích trong bảng Review. */
const REVIEW_TYPE = { restaurant: 'RESTAURANT', attraction: 'ATTRACTION' };

/**
 * Cửa sổ chi tiết cho nhà hàng / quán ăn và điểm đến lân cận.
 *
 * Hai loại này không có trang riêng nên trước đây chỉ hiện được vài dòng trên thẻ
 * ở danh sách, không có chỗ nào đặt ảnh minh hoạ. Modal này là chỗ "bấm vào chi tiết".
 *
 * Cùng khuôn với `LodgingDetail` để ba loại cơ sở nhìn giống nhau, và cũng theo
 * nguyên tắc chung của dự án: trường nào có dữ liệu mới hiện, không bịa chỗ trống.
 */
export default function PlaceDetail({ item, kind = 'restaurant', typeLabel, onClose }) {
  useScrollLock();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!item) return null;

  const mapQuery = item.mapQuery || `${item.name}, ${item.address ?? 'Đông Triều'}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* `role="dialog"` thuộc về khung nội dung chứ không phải lớp nền phủ.
          Đặt nhầm lên nền thì trình đọc màn hình coi cả màn hình tối là hộp thoại. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết ${item.name}`}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-lift dark:bg-jade-900 sm:rounded-3xl"
        >
        <div className="flex items-start justify-between gap-3 border-b border-jade-900/5 p-5 dark:border-white/5">
          <div className="min-w-0">
            {typeLabel && <Badge tone={kind === 'attraction' ? 'jade' : 'terra'}>{typeLabel}</Badge>}
            <h2 className="mt-2 font-serif text-xl font-bold text-jade-900 dark:text-jade-50">{item.name}</h2>
            {/* Điểm sao KHÔNG còn ở đây nữa. Trước đây chỗ này ghi điểm lấy từ
                Google Maps thành "(n đánh giá)" mà không nêu nguồn — nay đã có
                đánh giá do khách gửi trên cổng, hai con số cạnh nhau sẽ trông như
                cùng một thang đo. Cả hai gom về đúng một chỗ trong `Reviews`, mỗi
                con số ghi rõ nguồn. Một luật không ngoại lệ thì không ai làm lệch
                được về sau. */}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-jade-500 transition hover:bg-jade-100 dark:hover:bg-jade-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {item.coverUrl && (
            <figure>
              <img src={item.coverUrl} alt={item.name} className="aspect-[16/9] w-full rounded-2xl object-cover" />
              {item.coverIsIllustrative && (
                <figcaption className="mt-1.5 text-xs italic text-jade-400">Ảnh minh hoạ, không chụp tại chính địa điểm này.</figcaption>
              )}
            </figure>
          )}

          {(item.summary || item.description) && (
            <p className="leading-relaxed text-jade-800 dark:text-jade-100">{item.summary || item.description}</p>
          )}
          {item.summary && item.description && item.summary !== item.description && (
            <p className="leading-relaxed text-jade-700 dark:text-jade-200">{item.description}</p>
          )}

          <div className="space-y-2.5 rounded-2xl bg-jade-50 p-4 dark:bg-jade-800/40">
            {item.address && <Row icon={MapPin} label="Địa chỉ" value={item.address} />}
            {item.ward && <Row icon={MapPin} label="Địa bàn" value={item.ward} />}
            {item.khuPho && <Row icon={MapPin} label="Khu phố" value={item.khuPho + (item.khuPhoEstimated ? ' (ước tính)' : '')} />}
            {item.distanceKm != null && <Row icon={Route} label="Cách trung tâm" value={`khoảng ${item.distanceKm} km`} />}
            {item.openHours && <Row icon={Clock} label="Giờ mở cửa" value={item.openHours} />}
            {item.priceRange && <Row icon={Wallet} label="Giá tham khảo" value={item.priceRange} />}
          </div>

          {item.highlights?.length > 0 && (
            <div>
              <h3 className="mb-2 font-serif text-base font-semibold">Điểm nhấn</h3>
              <ul className="space-y-1.5">
                {item.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-jade-700 dark:text-jade-200">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.specialties?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.specialties.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-jade-50 px-2.5 py-1 text-xs text-jade-600 dark:bg-jade-800/50 dark:text-jade-200">
                  <Tag size={11} /> {s}
                </span>
              ))}
            </div>
          )}

          {/* Đặt ngay sau khối thông tin, TRƯỚC thư viện ảnh: điểm sao là tín hiệu
              chính khi chọn quán, không được nằm dưới một dãy ảnh dài. */}
          {REVIEW_TYPE[kind] && (
            <Reviews
              targetType={REVIEW_TYPE[kind]}
              targetId={item.id}
              googleRating={item.rating}
              googleRatingCount={item.ratingCount}
              className="border-t border-jade-900/5 pt-4 dark:border-white/5"
            />
          )}

          <Gallery images={item.images} name={item.name} title="Hình ảnh minh hoạ" />

          <div className="flex flex-wrap gap-2 pt-1">
            {item.phone && (
              <a href={phoneHref(item.phone)} className="btn-primary !py-2 text-sm"><Phone size={14} /> {item.phone}</a>
            )}
            {item.mapsUrl && (
              <a href={item.mapsUrl} target="_blank" rel="noreferrer" className="btn-ghost !py-2 text-sm">
                <ExternalLink size={14} /> Xem trên Google Maps
              </a>
            )}
          </div>

          <div>
            <h3 className="mb-2 font-serif text-base font-semibold">Vị trí</h3>
            <MapEmbed lat={item.lat} lng={item.lng} query={mapQuery} title={item.name} />
          </div>

          {item.sourceNote && <p className="text-xs italic text-jade-400">Nguồn: {item.sourceNote}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <p className="flex items-start gap-2.5 text-sm">
      <Icon size={15} className="mt-0.5 shrink-0 text-jade-400" />
      <span className="text-jade-500 dark:text-jade-400">{label}:</span>
      <span className="min-w-0 flex-1 text-jade-800 dark:text-jade-100">{value}</span>
    </p>
  );
}
