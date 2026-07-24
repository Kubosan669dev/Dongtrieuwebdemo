import { useState } from 'react';
import { Clock, CalendarRange, Waves, Droplets, Wind, Sun, Thermometer, AlertTriangle, ExternalLink, MapPin } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useWeather, useTide, useBulletins } from '../hooks/useForecast.js';
import PageHero from '../components/PageHero.jsx';
import { Spinner, ErrorNote, Badge } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { weatherInfo } from '../lib/constants.js';
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
  const bulletins = useBulletins();

  return (
    <div>
      <Seo title="Dự báo thời tiết & triều cường" description="Dự báo thời tiết theo giờ, 7 ngày tới và triều cường cho vùng Đông Triều, kèm bản tin cảnh báo của Trung tâm KTTV Quốc gia." />
      <PageHero
        title="Dự báo thời tiết & triều cường"
        description="Dữ liệu cập nhật theo thời gian thực từ Open-Meteo; bản tin cảnh báo từ Trung tâm Dự báo KTTV Quốc gia."
        breadcrumb={[{ label: 'Thời tiết' }]}
      />

      <div className="container-page py-10">
        {/* Thẻ hiện tại */}
        {weather.data?.current && <CurrentCard data={weather.data} />}

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

        {/* Bản tin cảnh báo */}
        <Bulletins query={bulletins} />
      </div>
    </div>
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

function Bulletins({ query }) {
  const { data, isLoading } = query;
  return (
    <div className="mt-12">
      <h2 className="mb-4 flex items-center gap-2 section-title">
        <AlertTriangle size={22} className="text-gold-500" /> Bản tin & cảnh báo thời tiết
      </h2>
      {isLoading ? (
        <Spinner />
      ) : !data?.items?.length ? (
        <div className="rounded-xl bg-jade-50 p-5 text-sm text-jade-600 dark:bg-jade-900/40 dark:text-jade-300">
          {data?.note || 'Hiện chưa có bản tin cảnh báo mới.'}
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((b, i) => (
            <a key={i} href={b.link} target="_blank" rel="noreferrer" className="card-hover block p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    {b.tag && <Badge tone="terra">{b.tag}</Badge>}
                    {b.pubDate && <span className="text-xs text-jade-400">{formatDate(b.pubDate, { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                  <p className="font-medium text-jade-900 dark:text-jade-50">{b.title}</p>
                  {b.description && <p className="mt-1 line-clamp-2 text-sm text-jade-500">{b.description}</p>}
                </div>
                <ExternalLink size={16} className="mt-1 shrink-0 text-jade-400" />
              </div>
            </a>
          ))}
          <p className="text-xs text-jade-400">Nguồn: {data.source} · nchmf.gov.vn</p>
        </div>
      )}
    </div>
  );
}
