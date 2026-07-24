import { env } from '../lib/env.js';
import { fetchJson } from '../lib/http.js';
import { cached } from '../lib/cache.js';

const TTL = 15 * 60 * 1000; // 15 phút

/**
 * Dự báo thời tiết cho phường Đông Triều qua Open-Meteo (miễn phí, không cần key).
 * Trả về: hiện tại + 24 giờ tới + 7 ngày.
 */
export async function getWeather(lat = env.weather.lat, lon = env.weather.lon) {
  const key = `weather:${lat}:${lon}`;
  return cached(key, TTL, async () => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,apparent_temperature` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset` +
      `&timezone=Asia%2FBangkok&forecast_days=7`;

    const d = await fetchJson(url, { timeoutMs: 8000 });

    // Cắt 24 giờ tới bắt đầu từ giờ hiện tại
    const now = d.current?.time;
    const times = d.hourly?.time ?? [];
    let startIdx = times.findIndex((t) => t >= now);
    if (startIdx < 0) startIdx = 0;
    const slice = (arr) => (arr ?? []).slice(startIdx, startIdx + 24);

    const hourly = slice(times).map((time, i) => ({
      time,
      temp: d.hourly.temperature_2m[startIdx + i],
      feels: d.hourly.apparent_temperature?.[startIdx + i],
      humidity: d.hourly.relative_humidity_2m[startIdx + i],
      rainProb: d.hourly.precipitation_probability[startIdx + i],
      wind: d.hourly.wind_speed_10m[startIdx + i],
      code: d.hourly.weather_code[startIdx + i],
    }));

    const daily = (d.daily?.time ?? []).map((date, i) => ({
      date,
      code: d.daily.weather_code[i],
      tempMax: d.daily.temperature_2m_max[i],
      tempMin: d.daily.temperature_2m_min[i],
      rainSum: d.daily.precipitation_sum[i],
      rainProb: d.daily.precipitation_probability_max[i],
      windMax: d.daily.wind_speed_10m_max[i],
      uvMax: d.daily.uv_index_max[i],
      sunrise: d.daily.sunrise[i],
      sunset: d.daily.sunset[i],
    }));

    return {
      location: { lat: d.latitude, lon: d.longitude, label: 'Trung tâm phường Đông Triều' },
      current: {
        time: d.current.time,
        temp: d.current.temperature_2m,
        feels: d.current.apparent_temperature,
        humidity: d.current.relative_humidity_2m,
        wind: d.current.wind_speed_10m,
        precipitation: d.current.precipitation,
        code: d.current.weather_code,
      },
      hourly,
      daily,
      updatedAt: new Date().toISOString(),
    };
  });
}
