// Lớp nền phủ của hộp thoại đóng được bằng cách bấm ra ngoài. Cố ý KHÔNG gắn
// thêm xử lý bàn phím lên lớp nền: bàn phím đã có hai lối thoát đúng chuẩn là
// phím Esc và nút đóng có thể Tab tới. Biến lớp nền thành phần tử hội tụ được
// chỉ thêm một chặng Tab vô nghĩa trước khi tới nội dung thật của hộp thoại.
/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Phone, User, Tag, CheckCircle2 } from 'lucide-react';
import { LODGING_TYPES } from '../lib/constants.js';
import { phoneHref } from '../lib/format.js';
import { useScrollLock } from '../hooks/useScrollLock.js';
import MapEmbed from './MapEmbed.jsx';
import Gallery from './Gallery.jsx';
import Reviews from './Reviews.jsx';
import { Badge } from './ui.jsx';

/**
 * Cửa sổ chi tiết một cơ sở lưu trú.
 *
 * Cơ sở lưu trú không có trang riêng (không có slug), nên hiện chi tiết dạng
 * modal ngay trên trang danh sách. Modal hiển thị mọi trường CÓ dữ liệu — khi
 * quản trị viên bổ sung mô tả, tiện nghi, giá phòng, ảnh… thì tự hiện thêm.
 */
export default function LodgingDetail({ item, onClose }) {
  useScrollLock();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!item) return null;
  const type = LODGING_TYPES[item.type];
  const mapQuery = `${item.name}, ${item.address}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* `role="dialog"` thuộc về khung nội dung chứ không phải lớp nền phủ.
          Đặt nhầm lên nền thì trình đọc màn hình coi cả màn hình tối là hộp thoại. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết ${item.name}`}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-lift dark:bg-jade-900 sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-jade-900/5 p-5 dark:border-white/5">
          <div>
            <Badge tone={item.type === 'KHACH_SAN' ? 'gold' : 'jade'}>{type?.label}</Badge>
            <h2 className="mt-2 font-serif text-xl font-bold text-jade-900 dark:text-jade-50">{item.name}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-jade-500 transition hover:bg-jade-100 dark:hover:bg-jade-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-2 text-sm text-jade-700 dark:text-jade-200">
            <p className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-jade-400" /> {item.address}
            </p>
            {item.owner && (
              <p className="flex items-center gap-2">
                <User size={16} className="shrink-0 text-jade-400" /> Đại diện: {item.owner}
              </p>
            )}
            {item.priceRange && (
              <p className="flex items-center gap-2">
                <Tag size={16} className="shrink-0 text-jade-400" /> Giá tham khảo: {item.priceRange}
              </p>
            )}
          </div>

          {item.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-jade-700 dark:text-jade-200">
              {item.description}
            </p>
          )}

          {item.amenities?.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-jade-800 dark:text-jade-100">Tiện nghi</p>
              <div className="flex flex-wrap gap-2">
                {item.amenities.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1 rounded-full bg-jade-50 px-3 py-1 text-xs text-jade-700 dark:bg-jade-800 dark:text-jade-100"
                  >
                    <CheckCircle2 size={13} className="text-jade-500" /> {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* `item.rating` là điểm lấy từ Google Maps. Trước đây cửa sổ này không
              hiện nó ở đâu cả, nên `Reviews` là chỗ đầu tiên và duy nhất nó xuất
              hiện — kèm nhãn nguồn, cạnh điểm của khách trên cổng. */}
          <Reviews
            targetType="LODGING"
            targetId={item.id}
            googleRating={item.rating}
            googleRatingCount={item.ratingCount}
            className="border-t border-jade-900/5 pt-4 dark:border-white/5"
          />

          <Gallery images={item.images} name={item.name} className="mt-0" />

          {item.phones?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.phones.map((p) => (
                <a key={p} href={phoneHref(p)} className="btn-primary !py-2 text-sm">
                  <Phone size={15} /> Gọi {p}
                </a>
              ))}
            </div>
          )}

          <MapEmbed lat={item.lat} lng={item.lng} query={mapQuery} title={item.name} height={240} />

          <p className="text-xs text-jade-400">
            Thông tin theo danh sách của UBND phường Đông Triều. Vui lòng gọi trực tiếp để xác nhận giá và đặt phòng.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
