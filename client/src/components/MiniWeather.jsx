import { Link } from 'react-router-dom';
import { Droplets, Wind, Lightbulb } from 'lucide-react';
import { useWeather } from '../hooks/useForecast.js';
import { weatherInfo } from '../lib/constants.js';
import { getShortAdvice } from '../../../shared/weather.js';

/**
 * Widget thời tiết gọn, là ô thứ tư của khối tra cứu nhanh trên trang chủ.
 *
 * Lấp đầy ô lưới chứ không tự đặt bề rộng: bản trước nằm trong một hàng ngang nên
 * để `shrink-0` và khung chờ rộng cố định, bê nguyên vào lưới bốn cột là ô này
 * lệch hẳn so với ba ô còn lại.
 */
export default function MiniWeather() {
  const { data, isLoading } = useWeather();
  if (isLoading) return <div className="min-h-[4.5rem] w-full animate-pulse rounded-md bg-jade-100 dark:bg-jade-800/60" />;
  if (!data?.current) return null;

  const { current } = data;
  const info = weatherInfo(current.code);
  const advice = getShortAdvice(data);

  return (
    <Link
      to="/thoi-tiet"
      className="flex flex-col justify-center gap-2 rounded-md bg-jade-600 px-4 py-3 text-white transition hover:bg-jade-700"
    >
      <div className="flex items-center gap-4">
        <span className="text-3xl leading-none">{info.icon}</span>
        <div className="leading-tight">
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-2xl font-bold">{Math.round(current.temp)}°</span>
            <span className="text-xs text-jade-100/80">{info.label}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-jade-100/80">
            <span className="flex items-center gap-1"><Droplets size={11} /> {current.humidity}%</span>
            <span className="flex items-center gap-1"><Wind size={11} /> {Math.round(current.wind)} km/h</span>
          </div>
        </div>
      </div>
      {advice && (
        <p className="flex items-center gap-1.5 border-t border-white/15 pt-2 text-[11px] text-gold-200">
          <Lightbulb size={12} className="shrink-0" /> {advice}
        </p>
      )}
    </Link>
  );
}
