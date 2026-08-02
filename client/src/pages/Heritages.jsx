import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { fetchList } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import { HeritageCard, AttractionCard } from '../components/cards.jsx';
import { SkeletonCard, EmptyState, ErrorNote, FilterChip } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { HERITAGE_TYPES, RANK_LEVELS } from '../lib/constants.js';

export default function Heritages() {
  const [params, setParams] = useSearchParams();
  const type = params.get('type') || '';
  const rank = params.get('rank') || '';
  const q = params.get('q') || '';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['heritages', { type, rank, q }],
    queryFn: () => fetchList('heritages', Object.fromEntries([...params].filter(([, v]) => v))),
  });

  const attractions = useQuery({ queryKey: ['attractions'], queryFn: () => fetchList('attractions') });

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const items = data?.items ?? [];
  const hasFilter = type || rank || q;

  return (
    <div>
      <Seo title="Di tích & danh thắng" description="13 cụm di tích đã xếp hạng của phường Đông Triều: chùa, đền, đình, miếu và di tích lịch sử cách mạng." />
      <PageHero
        title="Di tích & danh thắng"
        description="Khám phá 13 cụm di tích đã được xếp hạng của phường Đông Triều — từ Di tích quốc gia đặc biệt đến di tích cấp tỉnh."
        breadcrumb={[{ label: 'Di tích' }]}
      />

      <div className="container-page py-10">
        {/* Bộ lọc */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-2 rounded-md bg-white px-4 shadow-soft ring-1 ring-jade-900/5 dark:bg-jade-900/50">
            <Search size={18} className="text-subtle" />
            <input
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Tìm theo tên, địa chỉ, từ khoá…"
              className="w-full bg-transparent py-3 text-sm outline-none"
            />
            {q && <button onClick={() => setParam('q', '')} className="text-subtle hover:text-jade-600"><X size={16} /></button>}
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterChip active={!type} onClick={() => setParam('type', '')}>Tất cả loại hình</FilterChip>
            {Object.entries(HERITAGE_TYPES).map(([key, v]) => (
              <FilterChip key={key} active={type === key} onClick={() => setParam('type', key)}>{v.label}</FilterChip>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterChip active={!rank} onClick={() => setParam('rank', '')} tone="gold">Mọi cấp xếp hạng</FilterChip>
            {Object.entries(RANK_LEVELS).map(([key, v]) => (
              <FilterChip key={key} active={rank === key} onClick={() => setParam('rank', key)} tone="gold">{v.short}</FilterChip>
            ))}
          </div>
        </div>

        {isError ? (
          <ErrorNote onRetry={refetch} />
        ) : isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Không tìm thấy di tích phù hợp"
            description={hasFilter ? 'Thử bỏ bớt bộ lọc hoặc từ khoá tìm kiếm.' : 'Chưa có dữ liệu.'}
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">Tìm thấy {items.length} di tích.</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((h) => <HeritageCard key={h.id} item={h} />)}
            </div>
          </>
        )}

        {/* Điểm đến lân cận — ngoài phường nhưng nên kết hợp tham quan */}
        {attractions.data?.items?.length > 0 && (
          <section className="mt-16">
            <div className="mb-6">
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-gold-500">Mở rộng hành trình</p>
              <h2 className="section-title">Điểm đến lân cận</h2>
              <p className="mt-2 max-w-2xl text-muted">
                Những điểm nằm ngoài phường Đông Triều nhưng rất đáng kết hợp — phần lớn thuộc
                Khu di tích lịch sử nhà Trần tại Đông Triều.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {attractions.data.items.map((a) => <AttractionCard key={a.id} item={a} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

