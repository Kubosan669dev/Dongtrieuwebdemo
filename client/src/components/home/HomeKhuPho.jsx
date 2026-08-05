import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { SectionHeading } from '../ui.jsx';
import { useSettings } from '../../hooks/useSettings.js';

/**
 * Lưới 11 khu phố trên trang chủ chế độ Người dân.
 *
 * ── VÌ SAO HIỆN TÊN KHU CŨ NGAY TRÊN THẺ ───────────────────────────────────
 * Câu hỏi thật của bà con không phải "khu phố Mễ Xá có gì" mà là "khu Thủ Dương
 * của tôi giờ thuộc đâu". Thẻ nào cũng in kèm danh sách khu cũ đã gộp vào, nên
 * người đọc dò bằng mắt được ngay ở trang chủ, không phải mở thêm trang rồi mới
 * biết mình cần gõ gì vào ô tìm.
 *
 * Trang `/khu-pho` vẫn là nơi tra đầy đủ (ô tìm khớp cả tên cũ, bỏ dấu hai
 * phía); khối này chỉ là lối vào.
 */
export default function HomeKhuPho() {
  const settings = useSettings();
  const list = settings.khuPho?.danhSach ?? [];
  if (!list.length) return null;

  return (
    <section data-vao className="container-page mt-16">
      <SectionHeading
        eyebrow="Sau sắp xếp 2025"
        title={`${list.length} khu phố của phường`}
        description="36 khu phố cũ nay gộp thành 11 khu. Tìm tên khu cũ của mình trong danh sách dưới để biết giờ thuộc khu nào."
        action={
          <Link to="/khu-pho" className="btn-ghost">
            Tra cứu đầy đủ <ChevronRight size={16} />
          </Link>
        }
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((k) => (
          <li key={k.ten}>
            <Link to="/khu-pho" className="card-hover group block h-full p-5">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-sm font-semibold text-gold-600 dark:text-gold-400">{k.so}</span>
                <h3 className="font-serif text-lg font-semibold text-jade-900 group-hover:text-jade-600 dark:text-jade-50">
                  Khu phố {k.ten}
                </h3>
              </div>
              {k.gom && <p className="mt-1.5 text-sm text-muted">Gồm: {k.gom}</p>}
              <p className="mt-2 text-xs text-subtle">
                {k.soHo ? `${Number(k.soHo).toLocaleString('vi-VN')} hộ` : ''}
                {k.soHo && k.nhanKhau ? ' · ' : ''}
                {k.nhanKhau ? `${Number(k.nhanKhau).toLocaleString('vi-VN')} nhân khẩu` : ''}
                {k.nhaVanHoa ? ` · Nhà văn hoá: ${k.nhaVanHoa}` : ''}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
