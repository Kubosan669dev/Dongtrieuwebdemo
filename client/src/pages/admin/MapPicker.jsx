import { lazy, Suspense, useCallback, useState } from 'react';
import { AlertTriangle, Crosshair, Loader2, MapPinOff, Search } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useTheme } from '../../hooks/useTheme.js';
import { useMapsConfig } from '../../hooks/useMapsConfig.js';
import { MAP_CENTER } from '../../lib/mapKinds.js';
import { round5 } from '../../lib/mapPin.js';
import { googleMapsHongXacThuc } from '../../lib/googleMaps.js';

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
 * Phần nút bấm và việc dò theo địa chỉ nằm ở đây; mặt bản đồ do một trong hai bộ
 * máy trong `maps/` lo: có khoá thì Google, chưa có thì OpenStreetMap.
 *
 * Đây là chỗ DUY NHẤT trong cổng còn dùng Maps JavaScript API. Bản đồ công khai
 * đều nhúng bằng `<iframe>` (xem `components/MapEmbed.jsx`) nên không cần khoá;
 * riêng ở đây phải là bản đồ chạy bằng JavaScript, vì cần bắt cú bấm và cần ghim
 * kéo được — hai việc iframe không làm được.
 *
 * Khác trang công khai một điểm: sự cố Google ở đây được **nói ra**, vì quản trị
 * viên chính là người sửa được khoá.
 */
const GooglePicker = lazy(() => import('./maps/GooglePicker.jsx'));
const OsmPicker = lazy(() => import('./maps/OsmPicker.jsx'));

export default function MapPicker({ lat, lng, onPick, name, address, ward, height = 300 }) {
  const { mode } = useTheme();
  const { apiKey, mapId, dangCho } = useMapsConfig();

  const [doDang, setDoDang] = useState(false);
  const [ketQua, setKetQua] = useState(null);
  const [loi, setLoi] = useState('');
  const [hongGoogle, setHongGoogle] = useState(() =>
    googleMapsHongXacThuc() ? 'Google đã từ chối khoá này ở lần dựng bản đồ trước.' : '',
  );
  // Đối tượng mới mỗi lần đặt, nên bộ máy bản đồ nhận ra cả khi toạ độ trùng với
  // lần trước (bấm "Dò từ địa chỉ" hai lần liên tiếp vẫn phải kéo khung về ghim).
  const [focus, setFocus] = useState(null);

  const bo = useCallback((thongDiep) => setHongGoogle(thongDiep), []);

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
      onPick?.({ lat: round5(kq.lat), lng: round5(kq.lng) });
      setFocus({ lat: kq.lat, lng: kq.lng, zoom: kq.tang === 1 ? 17 : 14 });
    } catch (err) {
      setLoi(err.message || 'Không dò được toạ độ.');
    } finally {
      setDoDang(false);
    }
  };

  const veTrungTam = () => {
    onPick?.({ lat: MAP_CENTER[0], lng: MAP_CENTER[1] });
    setFocus({ lat: MAP_CENTER[0], lng: MAP_CENTER[1], zoom: 15 });
  };

  const dungGoogle = Boolean(apiKey) && !hongGoogle;
  const chung = { lat, lng, onPick, mode, height, focus };

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
            onClick={() => onPick?.({ lat: null, lng: null })}
            className="btn-ghost btn-sm text-danger"
          >
            <MapPinOff size={13} /> Xoá toạ độ
          </button>
        )}
        <span className="ml-auto text-xs text-muted">Bấm lên bản đồ hoặc kéo ghim để đặt vị trí</span>
      </div>

      {dangCho ? (
        <KhungCho height={height} />
      ) : (
        <Suspense fallback={<KhungCho height={height} />}>
          {dungGoogle ? <GooglePicker {...chung} apiKey={apiKey} mapId={mapId} onHong={bo} /> : <OsmPicker {...chung} />}
        </Suspense>
      )}

      {/* Sự cố Google nói thẳng ở đây, khác trang công khai. Quản trị viên là
          người duy nhất sửa được khoá, mà nền OpenStreetMap ở Đông Triều gần như
          trắng — không báo thì họ sẽ ngồi ghim mò trên một bản đồ trống và tưởng
          bản đồ vốn dĩ như vậy. */}
      {hongGoogle && (
        <p className="flex items-start gap-1.5 rounded-md bg-gold-50 px-3 py-2 text-xs text-gold-800 dark:bg-gold-900/25 dark:text-gold-200">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>
            Đang dùng nền OpenStreetMap vì Google Maps không dùng được: {hongGoogle} Kiểm tra lại khoá ở{' '}
            <strong>Cài đặt chung → Bản đồ</strong>.
          </span>
        </p>
      )}

      {/* Nói rõ độ tin cậy của kết quả dò: chỉ tầng 1 là đúng điểm, tầng 2 và 3
          chỉ rơi vào giữa làng / giữa xã. Quản trị viên phải biết mình đang nhận
          cái gì trước khi bấm Lưu, nếu không sẽ tưởng máy đã đặt đúng cổng đình. */}
      {ketQua && (
        <p
          className={
            ketQua.tang === 1
              ? 'rounded-md bg-jade-50 px-3 py-2 text-xs text-jade-700 dark:bg-jade-900/40 dark:text-jade-200'
              : 'rounded-md bg-gold-50 px-3 py-2 text-xs text-gold-800 dark:bg-gold-900/25 dark:text-gold-200'
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
      {loi && <p className="rounded-md bg-terra-500/10 px-3 py-2 text-xs text-danger">{loi}</p>}
    </div>
  );
}

function KhungCho({ height }) {
  return (
    <div
      style={{ height }}
      className="grid place-items-center rounded-md bg-jade-50 text-sm text-muted dark:bg-jade-900/40"
    >
      <span className="flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" /> Đang tải bản đồ…
      </span>
    </div>
  );
}
