# Cổng thông tin du lịch phường Đông Triều

Website du lịch của phường Đông Triều, tỉnh Quảng Ninh — giới thiệu **13 cụm di tích đã xếp hạng**, **17 lễ hội truyền thống**, **15 cơ sở lưu trú**, **8 đặc sản tiêu biểu**, kèm bản đồ, dự báo thời tiết – triều cường theo thời gian thực và trang quản trị nội dung.

Toàn bộ nội dung di tích được biên soạn từ **hồ sơ lý lịch di tích và quyết định xếp hạng chính thức** (thư mục `Ly lich di tich phuong Dong Trieu/`).

---

## Công nghệ

| Lớp | Công nghệ |
|---|---|
| Giao diện | React 18 · Vite · Tailwind CSS · React Router · TanStack Query |
| Thành phần | Swiper (slider) · Recharts (biểu đồ) · TipTap (soạn thảo) · Lucide (icon) |
| Máy chủ | Node 20 · Express 4 |
| Dữ liệu | PostgreSQL 16 · Prisma ORM |
| Khác | JWT (cookie httpOnly) · Multer + Sharp (ảnh) · Zod (kiểm tra dữ liệu) |

Dữ liệu thời tiết & triều cường: [Open-Meteo](https://open-meteo.com) (miễn phí, không cần API key).
Bản tin cảnh báo: RSS của [Trung tâm Dự báo KTTV Quốc gia](https://nchmf.gov.vn).
Bản đồ: Google Maps nhúng qua iframe (không cần API key).

## Cấu trúc thư mục

```
.
├── Ly lich di tich phuong Dong Trieu/   # 29 file .docx — dữ liệu nguồn
├── client/                              # Giao diện React
│   └── src/{components,pages,pages/admin,hooks,lib,styles}
├── server/                              # API Express
│   ├── prisma/{schema.prisma,seed.js,seed-data/}
│   ├── scripts/extract-docx.mjs         # .docx → JSON
│   ├── src/{routes,services,middleware,lib}
│   ├── data/knowledge_base.md           # kho tri thức cho chatbot (giai đoạn sau)
│   └── uploads/                         # ảnh admin tải lên (không commit)
├── ecosystem.config.cjs                 # cấu hình PM2
├── nginx.conf.example                   # cấu hình Nginx mẫu
└── DEPLOY.md                            # hướng dẫn lên VPS
```

---

## Chạy trên máy local

**Yêu cầu:** Node.js ≥ 20, PostgreSQL 16 đang chạy.

### 1. Tạo database

```bash
createdb -U postgres dongtrieu
```

### 2. Tạo file cấu hình

> ⚠️ File `.env` phải nằm ở **`server/.env`** — cả ứng dụng lẫn Prisma đều chỉ đọc ở đó.

```bash
cp .env.example server/.env
```

Mở `server/.env` và sửa `DATABASE_URL` cho khớp mật khẩu PostgreSQL của bạn:

```
DATABASE_URL="postgresql://postgres:MAT_KHAU@127.0.0.1:5432/dongtrieu?schema=public"
```

### 3. Cài đặt và nạp dữ liệu

```bash
npm run setup
```

Lệnh này chạy tuần tự: `npm install` → `extract` (đọc 29 file .docx) → `db:migrate` → `db:seed`.

### 4. Khởi động

```bash
npm run dev
```

- Giao diện: <http://localhost:5173>
- API: <http://localhost:4000/api/health>
- Trang quản trị: <http://localhost:5173/admin>

**Tài khoản admin mặc định** (đặt trong `server/.env`):

```
Tên đăng nhập: admin
Mật khẩu:      123456
```

> ⚠️ Mật khẩu này chỉ phù hợp khi chạy thử trên máy local. **Trước khi đưa lên VPS
> hãy đổi `ADMIN_PASSWORD` trong `server/.env` thành mật khẩu mạnh** — xem [DEPLOY.md](DEPLOY.md).

---

## Các lệnh npm

| Lệnh | Tác dụng |
|---|---|
| `npm run setup` | Cài đặt + trích xuất + migrate + seed (chạy lần đầu) |
| `npm run dev` | Chạy song song server (:4000) và client (:5173) |
| `npm run build` | Build giao diện React ra `client/dist` |
| `npm start` | Chạy production — 1 process phục vụ cả API lẫn giao diện |
| `npm run extract` | Đọc lại 29 file `.docx` → `server/prisma/seed-data/*.json` |
| `npm run db:migrate` | Tạo & áp dụng migration (khi sửa `schema.prisma`) |
| `npm run db:seed` | Nạp lại dữ liệu (an toàn khi chạy nhiều lần) |
| `npm run db:studio` | Mở Prisma Studio để xem/sửa database trực quan |

Chạy thử production trên máy local:

```bash
npm run build
NODE_ENV=production npm start     # mở http://localhost:4000
```

---

## API

Tất cả endpoint ghi dữ liệu (`POST` / `PATCH` / `DELETE`) đều yêu cầu đăng nhập bằng cookie JWT.

| Method | Đường dẫn | Ghi chú |
|---|---|---|
| `POST` | `/api/auth/login` · `/logout` · `GET /me` | Giới hạn 5 lần đăng nhập sai / 15 phút |
| `GET` | `/api/heritages` | Lọc `?type=&rank=&ward=&featured=1&q=` |
| `GET` | `/api/heritages/:slug` | Kèm thư viện ảnh |
| `GET` | `/api/festivals` | Lọc `?month=` (tháng âm lịch), `?scale=` |
| `GET` | `/api/lodgings` · `/cuisines` · `/restaurants` · `/articles` · `/slides` | |
| `GET` | `/api/weather` | Hiện tại + 24 giờ + 7 ngày · cache 15 phút |
| `GET` | `/api/tide` | Mực nước 3 ngày + giờ nước lớn/ròng · cache 60 phút |
| `GET` | `/api/bulletins` | Bản tin NCHMF · cache 30 phút · tự bỏ qua khi nguồn lỗi |
| `POST` | `/api/media/upload` | Tự nén sang WebP 1600px + thumbnail 480px |
| `GET` | `/api/settings` · `PUT /api/settings/:key` | Liên hệ, mạng xã hội, toạ độ, SEO |
| `POST` | `/api/chat` | Chatbot — hiện trả thông báo "đang hoàn thiện" |

`GET /sitemap.xml` và `/robots.txt` được sinh động từ database.

---

## Trang quản trị

Đăng nhập tại `/admin` để quản lý: **Di tích · Lễ hội · Lưu trú · Ẩm thực · Nhà hàng · Bài viết · Slider trang chủ · Thư viện ảnh · Cài đặt chung**.

Một số điểm đáng chú ý:

- **Thư viện ảnh**: tải lên nhiều ảnh cùng lúc, tự nén WebP, gán mô tả (alt), chọn làm ảnh bìa.
- **Form di tích**: có ô nhập `lat`/`lng` kèm nút *"Xem thử trên bản đồ"* để ghim toạ độ chính xác.
- **Bài viết**: soạn thảo trực quan (in đậm, tiêu đề, danh sách, chèn ảnh, liên kết).
- Bật/tắt hiển thị từng mục bằng công tắc *Hiển thị* mà không cần xoá dữ liệu.

---

## Giới hạn dữ liệu hiện tại

Những điểm sau là **hiện trạng dữ liệu nguồn**, không phải lỗi — cần bổ sung dần qua trang quản trị:

| Hạng mục | Hiện trạng | Cách khắc phục |
|---|---|---|
| **Ảnh di tích** | Chưa có ảnh thật. Ảnh nhúng trong file `.docx` gốc chỉ là con dấu và sơ đồ vị trí (10–80 KB). Website đang dùng ảnh bìa placeholder tự vẽ (gradient theo loại hình + badge xếp hạng). | Admin → Di tích → tải ảnh thật lên |
| **Toạ độ GPS** | Chỉ 1/13 di tích có toạ độ trong hồ sơ (đền, chùa Kênh Giang). 12 điểm còn lại đang ghim theo địa chỉ chữ nên có thể lệch vài trăm mét. | Admin → Di tích → nhập `lat`/`lng` |
| **Nhà hàng, quán ăn** | Hồ sơ gốc không có danh sách. 5 mục hiện tại là **dữ liệu mẫu** (gắn cờ `isPlaceholder`, hiển thị nhãn *"dữ liệu mẫu"*), suy ra từ mục "Mua/thưởng thức tại" của 8 đặc sản. | Admin → Nhà hàng → thay bằng cơ sở thật |
| **Triều cường** | Toạ độ Đông Triều nằm sâu trong đất liền, ngoài lưới hải văn của Open-Meteo (trả về `null`). Hệ thống dùng điểm **cửa Nam Triệu – Bạch Đằng** (20.70, 106.80) làm số liệu **tham chiếu** cho vùng sông Kinh Thầy – Đá Bạc, và ghi rõ điều này trên giao diện. | Không cần sửa — đã ghi nhãn minh bạch |
| **Chatbot AI** | Mới có vỏ giao diện. Endpoint `/api/chat` trả thông báo "đang hoàn thiện". | Giai đoạn sau: nối mô hình ngôn ngữ, dùng `server/data/knowledge_base.md` làm ngữ cảnh |

---

## Triển khai lên VPS

Xem hướng dẫn chi tiết tại **[DEPLOY.md](DEPLOY.md)** — cài Node/PostgreSQL/Nginx/PM2, cấu hình HTTPS bằng Let's Encrypt, quy trình cập nhật và sao lưu.
