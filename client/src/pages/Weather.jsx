import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock, CalendarRange, Waves, Droplets, Wind, Sun, Thermometer, MapPin, Lightbulb, ChevronRight } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useWeather, useTide } from '../hooks/useForecast.js';
import { fetchList } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import HeritageCover from '../components/HeritageCover.jsx';
import { Spinner, ErrorNote, Badge } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { weatherInfo } from '../lib/constants.js';
import { getWeatherAdvice } from '../../../shared/weather.js';
import { formatHour, formatDate, formatTime, cx } from '../lib/format.js';

const TABS = [
  { key: 'hourly', label: 'Theo giờ', icon: Clock },
  { key: 'daily', label: '7 ngày tới', icon: CalendarRange },
  { key: 'tide', label: 'Triều cường', icon: Waves },
];

const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export default function Weather() {
  const [tab, setTab] = useState('hourly');
  const weather = useWeather();
  const tide = useTide();
  const heritages = useQuery({ queryKey: ['heritages', 'advice'], queryFn: () => fetchList('heritages') });

  const advice = getWeatherAdvice(weather.data, heritages.data?.items);

  return (
    <div>
      <Seo title="Dự báo thời tiết & triều cường" description="Dự báo thời tiết theo giờ, 7 ngày tới và triều cường cho vùng Đông Triều, kèm gợi ý điểm tham quan phù hợp với thời tiết." />
      <PageHero
        title="Dự báo thời tiết & triều cường"
        description="Dữ liệu cập nhật theo thời gian thực từ Open-Meteo, kèm gợi ý điểm tham quan phù hợp với thời tiết hôm nay."
        breadcrumb={[{ label: 'Thời tiết' }]}
      />

      <div className="container-page py-10">
        {/* Thẻ hiện tại */}
        {weather.data?.current && <CurrentCard data={weather.data} />}

        {/* Gợi ý tham quan theo thời tiết */}
        {advice && <AdviceCard advice={advice} />}

        {/* Tabs */}
        <div className="no-scrollbar mt-8 flex gap-2 overflow-x-auto border-b border-jade-900/5 dark:border-white/10">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cx(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition',
                tab === t.key ? 'border-jade-600 text-jade-700 dark:text-jade-200' : 'border-transparent text-jade-500 hover:text-jade-700',
              )}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'hourly' && (weather.isLoading ? <Spinner /> : weather.isError ? <ErrorNote onRetry={weather.refetch} /> : <HourlyTab data={weather.data} />)}
          {tab === 'daily' && (weather.isLoading ? <Spinner /> : weather.isError ? <ErrorNote onRetry={weather.refetch} /> : <DailyTab data={weather.data} />)}
          {tab === 'tide' && (tide.isLoading ? <Spinner /> : tide.isError ? <ErrorNote onRetry={tide.refetch} /> : <TideTab data={tide.data} />)}
        </div>
      </div>
    </div>
  );
}

// Tông màu theo tình hình thời tiết
const ADVICE_TONES = {
  good: { ring: 'ring-jade-200 dark:ring-jade-700', bg: 'bg-jade-50 dark:bg-jade-900/40', icon: 'text-jade-600' },
  hot: { ring: 'ring-gold-200 dark:ring-gold-800/40', bg: 'bg-gold-50 dark:bg-gold-900/20', icon: 'text-gold-600' },
  rain: { ring: 'ring-sky-200 dark:ring-sky-800/40', bg: 'bg-sky-50 dark:bg-sky-900/20', icon: 'text-sky-600' },
  cold: { ring: 'ring-indigo-200 dark:ring-indigo-800/40', bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: 'text-indigo-600' },
  warn: { ring: 'ring-red-200 dark:ring-red-800/40', bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600' },
};

function AdviceCard({ advice }) {
  const tone = ADVICE_TONES[advice.tone] ?? ADVICE_TONES.good;
  return (
    <section className={cx('mt-6 rounded-3xl p-6 ring-1 sm:p-7', tone.bg, tone.ring)}>
      <div className="flex items-start gap-3">
        <span className={cx('mt-0.5 shrink-0', tone.icon)}><Lightbulb size={24} /></span>
        <div>
          <h2 className="font-serif text-xl font-semibold text-jade-900 dark:text-jade-50">{advice.title}</h2>
          <p className="mt-1.5 text-jade-700 dark:text-jade-200">{advice.message}</p>
        </div>
      </div>

      {advice.picks.length > 0 && (
        <>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-jade-500">Gợi ý hôm nay</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {advice.picks.map((h) => (
              <Link
                key={h.slug}
                to={`/di-tich/${h.slug}`}
                className="group flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-jade-900/5 transition hover:-translate-y-0.5 hover:shadow-lift dark:bg-jade-900/60 dark:ring-white/5"
              >
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                  <HeritageCover
                    src={h.coverUrl}
                    name={h.name}
                    type={h.type}
                    rounded="rounded-xl"
                    illustrative={h.coverIsIllustrative}
                    showBadge={false}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-jade-900 group-hover:text-jade-600 dark:text-jade-50">
                    {h.name}
                  </span>
                  <span className="block truncate text-xs text-jade-500">{h.address}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-jade-400" />
              </Link>
            ))}
          </div>
        </>
      )}

      {advice.tips.length > 0 && (
        <ul className="mt-5 space-y-1.5">
          {advice.tips.map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-jade-700 dark:text-jade-200">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
              {t}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CurrentCard({ data }) {
  const { current, location } = data;
  const info = weatherInfo(current.code);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-jade-600 to-jade-800 p-8 text-white">
      <div className="pattern-bg absolute inset-0 opacity-20" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <span className="text-6xl leading-none">{info.icon}</span>
          <div>
            <p className="flex items-center gap-1.5 text-sm text-jade-100/80"><MapPin size={14} /> {location?.label || 'Đông Triều'}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-serif text-5xl font-bold">{Math.round(current.temp)}°C</span>
              <span className="text-jade-100/90">{info.label}</span>
            </div>
            <p className="mt-1 text-sm text-jade-100/70">Cảm giác như {Math.round(current.feels)}°C</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <Metric icon={Droplets} label="Độ ẩm" value={`${current.humidity}%`} />
          <Metric icon={Wind} label="Gió" value={`${Math.round(current.wind)} km/h`} />
          <Metric icon={Thermometer} label="Lượng mưa" value={`${current.precipitation ?? 0} mm`} />
        </div>
      </div>
      <p className="relative mt-4 text-xs text-jade-100/60">Cập nhật lúc {formatTime(data.updatedAt)} · Nguồn: Open-Meteo</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="text-center">
      <Icon size={20} className="mx-auto mb-1 text-gold-300" />
      <p className="font-serif text-lg font-bold">{value}</p>
      <p className="text-xs text-jade-100/70">{label}</p>
    </div>
  );
}

function HourlyTab({ data }) {
  const chartData = data.hourly.map((h) => ({ hour: formatHour(h.time), temp: Math.round(h.temp), rain: h.rainProb }));
  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="mb-4 font-serif text-lg font-semibold">Nhiệt độ 24 giờ tới</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0e7c5e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0e7c5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,124,94,0.1)" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} interval={2} />
              <YAxis tick={{ fontSize: 12 }} unit="°" width={48} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip formatter={(v, n) => (n === 'temp' ? [`${v}°C`, 'Nhiệt độ'] : [`${v}%`, 'Khả năng mưa'])} />
              <Area type="monotone" dataKey="temp" stroke="#0e7c5e" strokeWidth={2.5} fill="url(#tempGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {data.hourly.map((h, i) => {
          const info = weatherInfo(h.code);
          return (
            <div key={i} className="card flex min-w-[92px] shrink-0 flex-col items-center gap-1 p-4 text-center">
              <span className="text-sm font-medium text-jade-500">{formatHour(h.time)}</span>
              <span className="text-2xl">{info.icon}</span>
              <span className="font-serif text-lg font-bold text-jade-900 dark:text-jade-50">{Math.round(h.temp)}°</span>
              <span className="flex items-center gap-0.5 text-[11px] text-jade-400"><Droplets size={10} /> {h.rainProb}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyTab({ data }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.daily.map((d, i) => {
        const info = weatherInfo(d.code);
        const dow = WEEKDAYS[new Date(d.date).getDay()];
        return (
          <div key={i} className={cx('card flex items-center gap-4 p-5', i === 0 && 'ring-2 ring-jade-400')}>
            <span className="text-4xl">{info.icon}</span>
            <div className="flex-1">
              <p className="font-serif font-semibold text-jade-900 dark:text-jade-50">
                {i === 0 ? 'Hôm nay' : dow}
              </p>
              <p className="text-xs text-jade-400">{formatDate(d.date)}</p>
              <p className="mt-0.5 text-sm text-jade-500">{info.label}</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-lg font-bold text-jade-900 dark:text-jade-50">{Math.round(d.tempMax)}°</p>
              <p className="text-sm text-jade-400">{Math.round(d.tempMin)}°</p>
            </div>
            <div className="hidden flex-col gap-1 border-l border-jade-900/5 pl-4 text-xs text-jade-500 sm:flex dark:border-white/5">
              <span className="flex items-center gap-1"><Droplets size={11} /> {d.rainProb ?? 0}%</span>
              <span className="flex items-center gap-1"><Sun size={11} /> UV {Math.round(d.uvMax ?? 0)}</span>
              <span className="flex items-center gap-1"><Wind size={11} /> {Math.round(d.windMax ?? 0)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TideTab({ data }) {
  if (!data.hasData) {
    return <ErrorNote message="Hiện chưa lấy được dữ liệu triều cường. Vui lòng thử lại sau." />;
  }
  const chartData = data.series.map((p) => ({
    label: `${p.time.slice(8, 10)}/${p.time.slice(5, 7)} ${p.time.slice(11, 13)}h`,
    height: Number(p.height.toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gold-50 p-4 text-sm text-gold-800 ring-1 ring-gold-200 dark:bg-gold-900/20 dark:text-gold-200 dark:ring-gold-800/40">
        <p className="flex items-start gap-2">
          <Waves size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>{data.location?.label}</strong> — {data.location?.note}
          </span>
        </p>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 font-serif text-lg font-semibold">Mực nước triều 3 ngày tới</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,124,94,0.1)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={5} />
              <YAxis tick={{ fontSize: 12 }} unit="m" width={45} />
              <Tooltip formatter={(v) => [`${v} m`, 'Mực nước']} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="height" stroke="#0e7c5e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-4 font-serif text-lg font-semibold">Giờ nước lớn / nước ròng</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.extremes.slice(0, 12).map((e, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-jade-50 px-4 py-3 dark:bg-jade-900/40">
              <span className="flex items-center gap-2 text-sm">
                <Badge tone={e.type === 'HIGH' ? 'terra' : 'jade'}>{e.type === 'HIGH' ? 'Nước lớn' : 'Nước ròng'}</Badge>
                {formatDate(e.time, { weekday: 'short' })} · {e.time.slice(11, 16)}
              </span>
              <span className="font-serif font-bold text-jade-800 dark:text-jade-100">{e.height.toFixed(2)} m</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-jade-400">
          💡 Con rươi vùng sông Kinh Thầy – Đá Bạc thường nổi theo con nước lớn cuối thu (tháng 9–11 âm lịch).
        </p>
      </div>
    </div>
  );
}
