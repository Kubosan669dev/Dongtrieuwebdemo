import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '../../lib/format.js';
import { MAP_CENTER, MAP_ZOOM } from '../../lib/mapKinds.js';
import { napGoogleMaps, napThuVien, ngheLoiXacThuc } from '../../lib/googleMaps.js';
import { pinHtml } from '../../lib/mapPin.js';
import MapPopup from './MapPopup.jsx';

/** Mức phóng tối đa khi canh khung, và mức phóng khi nhảy tới một điểm được chọn. */
const ZOOM_TOI_DA = 15;

/**
 * Đổi ghim sang kiểu "đang chọn" (to hơn, bóng đậm hơn) hoặc trở lại thường.
 *
 * Vẽ lại `innerHTML` của chính phần tử đã giao cho `AdvancedMarkerElement`, thay
 * vì thay cả phần tử: giữ nguyên phần tử thì Google không phải gắn lại ghim vào
 * bản đồ, và hội tụ bàn phím không bị mất khi người dùng bấm Enter trên ghim.
 */
function doiKieuGhim(muc, dangChon) {
  muc.el.innerHTML = pinHtml(muc.point, dangChon);
  muc.marker.zIndex = dangChon ? 1000 : 1;
}

/**
 * Bản đồ số chạy trên Google Maps JavaScript API.
 *
 * ── VÌ SAO GOOGLE THAY VÌ OPENSTREETMAP ─────────────────────────────────────
 *
 * Không phải vì Google đẹp hơn, mà vì **dữ liệu vùng Đông Triều**: trên OSM,
 * phần lớn đường thôn, tên xóm và các cơ sở kinh doanh nhỏ chưa được vẽ, nên
 * ghim của cổng nổi trên một nền gần như trắng và du khách không định vị được
 * mình đang ở đâu. Google có đủ nhãn tiếng Việt cho khu vực này.
 *
 * Đổi lại là phải có khoá API. Chưa có khoá thì `DigitalMap.jsx` chuyển sang
 * `OsmDigitalMap.jsx` — cổng không bao giờ để trống chỗ đáng lẽ là bản đồ.
 *
 * ── BA ĐIỂM PHẢI GIỮ, GIỐNG HỆT BẢN OSM ─────────────────────────────────────
 *
 *  1. Ghim tự vẽ, dùng chung `lib/mapPin.js` — nhờ `AdvancedMarkerElement` nhận
 *     DOM thật nên `currentColor` và class Tailwind vẫn có tác dụng, ghim đổi màu
 *     theo cả 8 bảng màu. Ghim đỏ mặc định của Google không phân biệt được nhóm.
 *  2. Nền bản đồ đổi theo chế độ sáng/tối.
 *  3. Tôn trọng `prefers-reduced-motion` — không lướt tới ghim.
 */
export default function GoogleDigitalMap({
  points = [],
  activeKinds = null,
  selectedId = null,
  onSelect,
  mode = 'light',
  height = 520,
  className,
  showPopup = true,
  apiKey,
  mapId,
  /**
   * Báo lên cho nơi gọi khi Google không dùng được (sai khoá, chưa bật thanh
   * toán, mất mạng). BẮT BUỘC truyền: thành phần này cố ý không tự vẽ khung báo
   * lỗi, vì việc đúng phải làm là đổi sang bản đồ OSM chứ không phải hiện lời xin
   * lỗi cho khách xem. `DigitalMap.jsx` lo việc đó.
   */
  onHong,
}) {
  const boxRef = useRef(null);
  const markersRef = useRef(new Map());
  const [api, setApi] = useState(null);
  const [map, setMap] = useState(null);

  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  const onHongRef = useRef(onHong);
  useEffect(() => {
    onHongRef.current = onHong;
  }, [onHong]);

  const hienThi = useMemo(
    () => points.filter((p) => !activeKinds || activeKinds.includes(p.kind)),
    [points, activeKinds],
  );

  // ── Nạp API ──
  useEffect(() => {
    let huy = false;
    napGoogleMaps(apiKey)
      .then(async (maps) => {
        const [thuVienBanDo, thuVienGhim] = await Promise.all([
          napThuVien(maps, 'maps'),
          napThuVien(maps, 'marker'),
        ]);
        if (huy) return;
        if (!thuVienGhim?.AdvancedMarkerElement) {
          throw new Error('Bản Google Maps API này không có AdvancedMarkerElement.');
        }
        setApi({ maps, Map: thuVienBanDo.Map, AdvancedMarkerElement: thuVienGhim.AdvancedMarkerElement });
      })
      .catch((e) => {
        if (!huy) onHongRef.current?.(e.message);
      });
    return () => {
      huy = true;
    };
  }, [apiKey]);

  // ── Google từ chối khoá ──
  //
  // Không đến qua đường `catch` ở trên: script vẫn tải về bình thường, mãi tới
  // lúc dựng bản đồ đầu tiên Google mới gọi `gm_authFailure` và bôi xám khung.
  useEffect(
    () =>
      ngheLoiXacThuc(() =>
        onHongRef.current?.('Google từ chối khoá API (sai khoá, chưa bật thanh toán, hoặc sai giới hạn tên miền).'),
      ),
    [],
  );

  // ── Dựng bản đồ ──
  useEffect(() => {
    const box = boxRef.current;
    if (!api || !box) return undefined;

    const banDo = new api.Map(box, {
      center: { lat: MAP_CENTER[0], lng: MAP_CENTER[1] },
      zoom: MAP_ZOOM,
      // Bắt buộc có Map ID thì `AdvancedMarkerElement` mới hiện ghim.
      mapId,
      // Cùng cách cư xử với bản OSM: con lăn không "ăn" mất thao tác cuộn trang,
      // phải giữ Ctrl mới phóng to. Google tự hiện câu nhắc bằng tiếng Việt nên ở
      // đây không cần dòng chữ nhắc như bản OSM.
      gestureHandling: 'cooperative',
      // Bỏ ba nút mặc định: bản đồ vệ tinh, Street View và toàn màn hình đều dẫn
      // khách ra khỏi ngữ cảnh của cổng, mà khối bản đồ trên trang chủ chỉ cao
      // 420px nên hàng nút này chiếm mất một góc đáng kể.
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      // Nền tối. `colorScheme` CHỈ đặt được lúc khởi tạo, nên `mode` phải nằm
      // trong danh sách phụ thuộc và đổi giao diện là dựng lại bản đồ. Chấp nhận
      // được vì đổi sáng/tối là việc hiếm; cách kia là cấu hình hai Map ID riêng
      // trên Cloud Console, tức bắt người vận hành làm gấp đôi việc.
      colorScheme: mode === 'dark' ? 'DARK' : 'LIGHT',
    });
    setMap(banDo);

    return () => {
      setMap(null);
      // Google Maps không có hàm huỷ bản đồ. Dọn DOM bằng tay, nếu không thì đổi
      // sáng/tối vài lần là có mấy bản đồ xếp chồng lên nhau trong cùng một ô.
      box.innerHTML = '';
    };
  }, [api, mapId, mode]);

  // ── Vẽ lại ghim khi danh sách điểm đổi ──
  useEffect(() => {
    if (!map || !api) return;

    const ghim = markersRef.current;
    for (const { marker } of ghim.values()) marker.map = null;
    ghim.clear();

    for (const p of hienThi) {
      const el = document.createElement('div');
      el.className = 'dt-pin-wrap';
      el.innerHTML = pinHtml(p, false);

      const marker = new api.AdvancedMarkerElement({
        map,
        position: { lat: p.lat, lng: p.lng },
        content: el,
        title: p.name,
        // Ghim bấm được thì Google tự cho nó `role="button"` và nhận được hội tụ
        // bàn phím — không phải tự dựng lại phần trợ năng đó.
        gmpClickable: true,
      });
      // Đăng ký cả hai tên sự kiện: `gmp-click` là tên hiện hành, `click` là tên
      // cũ vẫn dùng được. Bản API nào cũng chỉ bắn một trong hai; mà có bắn cả
      // hai thì cũng vô hại, `onSelect` chỉ đặt lại id đang chọn.
      marker.addListener('gmp-click', () => onSelectRef.current?.(p));
      marker.addListener('click', () => onSelectRef.current?.(p));

      ghim.set(p.id, { marker, el, point: p });
    }

    // Canh khung vừa đủ mọi ghim. Không có ghim nào thì giữ nguyên tâm mặc định
    // thay vì phóng ra cả thế giới.
    if (hienThi.length === 0) return;
    const khung = new api.maps.LatLngBounds();
    for (const p of hienThi) khung.extend({ lat: p.lat, lng: p.lng });
    map.fitBounds(khung, 40);
    // Một điểm duy nhất thì `fitBounds` phóng sát mái nhà. Chặn lại cho khớp bản
    // OSM. Phải chờ `idle` vì `fitBounds` đặt mức phóng bất đồng bộ, gọi
    // `getZoom()` ngay sau đó còn ra giá trị cũ.
    api.maps.event.addListenerOnce(map, 'idle', () => {
      if (map.getZoom() > ZOOM_TOI_DA) map.setZoom(ZOOM_TOI_DA);
    });
  }, [map, api, hienThi]);

  // ── Ghim đang chọn: đổi kiểu + đưa vào tầm nhìn ──
  useEffect(() => {
    if (!map) return;
    for (const [id, muc] of markersRef.current) doiKieuGhim(muc, id === selectedId);

    const chon = markersRef.current.get(selectedId);
    if (!chon) return;
    const { lat, lng } = chon.point;
    // `prefers-reduced-motion`: không lướt, nhảy thẳng tới.
    const giamChuyenDong = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (giamChuyenDong) map.setCenter({ lat, lng });
    else map.panTo({ lat, lng });
    if (map.getZoom() < ZOOM_TOI_DA) map.setZoom(ZOOM_TOI_DA);
  }, [map, selectedId, hienThi]);

  const diemChon = selectedId ? points.find((p) => p.id === selectedId) : null;

  return (
    <div className={cx('relative overflow-hidden rounded-3xl ring-1 ring-jade-900/10 dark:ring-white/10', className)}>
      <div ref={boxRef} style={{ height }} className="dt-map w-full" />
      {showPopup && diemChon && <MapPopup point={diemChon} onClose={() => onSelect?.(null)} />}
    </div>
  );
}
