import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchList } from '../lib/api.js';
import PageHero from '../components/PageHero.jsx';
import { CuisineCard, RestaurantCard } from '../components/cards.jsx';
import { SectionHeading, SkeletonCard, EmptyState, ErrorNote, FilterChip } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { RESTAURANT_TYPES } from '../lib/constants.js';

export default function Cuisine() {
  const [restType, setRestType] = useState('');
  const cuisines = useQuery({ queryKey: ['cuisines'], queryFn: () => fetchList('cuisines') });
  const restaurants = useQuery({ queryKey: ['restaurants'], queryFn: () => fetchList('restaurants') });

  const rItems = (restaurants.data?.items ?? []).filter((r) => !restType || r.type === restType);

  return (
    <div>
      <Seo title="Ẩm thực & đặc sản" description="8 đặc sản tiêu biểu của Đông Triều: na dai, rươi, nếp cái hoa vàng, gà đồi, ngán, khoai lang làng Trạo, bưởi, gốm sứ." />
      <PageHero
        title="Ẩm thực & đặc sản"
        description="Hương vị bản địa của vùng đất bán sơn địa ven sông Kinh Thầy — Đá Bạc."
        breadcrumb={[{ label: 'Ẩm thực' }]}
      />

      <div className="container-page py-10">
        <SectionHeading eyebrow="Sản vật quê hương" title="Đặc sản tiêu biểu" />
        {cuisines.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : cuisines.isError ? (
          <ErrorNote onRetry={cuisines.refetch} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cuisines.data?.items?.map((c) => <CuisineCard key={c.id} item={c} />)}
          </div>
        )}

        <div className="mt-16">
          <SectionHeading
            eyebrow="Ăn uống & dừng chân"
            title="Nhà hàng · Quán ăn · Điểm dừng chân"
            description="Gợi ý địa điểm thưởng thức đặc sản và mua quà. Danh sách đang được cập nhật thêm."
          />
          <div className="mb-6 flex flex-wrap gap-2">
            <FilterChip tone="gold" active={!restType} onClick={() => setRestType('')}>Tất cả</FilterChip>
            {Object.entries(RESTAURANT_TYPES).map(([key, v]) => (
              <FilterChip tone="gold" key={key} active={restType === key} onClick={() => setRestType(key)}>{v.label}</FilterChip>
            ))}
          </div>
          {rItems.length === 0 ? (
            <EmptyState title="Chưa có địa điểm phù hợp" description="Thử chọn nhóm khác." />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rItems.map((r) => <RestaurantCard key={r.id} item={r} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

