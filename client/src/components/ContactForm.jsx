import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Send, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api.js';
import { HONEYPOT_FIELD } from '../../../shared/antispam.js';

/**
 * Biểu mẫu gửi phản hồi / liên hệ.
 *
 * Chỉ có MỘT bản trong cả site, đặt ở trang /lien-he. Cố ý không nhân bản xuống
 * trang chủ: mỗi bản là một chỗ nữa phải cùng lúc đúng về kiểm dữ liệu, ô bẫy
 * chống bot và câu thông báo lỗi — và chỗ bị quên sẽ là chỗ ít người để ý hơn.
 *
 * Không có CAPTCHA. Ba lớp chống spam nằm ở phía máy chủ (giới hạn tần suất, ô
 * bẫy, chặn liên kết) — xem `server/src/lib/antispam.js`.
 */
export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [bay, setBay] = useState('');
  const [xong, setXong] = useState(false);
  const [loi, setLoi] = useState({});
  const [loiChung, setLoiChung] = useState('');

  const dat = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setLoi((l) => ({ ...l, [k]: undefined }));
  };

  const gui = useMutation({
    mutationFn: () => api.post('/contact', { ...form, [HONEYPOT_FIELD]: bay }),
    onSuccess: () => setXong(true),
    onError: (e) => {
      // Lỗi zod về đúng ô đã gây ra nó (`errorHandler` trả details = [{path, message}]).
      const m = {};
      for (const d of e?.details ?? []) if (d.path && !m[d.path]) m[d.path] = d.message;
      setLoi(m);
      setLoiChung(e.details?.length ? '' : e.message);
    },
  });

  if (xong) {
    return (
      <div className="card flex items-start gap-3 p-6">
        <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-jade-600 dark:text-jade-300" />
        <div>
          <h2 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">Đã nhận tin của bạn</h2>
          <p className="mt-1 text-sm text-jade-600 dark:text-jade-200">
            Ban quản trị sẽ phản hồi qua thông tin liên lạc bạn để lại. Cảm ơn bạn đã góp phần làm trang này
            chính xác hơn.
          </p>
          <button
            type="button"
            onClick={() => {
              setForm({ name: '', email: '', phone: '', subject: '', message: '' });
              setXong(false);
            }}
            className="btn-ghost btn-sm mt-4"
          >
            Gửi tin khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setLoiChung('');
        gui.mutate();
      }}
      className="card p-6"
      noValidate
    >
      <h2 className="font-serif text-lg font-semibold text-jade-900 dark:text-jade-50">Gửi phản hồi</h2>
      <p className="mt-1 text-sm text-jade-500 dark:text-jade-400">
        Thông tin sai, giờ mở cửa đã thay đổi, một lễ hội chưa có trên lịch — mọi góp ý đều hữu ích.
      </p>

      <div className="mt-5 space-y-4">
        <O label="Tên của bạn" required error={loi.name}>
          <input className={O_CLS} value={form.name} onChange={(e) => dat('name')(e.target.value)} maxLength={60} autoComplete="name" placeholder="Vd: Nguyễn Văn A" />
        </O>

        {/* Email và điện thoại: cần ÍT NHẤT một trong hai. Nói trước ở đây thay vì
            để người dùng bấm Gửi rồi mới biết. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <O label="Email" error={loi.email}>
            <input className={O_CLS} type="email" value={form.email} onChange={(e) => dat('email')(e.target.value)} maxLength={120} autoComplete="email" placeholder="ban@example.com" />
          </O>
          <O label="Điện thoại" error={loi.phone}>
            <input className={O_CLS} type="tel" value={form.phone} onChange={(e) => dat('phone')(e.target.value)} maxLength={20} autoComplete="tel" placeholder="0912 345 678" />
          </O>
        </div>
        <p className="-mt-2 text-xs text-jade-400">Vui lòng để lại ít nhất một trong hai để chúng tôi phản hồi được.</p>

        <O label="Tiêu đề" error={loi.subject}>
          <input className={O_CLS} value={form.subject} onChange={(e) => dat('subject')(e.target.value)} maxLength={120} placeholder="Vd: Góp ý về giờ mở cửa chùa Mỹ Cụ" />
        </O>

        <O label="Nội dung" required error={loi.message} hint={`${form.message.length}/2000 ký tự · vui lòng không chèn đường dẫn`}>
          <textarea className={O_CLS} rows={6} value={form.message} onChange={(e) => dat('message')(e.target.value)} maxLength={2000} placeholder="Mô tả cụ thể giúp chúng tôi xử lý nhanh hơn: tên địa điểm, thông tin nào chưa đúng, thông tin đúng là gì." />
        </O>

        {/* Ô bẫy chống bot. Ẩn khỏi mắt, khỏi thứ tự Tab, khỏi trình đọc màn hình,
            và tắt tự động điền — nếu trình duyệt điền hộ người dùng thật thì cái
            bẫy sẽ bắt đúng khách hàng. Xem shared/antispam.js. */}
        <div aria-hidden="true" className="hidden">
          <label htmlFor="lien-he-bay">Thông tin thêm</label>
          <input id="lien-he-bay" name={HONEYPOT_FIELD} value={bay} onChange={(e) => setBay(e.target.value)} tabIndex={-1} autoComplete="off" />
        </div>

        {loiChung && <p className="text-sm text-terra-600">{loiChung}</p>}

        <p className="flex items-start gap-2 text-xs text-jade-500 dark:text-jade-400">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          Chúng tôi chỉ lưu những gì bạn điền ở trên, không lưu địa chỉ IP.
        </p>

        <button type="submit" disabled={gui.isPending} className="btn-primary disabled:opacity-60">
          <Send size={16} /> {gui.isPending ? 'Đang gửi…' : 'Gửi phản hồi'}
        </button>
      </div>
    </form>
  );
}

const O_CLS =
  'w-full rounded-xl border border-jade-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 dark:border-jade-700 dark:bg-jade-900 dark:text-jade-50';

function O({ label, required, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-jade-700 dark:text-jade-200">
        {label} {required && <span className="text-terra-600">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-terra-600">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-jade-400">{hint}</span>
      )}
    </label>
  );
}
