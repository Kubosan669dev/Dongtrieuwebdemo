import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Megaphone, PenLine, Phone, Scale } from 'lucide-react';
import PageHero from '../components/PageHero.jsx';
import Seo from '../components/Seo.jsx';
import { SectionHeading } from '../components/ui.jsx';
import { useSettings } from '../hooks/useSettings.js';
import { phoneHref } from '../lib/format.js';

/**
 * `/phan-anh` — chỉ đường cho ba việc mà người dân hay gọi chung là "phản ánh".
 *
 * ── TRANG NÀY CHỦ YẾU LÀM MỘT VIỆC: NÓI KHÔNG ĐÚNG CHỖ ─────────────────────
 * Đây là chỗ ranh giới dễ vượt nhất của cả cổng, và vượt bằng sự tử tế chứ
 * không bằng sự bịa đặt. Người bấm "phản ánh" đang muốn một trong ba việc, mà
 * cổng chỉ làm được MỘT:
 *
 *   1. Báo nội dung sai trên chính cổng này → biểu mẫu Liên hệ NHẬN ĐƯỢC THẬT
 *   2. Phản ánh đời sống (rác, đường, ồn)   → cổng KHÔNG nhận, phải chỉ đường
 *   3. Khiếu nại, tố cáo                    → thủ tục pháp lý, có trình tự riêng
 *
 * Dựng một biểu mẫu "Gửi phản ánh" ở đây thì trông rất chu đáo và rất giống một
 * cổng chính quyền thật. Nhưng đó là hứa hộ chính quyền một việc cổng không làm:
 * bà con gửi chuyện rác thải vào biểu mẫu của cổng du lịch rồi ngồi chờ một hồi
 * âm không bao giờ tới. Nên trang này KHÔNG có biểu mẫu nào ngoài đường dẫn sang
 * trang Liên hệ, và mỗi thẻ nói thẳng cổng nhận được hay không.
 *
 * Cùng ranh giới mà trợ lý AI đang giữ — ba ý định `feedback_portal`,
 * `feedback_ward`, `feedback_legal` trong `server/src/services/chatbot.js`. Sửa
 * một bên thì phải sửa bên kia, nếu không cổng và trợ lý nói hai điều khác nhau.
 */

/** Một luồng phản ánh. `noiBat` = việc duy nhất cổng nhận trực tiếp. */
function Luong({ icon: Icon, tieuDe, nhan, children, hanhDong, noiBat }) {
  return (
    <article className={`card flex flex-col p-6 ${noiBat ? 'ring-2 ring-jade-600/30' : ''}`}>
      <span className="grid h-11 w-11 place-items-center rounded-md bg-jade-100 text-jade-700 dark:bg-jade-800/60 dark:text-jade-200">
        <Icon size={20} aria-hidden="true" />
      </span>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-subtle">{nhan}</p>
      <h2 className="mt-0.5 font-serif text-xl font-semibold text-jade-900 dark:text-jade-50">{tieuDe}</h2>
      <div className="mt-2 flex-1 space-y-2 text-sm text-muted">{children}</div>
      <div className="mt-5">{hanhDong}</div>
    </article>
  );
}

export default function Feedback() {
  const settings = useSettings();
  const c = settings.contact ?? {};
  const ten = c.name || 'UBND phường Đông Triều';

  return (
    <>
      <Seo
        title="Phản ánh & góp ý"
        description="Báo nội dung sai trên cổng, phản ánh chuyện đời sống với chính quyền phường, hoặc khiếu nại tố cáo — ba việc khác nhau, ba nơi khác nhau."
      />
      <PageHero
        title="Phản ánh & góp ý"
        description="Ba việc khác nhau, ba nơi khác nhau. Chọn đúng chỗ ngay từ đầu thì đỡ mất thời gian chờ."
        breadcrumb={[{ label: 'Phản ánh' }]}
      />

      <div className="container-page py-12">
        {/* ── Việc gấp đứng trước mọi thứ khác ──────────────────────────────
            "Cây đổ chắn đường báo ai" mà đáp bằng một đường dẫn tới biểu mẫu web
            thì đúng hình thức nhưng sai việc. Khối này vì thế không nằm trong
            lưới ba thẻ mà đứng riêng ở trên cùng. */}
        <div className="rounded-md bg-gold-50 p-6 ring-1 ring-inset ring-gold-500/30 dark:bg-gold-500/10">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">
            <AlertTriangle size={20} className="shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" />
            Việc gấp thì gọi điện, đừng chờ biểu mẫu
          </h2>
          <p className="mt-2 text-sm text-muted">
            Cháy nổ, tai nạn, đuối nước, trộm cướp, cây đổ chắn đường, ngập sâu — gọi thẳng ba số dưới đây trước,
            mọi việc giấy tờ tính sau.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ['113', 'Công an', 'Cảnh sát phản ứng nhanh'],
              ['114', 'Cứu hoả', 'Chữa cháy & cứu nạn'],
              ['115', 'Cấp cứu', 'Cấp cứu y tế'],
            ].map(([so, ten2, phu]) => (
              <li key={so}>
                <a
                  href={`tel:${so}`}
                  className="card-hover flex items-center gap-3 p-4"
                >
                  <span className="font-serif text-2xl font-bold text-jade-900 dark:text-jade-50">{so}</span>
                  <span>
                    <span className="block text-sm font-semibold text-jade-900 dark:text-jade-50">{ten2}</span>
                    <span className="block text-xs text-muted">{phu}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Ba luồng ── */}
        <section className="mt-14">
          <SectionHeading
            eyebrow="Chọn đúng nơi"
            title="Bạn muốn phản ánh việc gì?"
            description="Cổng này là cổng thông tin du lịch của phường. Nó nhận trực tiếp được đúng một trong ba việc dưới đây, và nói rõ hai việc còn lại phải gửi đi đâu."
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <Luong
              icon={PenLine}
              nhan="Cổng nhận trực tiếp"
              tieuDe="Nội dung sai trên cổng này"
              noiBat
              hanhDong={
                <Link to="/lien-he" className="btn-primary">
                  Gửi qua trang Liên hệ
                </Link>
              }
            >
              <p>
                Sai tên di tích, sai ngày lễ hội, ảnh không đúng chỗ, số điện thoại cũ, trợ lý AI trả lời sai —
                đây là việc cổng sửa được ngay.
              </p>
              <p className="font-medium text-jade-900 dark:text-jade-50">Ghi giúp trong tin nhắn:</p>
              <ul className="space-y-1">
                <li>• Trang nào, mục nào — dán đường dẫn thì nhanh nhất</li>
                <li>• Chỗ nào sai, và thông tin đúng là gì</li>
                <li>• Nguồn của thông tin đúng, nếu bạn có</li>
              </ul>
              <p>
                Nếu là <strong>trợ lý AI</strong> trả lời sai, chép lại nguyên văn câu bạn đã hỏi. Mọi câu hỏi đều
                được ghi lại để rà, nhưng có nguyên văn thì sửa nhanh hơn nhiều.
              </p>
            </Luong>

            <Luong
              icon={Megaphone}
              nhan="Cổng KHÔNG nhận"
              tieuDe="Phản ánh đời sống, hạ tầng"
              hanhDong={
                <a
                  href="https://nguoidan.chinhphu.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost flex items-center gap-1.5"
                >
                  nguoidan.chinhphu.vn <ExternalLink size={14} aria-hidden="true" />
                </a>
              }
            >
              <p>Rác thải, đường hỏng, đèn đường, tiếng ồn, trật tự đô thị, xây dựng sai phép.</p>
              <p className="rounded-md bg-jade-50 p-3 text-jade-900 ring-1 ring-inset ring-jade-900/[0.08] dark:bg-jade-800/50 dark:text-jade-50 dark:ring-white/10">
                <strong>Gửi vào cổng này thì không tới được đúng người.</strong> Đây là cổng thông tin du lịch,
                không phải kênh tiếp nhận phản ánh của chính quyền.
              </p>
              <p>
                Gọi hoặc tới thẳng {ten}
                {c.phone && (
                  <>
                    {' '}—{' '}
                    <a href={phoneHref(c.phone)} className="font-semibold text-jade-800 underline dark:text-jade-100">
                      {c.phone}
                    </a>
                  </>
                )}
                . Hoặc gửi qua cổng của Chính phủ để có <strong>mã hồ sơ theo dõi tiến độ</strong> — thứ mà gọi
                điện không có.
              </p>
              <p className="text-subtle">
                Mất điện, mất nước thì gọi thẳng tổng đài điện lực hoặc công ty nước, nhanh hơn qua phường.
              </p>
            </Luong>

            <Luong
              icon={Scale}
              nhan="Cổng KHÔNG nhận thay"
              tieuDe="Khiếu nại, tố cáo"
              hanhDong={
                <a
                  href="https://dichvucong.gov.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost flex items-center gap-1.5"
                >
                  dichvucong.gov.vn <ExternalLink size={14} aria-hidden="true" />
                </a>
              }
            >
              <p>
                Là thủ tục có trình tự và thời hạn theo luật, cần <strong>đơn có chữ ký</strong> và giấy tờ tuỳ thân.
                Một cổng thông tin không đứng ra nhận được, và cũng không nên — nhận rồi để đó là làm hỏng thời hiệu
                của chính người gửi.
              </p>
              <p className="font-medium text-jade-900 dark:text-jade-50">Ba đường đi đúng:</p>
              <ul className="space-y-1">
                <li>• Nộp trực tiếp tại bộ phận tiếp công dân của {ten}</li>
                <li>• Nộp trực tuyến qua Cổng dịch vụ công (cần VNeID mức 2)</li>
                <li>• Gửi qua hệ thống phản ánh, kiến nghị của Chính phủ</li>
              </ul>
            </Luong>
          </div>
        </section>

        {/* ── Gửi thế nào cho nhanh được xử lý ── */}
        <section className="mt-14">
          <div className="card p-6">
            <h2 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">
              Viết gì để phản ánh được xử lý nhanh
            </h2>
            <p className="mt-2 text-sm text-muted">
              Áp dụng cho cả ba luồng trên. Phần lớn phản ánh bị chậm không phải vì không ai đọc, mà vì người đọc
              không xác định được chỗ nào, lúc nào.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['Ở đâu', 'Khu phố nào, số nhà hoặc một mốc dễ nhận (cổng trường, ngã ba, cây đa)'],
                ['Khi nào', 'Ngày giờ xảy ra, hoặc "kéo dài từ khoảng tháng nào"'],
                ['Việc gì', 'Một câu tả thẳng, không cần văn hoa'],
                ['Bằng chứng', 'Ảnh chụp là thứ có sức nặng nhất; kèm được thì kèm'],
                ['Liên hệ lại', 'Số điện thoại của bạn, để cán bộ gọi hỏi thêm khi cần'],
                ['Đã báo chưa', 'Nếu đã báo lần trước mà chưa được xử lý, nói rõ đã báo ngày nào'],
              ].map(([nhan, mo]) => (
                <li key={nhan} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 rounded bg-jade-100 px-2 py-0.5 text-xs font-semibold text-jade-700 dark:bg-jade-800/60 dark:text-jade-200">
                    {nhan}
                  </span>
                  <span className="text-sm text-muted">{mo}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Lối ra ── */}
        <section className="mt-8 flex flex-wrap gap-3">
          <Link to="/lien-he" className="btn-primary">
            <Phone size={16} /> Thông tin liên hệ của phường
          </Link>
          <Link to="/hanh-chinh" className="btn-ghost">
            Trụ sở & cổng thông tin chính thức
          </Link>
        </section>
      </div>
    </>
  );
}
