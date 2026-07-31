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

export default defineConfig({
  plugins: [react(), injectThemes()],
  server: {
    port: 5173,
    proxy: {
      // Dev: chuyển tiếp API và ảnh sang server Express (cổng 4000)
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
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
