import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchList } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import { ArticleCard } from '../components/cards.jsx';
import { SkeletonCard, EmptyState } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { ARTICLE_CATEGORIES } from '../lib/constants.js';
import { cx } from '../lib/format.js';

export default function News() {
  const [cat, setCat] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['articles', cat],
    queryFn: () => fetchList('articles', cat ? { category: cat } : undefined),
  });
  const items = data?.items ?? [];

  return (
    <div>
      <Seo title="Tin tức & cẩm nang" description="Tin tức, cẩm nang du lịch và phóng sự về di tích, lễ hội, ẩm thực của phường Đông Triều." />
      <PageHero title="Tin tức & cẩm nang" description="Cập nhật thông tin du lịch, lễ hội và những câu chuyện văn hoá của vùng đất Đông Triều." breadcrumb={[{ label: 'Tin tức' }]} />

      <div className="container-page py-10">
        <div className="mb-6 flex flex-wrap gap-2">
          <Chip active={!cat} onClick={() => setCat('')}>Tất cả</Chip>
          {Object.entries(ARTICLE_CATEGORIES).map(([key, v]) => (
            <Chip key={key} active={cat === key} onClick={() => setCat(key)}>{v.label}</Chip>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Chưa có bài viết" description="Nội dung đang được cập nhật." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => <ArticleCard key={a.id} item={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'rounded-full px-4 py-2 text-sm font-medium transition',
        active ? 'bg-jade-600 text-white' : 'bg-white text-jade-700 ring-1 ring-jade-200 hover:bg-jade-50 dark:bg-jade-900/50 dark:text-jade-100 dark:ring-jade-700',
      )}
    >
      {children}
    </button>
  );
}
