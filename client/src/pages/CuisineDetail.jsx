import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Tag, MapPin, Coins } from 'lucide-react';
import { fetchOne } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import { Spinner, ErrorNote } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';

export default function CuisineDetail() {
  const { slug } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cuisine', slug],
    queryFn: () => fetchOne('cuisines', slug),
  });

  if (isLoading) return <Spinner className="min-h-[60vh]" />;
  if (isError) return <div className="container-page py-16"><ErrorNote onRetry={refetch} /></div>;

  const c = data.item;

  return (
    <div>
      <Seo title={c.name} description={c.summary} type="article" />
      <PageHero title={c.name} breadcrumb={[{ label: 'Ẩm thực', to: '/am-thuc' }, { label: c.name }]} />

      <div className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {c.coverUrl && (
              <img src={c.coverUrl} alt={c.name} className="mb-6 aspect-[16/9] w-full rounded-2xl object-cover shadow-soft" />
            )}
            <p className="text-lg font-medium text-jade-700 dark:text-jade-200">{c.summary}</p>
            <p className="mt-4 leading-relaxed text-jade-800 dark:text-jade-100">{c.description}</p>
          </div>

          <aside className="space-y-5">
            <div className="card p-5">
              <h3 className="mb-4 font-serif text-lg font-semibold">Thông tin</h3>
              {c.priceRange && (
                <div className="flex items-start gap-3 border-b border-jade-900/5 py-2.5 dark:border-white/5">
                  <Coins size={16} className="mt-0.5 text-jade-400" />
                  <div><p className="text-xs text-jade-400">Giá tham khảo</p><p className="text-sm text-jade-800 dark:text-jade-100">{c.priceRange}</p></div>
                </div>
              )}
              {c.season && (
                <div className="flex items-start gap-3 py-2.5">
                  <Tag size={16} className="mt-0.5 text-jade-400" />
                  <div><p className="text-xs text-jade-400">Mùa vụ</p><p className="text-sm text-jade-800 dark:text-jade-100">{c.season}</p></div>
                </div>
              )}
            </div>

            {c.whereToBuy?.length > 0 && (
              <div className="card p-5">
                <h3 className="mb-3 font-serif text-lg font-semibold">Mua / thưởng thức tại</h3>
                <ul className="space-y-2">
                  {c.whereToBuy.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-jade-700 dark:text-jade-200">
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
