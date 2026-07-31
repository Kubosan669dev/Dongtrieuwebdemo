import { Link } from 'react-router-dom';
import { ArrowRight, Landmark, CalendarDays, BedDouble, UtensilsCrossed } from 'lucide-react';
import PagodaMotif from '../PagodaMotif.jsx';

/**
 * Khối mở đầu trang chủ: một đoạn giới thiệu ngắn + dải số liệu.
 *
 * Gộp hai khối thành một. Bản trước có "Dải số liệu" đứng riêng ở giữa trang, bốn
 * con số trên nền xanh mà không câu nào nói đây là số liệu của cái gì — người mới
 * vào trang đọc "13 · 17 · 21 · 8" thì không rút ra được điều gì. Đặt cạnh đoạn
 * giới thiệu thì mỗi con số trở thành một bằng chứng cho câu vừa đọc.
 *
 * Số liệu lấy từ `/api/stats` (đếm thật trong cơ sở dữ liệu). Chưa có số thì để
 * dấu gạch chứ không đoán: đây là số liệu chính thức của phường, hiện sai còn tệ
 * hơn hiện chậm một nhịp.
 */
const STATS = [
  { icon: Landmark, key: 'heritages', label: 'Cụm di tích xếp hạng' },
  { icon: CalendarDays, key: 'festivals', label: 'Lễ hội truyền thống' },
  { icon: BedDouble, key: 'lodgings', label: 'Cơ sở lưu trú' },
  { icon: UtensilsCrossed, key: 'cuisines', label: 'Đặc sản tiêu biểu' },
];

/**
 * Đoạn mặc định khi quản trị viên chưa nhập gì trong Cài đặt → "Giới thiệu ngắn".
 * Cố ý không nêu con số nào trong câu: mọi con số đã nằm ở dải bên phải và lấy từ
 * cơ sở dữ liệu, viết lại vào đây là tạo ra một chỗ nữa để bị lệch.
 */
const INTRO_MAC_DINH =
  'Đông Triều là quê gốc và nơi yên nghỉ của các vị vua triều Trần, một trong ba trung tâm văn hoá – ' +
  'chính trị – tôn giáo tiêu biểu của nước Đại Việt cùng Thăng Long và Thiên Trường. Vùng đất này giữ ' +
  'quần thể di tích quốc gia đặc biệt nhà Trần, mạch thiền Trúc Lâm, và một lịch lễ hội trải gần như ' +
  'suốt năm theo âm lịch.';

export default function HomeIntro({ intro, counts }) {
  return (
    <section data-vao className="container-page mt-14">
      <div className="grid items-center gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <p className="eyebrow">Về vùng đất này</p>
          <h2 className="section-title mt-2">Ba trung tâm của Đại Việt, một trong số đó ở đây</h2>
          <p className="mt-4 leading-relaxed text-jade-700 dark:text-jade-200">{intro || INTRO_MAC_DINH}</p>
          <Link to="/gioi-thieu" className="btn-ghost mt-5">
            Đọc phần giới thiệu đầy đủ <ArrowRight size={16} />
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-jade-700 p-6 text-white lg:col-span-2">
          <PagodaMotif className="text-white" opacity={0.08} scale={130} />
          <div className="relative grid grid-cols-2 gap-5">
            {STATS.map((s) => (
              <div key={s.key}>
                <s.icon size={22} className="mb-1.5 text-gold-300" />
                <p className="font-serif text-3xl font-bold leading-none tabular-nums">{counts?.[s.key] ?? '—'}</p>
                <p className="mt-1.5 text-xs leading-snug text-jade-100/80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
