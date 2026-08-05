import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { fetchList, api } from '../lib/api.js';
import HeroSlider from '../components/HeroSlider.jsx';
import FestivalSeason from '../components/FestivalSeason.jsx';
import LodgingDetail from '../components/LodgingDetail.jsx';
import HomeQuickLinks from '../components/home/HomeQuickLinks.jsx';
import HomeIntro from '../components/home/HomeIntro.jsx';
import HomeMap from '../components/home/HomeMap.jsx';
import HomeReviews from '../components/home/HomeReviews.jsx';
import HomeContact from '../components/home/HomeContact.jsx';
import { HeritageCard, CuisineCard, LodgingCard } from '../components/cards.jsx';
import { SectionHeading, SkeletonCard, ErrorNote } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { useSettings } from '../hooks/useSettings.js';
import { LUNAR_MONTH_LABELS } from '../lib/constants.js';

/**
 * Trang chủ — theo đúng thứ tự người dân trong phường cần:
 * tra cứu nhanh → vùng đất này là gì → mùa lễ hội → di tích → bản đồ → lịch lễ
 * hội → đặc sản → cảm nhận → tin tức → lưu trú cho khách → liên hệ.
 *
 * ── LƯU TRÚ NẰM GẦN CUỐI, CÓ CHỦ Ý ──────────────────────────────────────────
 * Bản trước đặt nó ngay giữa trang, cạnh Ẩm thực. Với người sống trong phường thì
 * danh sách nhà nghỉ là mục ít cần nhất — họ đã ở đây rồi. Nó vẫn còn nguyên, chỉ
 * lùi xuống sau Tin tức và đổi giọng thành "giới thiệu cho khách tới thăm", tức
 * là nói với người trong phường về việc chỉ đường cho khách của mình.
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

/**
 * `/` — trang chủ của CỔNG DU LỊCH.
 *
 * Cổng người dân là một trang khác hẳn (`/nguoi-dan`, xem `pages/Resident.jsx`),
 * không dùng chung khối nào với trang này. Xem `hooks/useDoiTuong.jsx` để biết
 * vì sao hai bên tách thành hai đường dẫn thật, thay vì một công tắc nhớ trong máy.
 */
export default function Home() {
  const settings = useSettings();
  const [lodging, setLodging] = useState(null);

  const slides = useQuery({ queryKey: ['slides'], queryFn: () => fetchList('slides') });
  const heritages = useQuery({ queryKey: ['heritages', 'featured'], queryFn: () => fetchList('heritages', { featured: '1' }) });
  const festivals = useQuery({ queryKey: ['festivals', 'home'], queryFn: () => fetchList('festivals') });
  const cuisines = useQuery({ queryKey: ['cuisines', 'home'], queryFn: () => fetchList('cuisines') });
  const lodgings = useQuery({ queryKey: ['lodgings', 'home'], queryFn: () => fetchList('lodgings') });
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api.get('/stats') });

  // Bản đồ slug → ảnh bìa/loại hình cho hero. Giữ cả cờ ảnh minh hoạ, nếu không
  // nhãn "Ảnh minh hoạ" trong hero sẽ không bao giờ hiện dù đã được nối sẵn.
  const coverBySlug = {};
  (heritages.data?.items ?? []).forEach((h) => {
    coverBySlug[h.slug] = { coverUrl: h.coverUrl, type: h.type, illustrative: h.coverIsIllustrative };
  });

  const heritageItems = heritages.data?.items ?? [];
  const [lead, ...rest] = heritageItems;

  return (
    <div className="pb-20">
      {/* Không truyền description: `Seo` tự dùng SITE_DESCRIPTION trong lib/site.js */}
      <Seo />

      {slides.data?.items?.length ? (
        <HeroSlider slides={slides.data.items} coverBySlug={coverBySlug} />
      ) : (
        <div className="h-[440px] animate-pulse bg-jade-100 dark:bg-jade-900" />
      )}

      {/* 2. Tra cứu nhanh — ô tìm + ba việc khách hay làm nhất */}
      <HomeQuickLinks />

      {/* 3. Giới thiệu ngắn + dải số liệu */}
      <HomeIntro intro={settings.about?.intro} counts={stats.data?.counts} />

      {/* 4. Mùa lễ hội — đặt trước mọi lưới thẻ vì lịch hội là thứ khách xem trước tiên */}
      {festivals.data?.items?.length > 0 && <FestivalSeason festivals={festivals.data.items} />}

      {/* 5. Di tích nổi bật — một thẻ lớn dẫn đầu, phần còn lại xếp lưới */}
      <section data-vao className="container-page mt-16">
        <SectionHeading
          eyebrow="Di sản văn hoá"
          title="Di tích nổi bật"
          description="Những di tích tiêu biểu của phường, gắn với vương triều Trần và lịch sử cách mạng vùng Đông Triều."
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

      {/* 6. Bản đồ số */}
      <HomeMap />

      {/* 7. Lễ hội — dạng dòng thời gian như trang /le-hoi, không dùng thẻ chữ */}
      <section data-vao className="container-page mt-16">
        <SectionHeading
          eyebrow="Theo lịch âm"
          title="Lễ hội truyền thống"
          description="Từ mùng 9 tháng Giêng, hàng loạt lễ hội nối nhau diễn ra khắp các làng trong phường."
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
                  <p className="mt-1.5 text-sm text-muted">{f.location}</p>
                </Link>
              </li>
            ))}
          </ol>
        </SectionBody>
      </section>

      {/* 8. Ẩm thực */}
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

      {/* 9. Cảm nhận — tự ẩn khi chưa có đánh giá nào đã duyệt */}
      <HomeReviews />

      {/* 10. Lưu trú — đứng gần cuối, sau khi khách đã xem xong nơi đáng tới */}
      <section data-vao className="container-page mt-16">
        <SectionHeading
          eyebrow="Cho khách tới thăm"
          title="Cơ sở lưu trú"
          description="Các cơ sở lưu trú trong phường, kèm giá phòng, tiện nghi, ảnh và bản đồ."
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

      {/* 11. Liên hệ */}
      <HomeContact />

      {lodging && <LodgingDetail item={lodging} onClose={() => setLodging(null)} />}
    </div>
  );
}
