/**
 * Cấu hình PM2 cho Cổng thông tin du lịch phường Đông Triều.
 *
 * Chạy:  pm2 start ecosystem.config.cjs
 *        pm2 save && pm2 startup     (tự khởi động lại sau khi reboot VPS)
 *        pm2 reload dongtrieu        (nạp lại sau khi cập nhật code)
 *        pm2 logs dongtrieu          (xem log)
 */
module.exports = {
  apps: [
    {
      name: 'dongtrieu',
      script: 'server/src/index.js',
      cwd: __dirname,

      // Cố ý dùng 1 tiến trình (fork) thay vì cluster:
      // cache thời tiết / triều cường / bản tin là in-memory (server/src/lib/cache.js),
      // chạy nhiều instance sẽ khiến mỗi instance gọi Open-Meteo riêng, không chia sẻ cache.
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
      },

      // Tự khởi động lại nếu rò rỉ bộ nhớ
      max_memory_restart: '400M',
      autorestart: true,
      // Nếu crash liên tục thì dừng lại, tránh vòng lặp vô hạn
      max_restarts: 10,
      min_uptime: '20s',

      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      time: true,

      // Không watch trên production — chỉ reload thủ công sau khi deploy
      watch: false,
    },
  ],
};
