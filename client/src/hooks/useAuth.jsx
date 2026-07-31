import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from '../lib/api.js';

const AuthContext = createContext(null);

/**
 * Phiên đăng nhập quản trị.
 *
 * Token nằm trong bộ nhớ (xem `lib/api.js`), không lưu cookie hay localStorage,
 * nên mỗi lần tải lại trang là mất phiên và phải nhập mật khẩu lại — đúng yêu cầu
 * của phường cho khu quản trị.
 *
 * Vì vậy không có bước "khôi phục phiên" lúc khởi động: mới vào thì chắc chắn
 * chưa đăng nhập, gọi `/auth/me` chỉ tổ nhận 401.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = useCallback(async (username, password) => {
    const { user: u, token } = await api.post('/auth/login', { username, password });
    setAuthToken(token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Xoá token kể cả khi gọi máy chủ lỗi — nếu không, bấm đăng xuất mà mạng
      // chập chờn thì quản trị viên vẫn còn phiên trong tab đang mở.
      setAuthToken(null);
      setUser(null);
    }
  }, []);

  /** Máy chủ báo 401 (token hết hạn giữa chừng) thì đưa về màn hình đăng nhập. */
  const clearSession = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, login, logout, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
