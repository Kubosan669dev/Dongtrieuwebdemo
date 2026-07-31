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
  publicSiteUrl: process.env.PUBLIC_SITE_URL || 'http://localhost:4000',

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-doi-truoc-khi-len-production',
  /// Token chỉ nằm trong bộ nhớ trình duyệt và mất khi tải lại trang, nên hạn này
  /// chỉ là chặn trên cho một buổi làm việc liên tục — không cần dài như trước.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

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
