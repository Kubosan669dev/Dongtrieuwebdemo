import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

/**
 * Cấu hình ESLint cho toàn dự án (client + server + shared).
 *
 * Dự án chạy khá lâu mà không có bộ kiểm tra tĩnh nào, nên đã tích lại một ít
 * mã chết và vài lỗi hook. Bộ quy tắc dưới đây cố ý gọn: đủ bắt những lớp lỗi
 * đã thật sự xảy ra ở đây, không thêm quy tắc về phong cách viết để khỏi biến
 * thành hàng trăm cảnh báo vô nghĩa phải bỏ qua.
 *
 * Ba quy tắc quan trọng nhất, kèm lỗi thật mà chúng bắt được:
 *  - `no-unused-vars`            → bốn hàm export ra rồi không ai dùng
 *  - `react-hooks/exhaustive-deps` → `Seo` chèn lại thẻ JSON-LD mỗi lần render
 *  - `jsx-a11y/no-noninteractive-element-interactions` → thẻ lưu trú từng đặt
 *    `role="button"` bọc quanh các liên kết gọi điện
 */
/**
 * Cấu hình `no-unused-vars` dùng chung cho cả ba nhóm file.
 *
 * `ignoreRestSiblings` cho phép giữ nguyên lối viết "bỏ bớt trường" đang dùng ở
 * khắp khu quản trị — `const { id, createdAt, updatedAt, ...rest } = item` —
 * nơi ba biến đầu cố ý không dùng, chúng chỉ có mặt để KHÔNG lọt vào `rest`.
 * Không bật thì riêng lối viết này đã sinh hơn hai chục cảnh báo giả.
 *
 * Tiền tố `_` dành cho tham số phải khai báo để giữ đúng vị trí, vd `(_req, res)`.
 */
const UNUSED_VARS = {
  'no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
  ],
};

export default [
  {
    ignores: [
      '**/node_modules/**',
      'client/dist/**',
      'server/uploads/**',
      'server/prisma/migrations/**',
      'server/data/**',
    ],
  },

  js.configs.recommended,

  // ── Giao diện React ──
  {
    // `client/scripts/**/*.jsx` cũng nằm ở nhóm này: đó là phần chạy trong DOM
    // của bộ kiểm màn hình lỗi, dựng cây React thật nên phải có `window` và
    // trình phân tích JSX — xếp nhầm sang nhóm Node là báo lỗi cú pháp ngay.
    files: ['client/src/**/*.{js,jsx}', 'client/scripts/**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules, // không cần import React
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,

      // Dự án không dùng PropTypes; kiểu dữ liệu đã ghi trong JSDoc của từng
      // component. Bật lên chỉ tổ ồn.
      'react/prop-types': 'off',

      ...UNUSED_VARS,
    },
  },

  // ── Máy chủ, script build, file cấu hình ──
  // `client/scripts/` và `*.config.js` chạy bằng Node chứ không phải trình
  // duyệt, nên phải nằm ở nhóm này — xếp nhầm vào nhóm React là báo `require`
  // và `process` không tồn tại.
  {
    files: [
      'server/**/*.{js,mjs}',
      'client/scripts/**/*.{js,mjs}',
      // Script vòng đời npm ở gốc (`scripts/postinstall.mjs`). Mẫu `*.{js,cjs,mjs}`
      // ngay dưới chỉ khớp tệp NẰM Ở GỐC, không với xuống thư mục con.
      'scripts/**/*.{js,mjs}',
      '*.{js,cjs,mjs}',
      'client/*.config.js',
      'client/postcss.config.js',
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: { ...UNUSED_VARS },
  },

  // `shared/` chạy ở CẢ hai phía nên chỉ được dùng API có ở cả trình duyệt lẫn
  // Node — không `window`, không `process`. Bỏ trống `globals` chính là cách ép
  // điều đó: dùng nhầm là báo `no-undef` ngay.
  {
    files: ['shared/**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: {} },
    rules: { ...UNUSED_VARS },
  },
];
