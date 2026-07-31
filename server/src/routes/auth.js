import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/http.js';
import { COOKIE_NAME, cookieOptions, requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.' },
});

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, 'Tên đăng nhập hoặc mật khẩu không đúng.');
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    // Trả token trong thân phản hồi để client giữ trong bộ nhớ. KHÔNG đặt cookie:
    // cookie sống qua các lần tải trang, mà yêu cầu là mở lại trang quản trị thì
    // phải nhập mật khẩu lại. Xoá luôn cookie của bản cũ nếu máy còn giữ.
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.json({
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
      token: signToken(user),
    });
  }),
);

router.post('/logout', (_req, res) => {
  // Token nằm ở phía client nên chỉ cần client tự xoá; ở đây dọn nốt cookie cũ.
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.json({ ok: true });
});

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, username: true, name: true, role: true, lastLoginAt: true },
    });
    if (!user) throw new HttpError(401, 'Tài khoản không tồn tại.');
    res.json({ user });
  }),
);

router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự.'),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new HttpError(400, 'Mật khẩu hiện tại không đúng.');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });
    res.json({ ok: true });
  }),
);

export default router;
