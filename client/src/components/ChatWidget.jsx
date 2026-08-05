import { useState, useRef, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X, Send, Sparkles, RotateCcw } from 'lucide-react';
import { api } from '../lib/api.js';
import { cx } from '../lib/format.js';
import { useDoiTuong } from '../hooks/useDoiTuong.jsx';

const STORAGE_KEY = 'dt_chat';

const WELCOME = {
  role: 'bot',
  text:
    'Xin chào 👋 Mình là **trợ lý Khám phá Đông Triều**.\n\n' +
    'Mình trả lời dựa trên dữ liệu chính thức của phường — hồ sơ di tích, lịch lễ hội, ẩm thực, lưu trú — cùng **số liệu thời tiết và triều cường cập nhật theo giờ**.',
  suggestions: ['Hôm nay nên đi đâu?', 'Thời tiết hôm nay thế nào?', 'Lễ hội nào sắp diễn ra?', 'Đặc sản Đông Triều có gì?'],
};

/**
 * Hiển thị văn bản trả lời của bot.
 *
 * Bot trả về text thuần có đánh dấu **in đậm**, _in nghiêng_ và dòng bắt đầu
 * bằng "• ". In nghiêng dùng cho các ghi chú phụ: nhãn loại hình _(Nhà hàng)_,
 * cảnh báo _(ước tính)_, nguồn số liệu đánh giá.
 *
 * Cố ý KHÔNG dùng dangerouslySetInnerHTML — nội dung tuy do server sinh ra
 * nhưng có lẫn dữ liệu người dùng nhập trong trang quản trị, nên render bằng
 * React cho an toàn tuyệt đối trước XSS.
 */
/**
 * Tách một dòng thành các mảnh đậm / nghiêng / chữ thường.
 *
 * `dam` = false là lượt gọi BÊN TRONG một cụm nghiêng: lúc đó chỉ còn tách đậm,
 * không tách nghiêng nữa, để dừng đúng sau một tầng.
 *
 * Cần đúng một tầng lồng vì bot có viết kiểu `_Theo **tên sách** — tác giả_`
 * (dòng đóng dấu nguồn của địa chí 1896). Bản trước tách một lượt duy nhất nên
 * cụm ấy khớp nhánh nghiêng rồi nhả nguyên hai dấu sao ra màn hình.
 */
function tachDinhDang(content, dam = true) {
  const mau = dam ? /(\*\*[^*]+\*\*|_[^_\n]+_)/g : /(\*\*[^*]+\*\*)/g;
  return content.split(mau).map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (dam && part.length > 2 && part.startsWith('_') && part.endsWith('_'))
      return <em key={j} className="opacity-75">{tachDinhDang(part.slice(1, -1), false)}</em>;
    return <Fragment key={j}>{part}</Fragment>;
  });
}

function RichText({ text }) {
  return (
    <>
      {String(text).split('\n').map((line, i) => {
        const isBullet = line.startsWith('• ');
        const content = isBullet ? line.slice(2) : line;
        return (
          <p
            key={i}
            className={cx(
              line.trim() === '' && 'h-2',
              isBullet && 'relative pl-3.5 before:absolute before:left-0 before:content-["•"]',
            )}
          >
            {/* Dấu _ chỉ tính khi ôm trọn một cụm, nên số điện thoại hay slug
                có gạch dưới không bị hiểu nhầm. */}
            {tachDinhDang(content)}
          </p>
        );
      })}
    </>
  );
}

export default function ChatWidget() {
  const { doiTuong } = useDoiTuong();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      /* sessionStorage bị chặn — bỏ qua, dùng lời chào mặc định */
    }
    return [WELCOME];
  });
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, sending]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* không lưu được thì thôi, không ảnh hưởng chức năng */
    }
  }, [messages]);

  // Đóng bằng phím Esc
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setInput('');
    setSending(true);
    try {
      // Gửi kèm vai đang chọn. Máy chủ hiện CHỈ ghi lại chứ chưa đổi câu trả
      // lời — mục đích là biết người dân thật sự hỏi gì, làm cơ sở cho một trợ
      // lý riêng của mảng chính quyền sau này.
      const res = await api.post('/chat', { message: msg, audience: doiTuong });
      setMessages((m) => [
        ...m,
        { role: 'bot', text: res.reply, links: res.links, suggestions: res.suggestions },
      ]);
    } catch (err) {
      // Máy chủ có câu giải thích riêng thì dùng câu đó. Trường hợp hay gặp
      // nhất là bị chặn spam (429): máy chủ nói "Bạn hỏi hơi nhanh, chờ một
      // chút rồi thử lại nhé" — đúng việc cần làm. Câu chung chung ở dưới lại
      // khiến người dùng tưởng trợ lý hỏng và bỏ đi luôn.
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text:
            err?.status && err.status < 500 && err.message && !/^Lỗi \d+$/.test(err.message)
              ? err.message
              : 'Xin lỗi, hiện chưa thể phản hồi. Bạn thử lại sau một chút nhé.',
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const reset = () => setMessages([WELCOME]);
  const last = messages[messages.length - 1];
  const chips = !sending && last?.role === 'bot' ? (last.suggestions ?? []) : [];

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Đóng trợ lý du lịch' : 'Mở trợ lý du lịch'}
        aria-expanded={open}
        className={cx(
          'fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full text-white shadow-lift transition',
          open ? 'bg-jade-800' : 'bg-jade-600 hover:bg-jade-700 animate-float',
        )}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Trợ lý du lịch Đông Triều"
          className="fixed bottom-24 right-5 z-50 flex h-[min(34rem,calc(100vh-8rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-md bg-white shadow-lift ring-1 ring-jade-900/10 dark:bg-jade-900 dark:ring-white/10 animate-fade-up"
        >
          <div className="flex items-center gap-3 bg-jade-600 px-4 py-3.5 text-white">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15">
              <Sparkles size={18} />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="font-semibold">Trợ lý du lịch Đông Triều</p>
              <p className="text-[11px] text-jade-100/80">Trả lời từ dữ liệu của phường</p>
            </div>
            <button
              onClick={reset}
              title="Bắt đầu lại cuộc trò chuyện"
              aria-label="Bắt đầu lại"
              className="grid h-8 w-8 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto bg-paper/60 p-4 dark:bg-jade-950/40">
            {messages.map((m, i) => (
              <div key={i} className={cx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cx(
                    'max-w-[88%] rounded-md px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'bg-jade-600 text-white'
                      : 'bg-white text-jade-900 ring-1 ring-jade-900/5 dark:bg-jade-800 dark:text-jade-50',
                  )}
                >
                  {m.role === 'bot' ? <RichText text={m.text} /> : m.text}

                  {m.links?.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-jade-900/5 pt-2.5 dark:border-white/10">
                      {m.links.map((l, j) => (
                        <Link
                          key={j}
                          to={l.url}
                          onClick={() => setOpen(false)}
                          className="rounded-md bg-jade-50 px-2.5 py-1 text-xs font-medium text-jade-700 transition hover:bg-jade-100 dark:bg-jade-700/50 dark:text-jade-100 dark:hover:bg-jade-700"
                        >
                          {l.label} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-md bg-white px-3.5 py-3 ring-1 ring-jade-900/5 dark:bg-jade-800">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      style={{ animationDelay: `${d}ms` }}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-jade-400"
                    />
                  ))}
                </div>
              </div>
            )}

            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {chips.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-jade-700 ring-1 ring-jade-200 transition hover:bg-jade-50 dark:bg-jade-800 dark:text-jade-100 dark:ring-jade-700 dark:hover:bg-jade-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-jade-900/5 bg-white p-3 dark:border-white/5 dark:bg-jade-900"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              aria-label="Câu hỏi của bạn"
              placeholder="Nhập câu hỏi của bạn…"
              className="flex-1 rounded-md bg-jade-50 px-4 py-2.5 text-sm outline-none ring-1 ring-transparent focus:ring-jade-300 dark:bg-jade-800 dark:text-jade-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Gửi câu hỏi"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-jade-600 text-white transition hover:bg-jade-700 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
