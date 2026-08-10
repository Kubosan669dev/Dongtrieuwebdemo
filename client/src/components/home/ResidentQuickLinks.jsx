import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Landmark, MapPinned, Megaphone, Newspaper, Phone, ScrollText, Search } from 'lucide-react';

/**
 * Dải lối đi nhanh của cổng người dân.
 *
 * ── VÌ SAO KHÔNG DÙNG LẠI `HomeQuickLinks` CỦA CỔNG DU LỊCH ────────────────
 * Khối bên kia đè lên đáy ảnh bìa (`-mt-10`), nên tách khỏi ảnh bìa là nó lơ
 * lửng. Ô tìm cũng khác đích: bên du lịch tìm vào `/di-tich`, còn ở đây người
 * hỏi phần lớn đang tìm TÊN KHU CŨ của mình, nên nó dẫn thẳng vào ô tra cứu của
 * trang Khu phố.
 *
 * Dùng chung một khối rồi cắm cờ để nó cư xử hai kiểu thì rẻ hơn lúc viết, mà
 * mỗi lần sửa một bên lại phải nhớ kiểm bên kia. Hai cổng đã tách hẳn thì hai
 * khối cũng nên tách hẳn.
 */
const LOI_DI = [
  { to: '/khu-pho', icon: MapPinned, nhan: 'Khu phố của tôi', phu: '36 khu cũ → 11 khu mới' },
  { to: '/hanh-chinh', icon: Landmark, nhan: 'Hành chính phường', phu: 'Mã bưu chính, đơn vị cũ, trụ sở' },
  { to: '/thu-tuc', icon: ClipboardList, nhan: 'Thủ tục đất đai', phu: '19 việc làm ngay tại phường' },
  { to: '/van-ban', icon: ScrollText, nhan: 'Văn bản chỉ đạo', phu: 'Quyết định xếp hạng di tích' },
  { to: '/phan-anh', icon: Megaphone, nhan: 'Phản ánh & góp ý', phu: 'Gửi đúng nơi ngay từ đầu' },
  { to: '/tin-tuc', icon: Newspaper, nhan: 'Thông báo mới', phu: 'Tin của chính quyền phường' },
  { to: '/lien-he', icon: Phone, nhan: 'Liên hệ phường', phu: 'Địa chỉ, điện thoại, số khẩn cấp' },
];

export default function ResidentQuickLinks() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const timKhuPho = (e) => {
    e.preventDefault();
    const s = q.trim();
    // Trang Khu phố đọc `?q=` và khớp cả tên khu CŨ, bỏ dấu hai phía.
    navigate(s ? `/khu-pho?q=${encodeURIComponent(s)}` : '/khu-pho');
  };

  return (
    <div className="container-page mt-10">
      <div className="card p-4 sm:p-5">
        <label htmlFor="tim-khu-cu" className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
          Khu cũ của bạn giờ thuộc khu phố nào?
        </label>
        <form
          onSubmit={timKhuPho}
          className="mt-1.5 flex items-center gap-2 rounded-md bg-jade-50 px-4 ring-1 ring-inset ring-jade-900/[0.12] focus-within:ring-2 focus-within:ring-jade-500 dark:bg-jade-800/60 dark:ring-white/10"
        >
          <Search size={18} className="shrink-0 text-subtle" aria-hidden="true" />
          <input
            id="tim-khu-cu"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Gõ tên khu cũ: Thủ Dương, Mỹ Cụ 2, Nguyễn Huệ 7…"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-ink/50 dark:placeholder:text-jade-50/50"
          />
          <button className="btn-primary btn-sm shrink-0">Tra</button>
        </form>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </div>
    </div>
  );
}
