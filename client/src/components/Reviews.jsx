import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MessageSquarePlus, ShieldCheck, Star } from 'lucide-react';
import { api } from '../lib/api.js';
import { cx, formatDate, formatRating } from '../lib/format.js';
import { Stars, StarPicker } from './Stars.jsx';
import { HONEYPOT_FIELD } from '../../../shared/antispam.js';

/**
 * Đánh giá và góp ý cho một địa điểm.
 *
 * ── HAI CON SỐ, KHÔNG BAO GIỜ TRỘN ──────────────────────────────────────────
 * `googleRating` là điểm sao lấy từ Google Maps lúc nhập dữ liệu. Điểm bên dưới
 * là do khách gửi trên cổng này. Hai nguồn có cỡ mẫu và cách thu hoàn toàn khác
 * nhau, nên thành phần này hiện chúng ở hai chỗ riêng, mỗi chỗ ghi rõ nguồn.
 * Cộng gộp thành một điểm trung bình là bịa số liệu.
 *
 * Chưa có lượt nào thì mời gửi, KHÔNG hiện "0 sao": `0` và "chưa có" là hai
 * chuyện khác nhau — đúng quy ước đã ghi cho trường `rating` ở phía máy chủ.
 */
export default function Reviews({ targetType, targetId, googleRating, googleRatingCount, className }) {
  const key = ['reviews', targetType, targetId];
  const q = useQuery({
    queryKey: key,
    queryFn: () => api.get(`/reviews?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`),
    enabled: Boolean(targetType && targetId),
  });

  const items = q.data?.items ?? [];
  const summary = q.data?.summary;
  const [moForm, setMoForm] = useState(false);

  return (
    <section className={cx('space-y-4', className)} aria-labelledby={`danh-gia-${targetId}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={`danh-gia-${targetId}`} className="font-serif text-lg font-bold text-jade-900 dark:text-jade-50">
          Đánh giá &amp; góp ý
        </h3>
        {!moForm && (
          <button type="button" onClick={() => setMoForm(true)} className="btn-ghost btn-sm">
            <MessageSquarePlus size={14} /> Viết đánh giá
          </button>
        )}
      </div>

      <ThongKe summary={summary} googleRating={googleRating} googleRatingCount={googleRatingCount} dangTai={q.isLoading} />

      {moForm && (
        <FormDanhGia
          targetType={targetType}
          targetId={targetId}
          queryKey={key}
          onDong={() => setMoForm(false)}
        />
      )}

      {q.isError && (
        <p className="text-sm text-danger">Không tải được danh sách đánh giá. Vui lòng thử lại sau.</p>
      )}

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-md bg-jade-50 p-4 dark:bg-jade-800/40">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium text-jade-900 dark:text-jade-50">{r.authorName}</span>
                <Stars value={r.rating} size={13} />
                <time dateTime={r.createdAt} className="text-xs text-subtle">
                  {formatDate(r.createdAt)}
                </time>
              </div>
              {/* Văn bản THUẦN. Không `dangerouslySetInnerHTML` ở đây — nội dung do
                  khách gửi, `<script>` phải hiện ra thành chữ chứ không được chạy.
                  `whitespace-pre-line` giữ lại các dòng người viết ngắt. */}
              <p className="mt-2 whitespace-pre-line leading-relaxed text-body">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}

      {!q.isLoading && items.length === 0 && !moForm && (
        <p className="rounded-md border border-dashed border-jade-200 p-4 text-sm text-muted dark:border-jade-700">
          Chưa có đánh giá nào trên cổng. Nếu bạn đã tới đây, hãy là người đầu tiên chia sẻ cảm nhận.
        </p>
      )}
    </section>
  );
}

/**
 * Khối điểm tổng hợp.
 *
 * Điểm của cổng và điểm Google nằm hai bên, có vạch phân cách và mỗi bên ghi rõ
 * nguồn. Bố cục này là cách nói "đây là hai con số khác nhau" mà không cần một
 * câu giải thích dài, và cũng khiến không ai lỡ tay cộng chúng lại.
 */
function ThongKe({ summary, googleRating, googleRatingCount, dangTai }) {
  const coCong = summary && summary.count > 0;
  const coGoogle = googleRating != null;
  if (dangTai) return <div className="h-20 animate-pulse rounded-md bg-jade-100 dark:bg-jade-800/50" />;
  if (!coCong && !coGoogle) return null;

  return (
    <div className="flex flex-col gap-4 rounded-md bg-white p-4 ring-1 ring-jade-900/5 dark:bg-jade-900/40 dark:ring-white/5 sm:flex-row sm:items-center sm:gap-6">
      {coCong && (
        <div className="flex items-center gap-3">
          <div>
            <p className="font-serif text-3xl font-bold leading-none text-jade-900 dark:text-jade-50">
              {formatRating(summary.average)}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-subtle">trên 5</p>
          </div>
          <div>
            <Stars value={summary.average} size={16} />
            <p className="mt-1 text-xs text-muted">
              {summary.count} đánh giá <strong className="font-semibold">trên cổng này</strong>
            </p>
          </div>
        </div>
      )}

      {coCong && <PhoDiem breakdown={summary.breakdown} total={summary.count} />}

      {coGoogle && (
        <div className={cx('flex items-center gap-2 text-sm', coCong && 'border-jade-900/10 dark:border-white/10 sm:border-l sm:pl-6')}>
          <Star size={15} className="shrink-0 fill-gold-400 text-gold-400" />
          <span className="text-body">
            <strong className="font-semibold">{formatRating(googleRating)}</strong>
            {googleRatingCount != null && <span className="text-subtle"> ({googleRatingCount})</span>}
            {/* Nhãn "Google" là phần bắt buộc, không phải trang trí: thiếu nó thì
                hai con số cạnh nhau trông như cùng một thang đo. */}
            <span className="ml-1 text-muted">trên Google Maps</span>
          </span>
        </div>
      )}
    </div>
  );
}

/** Phổ điểm 5→1. Cho thấy hình dạng của tập đánh giá, thứ mà một con số trung bình che đi. */
function PhoDiem({ breakdown, total }) {
  return (
    <div className="min-w-[9rem] flex-1 space-y-1">
      {[5, 4, 3, 2, 1].map((n) => {
        const soLuot = breakdown?.[n] ?? 0;
        return (
          <div key={n} className="flex items-center gap-2 text-xs text-muted">
            <span className="w-3 text-right tabular-nums">{n}</span>
            <Star size={10} className="shrink-0 fill-gold-400 text-gold-400" />
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-jade-100 dark:bg-jade-800">
              <span
                className="block h-full rounded-full bg-gold-400"
                style={{ width: total > 0 ? `${(soLuot / total) * 100}%` : 0 }}
              />
            </span>
            <span className="w-4 tabular-nums">{soLuot}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Ánh xạ lỗi zod từ máy chủ về từng ô. Xem `errorHandler` phía máy chủ: details = [{path, message}]. */
const loiTheoO = (err) => {
  const m = {};
  for (const d of err?.details ?? []) if (d.path && !m[d.path]) m[d.path] = d.message;
  return m;
};

function FormDanhGia({ targetType, targetId, queryKey, onDong }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ authorName: '', rating: 0, comment: '' });
  const [bay, setBay] = useState('');
  const [xong, setXong] = useState(false);
  const [loi, setLoi] = useState({});
  const [loiChung, setLoiChung] = useState('');

  const dat = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setLoi((l) => ({ ...l, [k]: undefined }));
  };

  const gui = useMutation({
    mutationFn: () =>
      api.post('/reviews', {
        targetType,
        targetId,
        authorName: form.authorName,
        rating: form.rating,
        comment: form.comment,
        [HONEYPOT_FIELD]: bay,
      }),
    onSuccess: () => {
      setXong(true);
      // Nạp lại danh sách dù biết chắc chưa có gì mới hiện ra: nếu quản trị viên
      // duyệt trong lúc khách còn mở trang thì lần nạp này bắt được.
      qc.invalidateQueries({ queryKey });
    },
    onError: (e) => {
      setLoi(loiTheoO(e));
      setLoiChung(e.details?.length ? '' : e.message);
    },
  });

  if (xong) {
    return (
      <div className="flex items-start gap-3 rounded-md bg-jade-50 p-4 text-sm dark:bg-jade-800/40">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-jade-600 dark:text-jade-300" />
        <div>
          <p className="font-medium text-jade-900 dark:text-jade-50">Đã nhận đánh giá của bạn. Cảm ơn!</p>
          {/* Nói rõ vì sao chưa thấy đánh giá của mình. Không nói thì khách tưởng
              gửi thất bại và gửi lại nhiều lần. */}
          <p className="mt-1 text-jade-600 dark:text-jade-200">
            Đánh giá sẽ hiện trên trang sau khi ban quản trị duyệt, thường trong vòng vài ngày làm việc.
          </p>
          <button type="button" onClick={onDong} className="btn-ghost btn-sm mt-3">Đóng</button>
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
      className="space-y-3 rounded-md bg-jade-50 p-4 dark:bg-jade-800/40"
      noValidate
    >
      <StarPicker value={form.rating} onChange={dat('rating')} name={`rating-${targetId}`} error={loi.rating} />

      <O label="Tên của bạn" required error={loi.authorName}>
        <input
          className={O_CLS}
          value={form.authorName}
          onChange={(e) => dat('authorName')(e.target.value)}
          maxLength={60}
          autoComplete="name"
          placeholder="Vd: Nguyễn Văn A"
        />
      </O>

      <O
        label="Cảm nhận của bạn"
        required
        error={loi.comment}
        hint={`${form.comment.length}/1000 ký tự · vui lòng không chèn đường dẫn`}
      >
        <textarea
          className={O_CLS}
          rows={4}
          value={form.comment}
          onChange={(e) => dat('comment')(e.target.value)}
          maxLength={1000}
          placeholder="Điều gì làm bạn nhớ về nơi này? Đường đi, giờ mở cửa, chỗ đỗ xe… đều là thông tin hữu ích cho người sau."
        />
      </O>

      {/* Ô bẫy chống bot. Ẩn hoàn toàn: khỏi mắt, khỏi thứ tự Tab, khỏi trình đọc
          màn hình, và tắt tự động điền — nếu trình duyệt điền hộ người dùng thật
          thì cái bẫy sẽ bắt đúng khách hàng. Xem lib/antispam.js. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor={`${HONEYPOT_FIELD}-${targetId}`}>Thông tin thêm</label>
        <input
          id={`${HONEYPOT_FIELD}-${targetId}`}
          name={HONEYPOT_FIELD}
          value={bay}
          onChange={(e) => setBay(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {loiChung && <p className="text-sm text-danger">{loiChung}</p>}

      <p className="flex items-start gap-2 text-xs text-muted">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        Đánh giá được ban quản trị duyệt trước khi hiện trên trang.
      </p>

      <div className="flex gap-2">
        <button type="submit" disabled={gui.isPending} className="btn-primary btn-sm disabled:opacity-60">
          {gui.isPending ? 'Đang gửi…' : 'Gửi đánh giá'}
        </button>
        <button type="button" onClick={onDong} className="btn-ghost btn-sm">Huỷ</button>
      </div>
    </form>
  );
}

const O_CLS =
  'w-full rounded-md border border-jade-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 dark:border-jade-700 dark:bg-jade-900 dark:text-jade-50';

function O({ label, required, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-muted">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-subtle">{hint}</span>
      )}
    </label>
  );
}
