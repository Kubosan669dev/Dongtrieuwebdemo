import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env nằm ở gốc thư mục server
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 4000),
  /**
   * URL công khai, dùng cho sitemap và thẻ Open Graph.
   *
   * `RENDER_EXTERNAL_URL` là biến Render tự bơm vào, mang đúng địa chỉ dịch vụ
   * đang chạy. Nhận nó làm phương án hai để người triển khai không phải tự điền
   * — quên điền là thẻ chia sẻ và sitemap trỏ về `localhost:4000`, tức là dán
   * link lên Zalo/Facebook thì mất ảnh xem trước, còn Google lập chỉ mục vào một
   * địa chỉ không tồn tại. Đó là loại lỗi không ai thấy cho tới lúc đã muộn.
   */
  publicSiteUrl: process.env.PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:4000',

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-doi-truoc-khi-len-production',
  /// Token chỉ nằm trong bộ nhớ trình duyệt và mất khi tải lại trang, nên hạn này
  /// chỉ là chặn trên cho một buổi làm việc liên tục — không cần dài như trước.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  /// Rỗng = không bật CORS. Giao diện và API dùng chung một cổng nên bình thường
  /// không cần; chỉ khai khi tách API sang tên miền khác. Xem `src/index.js`.
  corsOrigin: process.env.CORS_ORIGIN || '',

  weather: {
    lat: num(process.env.WEATHER_LAT, 21.0433),
    lon: num(process.env.WEATHER_LON, 106.5544),
  },
  tide: {
    lat: num(process.env.TIDE_LAT, 20.7),
    lon: num(process.env.TIDE_LON, 106.8),
  },
  // Tuỳ chọn: có key thì script tải ảnh dùng Pexels, không có thì dùng Wikimedia Commons
  pexelsApiKey: process.env.PEXELS_API_KEY || '',

  uploadMaxBytes: num(process.env.UPLOAD_MAX_MB, 8) * 1024 * 1024,
};

if (env.isProd && env.jwtSecret.startsWith('dev-secret')) {
  console.warn('⚠ CẢNH BÁO: JWT_SECRET vẫn là giá trị mặc định. Hãy đặt JWT_SECRET thật trong .env!');
}
