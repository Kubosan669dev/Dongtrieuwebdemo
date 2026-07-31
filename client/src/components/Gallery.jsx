// Lớp nền phủ của hộp thoại đóng được bằng cách bấm ra ngoài. Cố ý KHÔNG gắn
// thêm xử lý bàn phím lên lớp nền: bàn phím đã có hai lối thoát đúng chuẩn là
// phím Esc và nút đóng có thể Tab tới. Biến lớp nền thành phần tử hội tụ được
// chỉ thêm một chặng Tab vô nghĩa trước khi tới nội dung thật của hộp thoại.
/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { normalizeImages, imageAlt } from '../../../shared/images.js';
import { cx } from '../lib/format.js';
import { useScrollLock } from '../hooks/useScrollLock.js';

/**
 * Thư viện ảnh minh hoạ kèm chú thích, dùng chung cho trang chi tiết của cả 6
 * loại nội dung: di tích, lễ hội, điểm lân cận, nhà hàng, ẩm thực, lưu trú.
 *
 * Chú thích hiện ngay dưới ảnh chứ không chỉ nằm trong thuộc tính `alt`: nhiều
 * ảnh tư liệu của phường là ảnh minh hoạ chứ không chụp đúng địa điểm, du khách
 * cần đọc được điều đó mà không phải rê chuột.
 */
export default function Gallery({ images, name, title = 'Hình ảnh', className }) {
  const items = normalizeImages(images);
  const [lightbox, setLightbox] = useState(null);

  if (items.length === 0) return null;

  return (
    <section className={cx('mt-8', className)}>
      <h3 className="mb-3 font-serif text-lg font-semibold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((img, i) => (
          <figure key={`${img.url}-${i}`} className="card-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setLightbox(i)}
              className="block aspect-[4/3] w-full overflow-hidden"
              aria-label={`Xem ảnh lớn${img.caption ? `: ${img.caption}` : ''}`}
            >
              <Thumb src={img.url} alt={imageAlt(img, name)} />
            </button>
            {img.caption && (
              <figcaption className="px-3 py-2.5 text-sm leading-snug text-jade-600 dark:text-jade-300">
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {lightbox !== null && (
        <Lightbox items={items} index={lightbox} name={name} onClose={() => setLightbox(null)} onIndex={setLightbox} />
      )}
    </section>
  );
}

/** Ảnh hỏng đường dẫn thì hiện khung báo thiếu ảnh, không để icon vỡ của trình duyệt. */
function Thumb({ src, alt, className }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="grid h-full w-full place-items-center bg-jade-50 text-jade-300 dark:bg-jade-800">
        <ImageOff size={26} />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cx('h-full w-full object-cover transition duration-300 hover:scale-105', className)}
    />
  );
}

/** Xem ảnh cỡ lớn, chuyển ảnh bằng phím mũi tên, đóng bằng Esc. */
function Lightbox({ items, index, name, onClose, onIndex }) {
  const img = items[index];

  // Hộp ảnh này thường mở ĐÈ LÊN một modal chi tiết đã khoá cuộn sẵn. Dùng hook
  // đếm lớp nên đóng ảnh lớn không trả lại quyền cuộn cho nền khi modal dưới
  // vẫn đang mở — đúng chỗ lỗi cũ.
  useScrollLock();
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((i) => (i + 1) % items.length);
      if (e.key === 'ArrowLeft') onIndex((i) => (i - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, onClose, onIndex]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh cỡ lớn"
    >
      <button onClick={onClose} aria-label="Đóng" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full text-white/80 hover:bg-white/15 hover:text-white">
        <X size={22} />
      </button>

      {items.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onIndex((i) => (i - 1 + items.length) % items.length); }}
            aria-label="Ảnh trước"
            className="absolute left-2 grid h-12 w-12 place-items-center rounded-full text-white/80 hover:bg-white/15 hover:text-white sm:left-6"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onIndex((i) => (i + 1) % items.length); }}
            aria-label="Ảnh sau"
            className="absolute right-2 grid h-12 w-12 place-items-center rounded-full text-white/80 hover:bg-white/15 hover:text-white sm:right-6"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      <figure className="max-h-full max-w-4xl">
        <img src={img.url} alt={imageAlt(img, name)} className="mx-auto max-h-[78vh] w-auto rounded-xl object-contain" />
        <figcaption className="mt-3 text-center text-sm text-white/80">
          {img.caption || name}
          {items.length > 1 && <span className="ml-2 text-white/50">({index + 1}/{items.length})</span>}
        </figcaption>
      </figure>
    </div>,
    document.body,
  );
}
