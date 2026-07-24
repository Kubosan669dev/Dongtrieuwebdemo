// Nhãn tiếng Việt & màu sắc cho các enum của backend.

export const HERITAGE_TYPES = {
  CHUA: { label: 'Chùa', color: 'jade' },
  DEN: { label: 'Đền', color: 'terra' },
  DINH: { label: 'Đình', color: 'gold' },
  MIEU: { label: 'Miếu', color: 'violet' },
  CUM_DI_TICH: { label: 'Cụm di tích', color: 'jade' },
  LICH_SU_CACH_MANG: { label: 'Di tích cách mạng', color: 'red' },
};

export const RANK_LEVELS = {
  QUOC_GIA_DAC_BIET: { label: 'Di tích Quốc gia đặc biệt', short: 'QG đặc biệt', color: 'gold' },
  QUOC_GIA: { label: 'Di tích Quốc gia', short: 'Quốc gia', color: 'terra' },
  CAP_TINH: { label: 'Di tích cấp tỉnh', short: 'Cấp tỉnh', color: 'jade' },
};

export const FESTIVAL_SCALES = {
  LON: { label: 'Lễ hội lớn', color: 'gold' },
  VUA: { label: 'Quy mô vừa', color: 'terra' },
  HOI_LANG: { label: 'Hội làng', color: 'jade' },
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

export const ARTICLE_CATEGORIES = {
  TIN_TUC: { label: 'Tin tức', color: 'jade' },
  CAM_NANG: { label: 'Cẩm nang', color: 'gold' },
  PHONG_SU: { label: 'Phóng sự', color: 'terra' },
  THONG_BAO: { label: 'Thông báo', color: 'red' },
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

// Mã thời tiết WMO → nhãn tiếng Việt + biểu tượng
export const WEATHER_CODES = {
  0: { label: 'Trời quang', icon: '☀️' },
  1: { label: 'Ít mây', icon: '🌤️' },
  2: { label: 'Có mây', icon: '⛅' },
  3: { label: 'Nhiều mây', icon: '☁️' },
  45: { label: 'Sương mù', icon: '🌫️' },
  48: { label: 'Sương muối', icon: '🌫️' },
  51: { label: 'Mưa phùn nhẹ', icon: '🌦️' },
  53: { label: 'Mưa phùn', icon: '🌦️' },
  55: { label: 'Mưa phùn dày', icon: '🌧️' },
  61: { label: 'Mưa nhẹ', icon: '🌧️' },
  63: { label: 'Mưa', icon: '🌧️' },
  65: { label: 'Mưa to', icon: '🌧️' },
  66: { label: 'Mưa lạnh', icon: '🌧️' },
  67: { label: 'Mưa lạnh nặng hạt', icon: '🌧️' },
  71: { label: 'Tuyết nhẹ', icon: '🌨️' },
  80: { label: 'Mưa rào nhẹ', icon: '🌦️' },
  81: { label: 'Mưa rào', icon: '🌧️' },
  82: { label: 'Mưa rào mạnh', icon: '⛈️' },
  95: { label: 'Dông', icon: '⛈️' },
  96: { label: 'Dông kèm mưa đá', icon: '⛈️' },
  99: { label: 'Dông mạnh, mưa đá', icon: '⛈️' },
};

export const weatherInfo = (code) => WEATHER_CODES[code] ?? { label: 'Không rõ', icon: '🌡️' };
