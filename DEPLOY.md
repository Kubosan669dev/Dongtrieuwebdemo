# Hướng dẫn triển khai lên VPS

Tài liệu này hướng dẫn đưa **Cổng thông tin du lịch phường Đông Triều** lên máy chủ VPS chạy Ubuntu 22.04 / 24.04.

Kiến trúc khi chạy thật: chỉ **một tiến trình Node** (quản lý bởi PM2) vừa phục vụ API, vừa phục vụ giao diện React đã build và ảnh tải lên. Nginx đứng trước làm reverse proxy và xử lý HTTPS.

```
Internet → Nginx (:80/:443) → Node/Express (:4000) → PostgreSQL (:5432)
                                      ├── client/dist   (giao diện React)
                                      └── server/uploads (ảnh admin tải lên)
```

---

## 1. Cài đặt phần mềm nền

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 16, Nginx, Git
sudo apt install -y postgresql postgresql-contrib nginx git

# PM2 (trình quản lý tiến trình Node)
sudo npm install -g pm2

# Kiểm tra
node -v      # v20.x
psql --version
```

## 2. Tạo cơ sở dữ liệu

Không dùng tài khoản `postgres` (superuser) cho ứng dụng. Tạo user riêng:

```bash
sudo -u postgres psql
```

```sql
CREATE USER dongtrieu WITH PASSWORD 'DAT_MAT_KHAU_MANH_O_DAY';
CREATE DATABASE dongtrieu OWNER dongtrieu ENCODING 'UTF8';
GRANT ALL PRIVILEGES ON DATABASE dongtrieu TO dongtrieu;
\q
```

## 3. Lấy mã nguồn

```bash
sudo mkdir -p /var/www && cd /var/www
sudo chown -R $USER:$USER /var/www

git clone <URL-REPO-CUA-BAN> dongtrieu
cd dongtrieu
npm install
```

## 4. Tạo file cấu hình `server/.env`

> ⚠️ **Quan trọng:** file `.env` phải nằm ở **`server/.env`**, không phải ở thư mục gốc.
> Cả ứng dụng (`server/src/lib/env.js`) lẫn Prisma đều chỉ đọc ở vị trí này.

```bash
cp .env.example server/.env
nano server/.env
```

Sinh khoá bí mật JWT (bắt buộc đổi, tuyệt đối không dùng giá trị mặc định):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Các giá trị **bắt buộc sửa** trước khi chạy tiếp:

| Biến | Giá trị cho production |
|---|---|
| `DATABASE_URL` | `postgresql://dongtrieu:MAT_KHAU@127.0.0.1:5432/dongtrieu?schema=public` |
| `NODE_ENV` | `production` |
| `PUBLIC_SITE_URL` | `https://<TEN-MIEN>` — dùng cho sitemap và thẻ Open Graph |
| `JWT_SECRET` | Chuỗi ngẫu nhiên vừa sinh ở trên |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Tài khoản quản trị đầu tiên. Mặc định là `admin` / `123456` — **bắt buộc đổi mật khẩu trước khi seed** |

## 5. Nạp dữ liệu

```bash
npm run extract          # đọc 29 file .docx → prisma/seed-data/*.json
npm --workspace server run db:deploy   # áp dụng migration (prisma migrate deploy)
npm run db:seed          # nạp 13 di tích, 17 lễ hội, 15 lưu trú, 8 đặc sản + tài khoản admin
```

Bước `extract` tự kiểm tra số lượng: nếu thiếu bất kỳ mục nào so với hồ sơ gốc, script sẽ báo lỗi và dừng.

## 6. Build giao diện

```bash
npm run build            # sinh client/dist để Express phục vụ
```

## 7. Khởi chạy bằng PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save                 # ghi nhớ danh sách app
pm2 startup              # in ra 1 lệnh — copy và chạy lệnh đó để tự chạy sau khi reboot

# Kiểm tra
pm2 status
pm2 logs dongtrieu
curl localhost:4000/api/health
```

## 8. Cấu hình Nginx

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/dongtrieu
sudo nano /etc/nginx/sites-available/dongtrieu     # thay <TEN-MIEN> bằng tên miền thật
sudo ln -s /etc/nginx/sites-available/dongtrieu /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t                    # kiểm tra cú pháp
sudo systemctl reload nginx
```

## 9. Bật HTTPS (Let's Encrypt)

Trỏ bản ghi DNS `A` của tên miền về IP VPS trước, rồi:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <TEN-MIEN> -d www.<TEN-MIEN>
```

Certbot tự thêm khối HTTPS và chuyển hướng `http → https`. Chứng chỉ tự gia hạn; kiểm tra bằng:

```bash
sudo certbot renew --dry-run
```

## 10. Tường lửa

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Cổng 4000 **không** cần mở ra ngoài — Nginx gọi qua `127.0.0.1`.

---

## Cập nhật code sau này

```bash
cd /var/www/dongtrieu
git pull
npm install
npm --workspace server run db:deploy    # chỉ chạy nếu có migration mới
npm run build
pm2 reload dongtrieu
```

## Sao lưu

Hai thứ **không nằm trong git**, phải sao lưu riêng:

```bash
# 1. Cơ sở dữ liệu
pg_dump -U dongtrieu -h 127.0.0.1 dongtrieu > backup-$(date +%F).sql

# 2. Ảnh do quản trị viên tải lên
tar -czf uploads-$(date +%F).tar.gz server/uploads/
```

Khôi phục database: `psql -U dongtrieu -h 127.0.0.1 dongtrieu < backup-2026-07-24.sql`

Nên đặt lịch chạy tự động bằng cron, ví dụ 2 giờ sáng mỗi ngày:

```bash
crontab -e
# 0 2 * * * cd /var/www/dongtrieu && pg_dump -U dongtrieu -h 127.0.0.1 dongtrieu > /var/backups/dongtrieu-$(date +\%F).sql
```

---

## Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| `pm2 status` báo `errored` | `pm2 logs dongtrieu --err` — thường do sai `DATABASE_URL` hoặc thiếu `server/.env` |
| Trang trắng, `/api/health` vẫn OK | Chưa chạy `npm run build`, hoặc thư mục `client/dist` bị thiếu |
| Lỗi 502 Bad Gateway | Tiến trình Node đã chết: `pm2 restart dongtrieu` |
| Tải ảnh báo lỗi 413 | Tăng `client_max_body_size` trong Nginx và `UPLOAD_MAX_MB` trong `server/.env` |
| Đăng nhập admin không giữ phiên | Kiểm tra site chạy HTTPS (cookie đặt `secure` khi `NODE_ENV=production`) |

## Ghi chú vận hành

- **Đổi mật khẩu admin**: đăng nhập `/admin` → hoặc gọi `POST /api/auth/change-password`.
- **Cache dự báo**: thời tiết 15 phút, triều cường 60 phút — lưu trong RAM của tiến trình, tự xoá khi `pm2 reload`.
- **Vì sao chỉ 1 instance**: cache lưu theo tiến trình, chạy cluster nhiều instance sẽ gọi Open-Meteo lặp lại không cần thiết. Với lưu lượng cấp phường, 1 instance là đủ.
