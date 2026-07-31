import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Landmark, CalendarDays, Mountain, BedDouble, UtensilsCrossed, Store, Newspaper, Images,
  ImageOff, PhoneCall, Bot, Star, Inbox, MapPinOff, MapPin, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { Spinner, ErrorNote } from '../../components/ui.jsx';
import { formatDate, cx } from '../../lib/format.js';

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

/**
 * Việc cần làm.
 *
 * Đặt TRÊN dải số liệu vì đây mới là lý do quản trị viên mở trang này: "còn gì
 * chờ tôi không". Số lượng bản ghi thì họ đã biết rồi.
 *
 * Ô "thiếu toạ độ" là chỗ đóng vòng lặp của bản đồ số: bản đồ chỉ tốt khi toạ độ
 * được điền, mà việc điền toạ độ thì không ai tự nhớ ra — nên Tổng quan phải là
 * nơi nhắc.
 */
const VIEC = [
  {
    key: 'reviewsPending',
    icon: Star,
    label: 'đánh giá chờ duyệt',
    mo: 'Đánh giá của du khách chỉ hiện trên trang sau khi được duyệt tại đây.',
    to: '/admin/phan-hoi',
    nut: 'Duyệt đánh giá',
    tone: 'gold',
  },
  {
    key: 'contactsPending',
    icon: Inbox,
    label: 'tin liên hệ chưa xử lý',
    mo: 'Không có email báo tự động — đây là nơi duy nhất đọc được tin khách gửi.',
    to: '/admin/phan-hoi',
    nut: 'Đọc tin',
    tone: 'gold',
  },
  {
    key: 'coordsMissing',
    icon: MapPinOff,
    label: 'địa điểm chưa có toạ độ',
    mo: 'Những điểm này KHÔNG hiện trên bản đồ số. Mở bản ghi rồi bấm "Chọn trên bản đồ" là xong trong ba giây.',
    to: '/admin/luu-tru',
    nut: 'Bổ sung toạ độ',
    tone: 'terra',
  },
  {
    key: 'coordsEstimated',
    icon: MapPin,
    label: 'toạ độ chưa xác minh',
    mo: 'Máy dò theo địa chỉ nên chỉ rơi vào giữa làng hoặc giữa xã. Bản đồ công khai vẽ nét đứt cho đến khi có người kéo ghim đúng chỗ.',
    to: '/admin/di-tich',
    nut: 'Xác minh vị trí',
    tone: 'jade',
  },
];

/**
 * Dải `terra` CHỈ có ba nấc 400 / 500 / 600 (xem `ramp('terra', …)` trong
 * tailwind.config.js) — không có 50, 200, 800 hay 900. Viết `bg-terra-50` thì
 * Tailwind không sinh ra lớp nào và ô mất nền mà không có lỗi nào báo.
 * Với terra phải dùng ba nấc đó kèm độ mờ, đúng như `mapKinds.js` vẫn làm.
 */
const TONE = {
  gold: 'bg-gold-50 ring-gold-200 text-gold-800 dark:bg-gold-900/20 dark:ring-gold-800/40 dark:text-gold-200',
  terra: 'bg-terra-500/10 ring-terra-500/30 text-terra-600 dark:bg-terra-500/15 dark:text-terra-400',
  jade: 'bg-jade-50 ring-jade-200 text-jade-800 dark:bg-jade-900/40 dark:ring-jade-700 dark:text-jade-100',
};

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api.get('/admin/stats') });
  if (isLoading) return <Spinner />;
  if (isError) return <ErrorNote onRetry={refetch} />;

  const { counts, heritagesWithoutCover, restaurantsUnverified, chat, recentArticles, todo = {} } = data;
  const conViec = VIEC.filter((v) => (todo[v.key] ?? 0) > 0);

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold">Tổng quan</h1>
      <p className="mt-1 text-jade-500">Quản lý toàn bộ nội dung cổng thông tin Khám phá Đông Triều.</p>

      {/* ── Việc cần làm ── */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-jade-500">Việc cần làm</h2>
        {conViec.length === 0 ? (
          // Nói rõ là đã xong, không để một khoảng trống câm khiến người dùng
          // tưởng khối này hỏng.
          <p className="flex items-center gap-2 rounded-2xl bg-jade-50 p-4 text-sm text-jade-700 ring-1 ring-jade-200 dark:bg-jade-900/40 dark:text-jade-200 dark:ring-jade-700">
            <CheckCircle2 size={18} className="shrink-0 text-jade-600 dark:text-jade-300" />
            Không còn việc nào đang chờ. Mọi phản hồi đã xử lý và mọi địa điểm đã có toạ độ đã xác minh.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {conViec.map((v) => (
              <div key={v.key} className={cx('flex items-start gap-3 rounded-2xl p-4 ring-1', TONE[v.tone])}>
                <v.icon size={20} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">
                    <span className="tabular-nums">{todo[v.key]}</span> {v.label}
                  </p>
                  <p className="mt-1 text-sm opacity-80">{v.mo}</p>
                  <Link to={v.to} className="btn-ghost btn-sm mt-3">
                    {v.nut} <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-jade-500">Nội dung đang có</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
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
              đang hiện nhãn cảnh báo. Sau khi gọi kiểm tra, hãy bật công tắc “Đã gọi xác minh” để gỡ nhãn.
            </p>
            <Link to="/admin/nha-hang" className="btn-ghost mt-3 !py-2 text-xs">Xem danh sách</Link>
          </div>
        </div>
      )}

      {/* Cùng lý do như chú thích ở `TONE`: dải terra không có nấc 50/200/700/800/
          900, nên khối này trước đây mất hẳn nền và viền — không ai để ý vì nó chỉ
          hiện khi trợ lý AI có câu chưa trả lời được. */}
      {chat?.unmatched > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-terra-500/10 p-5 ring-1 ring-terra-500/30 dark:bg-terra-500/15">
          <Bot size={22} className="mt-0.5 shrink-0 text-terra-600 dark:text-terra-400" />
          <div>
            <p className="font-semibold text-terra-600 dark:text-terra-400">
              Trợ lý AI chưa trả lời được {chat.unmatched}/{chat.total} câu hỏi
            </p>
            <p className="mt-1 text-sm text-jade-700 dark:text-jade-200">
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
