import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination, Navigation } from 'swiper/modules';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import HeritageCover from './HeritageCover.jsx';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

/**
 * Hero slider tự động chạy các di tích tiêu biểu.
 * @param {Array} slides  danh sách slide (title, subtitle, imageUrl, heritageSlug, cta…)
 * @param {Map}   coverBySlug  map slug → {coverUrl, type} để vẽ ảnh bìa placeholder
 */
export default function HeroSlider({ slides = [], coverBySlug = {} }) {
  if (slides.length === 0) return null;

  return (
    <section className="relative">
      <Swiper
        modules={[Autoplay, EffectFade, Pagination, Navigation]}
        effect="fade"
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        loop={slides.length > 1}
        pagination={{ clickable: true }}
        navigation
        className="h-[70vh] max-h-[640px] min-h-[440px] w-full"
      >
        {slides.map((s, i) => {
          const cover = coverBySlug[s.heritageSlug] || {};
          const img = s.imageUrl || cover.coverUrl;
          return (
            <SwiperSlide key={s.id ?? i}>
              <div className="relative h-full w-full overflow-hidden">
                <div className="absolute inset-0 animate-ken-burns">
                  <HeritageCover
                    src={img}
                    name={s.title}
                    type={cover.type || 'CHUA'}
                    rounded="rounded-none"
                    illustrative={cover.illustrative}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-jade-950/85 via-jade-950/30 to-transparent" />
                <div className="container-page relative flex h-full items-end pb-20 sm:items-center sm:pb-0">
                  <div className="max-w-2xl animate-fade-up">
                    <span className="inline-block rounded-full bg-gold-400/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-jade-950">
                      Di sản Đông Triều
                    </span>
                    {/* Slide đầu là <h1> của trang chủ — trước đây cả trang không
                        có <h1> nào, thiệt cho cả SEO lẫn trình đọc màn hình.
                        Các slide sau là <h2> để không có nhiều <h1> trên một trang. */}
                    <Heading level={i === 0 ? 1 : 2} className="display-1 mt-4 text-white drop-shadow-lg">
                      {s.title}
                    </Heading>
                    {s.subtitle && (
                      <p className="mt-4 max-w-xl text-base text-jade-50/90 sm:text-lg">{s.subtitle}</p>
                    )}
                    {s.ctaHref && (
                      <Link to={s.ctaHref} className="btn-gold mt-6">
                        {s.ctaLabel || 'Khám phá'} <ChevronRight size={16} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}

/** Thẻ tiêu đề đổi cấp theo `level` — để slide đầu là <h1>, các slide sau là <h2>. */
function Heading({ level, className, children }) {
  const Tag = `h${level}`;
  return <Tag className={className}>{children}</Tag>;
}
