/**
 * Ảnh minh hoạ kèm chú thích — dạng dùng chung cho cả 6 loại nội dung
 * (di tích, lễ hội, điểm lân cận, nhà hàng, ẩm thực, lưu trú).
 *
 * Trong cơ sở dữ liệu là cột JSONB chứa mảng `[{ url, caption }]`.
 *
 * Đặt ở `shared/` vì máy chủ cần nó để kiểm tra dữ liệu vào, còn giao diện cần
 * nó để hiển thị — hai bên phải hiểu giống hệt nhau, tách đôi là sớm muộn lệch.
 */

/**
 * Đưa dữ liệu ảnh về đúng dạng `[{ url, caption }]`.
 *
 * Nhận được cả dạng cũ là mảng chuỗi URL, vì dữ liệu do `npm run extract` sinh ra
 * từ file .docx vẫn ghi kiểu đó. Nhờ vậy đổi cấu trúc mà không phải sửa cả
 * đường ống nhập liệu.
 *
 * Ảnh không có `url` bị loại bỏ — hiển thị một khung ảnh vỡ còn tệ hơn là bỏ hẳn.
 */
export function normalizeImages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return { url: item.trim(), caption: '' };
      if (item && typeof item === 'object') {
        return {
          url: String(item.url ?? '').trim(),
          caption: String(item.caption ?? '').trim(),
        };
      }
      return { url: '', caption: '' };
    })
    .filter((img) => img.url !== '');
}

/** Chữ thay ảnh cho trình đọc màn hình. */
export function imageAlt(img, fallbackName) {
  return img?.caption || fallbackName || '';
}
