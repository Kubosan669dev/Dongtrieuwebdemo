import { ZodError } from 'zod';
import { HttpError } from '../lib/http.js';

export function notFound(_req, res) {
  res.status(404).json({ error: 'Không tìm thấy tài nguyên.' });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dữ liệu không hợp lệ.',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  // Prisma: bản ghi không tồn tại
  if (err?.code === 'P2025') {
    return res.status(404).json({ error: 'Không tìm thấy bản ghi.' });
  }
  // Prisma: vi phạm ràng buộc duy nhất
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: `Giá trị đã tồn tại: ${err.meta?.target?.join?.(', ') || ''}` });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Lỗi máy chủ.' });
}
