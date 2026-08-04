import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { MapPin, Award, Landmark, Sparkles, CalendarDays, ScrollText, Building2, Route, Images } from 'lucide-react';
import { fetchOne, fetchList } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import HeritageCover from '../components/HeritageCover.jsx';
import MapEmbed from '../components/MapEmbed.jsx';
import Tabs from '../components/Tabs.jsx';
import { HeritageCard } from '../components/cards.jsx';
import { Badge, Spinner, ErrorNote } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import Gallery, { galleryItems } from '../components/Gallery.jsx';
import Reviews from '../components/Reviews.jsx';
import { HERITAGE_TYPES, RANK_LEVELS } from '../lib/constants.js';

export default function HeritageDetail() {
  const { slug } = useParams();

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
  const cover = h.coverUrl ? { url: h.coverUrl, illustrative: h.coverIsIllustrative } : null;
  const photos = galleryItems(cover, h.images);
  const relatedItems = (related.data?.items ?? []).filter((x) => x.slug !== h.slug).slice(0, 3);

  // Không bọc `useMemo` được vì đoạn này nằm sau các nhánh `return` ở trên —
  // hook phải chạy vô điều kiện. `Seo` so sánh JSON-LD theo nội dung chứ không
  // theo định danh object, nên dựng lại mỗi lần render ở đây không sao.
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
      <PageHero
        title={h.name}
        image={h.coverUrl}
        illustrative={h.coverIsIllustrative}
        breadcrumb={[{ label: 'Di tích', to: '/di-tich' }, { label: h.name }]}
      />

      <div className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Nội dung chính */}
          <div className="lg:col-span-2">
            {/* Di tích chưa có ảnh thật thì hero là nền chuyển sắc, nên vẫn cần
                hình vẽ thay thế ở đây. Có ảnh rồi thì hero đã hiện — không lặp lại. */}
            {!h.coverUrl && (
              <div className="mb-5 aspect-[16/9] overflow-hidden rounded-md shadow-soft">
                <HeritageCover src={null} name={h.name} type={h.type} rounded="rounded-md" />
              </div>
            )}

            {/* Badge hàng đầu */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={type?.color}>{type?.label}</Badge>
              <Badge tone={rank?.color}>{rank?.label}</Badge>
              {h.altNames?.map((n) => (
                <span key={n} className="text-sm text-muted">· {n}</span>
              ))}
            </div>

            <Tabs
              className="mt-6"
              label={`Nội dung về ${h.name}`}
              items={[
                { key: 'summary', label: 'Tổng quan', icon: Sparkles, content: <div className="prose-vn"><ReactMarkdown>{h.summary}</ReactMarkdown></div> },
                { key: 'history', label: 'Lịch sử', icon: ScrollText, content: <div className="prose-vn"><ReactMarkdown>{h.history}</ReactMarkdown></div> },
                { key: 'architecture', label: 'Kiến trúc & hiện vật', icon: Building2, content: <div className="prose-vn"><ReactMarkdown>{h.architecture}</ReactMarkdown></div> },
                {
                  key: 'highlights',
                  label: 'Điểm nhấn',
                  icon: Award,
                  content: (
                    <ul className="space-y-3">
                      {h.highlights?.map((x, i) => (
                        <li key={i} className="card-sm flex items-start gap-3 p-4">
                          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold-100 text-xs font-bold text-gold-700">{i + 1}</span>
                          <span className="text-body">{x}</span>
                        </li>
                      ))}
                    </ul>
                  ),
                },
                // Số ảnh nằm ngay trên nhãn tab: du khách biết trước bấm vào có
                // mấy tấm, khỏi mở ra rồi thất vọng vì chỉ có mỗi ảnh bìa.
                photos.length > 0 && {
                  key: 'photos',
                  label: `Hình ảnh (${photos.length})`,
                  icon: Images,
                  content: <Gallery images={h.images} cover={cover} name={h.name} title={null} className="mt-0" />,
                },
                { key: 'travel', label: 'Cách đến & kinh nghiệm', icon: Route, content: <div className="prose-vn"><ReactMarkdown>{h.travelTips || 'Thông tin đang được cập nhật.'}</ReactMarkdown></div> },
              ]}
            />

            <Reviews targetType="HERITAGE" targetId={h.id} className="mt-10" />
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
                    <li key={i} className="flex items-start gap-2 text-sm text-muted">
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
                <p className="mt-2 text-xs text-subtle">
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
      <Icon size={16} className="mt-0.5 shrink-0 text-subtle" />
      <div>
        <p className="text-xs text-subtle">{label}</p>
        <p className="text-sm text-body">{value}</p>
      </div>
    </div>
  );
}
