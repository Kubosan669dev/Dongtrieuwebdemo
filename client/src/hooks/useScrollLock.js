import { useEffect } from 'react';

/**
 * Khoá cuộn trang nền khi đang mở cửa sổ phủ (modal, hộp ảnh lớn, hộp chọn màu).
 *
 * Đếm số lớp đang mở thay vì mỗi lớp tự ghi `document.body.style.overflow`.
 * Trước đây bốn nơi cùng ghi thẳng vào thuộc tính đó mà không ai đếm, nên khi
 * hai lớp chồng nhau — mở chi tiết nhà hàng rồi bấm xem ảnh lớn — đóng lớp trên
 * là lớp dưới bị mở khoá theo, nền trang cuộn được trong khi cửa sổ chi tiết
 * vẫn đang che.
 *
 * Chỉ trả `overflow` về giá trị cũ khi lớp cuối cùng đóng lại.
 */
let depth = 0;
let previousOverflow = '';

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;

    if (depth === 0) {
      // Nhớ giá trị sẵn có thay vì mặc định gán chuỗi rỗng, phòng khi trang tự
      // đặt `overflow` cho mục đích khác.
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    depth += 1;

    return () => {
      depth -= 1;
      if (depth === 0) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}

export default useScrollLock;
