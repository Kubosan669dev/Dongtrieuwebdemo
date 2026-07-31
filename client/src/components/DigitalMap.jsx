import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Phone, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cx } from '../lib/format.js';
import { mapDirectionsUrl } from '../lib/format.js';
import { MAP_KINDS, MAP_KIND_GLYPH, MAP_CENTER, MAP_ZOOM } from '../lib/mapKinds.js';

/**
 * Bản đồ số — bản đồ duy nhất hiện mọi điểm cùng lúc.
 *
 * Thay cho bản cũ ở `MapPage.jsx`: bản đó là MỘT iframe Google Maps hiện đúng một
 * điểm, chọn điểm khác thì iframe tải lại. Không có bản đồ nào hiện tất cả điểm,
 * không zoom/pan liên tục, không lớp — nên không phải "bản đồ số".
 *
 * ── VÌ SAO DÙNG LEAFLET TRẦN, KHÔNG DÙNG react-leaflet ──────────────────────
 *
 * `react-leaflet` 5 yêu cầu React 19, dự án đang ở React 18 nên cài là xung đột
 * ngay. Ghim ở đây lại tự vẽ và việc canh khung (`fitBounds`) vốn là thao tác
 * tuần tự, tức phần lớn lợi ích của lớp bọc React không dùng tới. Dùng Leaflet
 * trần thì chỉ một phụ thuộc và không bị ràng vào phiên bản React.
 *
 * ── BA ĐIỂM PHẢI GIỮ ────────────────────────────────────────────────────────
 *
 *  1. Ghim tự vẽ bằng SVG + `currentColor`, KHÔNG dùng icon mặc định của Leaflet
 *     (icon mặc định vỡ đường dẫn khi đóng gói — lỗi kinh điển). Nhờ tự vẽ, ghim
 *     đổi màu theo cả 8 bảng màu như `PagodaMotif`.
 *  2. Nền bản đồ đổi theo chế độ sáng/tối. OSM chỉ có bản sáng; để nguyên thì cả
 *     trang tối mà bản đồ trắng loá.
 *  3. Tôn trọng `prefers-reduced-motion` — không bay tới ghim.
 */
export default function DigitalMap({
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
  // Giữ `onSelect` mới nhất trong một ref để trình xử lý sự kiện của Leaflet
  // luôn gọi đúng hàm hiện tại, mà KHÔNG phải gỡ rồi gắn lại toàn bộ ghim mỗi
  // lần nơi gọi truyền vào một hàm mới. Gán trong effect, không gán khi render.
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
      {showPopup && diemChon && (
        <PopupDiem point={diemChon} onClose={() => onSelect?.(null)} />
      )}
      {/* Chỉ hiện từ khổ máy tính bảng trở lên: trên điện thoại không có con lăn,
          Leaflet đã tự bật chụm hai ngón để phóng to nên câu này chỉ gây rối. */}
      <p className="pointer-events-none absolute bottom-0 right-0 z-[400] hidden rounded-tl-lg bg-paper/85 px-2 py-1 text-[10px] text-jade-600 sm:block dark:bg-jade-950/85 dark:text-jade-300">
        Giữ Ctrl + con lăn để phóng to
      </p>
    </div>
  );
}

/**
 * Hai lớp nền. Cả hai đều miễn phí và không cần khoá API — đúng hướng dự án đang
 * đi (xem chú thích ở `MapEmbed.jsx`). Ghi nguồn là điều kiện sử dụng, không được bỏ.
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

/**
 * Ghim tự vẽ.
 *
 * Dùng `divIcon` với HTML thuần: Leaflet chèn khối này vào DOM bên ngoài cây
 * React, nhưng class của Tailwind vẫn có tác dụng vì CSS là toàn cục — nhờ đó
 * `currentColor` trong SVG lấy đúng màu của bảng màu đang dùng.
 *
 * Các class màu được viết nguyên chuỗi trong `lib/mapKinds.js` (không ghép động),
 * để Tailwind quét thấy và không loại bỏ khi đóng gói.
 */
function taoGhim(p, dangChon) {
  const kind = MAP_KINDS[p.kind] ?? MAP_KINDS.heritage;
  const co = dangChon ? 40 : 30;
  // Ghim ước tính vẽ nét đứt: người xem phải phân biệt được toạ độ đã xác minh
  // với toạ độ máy dò theo tên làng.
  const vien = p.coordsEstimated ? 'stroke-dasharray="3 2.5"' : '';
  // Hình riêng của từng nhóm nằm trong lòng ghim — xem MAP_KIND_GLYPH để biết
  // vì sao không thể chỉ dựa vào màu.
  const hinh = MAP_KIND_GLYPH[p.kind] ?? '<circle cx="12" cy="11" r="3.4" fill="var(--dt-pin-vien)"/>';
  const html = `
    <span class="dt-pin ${kind.pinClass} ${dangChon ? 'dt-pin-active' : ''}">
      <svg viewBox="0 0 24 32" width="${co}" height="${(co * 32) / 24}" aria-hidden="true">
        <path d="M12 1C6.5 1 2 5.4 2 10.9C2 18.4 12 31 12 31S22 18.4 22 10.9C22 5.4 17.5 1 12 1Z"
              fill="currentColor" stroke="var(--dt-pin-vien)" stroke-width="1.6" ${vien}/>
        ${hinh}
      </svg>
    </span>`;
  return L.divIcon({
    html,
    className: 'dt-pin-wrap',
    iconSize: [co, (co * 32) / 24],
    iconAnchor: [co / 2, (co * 32) / 24],
    popupAnchor: [0, -(co * 32) / 24],
  });
}

/** Khung thông tin của điểm đang chọn. Nổi trên bản đồ, không phải popup của Leaflet. */
function PopupDiem({ point: p, onClose }) {
  const kind = MAP_KINDS[p.kind] ?? MAP_KINDS.heritage;
  // Chỉ nhóm có trang chi tiết riêng mới dựng liên kết. Ba nhóm kia hiện chi
  // tiết bằng cửa sổ trong trang danh sách nên thay bằng liên kết về danh sách.
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

/** Cho phép nơi khác đọc lại danh mục nhóm mà không phải import trùng. */
export { MAP_KINDS };
