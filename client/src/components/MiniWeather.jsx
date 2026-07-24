import { Link } from 'react-router-dom';
import { Droplets, Wind } from 'lucide-react';
import { useWeather } from '../hooks/useForecast.js';
import { weatherInfo } from '../lib/constants.js';

/** Widget thời tiết gọn ở trang chủ. */
export default function MiniWeather() {
  const { data, isLoading } = useWeather();
  if (isLoading) return <div className="h-14 w-48 animate-pulse rounded-2xl bg-jade-100 dark:bg-jade-800/60" />;
  if (!data?.current) return null;

  const { current } = data;
  const info = weatherInfo(current.code);

  return (
    <Link to="/thoi-tiet" className="flex shrink-0 items-center gap-4 rounded-2xl bg-jade-600 px-5 py-3 text-white transition hover:bg-jade-700">
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
    </Link>
  );
}
