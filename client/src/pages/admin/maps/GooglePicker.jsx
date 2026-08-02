import { useEffect, useRef, useState } from 'react';
import { MAP_CENTER, MAP_ZOOM } from '../../../lib/mapKinds.js';
import { docToaDo, napGoogleMaps, napThuVien, ngheLoiXacThuc } from '../../../lib/googleMaps.js';
import { PIN_CHON_TOA_DO, round5 } from '../../../lib/mapPin.js';

/**
 * Mặt bản đồ của công cụ chọn toạ độ — bản Google Maps.
 *
 * Đây là bộ máy nên dùng cho việc nhập toạ độ: trên nền Google có tên đình, chùa,
 * quán ăn và đường thôn của Đông Triều, nên quản trị viên **nhìn thấy đúng chỗ
 * mình đang ghim**. Trên nền OpenStreetMap thì phần lớn khu vực là khoảng trắng,
 * chỉ canh được theo hình dạng con đường — đặt ghim kiểu đó rất dễ lệch.
 *
 * Toàn bộ nút bấm và việc dò theo địa chỉ nằm ở `MapPicker.jsx`.
 */
export default function GooglePicker({ lat, lng, onPick, mode = 'light', height = 300, focus, apiKey, mapId, onHong }) {
  const boxRef = useRef(null);
  const markerRef = useRef(null);
  const [api, setApi] = useState(null);
  const [map, setMap] = useState(null);

  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);
  const onHongRef = useRef(onHong);
  useEffect(() => {
    onHongRef.current = onHong;
  }, [onHong]);

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

  useEffect(
    () =>
      ngheLoiXacThuc(() =>
        onHongRef.current?.('Google từ chối khoá API (sai khoá, chưa bật thanh toán, hoặc sai giới hạn tên miền).'),
      ),
    [],
  );

  // ── Dựng bản đồ ──
  //
  // `lat`/`lng` cố ý KHÔNG nằm trong danh sách phụ thuộc: chúng chỉ dùng để canh
  // khung lần đầu. Để vào thì mỗi lần kéo ghim là dựng lại cả bản đồ.
  const toaDoDauRef = useRef({ lat, lng });
  useEffect(() => {
    const box = boxRef.current;
    if (!api || !box) return undefined;
    const dau = toaDoDauRef.current;
    const coToaDo = Number.isFinite(dau.lat) && Number.isFinite(dau.lng);

    const banDo = new api.Map(box, {
      center: coToaDo ? { lat: dau.lat, lng: dau.lng } : { lat: MAP_CENTER[0], lng: MAP_CENTER[1] },
      zoom: coToaDo ? 16 : MAP_ZOOM,
      mapId,
      // Khác trang công khai: ở đây con lăn phóng to ngay, không cần giữ Ctrl.
      // Đang trong biểu mẫu nên người dùng chủ động canh ghim chứ không cuộn qua.
      gestureHandling: 'greedy',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      colorScheme: mode === 'dark' ? 'DARK' : 'LIGHT',
    });
    banDo.addListener('click', (e) => {
      const t = docToaDo(e.latLng);
      if (t) onPickRef.current?.({ lat: round5(t.lat), lng: round5(t.lng) });
    });
    setMap(banDo);

    return () => {
      setMap(null);
      markerRef.current = null;
      // Google Maps không có hàm huỷ bản đồ. Dọn DOM bằng tay, nếu không thì đổi
      // sáng/tối vài lần là có mấy bản đồ xếp chồng lên nhau trong cùng một ô.
      box.innerHTML = '';
    };
  }, [api, mapId, mode]);

  // ── Đồng bộ ghim với giá trị đang có trong biểu mẫu ──
  useEffect(() => {
    if (!map || !api) return;
    const coToaDo = Number.isFinite(lat) && Number.isFinite(lng);

    if (!coToaDo) {
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
      return;
    }

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'dt-pin-wrap';
      el.innerHTML = PIN_CHON_TOA_DO;
      const marker = new api.AdvancedMarkerElement({
        map,
        position: { lat, lng },
        content: el,
        gmpDraggable: true,
        title: 'Kéo để đặt lại vị trí',
      });
      marker.addListener('dragend', (e) => {
        // Bản API này đưa toạ độ qua `event.latLng`, bản kia chỉ cập nhật
        // `marker.position` — đọc cả hai, xem `docToaDo`.
        const t = docToaDo(e?.latLng) ?? docToaDo(marker.position);
        if (t) onPickRef.current?.({ lat: round5(t.lat), lng: round5(t.lng) });
      });
      markerRef.current = marker;
    } else {
      markerRef.current.position = { lat, lng };
    }
  }, [map, api, lat, lng]);

  // ── Nơi gọi yêu cầu nhìn tới một điểm (sau khi dò địa chỉ, hoặc về trung tâm) ──
  useEffect(() => {
    if (!focus || !map) return;
    map.setCenter({ lat: focus.lat, lng: focus.lng });
    map.setZoom(focus.zoom);
  }, [focus, map]);

  return (
    <div
      ref={boxRef}
      style={{ height }}
      className="dt-map w-full overflow-hidden rounded-md ring-1 ring-jade-900/10 dark:ring-white/10"
    />
  );
}
