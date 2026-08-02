import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';
import Brand from '../../components/Brand.jsx';
import { SITE_NAME } from '../../lib/site.js';

/** Cùng công thức ô nhập với `fields.jsx` của khu quản trị, kể cả biến thể nền tối. */
const O_CLS =
  'w-full rounded-md border border-jade-200 bg-white px-4 py-2.5 outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100 dark:border-jade-700 dark:bg-jade-950 dark:text-jade-50';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from?.pathname || '/admin';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-jade-950 px-4">
      <div className="pattern-bg pointer-events-none absolute inset-0 opacity-10" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center text-white">
          <Brand size={44} title={SITE_NAME} titleClass="text-xl" />
        </Link>
        {/* Thẻ đăng nhập phải có biến thể nền tối.
            Bản trước ghi cứng `bg-white` và `text-jade-900` mà không có `dark:`,
            trong khi các ô nhập lại dùng `inputCls` chung ĐÃ có biến thể tối — nên
            ở chế độ tối thành một thẻ TRẮNG chứa các ô nhập ĐEN, chữ nhãn gần như
            không đọc được. Phát hiện qua ảnh chụp màn hình ở chế độ tối. */}
        {/* `id` để bài kiểm tương phản bám vào. Trước đây nó dò thẻ này bằng
            `closest('div.rounded-3xl')` — một lớp TRANG TRÍ, nên vừa đổi bo góc
            toàn site là phép kiểm khớp `null` và đổ. Class đổi theo thiết kế là
            chuyện thường; một `id` thì không. */}
        <div id="the-dang-nhap" className="rounded-md bg-white p-8 shadow-lift dark:bg-jade-900 dark:ring-1 dark:ring-white/10">
          <h1 className="font-serif text-2xl font-bold text-jade-900 dark:text-jade-50">Đăng nhập quản trị</h1>
          <p className="mt-1 text-sm text-muted">Truy cập trang quản lý nội dung.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="dt-username" className="mb-1 block text-sm font-medium text-muted">Tên đăng nhập</label>
              <input
                id="dt-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className={O_CLS}
                placeholder="admin"
              />
            </div>
            <div>
              <label htmlFor="dt-password" className="mb-1 block text-sm font-medium text-muted">Mật khẩu</label>
              <div className="relative">
                <input
                  id="dt-password"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={`${O_CLS} pr-11`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-jade-600 dark:hover:text-jade-200"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-300">{error}</p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
              <LogIn size={16} /> {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-jade-300/70">← <Link to="/" className="hover:text-gold-300">Về trang chủ</Link></p>
      </div>
    </div>
  );
}
