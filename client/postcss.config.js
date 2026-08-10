import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));

/**
 * Chỉ ĐÍCH DANH tệp cấu hình Tailwind, không để nó tự đi tìm.
 *
 * Không truyền `config` thì Tailwind dò `tailwind.config.js` bắt đầu từ thư mục
 * làm việc hiện tại. Khi `npm run build` chạy trong `client/` thì đúng, nhưng lúc
 * dev Vite nay khởi động từ tiến trình Express nên thư mục hiện tại là `server/`
 * — dò không ra, Tailwind lặng lẽ dùng cấu hình MẶC ĐỊNH của nó, và mọi màu của
 * dự án biến mất. Triệu chứng là một lỗi khó lần: "The `bg-paper` class does not
 * exist", trong khi lớp ấy vẫn nằm nguyên trong `tailwind.config.js`.
 */
export default {
  plugins: {
    tailwindcss: { config: path.join(THU_MUC, 'tailwind.config.js') },
    autoprefixer: {},
  },
};
