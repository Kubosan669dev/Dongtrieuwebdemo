import { Loader2, Navigation } from 'lucide-react';
import { mapEmbedUrl, mapDirectionsUrl } from '../lib/format.js';
import { useMapsConfig } from '../hooks/useMapsConfig.js';

/**
 * Bản đồ Google nhúng cho trang chi tiết + nút chỉ đường.
 *
 * Cố ý KHÔNG dùng `DigitalMap` như trang /ban-do: ở đây chỉ có một điểm và không
 * có gì để bấm, nên một tấm ảnh bản đồ nhúng là đủ. Đổi lại, mỗi lượt xem trang
 * chi tiết KHÔNG tiêu một lượt bản đồ động — xem `mapEmbedUrl` trong lib/format.js
 * để biết vì sao chỗ này lại là chỗ đáng tiết kiệm hạn mức nhất.
 *
 * Nút "Chỉ đường" không cần khoá và không phụ thuộc cài đặt, nên luôn dựng ngay,
 * kể cả trong lúc còn chờ cài đặt về.
 */
export default function MapEmbed({ lat, lng, query, title, height = 320, showDirections = true }) {
  const { apiKey, dangCho } = useMapsConfig();

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-jade-900/10 dark:ring-white/10">
      {dangCho ? (
        // Chờ cài đặt về rồi mới dựng iframe. Dựng sẵn bằng URL cũ rồi đổi sang
        // URL Embed API khi khoá tới nơi thì trình duyệt tải NGUYÊN một tấm bản
        // đồ Google hai lần, và khách thấy bản đồ nháy một cái.
        //
        // Khung chờ nằm trong đúng lớp bọc của iframe và cao đúng bằng nó, nên
        // lúc bản đồ hiện ra không có gì bị đẩy chỗ.
        <div
          style={{ height }}
          className="grid place-items-center bg-jade-50 dark:bg-jade-900/40"
        >
          <span className="flex items-center gap-2 text-sm text-jade-500">
            <Loader2 size={14} className="animate-spin" /> Đang tải bản đồ…
          </span>
        </div>
      ) : (
        <iframe
          title={title || 'Bản đồ'}
          src={mapEmbedUrl({ lat, lng, query, apiKey })}
          width="100%"
          height={height}
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      )}
      {showDirections && (
        <div className="flex items-center justify-between gap-2 bg-white px-4 py-3 dark:bg-jade-900">
          <p className="line-clamp-1 text-sm text-jade-600 dark:text-jade-300">{query || title}</p>
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
