import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { fetchList, api } from '../lib/api.js';
import HeroSlider from '../components/HeroSlider.jsx';
import FestivalSeason from '../components/FestivalSeason.jsx';
import LodgingDetail from '../components/LodgingDetail.jsx';
import HomeIntro from '../components/home/HomeIntro.jsx';
import HomeMap from '../components/home/HomeMap.jsx';
import HomeReviews from '../components/home/HomeReviews.jsx';
import HomeContact from '../components/home/HomeContact.jsx';
import { HeritageCard, CuisineCard, LodgingCard, ArticleCard } from '../components/cards.jsx';
import { SectionHeading, SkeletonCard, ErrorNote } from '../components/ui.jsx';
import MiniWeather from '../components/MiniWeather.jsx';
import Seo from '../components/Seo.jsx';
import { useSettings } from '../hooks/useSettings.js';
import { LUNAR_MONTH_LABELS } from '../lib/constants.js';

/**
 * Trang chủ — 11 khối, theo đúng thứ tự một người mới cần:
 * ở đâu → khi nào đi → xem gì → đường đi → ăn ngủ → người khác nói gì → hỏi ai.
 *
 * ── HAI KHỐI BỊ BỎ Ở BẢN NÀY ────────────────────────────────────────────────
 *
 *  · "Lối tắt khám phá" (6 ô Di tích / Lễ hội / Ẩm thực / Lưu trú / Bản đồ /
 *    Thời tiết) — lặp lại đúng thanh điều hướng nằm ngay phía trên, chỉ khác là
 *    to hơn. Sáu ô chiếm một màn hình mà không cho thêm lối đi nào mới.
 *
 *  · "Lên kế hoạch cho chuyến đi của bạn" (ô xanh cuối trang có hai nút) —
 *    một lời mời rỗng: hứa bản đồ mà không cho xem gì. Nay `HomeMap` đặt bản đồ
 *    thật lên trang, khách thấy mật độ điểm trước khi quyết định bấm vào.
 *
 * Dải số liệu không bị bỏ mà bị **hút vào** khối giới thiệu (`HomeIntro`): đứng
 * riêng thì bốn con số không có câu nào nói chúng là số liệu của cái gì.
 */

/**
 * Bọc quanh mỗi mục của trang chủ để lỗi tải không biến thành một khoảng trống câm.
 * Trước đây chỉ mục Di tích có trạng thái tải; các mục khác gọi API hỏng là hiện
 * tiêu đề rồi bỏ trống bên dưới, khách không biết là mất dữ liệu hay vốn dĩ không có.
 */
function SectionBody({ query, skeletonCount = 3, children }) {
  if (query.isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: skeletonCount }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }
  if (query.isError) return <ErrorNote onRetry={query.refetch} />;
  return children;
}

export default function Home() {
  const navigate = useNavigate();
  const settings = useSettings();
  const [q, setQ] = useState('');
  const [lodging, setLodging] = useState(null);

  const slides = useQuery({ queryKey: ['slides'], queryFn: () => fetchList('slides') });
  const heritages = useQuery({ queryKey: ['heritages', 'featured'], queryFn: () => fetchList('heritages', { featured: '1' }) });
  const festivals = useQuery({ queryKey: ['festivals', 'home'], queryFn: () => fetchList('festivals') });
  const cuisines = useQuery({ queryKey: ['cuisines', 'home'], queryFn: () => fetchList('cuisines') });
  const lodgings = useQuery({ queryKey: ['lodgings', 'home'], queryFn: () => fetchList('lodgings') });
  const articles = useQuery({ queryKey: ['articles', 'home'], queryFn: () => fetchList('articles') });
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api.get('/stats') });

  // Bản đồ slug → ảnh bìa/loại hình cho hero. Giữ cả cờ ảnh minh hoạ, nếu không
  // nhãn "Ảnh minh hoạ" trong hero sẽ không bao giờ hiện dù đã được nối sẵn.
  const coverBySlug = {};
  (heritages.data?.items ?? []).forEach((h) => {
    coverBySlug[h.slug] = { coverUrl: h.coverUrl, type: h.type, illustrative: h.coverIsIllustrative };
  });

  const heritageItems = heritages.data?.items ?? [];
  const [lead, ...rest] = heritageItems;

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/di-tich?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="pb-20">
      {/* Không truyền description: `Seo` tự dùng SITE_DESCRIPTION trong lib/site.js */}
      <Seo />

      {slides.data?.items?.length ? (
        <HeroSlider slides={slides.data.items} coverBySlug={coverBySlug} />
      ) : (
        <div className="h-[440px] animate-pulse bg-jade-100 dark:bg-jade-900" />
      )}

      {/* Thanh tìm kiếm + thời tiết mini */}
      <div className="container-page relative z-10 -mt-10">
        <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <form onSubmit={onSearch} className="flex flex-1 items-center gap-2 rounded-full bg-jade-50 px-4 dark:bg-jade-800/60">
            <Search size={18} className="text-jade-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm di tích, lễ hội, đặc sản…"
              aria-label="Tìm kiếm"
              className="w-full bg-transparent py-3 text-sm outline-none"
            />
            <button className="btn-primary btn-sm shrink-0">Tìm</button>
          </form>
          <MiniWeather />
        </div>
      </div>

      {/* 3. Giới thiệu ngắn + dải số liệu */}
      <HomeIntro intro={settings.about?.intro} counts={stats.data?.counts} />

      {/* 4. Mùa lễ hội — đặt trước mọi lưới thẻ vì "khi nào đi" mới là quyết định
          đầu tiên của khách với một điểm đến do lễ hội dẫn dắt. */}
      {festivals.data?.items?.length > 0 && <FestivalSeason festivals={festivals.data.items} />}

      {/* 5. Di tích nổi bật — một thẻ lớn dẫn đầu, phần còn lại xếp lưới */}
      <section data-vao className="container-page mt-16">
        <SectionHeading
          eyebrow="Di sản văn hoá"
          title="Di tích nổi bật"
          description="Những điểm đến tiêu biểu gắn với vương triều Trần và lịch sử cách mạng vùng Đông Triều."
          action={<Link to="/di-tich" className="btn-ghost">Tất cả di tích <ChevronRight size={16} /></Link>}
        />
        <SectionBody query={heritages} skeletonCount={5}>
          {lead && (
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <HeritageCard item={lead} featured />
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                {rest.slice(0, 2).map((h) => <HeritageCard key={h.id} item={h} />)}
              </div>
            </div>
          )}
          {rest.length > 2 && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.slice(2, 5).map((h) => <HeritageCard key={h.id} item={h} />)}
            </div>
          )}
        </SectionBody>
      </section>

      {/* 6. Bản đồ số — thay khối "CTA bản đồ" giả ở cuối trang bản trước */}
      <HomeMap />

      {/* 7. Lễ hội — dạng dòng thời gian như trang /le-hoi, không dùng thẻ chữ.
          Thẻ chữ ở đây từng tạo một khoảng trống thị giác giữa hai hàng thẻ ảnh. */}
      <section data-vao className="container-page mt-16">
        <SectionHeading
          eyebrow="Theo lịch âm"
          title="Lễ hội truyền thống"
          description="Từ mùng 9 tháng Giêng, hàng loạt lễ hội nối nhau diễn ra khắp các làng của Đông Triều."
          action={<Link to="/le-hoi" className="btn-ghost">Xem lịch lễ hội <ChevronRight size={16} /></Link>}
        />
        <SectionBody query={festivals}>
          <ol className="ml-5 space-y-4 border-l-2 border-jade-100 pl-6 dark:border-jade-800">
            {festivals.data?.items?.slice(0, 4).map((f) => (
              <li key={f.id} className="relative">
                <span className="absolute -left-[1.95rem] top-6 h-3 w-3 rounded-full bg-gold-400 ring-4 ring-paper dark:ring-jade-950" />
                <Link to={`/le-hoi/${f.slug}`} className="card-hover group block p-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-serif text-lg font-semibold text-jade-900 group-hover:text-jade-600 dark:text-jade-50">
                      {f.name}
                    </h3>
                    <span className="text-sm font-medium text-gold-600 dark:text-gold-400">
                      {f.lunarDay ? `${f.lunarDay} ` : ''}{LUNAR_MONTH_LABELS[f.lunarMonth]?.toLowerCase() ?? ''} âm lịch
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-jade-600/90 dark:text-jade-300">{f.location}</p>
                </Link>
              </li>
            ))}
          </ol>
        </SectionBody>
      </section>

      {/* 8a. Ẩm thực */}
      <section data-vao className="container-page mt-16">
        <SectionHeading
          eyebrow="Hương vị bản địa"
          title="Ẩm thực & đặc sản"
          description="Na dai, rươi, nếp cái hoa vàng — những thứ chỉ ngon đúng mùa ở vùng đất này."
          action={<Link to="/am-thuc" className="btn-ghost">Tất cả đặc sản <ChevronRight size={16} /></Link>}
        />
        <SectionBody query={cuisines} skeletonCount={4}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cuisines.data?.items?.slice(0, 4).map((c) => <CuisineCard key={c.id} item={c} />)}
          </div>
        </SectionBody>
      </section>

      {/* 8b. Lưu trú */}
      <section data-vao className="container-page mt-16">
        <SectionHeading
          eyebrow="Nghỉ ngơi"
          title="Cơ sở lưu trú"
          description="Bấm vào từng cơ sở để xem giá phòng, tiện nghi, ảnh và bản đồ."
          action={<Link to="/luu-tru" className="btn-ghost">Tất cả cơ sở <ChevronRight size={16} /></Link>}
        />
        <SectionBody query={lodgings}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {lodgings.data?.items?.slice(0, 3).map((l) => (
              <LodgingCard key={l.id} item={l} onClick={() => setLodging(l)} />
            ))}
          </div>
        </SectionBody>
      </section>

      {/* 9. Đánh giá du khách — tự ẩn khi chưa có đánh giá nào đã duyệt */}
      <HomeReviews />

      {/* 10. Tin tức */}
      {articles.data?.items?.length > 0 && (
        <section data-vao className="container-page mt-16">
          <SectionHeading
            eyebrow="Cẩm nang & tin tức"
            title="Bài viết mới"
            action={<Link to="/tin-tuc" className="btn-ghost">Tất cả bài viết <ChevronRight size={16} /></Link>}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.data.items.slice(0, 3).map((a) => <ArticleCard key={a.id} item={a} />)}
          </div>
        </section>
      )}

      {/* 11. Liên hệ */}
      <HomeContact />

      {lodging && <LodgingDetail item={lodging} onClose={() => setLodging(null)} />}
    </div>
  );
}
