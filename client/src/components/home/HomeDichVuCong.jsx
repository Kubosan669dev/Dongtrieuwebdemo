import { Building2, ExternalLink, FileText, Landmark, ScrollText } from 'lucide-react';
import { SectionHeading } from '../ui.jsx';
import { useSettings } from '../../hooks/useSettings.js';

/**
 * Dải "Dịch vụ công" của chế độ Người dân.
 *
 * ── ĐÂY LÀ BẢNG CHỈ ĐƯỜNG, KHÔNG PHẢI NƠI NỘP HỒ SƠ ────────────────────────
 * Cổng này là cổng thông tin du lịch của phường; nó không nhận hồ sơ, không tra
 * được tiến độ, không thay được Cổng dịch vụ công quốc gia. Cám dỗ ở đây là bày
 * mấy ô trông như biểu mẫu cho ra dáng "chính quyền số" — nhưng người dân bấm
 * vào rồi mới biết chẳng nộp được gì thì tệ hơn hẳn việc nói thẳng từ đầu.
 *
 * Nên mọi ô đều là liên kết RA NGOÀI, có dấu ngoặc kép chỉ rõ mở tab mới, và
 * dòng cuối nói đúng phạm vi của cổng. Cùng ranh giới mà trợ lý AI đang giữ:
 * hỏi thủ tục thì chỉ đường tới `dichvucong.gov.vn` chứ không tự nhận.
 *
 * ── VÌ SAO ĐỊA CHỈ CỔNG LẤY TỪ CÀI ĐẶT ─────────────────────────────────────
 * Khoá `hanhChinh.cong` đã giữ sẵn danh sách cổng thông tin kèm nguồn gốc; gõ
 * lại ở đây là tạo ra bản sao thứ hai sẽ lệch đi khi một bên được sửa.
 */
const MAC_DINH = [
  { ten: 'Cổng Dịch vụ công Quốc gia', url: 'https://dichvucong.gov.vn' },
  { ten: 'Cổng thông tin điện tử tỉnh Quảng Ninh', url: 'https://quangninh.gov.vn' },
];

/** Chọn biểu tượng theo tên cổng — không có bảng ánh xạ thì mọi ô trông như nhau. */
function iconCua(ten = '') {
  const t = ten.toLowerCase();
  if (t.includes('dịch vụ công')) return FileText;
  if (t.includes('tỉnh')) return Landmark;
  if (t.includes('phường')) return Building2;
  return ScrollText;
}

/** Bỏ giao thức cho gọn mắt, nhưng vẫn giữ nguyên `href` đầy đủ. */
const gonUrl = (u) => String(u).replace(/^https?:\/\//, '').replace(/\/$/, '');

export default function HomeDichVuCong() {
  const settings = useSettings();
  const hc = settings.hanhChinh;
  const cong = hc?.cong?.length ? hc.cong : MAC_DINH;

  return (
    <section data-vao className="container-page mt-16">
      <SectionHeading
        eyebrow="Cho người dân"
        title="Dịch vụ công & thông tin chính quyền"
        description="Nộp hồ sơ, tra cứu kết quả và xem thông tin chính thức của phường — tất cả đều ở cổng của cơ quan nhà nước, mở ra tab mới."
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cong.map((c) => {
          const Icon = iconCua(c.ten);
          return (
            <li key={c.url}>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card-hover group flex h-full items-start gap-3 p-5"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-jade-100 text-jade-700 dark:bg-jade-800/60 dark:text-jade-200">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-semibold text-jade-900 group-hover:text-jade-600 dark:text-jade-50">
                    {c.ten}
                    <ExternalLink size={13} className="shrink-0 opacity-60" aria-hidden="true" />
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted">{gonUrl(c.url)}</span>
                </span>
                <span className="sr-only">(mở ra tab mới)</span>
              </a>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-sm text-subtle">
        Cổng này là <strong>cổng thông tin</strong> của phường — không nhận hồ sơ và không tra được tiến độ.
        Việc nộp, tra cứu, thanh toán đều thực hiện ở các cổng trên (cần tài khoản định danh điện tử VNeID mức 2).
      </p>
    </section>
  );
}
