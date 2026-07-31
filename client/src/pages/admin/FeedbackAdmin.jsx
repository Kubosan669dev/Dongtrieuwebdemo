import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Check, X, Trash2, Star, Mail, Phone, MessageSquare, Inbox, ExternalLink, Clock, RotateCcw, CheckCheck,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { EmptyState, ErrorNote, Spinner } from '../../components/ui.jsx';
import { cx, formatDate, formatTime, phoneHref } from '../../lib/format.js';

/**
 * Một trang, hai thẻ: Đánh giá và Liên hệ.
 *
 * Gộp thay vì tách hai trang vì thao tác giống nhau (đọc → quyết định → xoá) và
 * cùng một câu hỏi "còn việc gì chờ tôi không". Tách ra chỉ làm thanh bên dài
 * thêm mà không cho thêm thông tin gì.
 *
 * Cả hai thẻ hiển thị nội dung do người ngoài gửi bằng **văn bản thuần**. Không
 * `dangerouslySetInnerHTML` ở bất cứ đâu trong file này: `<script>` mà khách gửi
 * phải hiện ra thành chữ để quản trị viên đọc được đúng thứ họ đã gửi.
 */
export default function FeedbackAdmin() {
  const [tab, setTab] = useState('reviews');

  // Nạp cả hai bộ đếm ngay từ đầu để con số trên nhãn thẻ đúng trước khi bấm vào.
  const dg = useQuery({ queryKey: ['admin', 'reviews'], queryFn: () => api.get('/reviews/admin/all') });
  const lh = useQuery({ queryKey: ['admin', 'contact'], queryFn: () => api.get('/contact') });

  const choDuyet = dg.data?.counts?.pending ?? 0;
  const chuaXuLy = lh.data?.counts?.pending ?? 0;

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold">Phản hồi của du khách</h1>
      <p className="mt-1 max-w-3xl text-jade-500">
        Đánh giá gửi từ trang chi tiết <strong>chỉ hiện ra sau khi được duyệt tại đây</strong>. Tin liên hệ
        thì không tự trả lời được — hãy gọi hoặc gửi email cho người gửi rồi đánh dấu đã xử lý.
      </p>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Loại phản hồi">
        <TabBtn active={tab === 'reviews'} onClick={() => setTab('reviews')} icon={Star} badge={choDuyet}>
          Đánh giá
        </TabBtn>
        <TabBtn active={tab === 'contact'} onClick={() => setTab('contact')} icon={Inbox} badge={chuaXuLy}>
          Liên hệ
        </TabBtn>
      </div>

      <div className="mt-5">{tab === 'reviews' ? <TheDanhGia q={dg} /> : <TheLienHe q={lh} />}</div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, badge, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cx('!py-2 text-sm', active ? 'btn-primary' : 'btn-ghost')}
    >
      <Icon size={15} /> {children}
      {/* Chỉ hiện nhãn đếm khi CÒN việc. Một vòng tròn số 0 vẫn cứ đập vào mắt như
          một việc chưa làm, trong khi ý nghĩa của nó là đã xong. */}
      {badge > 0 && (
        <span
          className={cx(
            'ml-1 rounded-full px-1.5 text-[11px] font-bold tabular-nums',
            active ? 'bg-white/25 text-white' : 'bg-terra-500 text-white',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Thẻ Đánh giá ───────────────────────────────────────────────────────────

const TRANG_THAI = {
  PENDING: { nhan: 'Chờ duyệt', lop: 'bg-gold-200 text-gold-900 dark:bg-gold-700 dark:text-gold-50' },
  APPROVED: { nhan: 'Đang hiện', lop: 'bg-jade-100 text-jade-700 dark:bg-jade-700 dark:text-jade-100' },
  REJECTED: { nhan: 'Đã từ chối', lop: 'bg-jade-100 text-jade-500 dark:bg-jade-800 dark:text-jade-400' },
};

const LOC_DG = [
  { key: '', nhan: 'Tất cả' },
  { key: 'PENDING', nhan: 'Chờ duyệt' },
  { key: 'APPROVED', nhan: 'Đang hiện' },
  { key: 'REJECTED', nhan: 'Đã từ chối' },
];

function TheDanhGia({ q }) {
  const qc = useQueryClient();
  const [loc, setLoc] = useState('PENDING');

  const duyet = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/reviews/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      // Trang công khai đang mở ở tab khác cũng phải đổi theo.
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
  const xoa = useMutation({
    mutationFn: (id) => api.del(`/reviews/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorNote onRetry={q.refetch} />;

  const tatCa = q.data.items;
  const items = loc ? tatCa.filter((r) => r.status === loc) : tatCa;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {LOC_DG.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => setLoc(l.key)}
            className={cx('btn-sm rounded-full', loc === l.key ? 'btn-gold' : 'btn-ghost')}
          >
            {l.nhan}
            <span className="tabular-nums opacity-60">
              {l.key ? tatCa.filter((r) => r.status === l.key).length : tatCa.length}
            </span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card mt-4">
          <EmptyState
            icon={Star}
            title={loc === 'PENDING' ? 'Không còn đánh giá nào chờ duyệt' : 'Chưa có đánh giá nào'}
            description={
              loc === 'PENDING'
                ? 'Mọi đánh giá đã được xử lý. Đánh giá mới sẽ xuất hiện ở đây.'
                : 'Đánh giá do du khách gửi từ trang chi tiết sẽ hiện ở đây trước khi được duyệt.'
            }
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((r) => (
            <li
              key={r.id}
              className={cx('card p-4', r.status === 'PENDING' && 'ring-2 ring-gold-300 dark:ring-gold-700/60')}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className={cx('chip', TRANG_THAI[r.status].lop)}>{TRANG_THAI[r.status].nhan}</span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-jade-900 dark:text-jade-50">
                  <Star size={13} className="fill-gold-400 text-gold-400" /> {r.rating}/5
                </span>
                <span className="font-medium text-jade-900 dark:text-jade-50">{r.authorName}</span>
                <span className="text-xs text-jade-400">
                  {formatDate(r.createdAt)} · {formatTime(r.createdAt)}
                </span>
              </div>

              <p className="mt-1.5 text-xs text-jade-500 dark:text-jade-400">
                {r.targetLabel}:{' '}
                {r.targetName ? (
                  r.targetPath ? (
                    <Link to={r.targetPath} target="_blank" className="inline-flex items-center gap-1 font-medium text-jade-700 underline decoration-dotted dark:text-jade-200">
                      {r.targetName} <ExternalLink size={11} />
                    </Link>
                  ) : (
                    <strong className="font-medium text-jade-700 dark:text-jade-200">{r.targetName}</strong>
                  )
                ) : (
                  // Về lý thì không nên còn dòng nào như vậy (xoá bản ghi là xoá
                  // luôn đánh giá của nó), nhưng dữ liệu cũ vẫn có thể sót.
                  <em className="text-terra-600">địa điểm đã bị xoá</em>
                )}
              </p>

              {/* Văn bản thuần, giữ ngắt dòng của người viết. */}
              <p className="mt-2.5 whitespace-pre-line rounded-xl bg-jade-50 p-3 text-sm leading-relaxed text-jade-800 dark:bg-jade-800/40 dark:text-jade-100">
                {r.comment}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== 'APPROVED' && (
                  <button onClick={() => duyet.mutate({ id: r.id, status: 'APPROVED' })} disabled={duyet.isPending} className="btn-primary btn-sm">
                    <Check size={14} /> Duyệt cho hiện
                  </button>
                )}
                {r.status !== 'REJECTED' && (
                  <button onClick={() => duyet.mutate({ id: r.id, status: 'REJECTED' })} disabled={duyet.isPending} className="btn-ghost btn-sm">
                    <X size={14} /> Từ chối
                  </button>
                )}
                {r.status !== 'PENDING' && (
                  <button onClick={() => duyet.mutate({ id: r.id, status: 'PENDING' })} disabled={duyet.isPending} className="btn-ghost btn-sm">
                    <RotateCcw size={14} /> Trả về chờ duyệt
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm(`Xoá vĩnh viễn đánh giá của "${r.authorName}"? Thao tác này không hoàn tác được.`))
                      xoa.mutate(r.id);
                  }}
                  disabled={xoa.isPending}
                  className="btn-ghost btn-sm ml-auto text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Xoá
                </button>
              </div>

              {r.handledAt && (
                <p className="mt-2 text-[11px] text-jade-400">
                  Đã xử lý lúc {formatDate(r.handledAt)} · {formatTime(r.handledAt)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-jade-400">
        Từ chối thì đánh giá được giữ lại để đối chiếu về sau nhưng không hiện trên trang. Xoá là mất hẳn.
      </p>
    </div>
  );
}

// ─── Thẻ Liên hệ ────────────────────────────────────────────────────────────

function TheLienHe({ q }) {
  const qc = useQueryClient();
  const [chiChuaXuLy, setChiChuaXuLy] = useState(true);

  const lamMoi = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'contact'] });
    qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
  };
  const danhDau = useMutation({
    mutationFn: ({ id, handled }) => api.patch(`/contact/${id}`, { handled }),
    onSuccess: lamMoi,
  });
  const xoa = useMutation({ mutationFn: (id) => api.del(`/contact/${id}`), onSuccess: lamMoi });

  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorNote onRetry={q.refetch} />;

  const tatCa = q.data.items;
  const items = chiChuaXuLy ? tatCa.filter((m) => !m.handled) : tatCa;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setChiChuaXuLy(true)} className={cx('btn-sm rounded-full', chiChuaXuLy ? 'btn-gold' : 'btn-ghost')}>
          Chưa xử lý <span className="tabular-nums opacity-60">{tatCa.filter((m) => !m.handled).length}</span>
        </button>
        <button type="button" onClick={() => setChiChuaXuLy(false)} className={cx('btn-sm rounded-full', !chiChuaXuLy ? 'btn-gold' : 'btn-ghost')}>
          Tất cả <span className="tabular-nums opacity-60">{tatCa.length}</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card mt-4">
          <EmptyState
            icon={Inbox}
            title={chiChuaXuLy ? 'Không còn tin nào chờ xử lý' : 'Chưa có tin liên hệ nào'}
            description={
              chiChuaXuLy
                ? 'Mọi tin đã được đánh dấu đã xử lý.'
                : 'Tin gửi từ trang Liên hệ sẽ hiện ở đây. Không có email báo tự động — đây là chỗ để xem.'
            }
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((m) => (
            <li key={m.id} className={cx('card p-4', !m.handled && 'ring-2 ring-gold-300 dark:ring-gold-700/60')}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className={cx('chip', m.handled ? 'bg-jade-100 text-jade-500 dark:bg-jade-800 dark:text-jade-400' : 'bg-gold-200 text-gold-900 dark:bg-gold-700 dark:text-gold-50')}>
                  {m.handled ? 'Đã xử lý' : 'Chờ xử lý'}
                </span>
                <span className="font-medium text-jade-900 dark:text-jade-50">{m.name}</span>
                <span className="inline-flex items-center gap-1 text-xs text-jade-400">
                  <Clock size={11} /> {formatDate(m.createdAt)} · {formatTime(m.createdAt)}
                </span>
              </div>

              {m.subject && (
                <p className="mt-2 font-serif text-base font-semibold text-jade-900 dark:text-jade-50">{m.subject}</p>
              )}
              <p className="mt-1.5 whitespace-pre-line rounded-xl bg-jade-50 p-3 text-sm leading-relaxed text-jade-800 dark:bg-jade-800/40 dark:text-jade-100">
                {m.message}
              </p>

              {/* Cách liên lạc là thứ quản trị viên cần bấm ngay, nên để dạng liên
                  kết mở sẵn ứng dụng gọi / gửi thư, không phải chữ để copy tay. */}
              <div className="mt-3 flex flex-wrap gap-2">
                {m.email && (
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Trả lời: ${m.subject || 'phản hồi của bạn'}`)}`} className="btn-ghost btn-sm">
                    <Mail size={14} /> {m.email}
                  </a>
                )}
                {m.phone && (
                  <a href={phoneHref(m.phone)} className="btn-ghost btn-sm">
                    <Phone size={14} /> {m.phone}
                  </a>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => danhDau.mutate({ id: m.id, handled: !m.handled })}
                  disabled={danhDau.isPending}
                  className={cx('btn-sm', m.handled ? 'btn-ghost' : 'btn-primary')}
                >
                  {m.handled ? <><RotateCcw size={14} /> Đánh dấu chưa xử lý</> : <><CheckCheck size={14} /> Đánh dấu đã xử lý</>}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Xoá vĩnh viễn tin của "${m.name}"? Thao tác này không hoàn tác được.`))
                      xoa.mutate(m.id);
                  }}
                  disabled={xoa.isPending}
                  className="btn-ghost btn-sm ml-auto text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Xoá
                </button>
              </div>

              {m.handledAt && (
                <p className="mt-2 text-[11px] text-jade-400">
                  Đã xử lý lúc {formatDate(m.handledAt)} · {formatTime(m.handledAt)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 flex items-start gap-1.5 text-xs text-jade-400">
        <MessageSquare size={13} className="mt-0.5 shrink-0" />
        Hộp thư này không lưu địa chỉ IP — chỉ những gì người gửi tự điền.
      </p>
    </div>
  );
}
