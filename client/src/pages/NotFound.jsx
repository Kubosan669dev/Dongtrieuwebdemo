import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Seo from '../components/Seo.jsx';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <Seo title="Không tìm thấy trang" />
      <p className="font-serif text-7xl font-bold text-jade-600">404</p>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-jade-900 dark:text-jade-50">Không tìm thấy trang</h1>
      <p className="mt-2 max-w-md text-jade-600 dark:text-jade-300">
        Trang bạn tìm không tồn tại hoặc đã được di chuyển. Hãy quay về trang chủ để tiếp tục khám phá.
      </p>
      <Link to="/" className="btn-primary mt-6"><Home size={16} /> Về trang chủ</Link>
    </div>
  );
}
