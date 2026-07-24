import { Navigation } from 'lucide-react';
import { mapEmbedUrl, mapDirectionsUrl } from '../lib/format.js';

/** Bản đồ Google nhúng (không cần API key) + nút chỉ đường. */
export default function MapEmbed({ lat, lng, query, title, height = 320, showDirections = true }) {
  const src = mapEmbedUrl({ lat, lng, query });
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-jade-900/10 dark:ring-white/10">
      <iframe
        title={title || 'Bản đồ'}
        src={src}
        width="100%"
        height={height}
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
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
