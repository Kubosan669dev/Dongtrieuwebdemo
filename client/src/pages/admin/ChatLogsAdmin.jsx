import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, AlertTriangle, Database, Trash2, BookOpen } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Spinner, EmptyState, ErrorNote } from '../../components/ui.jsx';
import { formatDate, formatTime, cx } from '../../lib/format.js';

/** Nhãn tiếng Việt cho các ý định bot nhận ra. */
const INTENT_LABELS = {
  greeting: 'Chào hỏi',
  thanks: 'Cảm ơn',
  help: 'Hỏi trợ giúp',
  weather_now: 'Thời tiết hiện tại',
  weather_day: 'Thời tiết một ngày',
  weather_range: 'Thời tiết 7 ngày',
  tide: 'Triều cường',
  where_today: 'Gợi ý điểm đến',
  route: 'Lộ trình (theo buổi/sở thích/sức khoẻ/ngân sách)',
  recommend: 'Gợi ý dịch vụ',
  budget: 'Ngân sách & lộ trình', // log cũ
  day_plan: 'Lịch trình theo buổi', // log cũ
  about: 'Giới thiệu địa phương',
  contact: 'Liên hệ',
  contact_emergency: 'Số khẩn cấp',
  ticket: 'Vé tham quan',
  hours: 'Giờ mở cửa',
  out_of_scope_admin: 'Thủ tục hành chính (ngoài phạm vi)',
  festival_upcoming: 'Lễ hội sắp tới',
  festival_month: 'Lễ hội theo tháng',
  list_heritage: 'Danh sách di tích',
  list_festival: 'Danh sách lễ hội',
  list_cuisine: 'Danh sách đặc sản',
  list_lodging: 'Danh sách lưu trú',
  list_restaurant: 'Danh sách nhà hàng',
  list_attraction: 'Điểm lân cận',
  directions: 'Đường đi',
  itinerary: 'Lịch trình',
  lookup_heritage: 'Tra cứu di tích',
  lookup_festival: 'Tra cứu lễ hội',
  lookup_cuisine: 'Tra cứu đặc sản',
  lookup_lodging: 'Tra cứu lưu trú',
  lookup_restaurant: 'Tra cứu nhà hàng',
  lookup_attraction: 'Tra cứu điểm lân cận',
  lookup_article: 'Tra cứu bài viết',
  fallback: 'Không trả lời được',
};
const intentLabel = (i) => INTENT_LABELS[i] ?? i;

function Stat({ icon: Icon, value, label, tone = 'jade' }) {
  return (
    <div className="card p-4">
      <span
        className={cx(
          'mb-3 grid h-10 w-10 place-items-center rounded-xl text-white',
          tone === 'gold' ? 'bg-gold-500' : tone === 'terra' ? 'bg-terra-500' : 'bg-jade-600',
        )}
      >
        <Icon size={20} />
      </span>
      <p className="font-serif text-2xl font-bold">{value}</p>
      <p className="text-xs text-jade-500">{label}</p>
    </div>
  );
}

export default function ChatLogsAdmin() {
  const [onlyUnmatched, setOnlyUnmatched] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'chat-logs', onlyUnmatched],
    queryFn: () => api.get(`/chat/logs?take=150${onlyUnmatched ? '&unmatched=1' : ''}`),
  });

  const clear = useMutation({
    mutationFn: () => api.del('/chat/logs'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'chat-logs'] }),
  });

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorNote onRetry={refetch} />;

  const { items, total, unmatched, topUnmatched, knowledgeSize } = data;

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold">Nhật ký trợ lý AI</h1>
      <p className="mt-1 max-w-3xl text-jade-500">
        Trợ lý trả lời hoàn toàn bằng dữ liệu của phường, không dùng dịch vụ AI bên ngoài. Vì vậy cách
        làm bot thông minh hơn là <strong>bổ sung dữ liệu</strong>: xem du khách hỏi gì mà bot chịu thua,
        rồi thêm nội dung tương ứng vào các mục Di tích, Lễ hội, Ẩm thực…
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={MessageCircle} value={total} label="Lượt hỏi" />
        <Stat icon={AlertTriangle} value={unmatched} label="Chưa trả lời được" tone="gold" />
        <Stat
          icon={Database}
          value={total ? `${Math.round(((total - unmatched) / total) * 100)}%` : '—'}
          label="Tỷ lệ trả lời được"
          tone="terra"
        />
        <Stat icon={BookOpen} value={knowledgeSize} label="Mục trong kho tri thức" />
      </div>

      {topUnmatched.length > 0 && (
        <div className="mt-6 rounded-2xl bg-gold-50 p-5 ring-1 ring-gold-200 dark:bg-gold-900/20 dark:ring-gold-800/40">
          <div className="flex items-start gap-3">
            <AlertTriangle size={22} className="mt-0.5 shrink-0 text-gold-600" />
            <div className="min-w-0">
              <p className="font-semibold text-gold-800 dark:text-gold-200">Câu hỏi bot chưa trả lời được</p>
              <p className="mt-1 text-sm text-gold-700/80 dark:text-gold-200/70">
                Đây là những chỗ dữ liệu còn thiếu. Câu nào bị hỏi nhiều lần thì nên bổ sung trước.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {topUnmatched.map((u) => (
                  <span
                    key={u.question}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs text-gold-900 ring-1 ring-gold-200 dark:bg-gold-900/40 dark:text-gold-100 dark:ring-gold-700"
                  >
                    {u.question}
                    {u.count > 1 && (
                      <strong className="rounded-full bg-gold-500 px-1.5 text-[10px] text-white">×{u.count}</strong>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setOnlyUnmatched((v) => !v)}
          className={cx('!py-2 text-xs', onlyUnmatched ? 'btn-gold' : 'btn-ghost')}
        >
          {onlyUnmatched ? 'Đang lọc: chưa trả lời được' : 'Chỉ xem câu chưa trả lời được'}
        </button>
        {total > 0 && (
          <button
            onClick={() => {
              if (window.confirm(`Xoá toàn bộ ${total} dòng nhật ký? Thao tác này không hoàn tác được.`))
                clear.mutate();
            }}
            disabled={clear.isPending}
            className="btn-ghost !py-2 text-xs text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} /> Xoá nhật ký
          </button>
        )}
      </div>

      <div className="card mt-4 overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Chưa có câu hỏi nào"
            description="Khi du khách bắt đầu trò chuyện với trợ lý, câu hỏi sẽ hiện ở đây."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="bg-jade-50 text-left text-xs uppercase tracking-wide text-jade-500 dark:bg-jade-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Câu hỏi</th>
                  <th className="px-4 py-3 font-medium">Bot hiểu là</th>
                  <th className="px-4 py-3 font-medium">Thời điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jade-900/5 dark:divide-white/5">
                {items.map((r) => (
                  <tr key={r.id} className={cx(!r.matched && 'bg-gold-50/60 dark:bg-gold-900/10')}>
                    <td className="px-4 py-3">{r.question}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cx(
                          'whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
                          r.matched
                            ? 'bg-jade-100 text-jade-700 dark:bg-jade-700 dark:text-jade-100'
                            : 'bg-gold-200 text-gold-900 dark:bg-gold-700 dark:text-gold-50',
                        )}
                      >
                        {intentLabel(r.intent)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-jade-400">
                      {formatDate(r.createdAt)} · {formatTime(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-jade-400">
        Nhật ký chỉ lưu nội dung câu hỏi, không lưu địa chỉ IP hay bất cứ thông tin nhận dạng người hỏi nào.
      </p>
    </div>
  );
}
