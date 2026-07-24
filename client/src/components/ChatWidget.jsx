import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { cx } from '../lib/format.js';

const SUGGESTIONS = ['Hôm nay nên đi đâu?', 'Có lễ hội nào sắp diễn ra?', 'Đặc sản Đông Triều có gì?'];

/**
 * Chatbot AI (giai đoạn này chỉ là vỏ giao diện).
 * Backend /api/chat trả thông báo "đang hoàn thiện". Khi tích hợp LLM ở giai đoạn
 * sau, chỉ cần nối endpoint này với mô hình + knowledge_base.md.
 */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Xin chào 👋 Mình là trợ lý du lịch Đông Triều. Bạn muốn tìm hiểu về di tích, lễ hội hay đặc sản nào?',
    },
  ]);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (open) bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setInput('');
    setSending(true);
    try {
      const res = await api.post('/chat', { message: msg });
      setMessages((m) => [...m, { role: 'bot', text: res.reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: 'Xin lỗi, hiện chưa thể phản hồi. Vui lòng thử lại sau.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Mở trợ lý AI"
        className={cx(
          'fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full text-white shadow-lift transition',
          open ? 'bg-jade-800' : 'bg-jade-600 hover:bg-jade-700 animate-float',
        )}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[30rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-jade-900/10 dark:bg-jade-900 dark:ring-white/10 animate-fade-up">
          <div className="flex items-center gap-3 bg-jade-600 px-4 py-3.5 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
              <Sparkles size={18} />
            </span>
            <div className="leading-tight">
              <p className="font-semibold">Trợ lý AI Đông Triều</p>
              <p className="text-[11px] text-jade-100/80">Đang phát triển · trả lời cơ bản</p>
            </div>
          </div>

          <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto bg-paper/60 p-4 dark:bg-jade-950/40">
            {messages.map((m, i) => (
              <div key={i} className={cx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cx(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'bg-jade-600 text-white'
                      : 'bg-white text-jade-900 ring-1 ring-jade-900/5 dark:bg-jade-800 dark:text-jade-50',
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && <div className="text-xs text-jade-500">Đang soạn trả lời…</div>}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-jade-700 ring-1 ring-jade-200 hover:bg-jade-50 dark:bg-jade-800 dark:text-jade-100 dark:ring-jade-700"
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi của bạn…"
              className="flex-1 rounded-full bg-jade-50 px-4 py-2.5 text-sm outline-none ring-1 ring-transparent focus:ring-jade-300 dark:bg-jade-800 dark:text-jade-50"
            />
            <button type="submit" disabled={sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-jade-600 text-white hover:bg-jade-700 disabled:opacity-50">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
