import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';

/**
 * Chặn các trang quản trị khi chưa đăng nhập.
 *
 * Không có trạng thái "đang kiểm tra phiên": token chỉ nằm trong bộ nhớ nên vừa
 * tải trang là chắc chắn chưa đăng nhập, đá thẳng về màn hình đăng nhập luôn.
 */
export default function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return children;
}
