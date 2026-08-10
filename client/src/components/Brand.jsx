import { cx } from '../lib/format.js';

/**
 * Logo phường Đông Triều kèm tên site — dùng chung cho đầu trang, chân trang,
 * khu quản trị và trang đăng nhập, để bốn nơi không bị lệch nhau mỗi lần sửa.
 *
 * Logo đã có sẵn nền trắng trong vòng tròn nên đặt lên nền sáng hay nền tối
 * đều đọc được; phần ngoài vòng tròn trong suốt nên không bị viền vuông.
 *
 * Chữ "ĐÔNG TRIỀU" in trong logo quá nhỏ để đọc ở cỡ 40px trên thanh điều hướng,
 * nên vẫn giữ phần chữ riêng bên cạnh thay vì để logo đứng một mình.
 */
export default function Brand({ size = 40, title, subtitle, titleClass, subtitleClass, className }) {
  return (
    <span className={cx('flex items-center gap-2.5', className)}>
      {/* Có chữ bên cạnh thì để alt rỗng, tránh trình đọc màn hình đọc lặp tên
          phường hai lần. Logo đứng một mình mới cần mô tả.
          `rounded-full` để bóng đổ ôm đúng hình tròn thay vì thành khối vuông. */}
      <img
        src="/logo.png"
        alt={title ? '' : 'Logo phường Đông Triều'}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-contain shadow-soft"
      />
      {/* `min-w-0` mở đường cho `truncate` mà nơi gọi có thể truyền vào
          `titleClass`: một ô flex mặc định không co xuống dưới bề rộng nội dung,
          nên thiếu dòng này thì `text-overflow` không bao giờ có cơ hội chạy —
          chữ cứ xuống dòng như cũ. */}
      {(title || subtitle) && (
        <span className="min-w-0 leading-tight">
          {title && <span className={cx('block font-serif font-bold', titleClass)}>{title}</span>}
          {subtitle && <span className={cx('block', subtitleClass)}>{subtitle}</span>}
        </span>
      )}
    </span>
  );
}
