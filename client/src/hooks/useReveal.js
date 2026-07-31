import { useEffect } from 'react';

/**
 * Hiện dần các khối có thuộc tính `data-vao` khi cuộn tới.
 *
 * MỘT observer cho cả trang, đặt ở `Layout`. Không phải một hook cho mỗi khối:
 * trang chủ có chín khối, chín observer là chín lần trình duyệt phải tính giao
 * nhau mỗi lần cuộn, mà kết quả trông y như nhau.
 *
 * ── HAI ĐIỂM AN TOÀN, KHÔNG ĐƯỢC BỎ ─────────────────────────────────────────
 *
 *  1. Class `dt-co-hieu-ung` chỉ được đặt lên <html> khi hàm này thật sự chạy
 *     được. Phần CSS ẩn khối gắn với class đó (xem index.css), nên JS lỗi, bị
 *     chặn, hay trình duyệt không có IntersectionObserver thì nội dung hiện đủ
 *     thay vì biến mất. Ẩn nội dung bằng CSS mà chỉ JS mới mở được là cách chắc
 *     nhất để một lỗi nhỏ thành trang trắng.
 *
 *  2. `prefers-reduced-motion` được xét TRƯỚC khi đặt class. Người bật giảm
 *     chuyển động không thấy gì mờ dần, và cũng không phải trả giá cho một
 *     observer chạy suốt.
 *
 * Bỏ theo dõi ngay sau lần hiện đầu tiên: hiệu ứng chạy một lần, cuộn lên rồi
 * cuộn xuống lại không nháy lại.
 */
export function useReveal(deps = []) {
  useEffect(() => {
    const giamChuyenDong = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (giamChuyenDong || typeof IntersectionObserver === 'undefined') return undefined;

    const root = document.documentElement;
    root.classList.add('dt-co-hieu-ung');

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('dt-vao');
          obs.unobserve(e.target);
        }
      },
      // Hiện sớm một chút trước khi khối tới mép dưới màn hình: đúng lúc mép trên
      // vừa vào là mắt đã kịp thấy nó hiện, không phải thấy nó đang mờ.
      { rootMargin: '0px 0px -8% 0px', threshold: 0.02 },
    );

    const theoDoiTatCa = () => {
      document.querySelectorAll('[data-vao]:not(.dt-vao)').forEach((el) => obs.observe(el));
    };
    theoDoiTatCa();

    /**
     * Bắt cả những khối xuất hiện MUỘN.
     *
     * Bắt buộc, không phải tối ưu thêm: phần lớn khối trên trang chủ chỉ được vẽ
     * sau khi React Query lấy xong dữ liệu (khối Đánh giá, Lễ hội, Bài viết đều
     * trả về `null` lúc đầu). Quét đúng một lần thì những khối đó không bao giờ
     * được theo dõi, mà CSS ẩn khối thì đã có tác dụng — kết quả là nội dung
     * tải xong rồi vẫn nằm im ở `opacity: 0`.
     */
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        for (const node of r.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.('[data-vao]:not(.dt-vao)')) obs.observe(node);
          node.querySelectorAll?.('[data-vao]:not(.dt-vao)').forEach((el) => obs.observe(el));
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      obs.disconnect();
      mo.disconnect();
      root.classList.remove('dt-co-hieu-ung');
    };
    // Nơi gọi truyền `pathname` vào để mỗi lần đổi trang là quét lại các khối mới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
