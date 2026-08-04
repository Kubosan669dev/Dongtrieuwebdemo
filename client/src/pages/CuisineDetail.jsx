import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Tag, MapPin, Coins, Images, ScrollText } from 'lucide-react';
import { fetchOne } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import Tabs from '../components/Tabs.jsx';
import { Spinner, ErrorNote } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import Gallery, { galleryItems } from '../components/Gallery.jsx';
import Reviews from '../components/Reviews.jsx';

export default function CuisineDetail() {
  const { slug } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cuisine', slug],
    queryFn: () => fetchOne('cuisines', slug),
  });

  if (isLoading) return <Spinner className="min-h-[60vh]" />;
  if (isError) return <div className="container-page py-16"><ErrorNote onRetry={refetch} /></div>;

  const c = data.item;
  const cover = c.coverUrl ? { url: c.coverUrl, illustrative: c.coverIsIllustrative } : null;
  const photos = galleryItems(cover, c.images);

  return (
    <div>
      <Seo title={c.name} description={c.summary} type="article" />
      <PageHero
        title={c.name}
        image={c.coverUrl}
        illustrative={c.coverIsIllustrative}
        breadcrumb={[{ label: 'Ẩm thực', to: '/am-thuc' }, { label: c.name }]}
      />

      <div className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {/* Ảnh bìa ở hero phía trên bị lớp phủ và tiêu đề che, nên nó được
                xếp lại vào tab "Hình ảnh" — chỗ duy nhất xem được trọn tấm. */}
            <Tabs
              label={`Nội dung về ${c.name}`}
              items={[
                {
                  key: 'about',
                  label: 'Giới thiệu',
                  icon: ScrollText,
                  content: (
                    <>
                      <p className="text-lg font-medium text-muted">{c.summary}</p>
                      <p className="mt-4 leading-relaxed text-body">{c.description}</p>
                    </>
                  ),
                },
                photos.length > 0 && {
                  key: 'photos',
                  label: `Hình ảnh (${photos.length})`,
                  icon: Images,
                  content: <Gallery images={c.images} cover={cover} name={c.name} title={null} className="mt-0" />,
                },
              ]}
            />

            <Reviews targetType="CUISINE" targetId={c.id} className="mt-10" />
          </div>

          <aside className="space-y-5">
            <div className="card p-5">
              <h3 className="mb-4 font-serif text-lg font-semibold">Thông tin</h3>
              {c.priceRange && (
                <div className="flex items-start gap-3 border-b border-jade-900/5 py-2.5 dark:border-white/5">
                  <Coins size={16} className="mt-0.5 text-subtle" />
                  <div><p className="text-xs text-subtle">Giá tham khảo</p><p className="text-sm text-body">{c.priceRange}</p></div>
                </div>
              )}
              {c.season && (
                <div className="flex items-start gap-3 py-2.5">
                  <Tag size={16} className="mt-0.5 text-subtle" />
                  <div><p className="text-xs text-subtle">Mùa vụ</p><p className="text-sm text-body">{c.season}</p></div>
                </div>
              )}
            </div>

            {c.whereToBuy?.length > 0 && (
              <div className="card p-5">
                <h3 className="mb-3 font-serif text-lg font-semibold">Mua / thưởng thức tại</h3>
                <ul className="space-y-2">
                  {c.whereToBuy.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-gold-400" /> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
