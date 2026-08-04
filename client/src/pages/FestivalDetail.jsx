import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { CalendarDays, MapPin, Sparkles, Landmark, Images, ScrollText } from 'lucide-react';
import { fetchOne } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import Tabs from '../components/Tabs.jsx';
import { Badge, Spinner, ErrorNote } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import Gallery, { galleryItems } from '../components/Gallery.jsx';
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
  const cover = f.coverUrl ? { url: f.coverUrl, illustrative: f.coverIsIllustrative } : null;
  const photos = galleryItems(cover, f.images);

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
              {f.lunarMonth && <Badge tone="line-jade">{LUNAR_MONTH_LABELS[f.lunarMonth]} (âm lịch)</Badge>}
            </div>
            <Tabs
              className="mt-6"
              label={`Nội dung về ${f.name}`}
              items={[
                {
                  key: 'intro',
                  label: 'Tổng quan',
                  icon: ScrollText,
                  content: <p className="text-lg leading-relaxed text-body">{f.intro}</p>,
                },
                f.rituals?.length > 0 && {
                  key: 'rituals',
                  label: 'Nghi lễ & hoạt động',
                  icon: Sparkles,
                  content: (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {f.rituals.map((r, i) => (
                        <div key={i} className="card-sm flex items-start gap-3 p-4">
                          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-jade-100 text-xs font-bold text-jade-700 dark:bg-jade-800">{i + 1}</span>
                          <span className="text-body">{r}</span>
                        </div>
                      ))}
                    </div>
                  ),
                },
                photos.length > 0 && {
                  key: 'photos',
                  label: `Hình ảnh (${photos.length})`,
                  icon: Images,
                  content: <Gallery images={f.images} cover={cover} name={f.name} title={null} className="mt-0" />,
                },
              ]}
            />

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
                <p className="mb-1 flex items-center gap-1.5 text-xs text-subtle"><Landmark size={13} /> Di tích liên quan</p>
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
      <Icon size={16} className="mt-0.5 shrink-0 text-subtle" />
      <div>
        <p className="text-xs text-subtle">{label}</p>
        <p className="text-sm text-body">{value}</p>
      </div>
    </div>
  );
}
