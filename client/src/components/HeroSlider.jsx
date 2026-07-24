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
                  <HeritageCover src={img} name={s.title} type={cover.type || 'CHUA'} rounded="rounded-none" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-jade-950/85 via-jade-950/30 to-transparent" />
                <div className="container-page relative flex h-full items-end pb-20 sm:items-center sm:pb-0">
                  <div className="max-w-2xl animate-fade-up">
                    <span className="inline-block rounded-full bg-gold-400/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-jade-950">
                      Di sản Đông Triều
                    </span>
                    <h2 className="mt-4 font-serif text-4xl font-bold leading-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl">
                      {s.title}
                    </h2>
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
