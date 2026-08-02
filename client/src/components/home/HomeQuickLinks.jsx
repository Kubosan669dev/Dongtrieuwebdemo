import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPinned, Phone, Search } from 'lucide-react';
import MiniWeather from '../MiniWeather.jsx';

/**
 * Khối tra cứu nhanh, nằm đè lên đáy ảnh bìa trang chủ.
 *
 * Thay dải "ô tìm + thời tiết" của bản trước. Dải đó chỉ có một lối đi duy nhất
 * là gõ chữ, mà người mở cổng thông tin của phường phần lớn không tới với một từ
 * khoá sẵn trong đầu — họ tới với một VIỆC: xem khu mình giờ tên gì, tháng này
 * làng có hội chưa, gọi cho phường ở số nào.
 *
 * ── VÌ SAO Ô TÌM VẪN CÒN ────────────────────────────────────────────────────
 * Đây là ô tìm toàn cổng DUY NHẤT, đường vào `/di-tich?q=`. Bỏ hẳn là mất một
 * chức năng thật chứ không phải dọn bớt giao diện, nên nó ở lại làm hàng đầu của
 * chính khối này, còn bốn lối đi xếp bên dưới.
 */
const LOI_DI = [
  {
    to: '/khu-pho',
    icon: MapPinned,
    nhan: 'Khu phố của tôi',
    phu: '36 khu cũ → 11 khu mới',
  },
  {
    to: '/le-hoi',
    icon: CalendarDays,
    nhan: 'Lễ hội sắp tới',
    phu: 'Lịch theo âm lịch',
  },
  {
    to: '/lien-he',
    icon: Phone,
    nhan: 'Liên hệ phường',
    phu: 'Địa chỉ, điện thoại, góp ý',
  },
];

export default function HomeQuickLinks() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/di-tich?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="container-page relative z-10 -mt-10">
      <div className="card p-4 sm:p-5">
        <form
          onSubmit={onSearch}
          className="flex items-center gap-2 rounded-md bg-jade-50 px-4 ring-1 ring-inset ring-jade-900/[0.12] focus-within:ring-2 focus-within:ring-jade-500 dark:bg-jade-800/60 dark:ring-white/10"
        >
          <Search size={18} className="shrink-0 text-subtle" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm di tích, lễ hội, đặc sản…"
            aria-label="Tìm kiếm trên cổng thông tin"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-ink/50 dark:placeholder:text-jade-50/50"
          />
          <button className="btn-primary btn-sm shrink-0">Tìm</button>
        </form>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LOI_DI.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="group flex items-center gap-3 rounded-md p-3 ring-1 ring-inset ring-jade-900/[0.12] transition hover:bg-jade-50 hover:ring-jade-600 dark:ring-white/10 dark:hover:bg-jade-800/50"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-jade-600 text-white transition group-hover:bg-jade-700">
                <l.icon size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-jade-900 dark:text-jade-50">{l.nhan}</span>
                <span className="block truncate text-xs text-muted">{l.phu}</span>
              </span>
            </Link>
          ))}
          {/* Thời tiết là ô thứ tư — nó tự mang sẵn số liệu nên không cần khung
              giống ba ô kia, và cũng không dẫn đi đâu bắt buộc. */}
          <MiniWeather />
        </div>
      </div>
    </div>
  );
}
