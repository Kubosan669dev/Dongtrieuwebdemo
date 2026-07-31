import { lazy, Suspense, useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from '../lib/format.js';
import { googleMapsHongXacThuc } from '../lib/googleMaps.js';
import { useMapsConfig } from '../hooks/useMapsConfig.js';

/**
 * Bản đồ số — chọn bộ máy rồi giao việc.
 *
 * Mọi nơi trong cổng vẫn nhập đúng thành phần này (`components/DigitalMap.jsx`),
 * không nơi nào phải biết bên dưới là Google hay OpenStreetMap.
 *
 * ── LUẬT CHỌN ───────────────────────────────────────────────────────────────
 *
 *   có khoá Google  →  GoogleDigitalMap   (nền bản đồ đủ nhãn tiếng Việt)
 *   chưa có khoá    →  OsmDigitalMap      (miễn phí, không cần khoá)
 *   Google hỏng     →  OsmDigitalMap      (tự chuyển, khách vẫn có bản đồ)
 *
 * Nhánh thứ ba mới là nhánh quan trọng. Khoá hết hạn, hết hạn mức, hay ai đó sửa
 * giới hạn tên miền trên Cloud Console — cổng KHÔNG được biến thành một ô xám
 * câm vì chuyện đó. Sự cố ghi ra console cho người quản trị, còn khách thì vẫn
 * thấy bản đồ chạy.
 *
 * Hai bộ máy nạp trễ và nằm ở hai gói tách rời, nên trình duyệt chỉ tải về đúng
 * bộ máy đang dùng — có khoá Google thì không tải Leaflet (~43KB nén) làm gì.
 */
const GoogleDigitalMap = lazy(() => import('./maps/GoogleDigitalMap.jsx'));
const OsmDigitalMap = lazy(() => import('./maps/OsmDigitalMap.jsx'));

export default function DigitalMap({ height = 520, className, ...props }) {
  const { apiKey, mapId, dangCho } = useMapsConfig();
  // Khởi tạo từ trạng thái chung: Google đã từ chối khoá ở một bản đồ khác trong
  // cùng phiên thì bản đồ này khỏi thử lại cho mất công — trang chủ có bản đồ,
  // trang /ban-do có bản đồ, đi qua đi lại là dựng lại nhiều lần.
  const [hongGoogle, setHongGoogle] = useState(googleMapsHongXacThuc);

  const bo = useCallback((thongDiep) => {
    // Ghi ra console chứ không hiện cho khách: khách không sửa được khoá API, mà
    // câu báo lỗi thì chỉ làm cổng trông như đang hỏng trong khi bản đồ vẫn chạy.
    // Người quản trị thấy đúng câu này ở công cụ chọn toạ độ trong khu quản trị.
    console.warn(`[bản đồ] Chuyển sang OpenStreetMap: ${thongDiep}`);
    setHongGoogle(true);
  }, []);

  // Chờ cài đặt về mới biết dùng bộ máy nào. Không chờ thì lượt vẽ đầu tiên luôn
  // ra OSM rồi giây sau dựng Google đè lên — bản đồ nháy một cái và máy dựng hai lần.
  if (dangCho) return <KhungCho height={height} className={className} />;

  const dungGoogle = Boolean(apiKey) && !hongGoogle;

  return (
    <Suspense fallback={<KhungCho height={height} className={className} />}>
      {dungGoogle ? (
        <GoogleDigitalMap apiKey={apiKey} mapId={mapId} onHong={bo} height={height} className={className} {...props} />
      ) : (
        <OsmDigitalMap height={height} className={className} {...props} />
      )}
    </Suspense>
  );
}

function KhungCho({ height, className }) {
  return (
    <div
      style={{ height }}
      className={cx(
        'grid place-items-center rounded-3xl bg-jade-50 ring-1 ring-jade-900/5 dark:bg-jade-900/40 dark:ring-white/5',
        className,
      )}
    >
      <span className="flex items-center gap-2 text-sm text-jade-500">
        <Loader2 size={16} className="animate-spin" /> Đang tải bản đồ…
      </span>
    </div>
  );
}
