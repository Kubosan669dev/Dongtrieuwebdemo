import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Megaphone, PenLine, Scale } from 'lucide-react';
import { SectionHeading } from '../ui.jsx';

/**
 * Khối "Phản ánh & góp ý" trên trang chủ chế độ Người dân.
 *
 * ── CỐ Ý CHỈ LÀ TÓM TẮT, NỘI DUNG THẬT Ở `/phan-anh` ───────────────────────
 * Bản đầu dựng đủ ba thẻ với toàn bộ hướng dẫn ngay tại đây. Sau khi tách ra
 * trang riêng thì hai chỗ thành hai bản chép của cùng một nội dung — mà đây lại
 * đúng là loại nội dung không được phép lệch nhau: nó nói cổng nhận việc gì và
 * KHÔNG nhận việc gì. Hai bản chép thì sớm muộn một bản sẽ cũ đi, và bản cũ hứa
 * hộ chính quyền một việc bản mới đã rút lại.
 *
 * Nên khối này chỉ giữ ba dòng đủ để người đọc tự nhận ra mình thuộc nhóm nào,
 * còn mọi hướng dẫn chi tiết nằm ở một chỗ duy nhất.
 */
const LUONG = [
  {
    icon: PenLine,
    tieuDe: 'Nội dung sai trên cổng này',
    mo: 'Sai tên di tích, sai ngày lễ hội, trợ lý trả lời sai',
    nhan: 'Cổng nhận trực tiếp',
    noiBat: true,
  },
  {
    icon: Megaphone,
    tieuDe: 'Phản ánh đời sống, hạ tầng',
    mo: 'Rác thải, đường hỏng, đèn đường, tiếng ồn',
    nhan: 'Cổng không nhận — có nơi khác',
  },
  {
    icon: Scale,
    tieuDe: 'Khiếu nại, tố cáo',
    mo: 'Thủ tục có trình tự, thời hạn, cần đơn có chữ ký',
    nhan: 'Cổng không nhận thay',
  },
];

export default function HomePhanAnh() {
  return (
    <section data-vao className="container-page mt-16">
      <SectionHeading
        eyebrow="Cho người dân"
        title="Phản ánh & góp ý"
        description="Ba việc khác nhau, ba nơi khác nhau. Cổng này nhận trực tiếp được đúng một trong ba."
        action={
          <Link to="/phan-anh" className="btn-ghost">
            Hướng dẫn đầy đủ <ChevronRight size={16} />
          </Link>
        }
      />

      {/* Việc gấp đứng trước — "cây đổ chắn đường" mà đáp bằng đường dẫn tới một
          biểu mẫu web thì đúng hình thức nhưng sai việc. */}
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-gold-50 p-4 ring-1 ring-inset ring-gold-500/25 dark:bg-gold-500/10">
        <span className="flex items-center gap-2 font-semibold text-jade-900 dark:text-jade-50">
          <AlertTriangle size={18} className="shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" />
          Việc gấp thì gọi điện, đừng chờ biểu mẫu
        </span>
        <span className="text-sm text-muted">
          <a href="tel:113" className="font-semibold text-jade-800 underline dark:text-jade-100">113</a> Công an ·{' '}
          <a href="tel:114" className="font-semibold text-jade-800 underline dark:text-jade-100">114</a> Cứu hoả, cứu nạn ·{' '}
          <a href="tel:115" className="font-semibold text-jade-800 underline dark:text-jade-100">115</a> Cấp cứu
        </span>
      </div>

      <ul className="grid gap-4 lg:grid-cols-3">
        {LUONG.map((l) => (
          <li key={l.tieuDe}>
            <Link
              to="/phan-anh"
              className={`card-hover group flex h-full items-start gap-3 p-5 ${l.noiBat ? 'ring-2 ring-jade-600/30' : ''}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-jade-100 text-jade-700 dark:bg-jade-800/60 dark:text-jade-200">
                <l.icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-subtle">{l.nhan}</span>
                <span className="mt-0.5 block font-semibold text-jade-900 group-hover:text-jade-600 dark:text-jade-50">
                  {l.tieuDe}
                </span>
                <span className="mt-0.5 block text-sm text-muted">{l.mo}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
