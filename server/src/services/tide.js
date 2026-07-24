import { env } from '../lib/env.js';
import { fetchJson } from '../lib/http.js';
import { cached } from '../lib/cache.js';

const TTL = 60 * 60 * 1000; // 60 phút

/**
 * Dự báo triều cường (mực nước biển) qua Open-Meteo Marine API.
 *
 * Lưu ý: toạ độ trung tâm Đông Triều nằm sâu trong đất liền → ngoài lưới hải văn,
 * API trả về null. Ta lấy điểm lưới gần nhất có dữ liệu (cửa Nam Triệu – Bạch Đằng,
 * mặc định 20.70, 106.80) làm THAM CHIẾU cho vùng sông Kinh Thầy – Đá Bạc.
 */
export async function getTide(lat = env.tide.lat, lon = env.tide.lon) {
  const key = `tide:${lat}:${lon}`;
  return cached(key, TTL, async () => {
    const url =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
      `&hourly=sea_level_height_msl&timezone=Asia%2FBangkok&forecast_days=3`;

    const d = await fetchJson(url, { timeoutMs: 8000 });
    const times = d.hourly?.time ?? [];
    const heights = d.hourly?.sea_level_height_msl ?? [];

    const series = times
      .map((time, i) => ({ time, height: heights[i] }))
      .filter((p) => p.height !== null && p.height !== undefined);

    const extremes = findExtremes(series);

    return {
      location: {
        lat: d.latitude,
        lon: d.longitude,
        label: 'Cửa Nam Triệu – Bạch Đằng',
        note: 'Số liệu tham chiếu cho vùng sông Kinh Thầy – Đá Bạc (Đông Triều). Đơn vị: mét so với mực nước biển trung bình (MSL).',
      },
      series,
      extremes,
      hasData: series.length > 0,
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Tìm đỉnh triều (nước lớn) và chân triều (nước ròng) từ chuỗi mực nước theo giờ.
 * Một điểm là cực trị nếu cao/thấp hơn cả hai điểm kề.
 */
function findExtremes(series) {
  const out = [];
  for (let i = 1; i < series.length - 1; i++) {
    const prev = series[i - 1].height;
    const cur = series[i].height;
    const next = series[i + 1].height;
    if (cur > prev && cur >= next) out.push({ ...series[i], type: 'HIGH' }); // nước lớn
    else if (cur < prev && cur <= next) out.push({ ...series[i], type: 'LOW' }); // nước ròng
  }
  return out;
}
