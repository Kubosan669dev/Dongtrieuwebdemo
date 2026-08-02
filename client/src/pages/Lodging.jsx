import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchList } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import { LodgingCard } from '../components/cards.jsx';
import LodgingDetail from '../components/LodgingDetail.jsx';
import { SkeletonCard, EmptyState, ErrorNote, FilterChip } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { LODGING_TYPES } from '../lib/constants.js';

export default function Lodging() {
  const [type, setType] = useState('');
  const [selected, setSelected] = useState(null);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['lodgings'], queryFn: () => fetchList('lodgings') });
  const items = (data?.items ?? []).filter((l) => !type || l.type === type);

  return (
    <div>
      <Seo title="Lưu trú" description="15 cơ sở lưu trú tại phường Đông Triều theo thống kê của UBND phường: khách sạn và nhà nghỉ." />
      <PageHero
        title="Cơ sở lưu trú"
        description="Danh sách khách sạn và nhà nghỉ trên địa bàn phường Đông Triều (theo thống kê của UBND phường)."
        breadcrumb={[{ label: 'Lưu trú' }]}
      />

      <div className="container-page py-10">
        <div className="mb-6 flex flex-wrap gap-2">
          <FilterChip active={!type} onClick={() => setType('')}>Tất cả ({data?.items?.length ?? 0})</FilterChip>
          {Object.entries(LODGING_TYPES).map(([key, v]) => {
            const count = (data?.items ?? []).filter((l) => l.type === key).length;
            if (count === 0) return null;
            return <FilterChip key={key} active={type === key} onClick={() => setType(key)}>{v.label} ({count})</FilterChip>;
          })}
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : isError ? (
          <ErrorNote onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState title="Chưa có cơ sở lưu trú" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((l) => <LodgingCard key={l.id} item={l} onClick={() => setSelected(l)} />)}
          </div>
        )}

        {selected && <LodgingDetail item={selected} onClose={() => setSelected(null)} />}

        <p className="mt-8 rounded-md bg-jade-50 p-4 text-sm text-jade-600 dark:bg-jade-900/40 dark:text-jade-300">
          ℹ️ Thông tin liên hệ được cung cấp theo danh sách thống kê của UBND phường Đông Triều. Vui lòng
          gọi trực tiếp để đặt phòng và xác nhận giá.
        </p>
      </div>
    </div>
  );
}

