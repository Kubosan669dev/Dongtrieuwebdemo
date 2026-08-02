import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { fetchList } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import { Badge, Spinner, ErrorNote } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { FESTIVAL_SCALES, LUNAR_MONTH_LABELS } from '../lib/constants.js';

export default function Festivals() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['festivals'],
    queryFn: () => fetchList('festivals'),
  });

  if (isLoading) return <Spinner className="min-h-[60vh]" />;
  if (isError) return <div className="container-page py-16"><ErrorNote onRetry={refetch} /></div>;

  // Nhóm theo tháng âm lịch
  const byMonth = {};
  for (const f of data.items) {
    const m = f.lunarMonth ?? 0;
    (byMonth[m] ??= []).push(f);
  }
  const months = Object.keys(byMonth).map(Number).sort((a, b) => a - b);

  return (
    <div>
      <Seo title="Lễ hội truyền thống" description="Lịch 17 lễ hội của Đông Triều theo tháng âm lịch: Thái Miếu nhà Trần, Xuân Ngọa Vân, hội làng Vẻn, đền An Sinh…" />
      <PageHero
        title="Lễ hội truyền thống"
        description="Đông Triều rộn ràng lễ hội quanh năm, cao điểm là mùa xuân tháng Giêng và mùa thu tháng Tám âm lịch."
        breadcrumb={[{ label: 'Lễ hội' }]}
      />

      <div className="container-page py-10">
        <div className="space-y-12">
          {months.map((m) => (
            <div key={m}>
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-md bg-jade-600 font-serif text-lg font-bold text-white">
                  {m || '?'}
                </span>
                <h2 className="font-serif text-2xl font-semibold text-jade-900 dark:text-jade-50">
                  {LUNAR_MONTH_LABELS[m] || 'Chưa rõ tháng'} <span className="text-base font-normal text-subtle">(âm lịch)</span>
                </h2>
              </div>
              <div className="ml-5 space-y-4 border-l-2 border-jade-100 pl-6 dark:border-jade-800">
                {byMonth[m].map((f) => {
                  const scale = FESTIVAL_SCALES[f.scale];
                  return (
                    <Link
                      key={f.id}
                      to={`/le-hoi/${f.slug}`}
                      className="card-hover relative block p-5"
                    >
                      <span className="absolute -left-[1.95rem] top-6 h-3 w-3 rounded-full bg-gold-400 ring-4 ring-paper dark:ring-jade-950" />
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">{f.name}</h3>
                        <Badge tone={scale?.color}>{scale?.label}</Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-jade-600">
                        <CalendarDays size={14} /> {f.lunarTimeText}
                        {f.solarEstimate && <span className="text-subtle">· {f.solarEstimate}</span>}
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                        <MapPin size={14} className="shrink-0" /> {f.location}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
