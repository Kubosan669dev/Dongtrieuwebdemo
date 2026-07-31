/**
 * Nạp Google Maps JavaScript API — một lần cho cả phiên, dùng chung mọi bản đồ.
 *
 * ── VÌ SAO PHẢI LÀ MỘT MÔ-ĐUN RIÊNG ─────────────────────────────────────────
 *
 * Google Maps API chỉ nạp được ĐÚNG MỘT LẦN mỗi trang; chèn thẻ script lần thứ
 * hai là nó ghi ra cảnh báo và có thể hỏng. Mà trang chủ có khối bản đồ, trang
 * /ban-do có bản đồ lớn, khu quản trị có công cụ chọn toạ độ — ba nơi, cùng một
 * lần nạp. Lời hứa (promise) giữ ở đây chính là chỗ bảo đảm điều đó.
 *
 * ── KHOÁ API LỘ RA NGOÀI LÀ BÌNH THƯỜNG, NHƯNG PHẢI GIỚI HẠN ────────────────
 *
 * Khoá Maps JavaScript API luôn nằm trong mã nguồn trang — không có cách nào
 * giấu, và Google cũng không thiết kế để giấu. Cái phải làm là **giới hạn theo
 * tên miền** (HTTP referrer) trong Google Cloud Console, để khoá bị chép đi cũng
 * không dùng được ở nơi khác. Khu quản trị nhắc đúng câu này ngay cạnh ô nhập.
 */

const TEN_CALLBACK = '__dtGoogleMapsSanSang';

let loiHua = null;
let khoaDaNap = null;
let hongXacThuc = false;
const nguoiNghe = new Set();

/** Google từ chối khoá (sai khoá, chưa bật thanh toán, sai giới hạn tên miền)? */
export const googleMapsHongXacThuc = () => hongXacThuc;

/**
 * Đăng ký nhận tin khi Google từ chối khoá.
 *
 * Cần một cơ chế riêng vì Google KHÔNG báo lỗi lúc nạp script — script tải về
 * bình thường, mãi tới khi dựng bản đồ đầu tiên nó mới gọi `window.gm_authFailure`
 * và bôi xám khung bản đồ. Không bắt lấy sự kiện này thì người dùng chỉ thấy một
 * ô xám câm, còn lỗi thật thì nằm trong console.
 */
export function ngheLoiXacThuc(fn) {
  nguoiNghe.add(fn);
  if (hongXacThuc) fn();
  return () => nguoiNghe.delete(fn);
}

/**
 * Nạp API và trả về `google.maps`.
 *
 * Ném lỗi khi chưa có khoá, thay vì trả về `null` lặng lẽ: nơi gọi phải quyết
 * định hiển thị gì, và bộ điều phối `DigitalMap` đã lọc trường hợp không có khoá
 * từ trước rồi.
 */
export function napGoogleMaps(khoa, { language = 'vi', region = 'VN' } = {}) {
  if (!khoa) return Promise.reject(new Error('Chưa cấu hình khoá Google Maps API.'));

  // Cài trước mọi nhánh thoát sớm bên dưới. Google gọi hàm này bất kể API được
  // nạp bằng cách nào, kể cả khi nó đã có sẵn trên trang từ trước — đặt nó bên
  // trong nhánh chèn script thì có đúng trường hợp đó là mất tín hiệu.
  window.gm_authFailure = () => {
    hongXacThuc = true;
    for (const fn of nguoiNghe) fn();
  };

  // Đã có sẵn trên `window`: dùng luôn, không chèn script nữa. Xảy ra khi trang
  // được nạp lại phần React mà không tải lại trình duyệt, và là chỗ để bài kiểm
  // thử cắm một bản giả vào mà không phải gọi ra mạng.
  if (window.google?.maps) return Promise.resolve(window.google.maps);

  if (loiHua) {
    if (khoaDaNap === khoa) return loiHua;
    // Quản trị viên vừa đổi khoá trong Cài đặt mà trang chưa tải lại. Không thể
    // nạp API lần hai với khoá khác, nên nói thẳng thay vì im lặng dùng khoá cũ.
    return Promise.reject(new Error('Khoá Google Maps vừa thay đổi. Hãy tải lại trang để áp dụng.'));
  }

  khoaDaNap = khoa;
  loiHua = new Promise((resolve, reject) => {
    window[TEN_CALLBACK] = () => resolve(window.google.maps);

    const params = new URLSearchParams({
      key: khoa,
      v: 'weekly',
      // `marker` cho AdvancedMarkerElement — ghim tự vẽ của dự án.
      libraries: 'marker',
      // Nhãn địa danh tiếng Việt và ưu tiên dữ liệu Việt Nam. Đây cũng là lý do
      // chính chọn Google thay OpenStreetMap: vùng Đông Triều trên OSM thiếu
      // nhiều tên đường và tên thôn.
      language,
      region,
      loading: 'async',
      callback: TEN_CALLBACK,
    });

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => reject(new Error('Không tải được Google Maps. Kiểm tra kết nối mạng.'));
    document.head.appendChild(script);
  });
  return loiHua;
}

/**
 * Lấy một thư viện con của API.
 *
 * `importLibrary` là cách hiện hành, nhưng bản API cũ hơn thì chưa có — lúc đó
 * đọc thẳng từ không gian tên toàn cục, vì `libraries=marker` trên URL đã bảo
 * đảm thư viện có mặt.
 */
export async function napThuVien(maps, ten) {
  if (typeof maps.importLibrary === 'function') return maps.importLibrary(ten);
  return ten === 'maps' ? maps : maps[ten];
}

/**
 * Đọc toạ độ ra `{ lat, lng }` số thuần.
 *
 * Google trả toạ độ ở hai dạng lẫn lộn tuỳ chỗ: `LatLng` (lat/lng là HÀM) và
 * `LatLngLiteral` (lat/lng là SỐ). Riêng sự kiện `dragend` của ghim thì bản này
 * đưa `event.latLng`, bản kia lại chỉ cập nhật `marker.position`. Gom một chỗ để
 * nơi gọi khỏi phải đoán.
 */
export function docToaDo(x) {
  if (!x) return null;
  const lat = typeof x.lat === 'function' ? x.lat() : x.lat;
  const lng = typeof x.lng === 'function' ? x.lng() : x.lng;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}
