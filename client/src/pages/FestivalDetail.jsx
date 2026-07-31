import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { CalendarDays, MapPin, Sparkles, Landmark } from 'lucide-react';
import { fetchOne } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import { Badge, Spinner, ErrorNote } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import Gallery from '../components/Gallery.jsx';
import Reviews from '../components/Reviews.jsx';
import { FESTIVAL_SCALES, LUNAR_MONTH_LABELS } from '../lib/constants.js';

export default function FestivalDetail() {
  const { slug } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['festival', slug],
    queryFn: () => fetchOne('festivals', slug),
  });

  if (isLoading) return <Spinner className="min-h-[60vh]" />;
  if (isError) return <div className="container-page py-16"><ErrorNote onRetry={refetch} /></div>;

  const f = data.item;
  const scale = FESTIVAL_SCALES[f.scale];

  return (
    <div>
      <Seo title={f.name} description={f.intro} type="article" />
      <PageHero
        title={f.name}
        image={f.coverUrl}
        illustrative={f.coverIsIllustrative}
        breadcrumb={[{ label: 'Lễ hội', to: '/le-hoi' }, { label: f.name }]}
      />

      <div className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={scale?.color}>{scale?.label}</Badge>
              {f.lunarMonth && <Badge tone="jade">{LUNAR_MONTH_LABELS[f.lunarMonth]} (âm lịch)</Badge>}
            </div>
            <p className="mt-6 text-lg leading-relaxed text-jade-800 dark:text-jade-100">{f.intro}</p>

            {f.rituals?.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-semibold">
                  <Sparkles size={20} className="text-gold-500" /> Nghi lễ & hoạt động
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {f.rituals.map((r, i) => (
                    <div key={i} className="card-sm flex items-start gap-3 p-4">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-jade-100 text-xs font-bold text-jade-700 dark:bg-jade-800">{i + 1}</span>
                      <span className="text-jade-800 dark:text-jade-100">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Gallery images={f.images} name={f.name} />

            <Reviews targetType="FESTIVAL" targetId={f.id} className="mt-10" />
          </div>

          <aside className="space-y-5">
            <div className="card p-5">
              <h3 className="mb-4 font-serif text-lg font-semibold">Thông tin lễ hội</h3>
              <Row icon={CalendarDays} label="Thời gian (âm lịch)" value={f.lunarTimeText} />
              {f.solarEstimate && <Row icon={CalendarDays} label="Dương lịch (ước tính)" value={f.solarEstimate} />}
              <Row icon={MapPin} label="Địa điểm" value={f.location} />
            </div>

            {f.heritage && (
              <Link to={`/di-tich/${f.heritage.slug}`} className="card-hover block p-5">
                <p className="mb-1 flex items-center gap-1.5 text-xs text-jade-400"><Landmark size={13} /> Di tích liên quan</p>
                <p className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">{f.heritage.name}</p>
                <p className="mt-1 text-sm text-jade-600">Xem chi tiết di tích →</p>
              </Link>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 border-b border-jade-900/5 py-2.5 last:border-0 dark:border-white/5">
      <Icon size={16} className="mt-0.5 shrink-0 text-jade-400" />
      <div>
        <p className="text-xs text-jade-400">{label}</p>
        <p className="text-sm text-jade-800 dark:text-jade-100">{value}</p>
      </div>
    </div>
  );
}
