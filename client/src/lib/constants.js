// Nhãn tiếng Việt & màu sắc cho các enum của backend.
//
// `color` là tên tone trong `TONES` của components/ui.jsx. Ở đó nhãn có hai dáng
// chứ không phải sáu màu:
//
//   `gold` / `jade`  — nền đặc, chỉ dành cho bậc CAO của thang có thứ tự
//   `line-*`         — viền, dành cho nhãn PHÂN LOẠI và bậc thấp nhất
//
// Nhờ vậy nhìn một danh sách di tích là biết ngay cái nào xếp hạng cao hơn, thay
// vì phải đọc chữ trong từng nhãn như bản trước (ba mảng màu nhạt khác sắc, mà
// khác sắc thì không nói được cái nào hơn cái nào).

export const HERITAGE_TYPES = {
  CHUA: { label: 'Chùa', color: 'line-jade' },
  DEN: { label: 'Đền', color: 'line-terra' },
  DINH: { label: 'Đình', color: 'line-gold' },
  MIEU: { label: 'Miếu', color: 'line' },
  CUM_DI_TICH: { label: 'Cụm di tích', color: 'line-jade' },
  LICH_SU_CACH_MANG: { label: 'Di tích cách mạng', color: 'line-terra' },
};

// Thang có THỨ TỰ — độ đậm của nhãn giảm dần đúng theo cấp xếp hạng.
export const RANK_LEVELS = {
  QUOC_GIA_DAC_BIET: { label: 'Di tích Quốc gia đặc biệt', short: 'QG đặc biệt', color: 'gold' },
  QUOC_GIA: { label: 'Di tích Quốc gia', short: 'Quốc gia', color: 'jade' },
  CAP_TINH: { label: 'Di tích cấp tỉnh', short: 'Cấp tỉnh', color: 'line' },
};

// Cũng là thang có thứ tự, dùng đúng ba bậc như trên.
export const FESTIVAL_SCALES = {
  LON: { label: 'Lễ hội lớn', color: 'gold' },
  VUA: { label: 'Quy mô vừa', color: 'jade' },
  HOI_LANG: { label: 'Hội làng', color: 'line' },
};

export const LODGING_TYPES = {
  KHACH_SAN: { label: 'Khách sạn' },
  NHA_NGHI: { label: 'Nhà nghỉ' },
  HOMESTAY: { label: 'Homestay' },
};

export const RESTAURANT_TYPES = {
  NHA_HANG: { label: 'Nhà hàng' },
  QUAN_AN: { label: 'Quán ăn' },
  CAFE: { label: 'Cà phê' },
  DIEM_DUNG_CHAN: { label: 'Điểm dừng chân' },
};

// Phân loại chứ không phải thứ tự, nên toàn nhãn viền — trừ Thông báo. Thông báo
// của phường thì đúng là cần đọc trước những bài còn lại, và đó là thông tin thật
// chứ không phải trang trí, nên nó được nhận nhãn nền đặc.
export const ARTICLE_CATEGORIES = {
  TIN_TUC: { label: 'Tin tức', color: 'line-jade' },
  CAM_NANG: { label: 'Cẩm nang', color: 'line-gold' },
  PHONG_SU: { label: 'Phóng sự', color: 'line-terra' },
  THONG_BAO: { label: 'Thông báo', color: 'gold' },
};

export const LUNAR_MONTH_LABELS = {
  1: 'Tháng Giêng',
  2: 'Tháng Hai',
  3: 'Tháng Ba',
  4: 'Tháng Tư',
  5: 'Tháng Năm',
  6: 'Tháng Sáu',
  7: 'Tháng Bảy',
  8: 'Tháng Tám',
  9: 'Tháng Chín',
  10: 'Tháng Mười',
  11: 'Tháng Một (11)',
  12: 'Tháng Chạp',
};

// Mã thời tiết WMO → nhãn tiếng Việt + biểu tượng.
// Định nghĩa thật nằm ở shared/weather.js để chatbot phía server dùng chung.
export { WEATHER_CODES, weatherInfo } from '../../../shared/weather.js';
