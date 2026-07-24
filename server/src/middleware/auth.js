import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';
import { HttpError } from '../lib/http.js';

export const COOKIE_NAME = 'dt_token';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, username: user.username }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

/** Bắt buộc đã đăng nhập. Gắn req.user. */
export function requireAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next(new HttpError(401, 'Chưa đăng nhập.'));
  try {
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    next(new HttpError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'));
  }
}

/** Yêu cầu vai trò cụ thể (dùng sau requireAuth). */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Chưa đăng nhập.'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Không đủ quyền.'));
    next();
  };
}
