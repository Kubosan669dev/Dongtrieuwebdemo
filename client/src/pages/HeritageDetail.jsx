import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { MapPin, Award, Landmark, Sparkles, CalendarDays, ScrollText, Building2, Route } from 'lucide-react';
import { fetchOne, fetchList } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import HeritageCover from '../components/HeritageCover.jsx';
import MapEmbed from '../components/MapEmbed.jsx';
import { HeritageCard } from '../components/cards.jsx';
import { Badge, Spinner, ErrorNote } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { HERITAGE_TYPES, RANK_LEVELS } from '../lib/constants.js';
import { cx } from '../lib/format.js';

const TABS = [
  { key: 'summary', label: 'Tổng quan', icon: Sparkles },
  { key: 'history', label: 'Lịch sử', icon: ScrollText },
  { key: 'architecture', label: 'Kiến trúc & hiện vật', icon: Building2 },
  { key: 'highlights', label: 'Điểm nhấn', icon: Award },
  { key: 'travel', label: 'Cách đến & kinh nghiệm', icon: Route },
];

export default function HeritageDetail() {
  const { slug } = useParams();
  const [tab, setTab] = useState('summary');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['heritage', slug],
    queryFn: () => fetchOne('heritages', slug),
  });

  const related = useQuery({
    queryKey: ['heritages', 'related', data?.item?.type],
    queryFn: () => fetchList('heritages', { type: data.item.type }),
    enabled: !!data?.item,
  });

  if (isLoading) return <Spinner className="min-h-[60vh]" />;
  if (isError) return <div className="container-page py-16"><ErrorNote onRetry={refetch} /></div>;

  const h = data.item;
  const rank = RANK_LEVELS[h.rankLevel];
  const type = HERITAGE_TYPES[h.type];
  const images = h.images ?? [];
  const relatedItems = (related.data?.items ?? []).filter((x) => x.slug !== h.slug).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: h.name,
    description: h.summary,
    address: { '@type': 'PostalAddress', addressLocality: 'Phường Đông Triều', addressRegion: 'Quảng Ninh', streetAddress: h.address },
    ...(h.lat && h.lng ? { geo: { '@type': 'GeoCoordinates', latitude: h.lat, longitude: h.lng } } : {}),
  };

  return (
    <div>
      <Seo title={h.name} description={h.summary} type="article" jsonLd={jsonLd} image={h.coverUrl} />
      <PageHero title={h.name} breadcrumb={[{ label: 'Di tích', to: '/di-tich' }, { label: h.name }]} />

      <div className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Nội dung chính */}
          <div className="lg:col-span-2">
            <div className="aspect-[16/9] overflow-hidden rounded-2xl shadow-soft">
              <HeritageCover
                src={h.coverUrl}
                name={h.name}
                type={h.type}
                rounded="rounded-2xl"
                illustrative={h.coverIsIllustrative}
              />
            </div>

            {/* Badge hàng đầu */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge tone={type?.color}>{type?.label}</Badge>
              <Badge tone={rank?.color}>{rank?.label}</Badge>
              {h.altNames?.map((n) => (
                <span key={n} className="text-sm text-jade-500">· {n}</span>
              ))}
            </div>

            {/* Tabs */}
            <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto border-b border-jade-900/5 dark:border-white/10">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cx(
                    'flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition',
                    tab === t.key
                      ? 'border-jade-600 text-jade-700 dark:text-jade-200'
                      : 'border-transparent text-jade-500 hover:text-jade-700',
                  )}
                >
                  <t.icon size={15} /> {t.label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {tab === 'summary' && <div className="prose-vn"><ReactMarkdown>{h.summary}</ReactMarkdown></div>}
              {tab === 'history' && <div className="prose-vn"><ReactMarkdown>{h.history}</ReactMarkdown></div>}
              {tab === 'architecture' && <div className="prose-vn"><ReactMarkdown>{h.architecture}</ReactMarkdown></div>}
              {tab === 'travel' && (
                <div className="prose-vn">
                  <ReactMarkdown>{h.travelTips || 'Thông tin đang được cập nhật.'}</ReactMarkdown>
                </div>
              )}
              {tab === 'highlights' && (
                <ul className="space-y-3">
                  {h.highlights?.map((x, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-soft ring-1 ring-jade-900/5 dark:bg-jade-900/40 dark:ring-white/5">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold-100 text-xs font-bold text-gold-700">{i + 1}</span>
                      <span className="text-jade-800 dark:text-jade-100">{x}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Thư viện ảnh */}
            {images.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 font-serif text-lg font-semibold">Hình ảnh</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {images.map((img) => (
                    <a key={img.id} href={img.url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-xl">
                      <img src={img.url} alt={img.caption || h.name} loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cột thông tin */}
          <aside className="space-y-5">
            <div className="card p-5">
              <h3 className="mb-4 font-serif text-lg font-semibold">Thông tin di tích</h3>
              <InfoRow icon={Award} label="Xếp hạng" value={h.rankLevelText || rank?.label} />
              {h.rankDecision && <InfoRow icon={ScrollText} label="Quyết định" value={h.rankDecision} />}
              {h.rankAuthority && <InfoRow icon={Landmark} label="Cơ quan" value={h.rankAuthority} />}
              <InfoRow icon={MapPin} label="Địa chỉ" value={h.address} />
              {h.wardOld && <InfoRow icon={MapPin} label="Đơn vị cũ" value={`Xã/phường ${h.wardOld}`} />}
              {h.festivalNote && <InfoRow icon={CalendarDays} label="Lễ hội" value={h.festivalNote} />}
            </div>

            {h.worship?.length > 0 && (
              <div className="card p-5">
                <h3 className="mb-3 font-serif text-lg font-semibold">Thờ phụng</h3>
                <ul className="space-y-2">
                  {h.worship.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-jade-700 dark:text-jade-200">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="mb-3 font-serif text-lg font-semibold">Vị trí</h3>
              <MapEmbed lat={h.lat} lng={h.lng} query={h.mapQuery || h.address} title={h.name} />
              {!h.lat && (
                <p className="mt-2 text-xs text-jade-400">
                  * Vị trí ước lượng theo địa chỉ. Toạ độ chính xác sẽ được cập nhật.
                </p>
              )}
            </div>
          </aside>
        </div>

        {/* Di tích liên quan */}
        {relatedItems.length > 0 && (
          <div className="mt-16">
            <h2 className="section-title mb-6">Di tích cùng loại</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedItems.map((r) => <HeritageCard key={r.id} item={r} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
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
