import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Landmark, CalendarDays, Mountain, BedDouble, UtensilsCrossed, Store, Newspaper, Images, ImageOff, PhoneCall, Bot } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Spinner } from '../../components/ui.jsx';
import { formatDate } from '../../lib/format.js';

const CARDS = [
  { key: 'heritages', icon: Landmark, label: 'Di tích', to: '/admin/di-tich', color: 'bg-jade-600' },
  { key: 'festivals', icon: CalendarDays, label: 'Lễ hội', to: '/admin/le-hoi', color: 'bg-gold-500' },
  { key: 'attractions', icon: Mountain, label: 'Điểm lân cận', to: '/admin/diem-lan-can', color: 'bg-jade-800' },
  { key: 'lodgings', icon: BedDouble, label: 'Lưu trú', to: '/admin/luu-tru', color: 'bg-terra-500' },
  { key: 'cuisines', icon: UtensilsCrossed, label: 'Ẩm thực', to: '/admin/am-thuc', color: 'bg-jade-500' },
  { key: 'restaurants', icon: Store, label: 'Nhà hàng', to: '/admin/nha-hang', color: 'bg-gold-600' },
  { key: 'articles', icon: Newspaper, label: 'Bài viết', to: '/admin/bai-viet', color: 'bg-jade-700' },
  { key: 'media', icon: Images, label: 'Ảnh', to: '/admin/thu-vien', color: 'bg-terra-600' },
];

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api.get('/admin/stats') });
  if (isLoading) return <Spinner />;

  const { counts, heritagesWithoutCover, restaurantsUnverified, chat, recentArticles } = data;

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold">Tổng quan</h1>
      <p className="mt-1 text-jade-500">Quản lý toàn bộ nội dung cổng thông tin du lịch Đông Triều.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
        {CARDS.map((c) => (
          <Link key={c.key} to={c.to} className="card p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
            <span className={`mb-3 grid h-10 w-10 place-items-center rounded-xl text-white ${c.color}`}>
              <c.icon size={20} />
            </span>
            <p className="font-serif text-2xl font-bold">{counts[c.key] ?? 0}</p>
            <p className="text-xs text-jade-500">{c.label}</p>
          </Link>
        ))}
      </div>

      {heritagesWithoutCover > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-gold-50 p-5 ring-1 ring-gold-200 dark:bg-gold-900/20 dark:ring-gold-800/40">
          <ImageOff size={22} className="mt-0.5 shrink-0 text-gold-600" />
          <div>
            <p className="font-semibold text-gold-800 dark:text-gold-200">
              {heritagesWithoutCover} di tích chưa có ảnh bìa
            </p>
            <p className="mt-1 text-sm text-gold-700/80 dark:text-gold-200/70">
              Website đang dùng ảnh bìa placeholder cho các di tích này. Hãy tải ảnh thật lên để trang trông
              thuyết phục hơn với du khách.
            </p>
            <Link to="/admin/di-tich" className="btn-gold mt-3 !py-2 text-xs">Cập nhật ảnh di tích</Link>
          </div>
        </div>
      )}

      {restaurantsUnverified > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-jade-50 p-5 ring-1 ring-jade-200 dark:bg-jade-900/40 dark:ring-jade-700">
          <PhoneCall size={22} className="mt-0.5 shrink-0 text-jade-600" />
          <div>
            <p className="font-semibold text-jade-800 dark:text-jade-100">
              {restaurantsUnverified} cơ sở ăn uống chưa xác minh
            </p>
            <p className="mt-1 text-sm text-jade-600 dark:text-jade-300">
              Thông tin tổng hợp từ Internet nên số điện thoại, địa chỉ có thể đã thay đổi. Trang công khai
              đang hiện nhãn cảnh báo. Sau khi gọi kiểm tra, hãy bật công tắc "Đã gọi xác minh" để gỡ nhãn.
            </p>
            <Link to="/admin/nha-hang" className="btn-ghost mt-3 !py-2 text-xs">Xem danh sách</Link>
          </div>
        </div>
      )}

      {chat?.unmatched > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-terra-50 p-5 ring-1 ring-terra-200 dark:bg-terra-900/20 dark:ring-terra-800/40">
          <Bot size={22} className="mt-0.5 shrink-0 text-terra-600" />
          <div>
            <p className="font-semibold text-terra-800 dark:text-terra-200">
              Trợ lý AI chưa trả lời được {chat.unmatched}/{chat.total} câu hỏi
            </p>
            <p className="mt-1 text-sm text-terra-700/80 dark:text-terra-200/70">
              Trợ lý chỉ trả lời bằng dữ liệu của phường. Xem du khách hỏi gì mà bot chịu thua, rồi bổ
              sung nội dung tương ứng — đó là cách làm bot thông minh hơn.
            </p>
            <Link to="/admin/tro-ly-ai" className="btn-ghost mt-3 !py-2 text-xs">Xem nhật ký trợ lý</Link>
          </div>
        </div>
      )}

      <div className="mt-6 card p-6">
        <h2 className="mb-4 font-serif text-lg font-semibold">Bài viết cập nhật gần đây</h2>
        {recentArticles.length === 0 ? (
          <p className="text-sm text-jade-500">Chưa có bài viết.</p>
        ) : (
          <div className="divide-y divide-jade-900/5 dark:divide-white/5">
            {recentArticles.map((a) => (
              <Link key={a.id} to="/admin/bai-viet" className="flex items-center justify-between py-3 hover:text-jade-600">
                <span className="text-sm font-medium">{a.title}</span>
                <span className="flex items-center gap-3 text-xs text-jade-400">
                  <span className={a.published ? 'text-jade-600' : 'text-gold-600'}>
                    {a.published ? 'Đã xuất bản' : 'Bản nháp'}
                  </span>
                  {formatDate(a.updatedAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
