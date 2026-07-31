import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_CENTER, MAP_ZOOM } from '../../../lib/mapKinds.js';
import { PIN_CHON_TOA_DO, round5 } from '../../../lib/mapPin.js';

/**
 * Mặt bản đồ của công cụ chọn toạ độ — bản Leaflet + OpenStreetMap.
 *
 * Bộ máy dự phòng, dùng khi chưa có khoá Google Maps. Toàn bộ nút bấm, việc dò
 * theo địa chỉ và phần hiển thị kết quả nằm ở `MapPicker.jsx`; ở đây chỉ có bản
 * đồ và chiếc ghim kéo được, để hai bộ máy thay nhau mà phần còn lại không đổi.
 */
export default function OsmPicker({ lat, lng, onPick, mode = 'light', height = 300, focus }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const tileRef = useRef(null);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // ── Khởi tạo ──
  useEffect(() => {
    if (mapRef.current || !boxRef.current) return undefined;
    const coToaDo = Number.isFinite(lat) && Number.isFinite(lng);
    const map = L.map(boxRef.current, {
      center: coToaDo ? [lat, lng] : MAP_CENTER,
      zoom: coToaDo ? 16 : MAP_ZOOM,
      // Ở đây BẬT con lăn: đang trong biểu mẫu, người dùng chủ động phóng to để
      // canh ghim cho chính xác chứ không cuộn qua như trên trang công khai.
      scrollWheelZoom: true,
    });
    map.on('click', (e) => onPickRef.current?.({ lat: round5(e.latlng.lat), lng: round5(e.latlng.lng) }));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      tileRef.current = null;
    };
    // Chỉ chạy một lần: toạ độ ban đầu chỉ dùng để canh khung lần đầu, sau đó
    // hiệu ứng bên dưới lo việc đồng bộ ghim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Lớp nền theo chế độ sáng/tối ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const t = mode === 'dark' ? TILES.dark : TILES.light;
    tileRef.current = L.tileLayer(t.url, { attribution: t.attribution, maxZoom: 19 }).addTo(map);
    tileRef.current.bringToBack();
  }, [mode]);

  // ── Đồng bộ ghim với giá trị đang có trong biểu mẫu ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const coToaDo = Number.isFinite(lat) && Number.isFinite(lng);
    if (!coToaDo) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { draggable: true, icon: GHIM }).addTo(map);
      markerRef.current.on('dragend', (e) => {
        const p = e.target.getLatLng();
        onPickRef.current?.({ lat: round5(p.lat), lng: round5(p.lng) });
      });
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  // ── Nơi gọi yêu cầu nhìn tới một điểm (sau khi dò địa chỉ, hoặc về trung tâm) ──
  useEffect(() => {
    if (!focus || !mapRef.current) return;
    mapRef.current.setView([focus.lat, focus.lng], focus.zoom);
  }, [focus]);

  return (
    <div
      ref={boxRef}
      style={{ height }}
      className="dt-map w-full overflow-hidden rounded-xl ring-1 ring-jade-900/10 dark:ring-white/10"
    />
  );
}

const TILES = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap · © <a href="https://carto.com/attributions">CARTO</a>',
  },
};

/** Ghim kéo được. Cùng hình với bản đồ công khai để quản trị viên thấy đúng thứ khách sẽ thấy. */
const GHIM = L.divIcon({
  className: 'dt-pin-wrap',
  html: PIN_CHON_TOA_DO,
  iconSize: [32, 42.7],
  iconAnchor: [16, 42.7],
});
