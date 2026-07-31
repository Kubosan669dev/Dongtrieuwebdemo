import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cx } from '../../lib/format.js';
import { MAP_CENTER, MAP_ZOOM } from '../../lib/mapKinds.js';
import { PIN_CO, PIN_CO_CHON, pinCao, pinHtml } from '../../lib/mapPin.js';
import MapPopup from './MapPopup.jsx';

/**
 * Bản đồ số chạy trên Leaflet + OpenStreetMap.
 *
 * Đây là bộ máy **dự phòng**: dùng khi chưa cấu hình khoá Google Maps API. Bộ máy
 * chính là `GoogleDigitalMap.jsx` — xem `DigitalMap.jsx` để biết cách chọn.
 *
 * Giữ lại chứ không xoá, vì nó là thứ bảo đảm cổng không bao giờ có một ô trống
 * chỗ đáng lẽ là bản đồ: khoá hết hạn, chưa kịp lấy khoá, hay quên điền sau khi
 * dựng lại máy chủ thì bản đồ này vẫn chạy, miễn phí và không cần khoá.
 *
 * ── VÌ SAO DÙNG LEAFLET TRẦN, KHÔNG DÙNG react-leaflet ──────────────────────
 *
 * `react-leaflet` 5 yêu cầu React 19, dự án đang ở React 18 nên cài là xung đột
 * ngay. Ghim ở đây lại tự vẽ và việc canh khung (`fitBounds`) vốn là thao tác
 * tuần tự, tức phần lớn lợi ích của lớp bọc React không dùng tới.
 */
export default function OsmDigitalMap({
  points = [],
  activeKinds = null,
  selectedId = null,
  onSelect,
  mode = 'light',
  height = 520,
  className,
  showPopup = true,
}) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markersRef = useRef(new Map());
  const tileRef = useRef(null);
  // Giữ `onSelect` mới nhất trong một ref để trình xử lý sự kiện của Leaflet luôn
  // gọi đúng hàm hiện tại, mà KHÔNG phải gỡ rồi gắn lại toàn bộ ghim mỗi lần nơi
  // gọi truyền vào một hàm mới. Gán trong effect, không gán khi render.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const hienThi = useMemo(
    () => points.filter((p) => !activeKinds || activeKinds.includes(p.kind)),
    [points, activeKinds],
  );

  // ── Khởi tạo bản đồ một lần ──
  useEffect(() => {
    if (mapRef.current || !boxRef.current) return undefined;

    const map = L.map(boxRef.current, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      // Cuộn trang bằng con lăn không được bị bản đồ "ăn" mất — khách cuộn qua
      // khối bản đồ trên trang chủ là mắc kẹt. Giữ Ctrl mới zoom bằng con lăn.
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    });
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Chụp lại tham chiếu ngay bây giờ: tới lúc hàm dọn dẹp chạy thì
    // `markersRef.current` có thể đã trỏ sang chỗ khác.
    const markers = markersRef.current;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      tileRef.current = null;
      markers.clear();
    };
  }, []);

  // ── Lớp nền, đổi theo chế độ sáng/tối ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const t = mode === 'dark' ? TILES.dark : TILES.light;
    tileRef.current = L.tileLayer(t.url, { attribution: t.attribution, maxZoom: 19 }).addTo(map);
    // Lớp nền phải nằm dưới ghim
    tileRef.current.bringToBack();
  }, [mode]);

  // ── Vẽ lại ghim khi danh sách điểm đổi ──
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersRef.current.clear();

    for (const p of hienThi) {
      const marker = L.marker([p.lat, p.lng], {
        icon: taoGhim(p, false),
        title: p.name,
        // Trình đọc màn hình và bàn phím: ghim là nút bấm được
        keyboard: true,
        alt: p.name,
        riseOnHover: true,
      });
      marker.on('click', () => onSelectRef.current?.(p));
      marker.on('keypress', (e) => {
        if (e.originalEvent?.key === 'Enter' || e.originalEvent?.key === ' ') onSelectRef.current?.(p);
      });
      marker.addTo(layer);
      markersRef.current.set(p.id, { marker, point: p });
    }

    // Canh khung vừa đủ mọi ghim. Chỉ khi có ghim, và không có ghim nào thì giữ
    // nguyên tâm mặc định thay vì phóng ra cả thế giới.
    if (hienThi.length > 0) {
      const bounds = L.latLngBounds(hienThi.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: false });
    }
  }, [hienThi]);

  // ── Ghim đang chọn: đổi kiểu + đưa vào tầm nhìn ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const [id, { marker, point }] of markersRef.current) {
      marker.setIcon(taoGhim(point, id === selectedId));
      if (id === selectedId) marker.setZIndexOffset(1000);
      else marker.setZIndexOffset(0);
    }
    const chon = markersRef.current.get(selectedId);
    if (chon) {
      // `prefers-reduced-motion`: không bay, nhảy thẳng tới.
      const giamChuyenDong = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const dich = chon.point;
      if (giamChuyenDong) map.setView([dich.lat, dich.lng], Math.max(map.getZoom(), 15), { animate: false });
      else map.flyTo([dich.lat, dich.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    }
  }, [selectedId, hienThi]);

  const diemChon = selectedId ? points.find((p) => p.id === selectedId) : null;

  return (
    <div className={cx('relative overflow-hidden rounded-3xl ring-1 ring-jade-900/10 dark:ring-white/10', className)}>
      <div ref={boxRef} style={{ height }} className="dt-map w-full" />
      {showPopup && diemChon && <MapPopup point={diemChon} onClose={() => onSelect?.(null)} />}
      {/* Chỉ hiện từ khổ máy tính bảng trở lên: trên điện thoại không có con lăn,
          Leaflet đã tự bật chụm hai ngón để phóng to nên câu này chỉ gây rối. */}
      <p className="pointer-events-none absolute bottom-0 right-0 z-[400] hidden rounded-tl-lg bg-paper/85 px-2 py-1 text-[10px] text-jade-600 sm:block dark:bg-jade-950/85 dark:text-jade-300">
        Giữ Ctrl + con lăn để phóng to
      </p>
    </div>
  );
}

/**
 * Hai lớp nền. Cả hai đều miễn phí và không cần khoá API. Ghi nguồn là điều kiện
 * sử dụng, không được bỏ.
 */
const TILES = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
  },
};

/** Bọc chiếc ghim dùng chung (`lib/mapPin.js`) vào `divIcon` của Leaflet. */
function taoGhim(p, dangChon) {
  const co = dangChon ? PIN_CO_CHON : PIN_CO;
  return L.divIcon({
    html: pinHtml(p, dangChon),
    className: 'dt-pin-wrap',
    iconSize: [co, pinCao(co)],
    iconAnchor: [co / 2, pinCao(co)],
    popupAnchor: [0, -pinCao(co)],
  });
}
