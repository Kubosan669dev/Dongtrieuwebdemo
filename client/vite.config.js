import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { THEMES } from './src/lib/themes.js';

/**
 * Chèn danh mục bảng màu vào `index.html` lúc dựng.
 *
 * Đoạn script chặn nhấp nháy trong `index.html` phải biết id nào là bảng màu hợp
 * lệ và bảng nào ưa nền tối, nhưng nó chạy TRƯỚC cả React nên không import được
 * module. Trước đây danh sách bị chép tay sang HTML — thêm bảng màu mới mà quên
 * sửa thì bảng đó âm thầm không dùng được ở lần tải trang đầu, không lỗi, không
 * cảnh báo. Nay chỉ còn một nguồn duy nhất là `src/lib/themes.js`.
 */
function injectThemes() {
  const json = JSON.stringify(Object.fromEntries(THEMES.map((t) => [t.id, t.mode])));
  const PLACEHOLDER = '__DT_THEMES__';
  const put = (html) => {
    if (!html.includes(PLACEHOLDER)) {
      throw new Error('index.html thiếu chỗ chèn ' + PLACEHOLDER + ' — xem plugin dt-inject-themes trong vite.config.js.');
    }
    return html.split(PLACEHOLDER).join(json);
  };

  return {
    name: 'dt-inject-themes',
    // Máy chủ dev phục vụ HTML qua hook này.
    transformIndexHtml: { order: 'pre', handler: put },
    // Bản dựng thì phải sửa thẳng asset đã phát sinh: kết quả của
    // `transformIndexHtml` không đi tới tệp cuối cùng trong luồng build.
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) {
        if (asset.type === 'asset' && asset.fileName.endsWith('.html')) {
          asset.source = put(String(asset.source));
        }
      }
    },
  };
}

/**
 * KHÔNG có khối `server` ở đây, và đó là chủ đích.
 *
 * Vite không còn tự mở cổng nào: lúc dev nó chạy ở chế độ middleware bên trong
 * Express (xem `server/src/index.js`), nên `server.port` bị bỏ qua hoàn toàn.
 *
 * Quan trọng hơn là khối `proxy` cũ — nó chuyển tiếp `/api` sang
 * `http://localhost:4000`. Từ khi Express cũng ở 4000, đó chính là địa chỉ của
 * tiến trình đang chạy Vite: giữ lại là tự gọi vào mình. Thực tế Express đã bắt
 * `/api` trước khi request tới được Vite nên nó không bao giờ chạy, nhưng để một
 * vòng lặp nằm sẵn trong tệp cấu hình thì sớm muộn cũng có người mắc vào.
 */
export default defineConfig({
  plugins: [react(), injectThemes()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          editor: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-image', '@tiptap/extension-link'],
        },
      },
    },
  },
});
