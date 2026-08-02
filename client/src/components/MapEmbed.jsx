import { Loader2, Navigation } from 'lucide-react';
import { cx, mapEmbedUrl, mapDirectionsUrl } from '../lib/format.js';
import { useMapsConfig } from '../hooks/useMapsConfig.js';

/**
 * Bản đồ Google nhúng + nút chỉ đường.
 *
 * Đây là cách nhúng bản đồ DUY NHẤT của cả cổng — trang chi tiết, trang Liên hệ,
 * khối bản đồ trang chủ và trang /ban-do đều đi qua đây. Nhờ vậy chỉ có một chỗ
 * quyết định dùng Maps Embed API hay dạng URL cũ, xem `mapEmbedUrl` trong
 * lib/format.js.
 *
 * Hai chế độ khung:
 *   · mặc định — cao đúng `height` px, bo góc, có viền. Dùng ở trang chi tiết,
 *     trang Liên hệ, khối trang chủ.
 *   · `fill` — lấp đầy phần tử cha, không bo góc, không viền. Dùng ở /ban-do,
 *     nơi bản đồ chiếm trọn phần màn hình còn lại. Cha PHẢI có chiều cao xác
 *     định, nếu không iframe cao 0.
 *
 * Nút "Chỉ đường" không cần khoá và không phụ thuộc cài đặt, nên luôn dựng ngay,
 * kể cả trong lúc còn chờ cài đặt về.
 */
export default function MapEmbed({
  lat,
  lng,
  query,
  title,
  height = 320,
  zoom = 16,
  showDirections = true,
  fill = false,
  className,
}) {
  const { apiKey, dangCho } = useMapsConfig();

  return (
    <div
      className={cx(
        'overflow-hidden',
        fill ? 'flex h-full flex-col' : 'rounded-md ring-1 ring-jade-900/10 dark:ring-white/10',
        className,
      )}
    >
      {dangCho ? (
        // Chờ cài đặt về rồi mới dựng iframe. Dựng sẵn bằng URL cũ rồi đổi sang
        // URL Embed API khi khoá tới nơi thì trình duyệt tải NGUYÊN một tấm bản
        // đồ Google hai lần, và khách thấy bản đồ nháy một cái.
        //
        // Khung chờ nằm trong đúng lớp bọc của iframe và cao đúng bằng nó, nên
        // lúc bản đồ hiện ra không có gì bị đẩy chỗ.
        <div
          style={fill ? undefined : { height }}
          className={cx('grid place-items-center bg-jade-50 dark:bg-jade-900/40', fill && 'flex-1')}
        >
          <span className="flex items-center gap-2 text-sm text-muted">
            <Loader2 size={14} className="animate-spin" /> Đang tải bản đồ…
          </span>
        </div>
      ) : (
        <iframe
          title={title || 'Bản đồ'}
          src={mapEmbedUrl({ lat, lng, query, apiKey, zoom })}
          width="100%"
          height={fill ? '100%' : height}
          style={{ border: 0 }}
          className={cx(fill && 'flex-1')}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      )}
      {showDirections && (
        <div className="flex shrink-0 items-center justify-between gap-2 bg-white px-4 py-3 dark:bg-jade-900">
          <p className="line-clamp-1 text-sm text-muted">{query || title}</p>
          <a
            href={mapDirectionsUrl({ lat, lng, query })}
            target="_blank"
            rel="noreferrer"
            className="btn-primary shrink-0 !py-2 text-xs"
          >
            <Navigation size={14} /> Chỉ đường
          </a>
        </div>
      )}
    </div>
  );
}
