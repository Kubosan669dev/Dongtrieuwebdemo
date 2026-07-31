import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';
import { HttpError } from '../lib/http.js';

/**
 * Tên cookie của bản cũ. Nay không phát hành nữa, chỉ giữ để xoá cookie còn sót
 * trên máy quản trị viên đã đăng nhập từ trước.
 */
export const COOKIE_NAME = 'dt_token';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, username: user.username }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

/** Dùng khi xoá cookie cũ — phải trùng thuộc tính lúc đặt thì trình duyệt mới xoá. */
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
  path: '/',
};

/**
 * Bắt buộc đã đăng nhập. Gắn req.user.
 *
 * Token đọc từ header `Authorization: Bearer …` chứ không từ cookie. Cố ý như vậy:
 * cookie sống qua các lần tải trang nên quản trị viên mở /admin là đã đăng nhập sẵn.
 * Trình duyệt không tự gửi kèm header, mà phía client chỉ giữ token trong bộ nhớ,
 * nên tải lại trang là mất phiên và phải nhập mật khẩu lại.
 *
 * Kèm theo đó, bỏ cookie cũng loại luôn nguy cơ CSRF cho toàn bộ API quản trị.
 */
/** Đọc token Bearer từ header. Trả null nếu không có hoặc sai định dạng. */
function bearerToken(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

export function requireAuth(req, _res, next) {
  const token = bearerToken(req);
  if (!token) return next(new HttpError(401, 'Chưa đăng nhập.'));
  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    next(new HttpError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'));
  }
}

/**
 * Gắn req.user NẾU có token hợp lệ, còn không thì đi tiếp bình thường.
 *
 * Dùng cho các endpoint vừa phục vụ khách vãng lai vừa phục vụ quản trị viên,
 * mà nội dung trả về khác nhau — cụ thể là danh sách tài nguyên: khách chỉ thấy
 * mục đã xuất bản, quản trị viên thêm `?all=1` thì thấy cả bản nháp.
 *
 * Token hỏng hoặc hết hạn coi như chưa đăng nhập, KHÔNG báo lỗi: du khách không
 * đăng nhập vẫn phải xem được trang. Nhưng cũng KHÔNG được rơi về mức tin cậy
 * mặc định — bản trước chỗ này chỉ kiểm tra cookie `dt_token` có tồn tại hay
 * không mà không xác minh chữ ký, nên ai tự đặt cookie đó cũng đọc được bản nháp.
 */
export function optionalAuth(req, _res, next) {
  const token = bearerToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, env.jwtSecret);
    } catch {
      /* token hỏng → coi như khách vãng lai */
    }
  }
  next();
}

/** Yêu cầu vai trò cụ thể (dùng sau requireAuth). */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Chưa đăng nhập.'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Không đủ quyền.'));
    next();
  };
}
