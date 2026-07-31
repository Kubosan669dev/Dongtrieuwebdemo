import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Loader2, MapPinOff, Search } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useTheme } from '../../hooks/useTheme.js';
import { MAP_CENTER, MAP_ZOOM } from '../../lib/mapKinds.js';

/**
 * Chọn toạ độ bằng cách bấm lên bản đồ.
 *
 * ── VÌ SAO CẦN THÀNH PHẦN NÀY ───────────────────────────────────────────────
 *
 * Ô nhập toạ độ cũ chỉ có hai hộp số, bắt gõ tay tới 5 chữ số thập phân. Kết quả
 * thực tế: **12/13 di tích và 6/7 điểm lân cận không có toạ độ** — không ai làm
 * việc đó. Bản đồ số thì vô nghĩa nếu dữ liệu toạ độ trống.
 *
 * Đây là chỗ biến việc nhập toạ độ từ một việc không ai làm thành ba giây bấm
 * chuột, nên nó quyết định bản đồ số có sống được về lâu dài hay không.
 *
 * Ghim kéo được, bấm chỗ nào ghim nhảy tới đó, và có nút dò từ địa chỉ. Hai hộp
 * số vẫn giữ ở `LatLngField` cho ai muốn dán toạ độ chính xác từ nguồn khác.
 */
export default function MapPicker({ lat, lng, onPick, name, address, ward, height = 300 }) {
  const { mode } = useTheme();
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const tileRef = useRef(null);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  const [doDang, setDoDang] = useState(false);
  const [ketQua, setKetQua] = useState(null);
  const [loi, setLoi] = useState('');

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
    L.tileLayer(TILES.light.url, { attribution: TILES.light.attribution, maxZoom: 19 }).addTo(map);
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

  const doTuDiaChi = async () => {
    setDoDang(true);
    setLoi('');
    setKetQua(null);
    try {
      const params = new URLSearchParams();
      if (name) params.set('name', name);
      if (address) params.set('address', address);
      if (ward) params.set('ward', ward);
      const kq = await api.get(`/geocode?${params.toString()}`);
      setKetQua(kq);
      onPickRef.current?.({ lat: round5(kq.lat), lng: round5(kq.lng) });
      mapRef.current?.setView([kq.lat, kq.lng], kq.tang === 1 ? 17 : 14);
    } catch (err) {
      setLoi(err.message || 'Không dò được toạ độ.');
    } finally {
      setDoDang(false);
    }
  };

  const veTrungTam = () => {
    onPickRef.current?.({ lat: MAP_CENTER[0], lng: MAP_CENTER[1] });
    mapRef.current?.setView(MAP_CENTER, 15);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={doTuDiaChi}
          disabled={doDang || (!name && !address)}
          className="btn-ghost btn-sm disabled:opacity-50"
        >
          {doDang ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          Dò từ địa chỉ
        </button>
        <button type="button" onClick={veTrungTam} className="btn-ghost btn-sm">
          <Crosshair size={13} /> Đặt ở trung tâm phường
        </button>
        {Number.isFinite(lat) && Number.isFinite(lng) && (
          <button
            type="button"
            onClick={() => onPickRef.current?.({ lat: null, lng: null })}
            className="btn-ghost btn-sm text-terra-600"
          >
            <MapPinOff size={13} /> Xoá toạ độ
          </button>
        )}
        <span className="ml-auto text-xs text-jade-500">Bấm lên bản đồ hoặc kéo ghim để đặt vị trí</span>
      </div>

      <div ref={boxRef} style={{ height }} className="dt-map w-full overflow-hidden rounded-xl ring-1 ring-jade-900/10 dark:ring-white/10" />

      {/* Nói rõ độ tin cậy của kết quả dò: chỉ tầng 1 là đúng điểm, tầng 2 và 3
          chỉ rơi vào giữa làng / giữa xã. Quản trị viên phải biết mình đang nhận
          cái gì trước khi bấm Lưu, nếu không sẽ tưởng máy đã đặt đúng cổng đình. */}
      {ketQua && (
        <p
          className={
            ketQua.tang === 1
              ? 'rounded-lg bg-jade-50 px-3 py-2 text-xs text-jade-700 dark:bg-jade-900/40 dark:text-jade-200'
              : 'rounded-lg bg-gold-50 px-3 py-2 text-xs text-gold-800 dark:bg-gold-900/25 dark:text-gold-200'
          }
        >
          {ketQua.tang === 1 ? (
            <>
              Dò được <strong>đúng điểm</strong>: {ketQua.hienThi}
            </>
          ) : (
            <>
              Chỉ dò được <strong>{ketQua.doChinhXac}</strong> — ghim đang ở giữa khu vực, chưa đúng vị trí
              thật. Hãy kéo ghim tới đúng chỗ rồi lưu. ({ketQua.hienThi})
            </>
          )}
        </p>
      )}
      {loi && <p className="rounded-lg bg-terra-500/10 px-3 py-2 text-xs text-terra-600">{loi}</p>}
    </div>
  );
}

/** Làm tròn 5 chữ số ≈ 1m — đủ chính xác, và tránh số thập phân dài vô nghĩa. */
const round5 = (n) => Math.round(n * 1e5) / 1e5;

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
  html: `<span class="dt-pin text-jade-700 dark:text-jade-400">
    <svg viewBox="0 0 24 32" width="32" height="42.7" aria-hidden="true">
      <path d="M12 1C6.5 1 2 5.4 2 10.9C2 18.4 12 31 12 31S22 18.4 22 10.9C22 5.4 17.5 1 12 1Z"
            fill="currentColor" stroke="var(--dt-pin-vien)" stroke-width="1.6"/>
      <circle cx="12" cy="11" r="3.4" fill="var(--dt-pin-vien)"/>
    </svg></span>`,
  iconSize: [32, 42.7],
  iconAnchor: [16, 42.7],
});
