import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/**
 * Cấu hình Google Maps: lấy ở đâu, và khi nào thì rơi về OpenStreetMap.
 *
 * ── HAI NGUỒN, CÓ THỨ TỰ ────────────────────────────────────────────────────
 *
 *  1. **Cài đặt trong khu quản trị** (`settings.maps`) — nguồn chính. Dán khoá
 *     vào là bản đồ đổi ngay, không phải dựng lại, không phải đụng vào máy chủ.
 *     Đúng mô hình của dự án: người vận hành cổng không phải là người triển khai.
 *  2. **Biến môi trường lúc dựng** (`VITE_GOOGLE_MAPS_API_KEY`) — nguồn dự phòng
 *     cho bản triển khai muốn ghim sẵn khoá. Vite nướng biến này vào gói lúc
 *     `npm run build`, nên đổi nó là phải dựng lại.
 *
 * Ô trong Cài đặt để trống thì rơi về biến môi trường; cả hai đều trống thì bản
 * đồ dùng OpenStreetMap. Không bao giờ có trạng thái "không có bản đồ nào".
 */

const khoaMoiTruong = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
const mapIdMoiTruong = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? '').trim();

/**
 * Map ID mặc định của Google dành cho thử nghiệm.
 *
 * `AdvancedMarkerElement` — thứ cho phép ghim là DOM thật, tức là ghim tự vẽ theo
 * 8 bảng màu — BẮT BUỘC bản đồ phải có Map ID. Không có thì ghim không hiện lên
 * chút nào. Nên phải có giá trị mặc định, nếu không thì dán mỗi khoá API vào là
 * ra một bản đồ trống trơn không ghim.
 *
 * Bản triển khai thật nên tạo Map ID riêng trong Google Cloud Console (Map
 * Management) và điền vào Cài đặt — Map ID riêng mới đặt được kiểu dáng bản đồ.
 */
export const MAP_ID_MAC_DINH = 'DEMO_MAP_ID';

export function useMapsConfig() {
  // Cùng `queryKey` với `useSettings` nên dùng chung bộ nhớ đệm — không phát
  // sinh thêm lời gọi mạng nào.
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
    staleTime: 10 * 60 * 1000,
  });

  const maps = data?.settings?.maps ?? {};
  const apiKey = (maps.apiKey ?? '').trim() || khoaMoiTruong;
  const mapId = (maps.mapId ?? '').trim() || mapIdMoiTruong || MAP_ID_MAC_DINH;

  return {
    apiKey,
    mapId,
    /**
     * Còn phải chờ cài đặt về mới biết dùng bộ máy nào.
     *
     * Không có cờ này thì lượt vẽ đầu tiên luôn ra bản đồ OSM (vì cài đặt chưa
     * về), rồi giây sau lại dựng bản đồ Google đè lên — khách thấy bản đồ nháy
     * một cái, mà máy thì dựng bản đồ hai lần. Khoá nằm sẵn trong biến môi trường
     * thì không phải chờ gì cả.
     */
    dangCho: !khoaMoiTruong && isLoading,
  };
}
