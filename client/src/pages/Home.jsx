import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, Landmark, CalendarDays, UtensilsCrossed, BedDouble, Map as MapIcon, CloudSun, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fetchList } from '../lib/api.js';
import HeroSlider from '../components/HeroSlider.jsx';
import { HeritageCard, FestivalCard, CuisineCard, LodgingCard, ArticleCard } from '../components/cards.jsx';
import { SectionHeading, SkeletonCard } from '../components/ui.jsx';
import MiniWeather from '../components/MiniWeather.jsx';
import Seo from '../components/Seo.jsx';
import { weatherInfo } from '../lib/constants.js';

const STATS = [
  { icon: Landmark, value: 13, label: 'Cụm di tích xếp hạng' },
  { icon: CalendarDays, value: 17, label: 'Lễ hội truyền thống' },
  { icon: BedDouble, value: 15, label: 'Cơ sở lưu trú' },
  { icon: UtensilsCrossed, value: 8, label: 'Đặc sản tiêu biểu' },
];

const EXPLORE = [
  { to: '/di-tich', icon: Landmark, label: 'Di tích', desc: 'Chùa · đền · đình · miếu' },
  { to: '/le-hoi', icon: CalendarDays, label: 'Lễ hội', desc: 'Theo tháng âm lịch' },
  { to: '/am-thuc', icon: UtensilsCrossed, label: 'Ẩm thực', desc: 'Đặc sản & nhà hàng' },
  { to: '/luu-tru', icon: BedDouble, label: 'Lưu trú', desc: 'Khách sạn & nhà nghỉ' },
  { to: '/ban-do', icon: MapIcon, label: 'Bản đồ', desc: 'Đường đi các điểm' },
  { to: '/thoi-tiet', icon: CloudSun, label: 'Thời tiết', desc: 'Dự báo & triều cường' },
];

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const slides = useQuery({ queryKey: ['slides'], queryFn: () => fetchList('slides') });
  const heritages = useQuery({ queryKey: ['heritages', 'featured'], queryFn: () => fetchList('heritages', { featured: '1' }) });
  const festivals = useQuery({ queryKey: ['festivals', 'home'], queryFn: () => fetchList('festivals') });
  const cuisines = useQuery({ queryKey: ['cuisines', 'home'], queryFn: () => fetchList('cuisines') });
  const lodgings = useQuery({ queryKey: ['lodgings', 'home'], queryFn: () => fetchList('lodgings') });
  const articles = useQuery({ queryKey: ['articles', 'home'], queryFn: () => fetchList('articles') });

  // Bản đồ slug → ảnh bìa/loại hình cho hero
  const coverBySlug = {};
  (heritages.data?.items ?? []).forEach((h) => (coverBySlug[h.slug] = { coverUrl: h.coverUrl, type: h.type }));

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/di-tich?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div>
      <Seo description="Cổng thông tin du lịch phường Đông Triều: 13 cụm di tích, lễ hội, ẩm thực, lưu trú, bản đồ và dự báo thời tiết – triều cường." />

      {slides.data?.items?.length ? (
        <HeroSlider slides={slides.data.items} coverBySlug={coverBySlug} />
      ) : (
        <div className="h-[440px] animate-pulse bg-jade-100 dark:bg-jade-900" />
      )}

      {/* Thanh tìm kiếm + thời tiết mini */}
      <div className="container-page -mt-10 relative z-10">
        <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <form onSubmit={onSearch} className="flex flex-1 items-center gap-2 rounded-full bg-jade-50 px-4 dark:bg-jade-800/60">
            <Search size={18} className="text-jade-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm di tích, lễ hội, đặc sản…"
              className="w-full bg-transparent py-3 text-sm outline-none"
            />
            <button className="btn-primary shrink-0 !py-2">Tìm</button>
          </form>
          <MiniWeather />
        </div>
      </div>

      {/* Lối tắt khám phá */}
      <section className="container-page mt-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {EXPLORE.map((e) => (
            <Link key={e.to} to={e.to} className="card-hover group flex flex-col items-center gap-2 p-5 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-jade-100 text-jade-600 transition group-hover:bg-jade-600 group-hover:text-white dark:bg-jade-800/60">
                <e.icon size={22} />
              </span>
              <span className="font-serif text-sm font-semibold text-jade-900 dark:text-jade-50">{e.label}</span>
              <span className="text-[11px] text-jade-500">{e.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Di tích nổi bật */}
      <section className="container-page mt-16">
        <SectionHeading
          eyebrow="Di sản văn hoá"
          title="Di tích nổi bật"
          description="Những điểm đến tiêu biểu gắn với vương triều Trần và lịch sử cách mạng vùng Đông Triều."
          action={<Link to="/di-tich" className="btn-ghost">Tất cả di tích <ChevronRight size={16} /></Link>}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {heritages.isLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : heritages.data?.items?.slice(0, 6).map((h) => <HeritageCard key={h.id} item={h} />)}
        </div>
      </section>

      {/* Dải số liệu */}
      <section className="container-page mt-16">
        <div className="grid grid-cols-2 gap-4 rounded-3xl bg-jade-700 p-8 text-white sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center text-center">
              <s.icon size={28} className="mb-2 text-gold-300" />
              <span className="font-serif text-3xl font-bold sm:text-4xl">{s.value}</span>
              <span className="mt-1 text-sm text-jade-100/80">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Lễ hội */}
      <section className="container-page mt-16">
        <SectionHeading
          eyebrow="Mùa lễ hội"
          title="Lễ hội truyền thống"
          description="Từ mùng 9 tháng Giêng, hàng loạt lễ hội nối nhau diễn ra khắp các làng của Đông Triều."
          action={<Link to="/le-hoi" className="btn-ghost">Xem lịch lễ hội <ChevronRight size={16} /></Link>}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.data?.items?.slice(0, 3).map((f) => <FestivalCard key={f.id} item={f} />)}
        </div>
      </section>

      {/* Ẩm thực */}
      <section className="container-page mt-16">
        <SectionHeading
          eyebrow="Hương vị bản địa"
          title="Ẩm thực & đặc sản"
          action={<Link to="/am-thuc" className="btn-ghost">Tất cả đặc sản <ChevronRight size={16} /></Link>}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cuisines.data?.items?.slice(0, 4).map((c) => <CuisineCard key={c.id} item={c} />)}
        </div>
      </section>

      {/* Lưu trú */}
      <section className="container-page mt-16">
        <SectionHeading
          eyebrow="Nghỉ ngơi"
          title="Cơ sở lưu trú"
          action={<Link to="/luu-tru" className="btn-ghost">Tất cả cơ sở <ChevronRight size={16} /></Link>}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {lodgings.data?.items?.slice(0, 3).map((l) => <LodgingCard key={l.id} item={l} />)}
        </div>
      </section>

      {/* Tin tức */}
      {articles.data?.items?.length > 0 && (
        <section className="container-page mt-16">
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

      {/* CTA bản đồ */}
      <section className="container-page mt-16">
        <div className="relative overflow-hidden rounded-3xl bg-jade-800 p-10 text-center text-white">
          <div className="pattern-bg absolute inset-0 opacity-30" />
          <div className="relative">
            <h2 className="font-serif text-2xl font-bold sm:text-3xl">Lên kế hoạch cho chuyến đi của bạn</h2>
            <p className="mx-auto mt-3 max-w-xl text-jade-100/85">
              Xem toàn bộ di tích trên bản đồ, tra cứu đường đi và theo dõi dự báo thời tiết – triều cường trước khi khởi hành.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/ban-do" className="btn-gold"><MapIcon size={16} /> Mở bản đồ</Link>
              <Link to="/thoi-tiet" className="btn-ghost !border-white/30 !bg-white/10 !text-white hover:!bg-white/20">
                <CloudSun size={16} /> Xem thời tiết
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
