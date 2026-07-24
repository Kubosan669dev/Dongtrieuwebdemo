import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { MapPin, LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.jsx';

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
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5 text-white">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-jade-600"><MapPin size={22} /></span>
          <span className="font-serif text-xl font-bold">Du lịch Đông Triều</span>
        </Link>
        <div className="rounded-3xl bg-white p-8 shadow-lift">
          <h1 className="font-serif text-2xl font-bold text-jade-900">Đăng nhập quản trị</h1>
          <p className="mt-1 text-sm text-jade-500">Truy cập trang quản lý nội dung.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-jade-700">Tên đăng nhập</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                className="w-full rounded-xl border border-jade-200 px-4 py-2.5 outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-jade-700">Mật khẩu</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-jade-200 px-4 py-2.5 pr-11 outline-none focus:border-jade-400 focus:ring-2 focus:ring-jade-100"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-jade-400">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

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
