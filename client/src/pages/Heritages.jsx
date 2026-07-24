import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { fetchList } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import { HeritageCard } from '../components/cards.jsx';
import { SkeletonCard, EmptyState, ErrorNote } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { HERITAGE_TYPES, RANK_LEVELS } from '../lib/constants.js';
import { cx } from '../lib/format.js';

export default function Heritages() {
  const [params, setParams] = useSearchParams();
  const type = params.get('type') || '';
  const rank = params.get('rank') || '';
  const q = params.get('q') || '';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['heritages', { type, rank, q }],
    queryFn: () => fetchList('heritages', Object.fromEntries([...params].filter(([, v]) => v))),
  });

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
          <div className="flex items-center gap-2 rounded-full bg-white px-4 shadow-soft ring-1 ring-jade-900/5 dark:bg-jade-900/50">
            <Search size={18} className="text-jade-400" />
            <input
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Tìm theo tên, địa chỉ, từ khoá…"
              className="w-full bg-transparent py-3 text-sm outline-none"
            />
            {q && <button onClick={() => setParam('q', '')} className="text-jade-400 hover:text-jade-600"><X size={16} /></button>}
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
            <p className="mb-4 text-sm text-jade-500">Tìm thấy {items.length} di tích.</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((h) => <HeritageCard key={h.id} item={h} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children, tone = 'jade' }) {
  const tones = {
    jade: active ? 'bg-jade-600 text-white' : 'bg-white text-jade-700 ring-1 ring-jade-200 hover:bg-jade-50 dark:bg-jade-900/50 dark:text-jade-100 dark:ring-jade-700',
    gold: active ? 'bg-gold-400 text-jade-950' : 'bg-white text-jade-700 ring-1 ring-jade-200 hover:bg-jade-50 dark:bg-jade-900/50 dark:text-jade-100 dark:ring-jade-700',
  };
  return (
    <button onClick={onClick} className={cx('rounded-full px-4 py-2 text-sm font-medium transition', tones[tone])}>
      {children}
    </button>
  );
}
