import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { fetchList } from '../lib/api.js';
import Seo from '../components/Seo.jsx';
import HomeTongQuan from '../components/home/HomeTongQuan.jsx';
import HomeDichVuCong from '../components/home/HomeDichVuCong.jsx';
import HomeKhuPho from '../components/home/HomeKhuPho.jsx';
import HomePhanAnh from '../components/home/HomePhanAnh.jsx';
import HomeContact from '../components/home/HomeContact.jsx';
import ResidentQuickLinks from '../components/home/ResidentQuickLinks.jsx';
import { ArticleCard } from '../components/cards.jsx';
import { SectionHeading, ErrorNote, SkeletonCard } from '../components/ui.jsx';

/**
 * `/nguoi-dan` — trang chủ của cổng dành cho người trong phường.
 *
 * ── TRANG NÀY KHÔNG DÙNG CHUNG GÌ VỚI `/` ──────────────────────────────────
 * Không ảnh bìa xoay vòng, không di tích nổi bật, không ẩm thực, không lưu trú.
 * Đó không phải cắt bớt cho gọn: người mở cổng này đang có một VIỆC — tra khu
 * phố mình giờ tên gì, xem phường có thông báo gì mới, tìm chỗ gửi phản ánh.
 * Một băng ảnh cao 440px đặt trên đầu chỉ đẩy việc của họ xuống dưới màn hình.
 *
 * Vì thế nó mở đầu bằng khối tổng quan có số liệu thật, rồi tới các lối đi.
 * Muốn xem di tích, lễ hội, ẩm thực thì bấm nút chuyển cổng ở đầu trang — một
 * cái cửa thấy được, chứ không phải trượt sang lúc nào không biết.
 */
export default function Resident() {
  const articles = useQuery({ queryKey: ['articles', 'nguoi-dan'], queryFn: () => fetchList('articles') });

  return (
    <div className="pb-20">
      <Seo
        title="Cổng người dân phường Đông Triều"
        description="Dành cho bà con trong phường: tra 11 khu phố sau sắp xếp, mã bưu chính và thông tin hành chính, thông báo của phường, và chỗ gửi phản ánh đúng nơi."
      />

      {/* 1. Phường mình là đơn vị nào, rộng bao nhiêu, ghi địa chỉ ra sao */}
      <HomeTongQuan />

      {/* 2. Bốn lối đi hay dùng nhất + ô tìm */}
      <ResidentQuickLinks />

      {/* 3. Khu mình giờ tên gì — câu hỏi thường gặp nhất sau sắp xếp */}
      <HomeKhuPho />

      {/* 4. Nộp hồ sơ, tra cứu ở đâu (đều là cổng của cơ quan nhà nước) */}
      <HomeDichVuCong />

      {/* 5. Thông báo của phường */}
      <section data-vao className="container-page mt-16">
        <SectionHeading
          eyebrow="Tin của phường"
          title="Tin tức & thông báo"
          description="Thông báo của chính quyền, lịch làm việc, tin đời sống trên địa bàn."
          action={
            <Link to="/tin-tuc" className="btn-ghost">
              Tất cả thông báo <ChevronRight size={16} />
            </Link>
          }
        />
        {articles.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : articles.isError ? (
          <ErrorNote onRetry={articles.refetch} />
        ) : articles.data?.items?.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.data.items.slice(0, 3).map((a) => <ArticleCard key={a.id} item={a} />)}
          </div>
        ) : (
          <p className="text-sm text-muted">Chưa có thông báo nào được đăng.</p>
        )}
      </section>

      {/* 6. Phản ánh, góp ý — ba việc, ba nơi */}
      <HomePhanAnh />

      {/* 7. Liên hệ UBND phường */}
      <HomeContact />
    </div>
  );
}
