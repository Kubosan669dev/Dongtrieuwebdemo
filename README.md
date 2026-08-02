# Khám phá Đông Triều

Cổng thông tin của phường Đông Triều, tỉnh Quảng Ninh — viết cho **bà con trong phường** trước, khách phương xa sau. Gồm **11 khu phố sau sắp xếp** (tra được bằng tên khu cũ), **13 cụm di tích đã xếp hạng**, **17 lễ hội truyền thống**, **41 nơi ăn uống**, **8 đặc sản tiêu biểu**, **7 điểm đến lân cận**, **21 cơ sở lưu trú** cho khách tới thăm, kèm **bản đồ số** (Google Maps, tự rơi về OpenStreetMap khi chưa có khoá), **đánh giá có kiểm duyệt**, biểu mẫu liên hệ, dự báo thời tiết – triều cường theo thời gian thực và trang quản trị nội dung.

Toàn bộ nội dung di tích được biên soạn từ **hồ sơ lý lịch di tích và quyết định xếp hạng chính thức** (thư mục `Ly lich di tich phuong Dong Trieu/`).

---

## Công nghệ

| Lớp | Công nghệ |
|---|---|
| Giao diện | React 18 · Vite · Tailwind CSS · React Router · TanStack Query |
| Thành phần | Swiper (slider) · Recharts (biểu đồ) · TipTap (soạn thảo) · Lucide (icon) |
| Máy chủ | Node 20 · Express 4 |
| Dữ liệu | PostgreSQL 16 · Prisma ORM |
| Khác | JWT (token giữ trong bộ nhớ) · Multer + Sharp (ảnh) · Zod (kiểm tra dữ liệu) |

Dữ liệu thời tiết & triều cường: [Open-Meteo](https://open-meteo.com) (miễn phí, không cần API key).

### Trang Khu phố

`/khu-pho` trả lời câu hỏi thường gặp nhất của người dân sau sắp xếp: **36 khu phố
cũ nay gộp thành 11 khu**, khu mình ở giờ tên gì, nhà văn hoá ở đâu, ghi địa chỉ
thế nào cho đúng.

Ô tra cứu khớp theo **tên khu CŨ** và bỏ dấu cả hai phía, nên gõ `thu duong` ra
ngay Khu phố Mễ Xá. Dữ liệu gốc viết tắt hai kiểu và trang phải gỡ cả hai, nếu
không việc tra sẽ sai:

- `"Nguyễn Huệ 3 + 4 + 5 + … + 9"` — các phần sau lược mất tiền tố. Cắt thô là ra
  những cái nhãn `"4"`, `"5"` vô nghĩa, và bà con ở khu Nguyễn Huệ 7 gõ đúng tên
  khu mình thì **không tìm thấy gì**, vì chuỗi gốc không hề chứa cụm đó.
- `"Giữ nguyên khu Đạm Thuỷ"` — là một câu, không phải danh sách tên.

Toàn bộ số liệu (12.722 hộ · 42.454 nhân khẩu · 40,41 km²) **cộng từ dữ liệu**,
không gõ tay. Nguồn là khoá cài đặt `khuPho`, sửa trong Admin → Cài đặt.

### Bản đồ số

**Mọi bản đồ trên trang công khai đều là bản đồ Google, và không cần khoá API.**
Tất cả đi qua một thành phần duy nhất — [`MapEmbed.jsx`](client/src/components/MapEmbed.jsx)
— nhúng bản đồ bằng `<iframe>`.

| Trang | Bản đồ hiện gì |
|---|---|
| `/ban-do` | điểm đang chọn trong danh sách; đổi mục là bản đồ chạy theo |
| Trang chủ | toàn phường ở mức phóng 13 |
| Di tích · lưu trú · quán ăn | đúng địa điểm đang xem |
| Liên hệ | trung tâm phường (mức 14 — toạ độ là tâm phường, không phải cửa trụ sở) |

### Vì sao khung bản đồ chỉ hiện một điểm

Nhúng bằng `<iframe>` là cách **duy nhất** lấy được nền Google mà không cần khoá.
Đổi lại, khối đó khác tên miền nên bị niêm phong: cổng không gắn được ghim của
mình vào, không bắt được cú bấm, và mỗi lần chỉ hiện được một điểm.

Việc "xem toàn cảnh" vì thế do **thanh bên** của trang `/ban-do` gánh, và đó là lý
do trang này được dựng theo lối tràn màn hình thay vì một trang bài viết thường:

- thanh bên bên trái, bản đồ chiếm trọn phần màn hình còn lại dưới thanh điều hướng
- bộ lọc bốn nhóm bật/tắt được nhiều nhóm cùng lúc, ô tìm không dấu
- mỗi mục trong danh sách mang theo **đoạn giới thiệu**, không chỉ tên với địa chỉ
  — danh sách phải tự nó đủ để chọn, vì bản đồ không bày ra được 66 điểm cùng lúc
- khung chi tiết **nổi trên bản đồ**: ảnh, mô tả, cảnh báo toạ độ ước tính, và một
  nút hành động đổi theo nhóm — di tích thì *Khám phá chi tiết* vào trang riêng,
  ba nhóm còn lại thì *Chỉ đường tới đây* (chúng không có trang riêng)

Đoạn giới thiệu được **cắt sẵn ở máy chủ** còn 320 ký tự (`server/src/routes/mapPoints.js`).
Hồ sơ một di tích dài hàng nghìn chữ; nhân 66 điểm là mấy trăm KB cho một trang
chỉ hiện vài dòng mỗi mục.

> Bản đồ nhiều ghim tự vẽ (Leaflet/Google JS API, ghim bốn màu, lọc trực tiếp
> trên bản đồ) từng được làm xong ở commit `933b9d1`–`0226ad0` nhưng đã gỡ bỏ:
> bản Google của nó bắt buộc phải có khoá API. Cần lấy lại thì lấy từ đó.

### Khoá API — không bắt buộc, nhưng nên có

Bỏ trống thì mọi thứ vẫn chạy như trên. Điền khoá vào *Cài đặt chung → Bản đồ*
thì được hai thứ:

| | Không khoá | Có khoá |
|---|---|---|
| Bản đồ công khai | URL `output=embed` — dạng cũ Google **không có tài liệu chính thức**, chạy nhiều năm nhưng không hứa giữ | **Maps Embed API** chính danh, miễn phí không giới hạn lượt |
| Chọn toạ độ trong khu quản trị | nền OpenStreetMap (vùng Đông Triều khá thưa tên đường) | nền Google, thấy rõ tên đình chùa để đặt ghim cho đúng |

Cần bật **Maps JavaScript API** *và* **Maps Embed API** trong Cloud Console — thiếu
Embed API thì bản đồ công khai hiện khung báo lỗi của Google. Bản triển khai muốn
ghim sẵn khoá lúc dựng thì đặt `VITE_GOOGLE_MAPS_API_KEY` (và
`VITE_GOOGLE_MAPS_MAP_ID`) trong `client/.env` — ô trong Cài đặt được ưu tiên,
biến môi trường là giá trị rơi về.

> ⚠️ Khoá Maps API **luôn công khai trong mã nguồn trang** — Google thiết kế như
> vậy và không có cách nào giấu. Bắt buộc vào Cloud Console đặt **giới hạn theo
> tên miền** (HTTP referrer) cho đúng địa chỉ của cổng, nếu không ai chép được
> khoá cũng dùng được và phường phải trả tiền.

Công cụ chọn toạ độ là chỗ **duy nhất** còn dùng Maps JavaScript API: ở đó cần bắt
cú bấm lên bản đồ và cần ghim kéo được — hai việc `<iframe>` không làm được. Nó tự
rơi về Leaflet + OpenStreetMap khi không có khoá, nên Leaflet chỉ nằm trong gói
của khu quản trị, trang công khai không tải.

Việc **dò toạ độ từ địa chỉ** (nút *"Dò từ địa chỉ"* trong khu quản trị) không đi
qua Google mà dùng [Nominatim](https://nominatim.org) của OpenStreetMap, chạy phía
máy chủ — miễn phí, và không lộ địa chỉ IP của người dùng cho bên thứ ba.

## Cấu trúc thư mục

```
.
├── Ly lich di tich phuong Dong Trieu/   # 29 file .docx — dữ liệu nguồn
├── Anh di tich/                         # ảnh nguồn + _nguon-anh.json (ghi giấy phép)
├── shared/                              # mã dùng chung cho cả client lẫn server
│   └── weather.js                       # mã WMO + gợi ý theo thời tiết (web & chatbot chung một nguồn)
├── client/                              # Giao diện React
│   └── src/{components,pages,pages/admin,hooks,lib,styles}
├── server/                              # API Express
│   ├── prisma/{schema.prisma,seed.js,seed-data/}
│   ├── scripts/                         # extract-docx · build-dataset · fetch-images · test-chatbot
│   ├── src/
│   │   ├── lib/                         # vitext.js (tiếng Việt) · lunar.js (âm lịch) · hours.js · geo.js
│   │   ├── services/                    # chatbot.js · knowledge.js · retrieval.js · weather · tide
│   │   ├── routes/ · middleware/
│   ├── data/knowledge_base.md           # bản xuất tĩnh kho tri thức (tham khảo/đối chiếu)
│   ├── data/sources/                     # bộ dữ liệu khảo sát 2026 + logo gốc của phường
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

Lệnh này chạy tuần tự: `npm install` → `extract` (đọc 29 file .docx) → `build-dataset`
(chuyển bộ dữ liệu khảo sát 2026) → `db:migrate` → `db:seed`.

### 4. Khởi động

```bash
npm run dev
```

- Giao diện: <http://localhost:5173>
- API: <http://localhost:4000/api/health>
- Trang quản trị: <http://localhost:5173/admin>

**Tài khoản quản trị** được tạo lúc seed từ hai biến trong `server/.env`:

```
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="…"      # bắt buộc, tối thiểu 10 ký tự
```

Không có mật khẩu mặc định: `npm run db:seed` sẽ dừng và báo lỗi nếu
`ADMIN_PASSWORD` còn trống, quá ngắn, hoặc nằm trong danh sách dễ đoán. Sinh
một mật khẩu mạnh:

```bash
node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"
```

> ⚠️ Trang quản trị bắt nhập lại mật khẩu mỗi lần tải trang (token chỉ nằm trong
> bộ nhớ, không lưu cookie hay `localStorage`). Điều đó chỉ có tác dụng khi mật
> khẩu đủ mạnh — xem thêm [DEPLOY.md](DEPLOY.md).

---

## Các lệnh npm

| Lệnh | Tác dụng |
|---|---|
| `npm run setup` | Cài đặt + trích xuất + chuyển dữ liệu + migrate + seed (chạy lần đầu) |
| `npm run dev` | Chạy song song server (:4000) và client (:5173) |
| `npm run build` | Build giao diện React ra `client/dist` |
| `npm start` | Chạy production — 1 process phục vụ cả API lẫn giao diện |
| `npm run extract` | Đọc lại 29 file `.docx` → `server/prisma/seed-data/*.json` |
| `npm run build-dataset` | Chuyển `server/data/sources/*.json` (khảo sát 2026) → 3 lớp phủ seed |
| `npm run make-favicon` | Sinh lại favicon, logo header/footer và ảnh chia sẻ từ logo phường |
| `npm run db:migrate` | Tạo & áp dụng migration (khi sửa `schema.prisma`) |
| `npm run db:seed` | Nạp lại dữ liệu (an toàn khi chạy nhiều lần) |
| `npm run db:studio` | Mở Prisma Studio để xem/sửa database trực quan |
| `npm run fetch-images` | Tải ảnh minh hoạ về thư mục `Anh di tich/` (Pexels nếu có key, không thì Wikimedia) |
| `npm run import-images` | Nén ảnh sang WebP, đưa vào `server/uploads/` và gán ảnh bìa theo slug |
| `npm run test-chatbot` | Chạy thử trợ lý AI với ~40 câu hỏi mẫu, in ra câu trả lời |
| `npm run test-chatbot "câu hỏi"` | Hỏi trợ lý một câu bất kỳ ngay trên terminal |
| `npm run test-scenarios` | Bộ kịch bản ~110 câu theo 18 nhóm (kiểu cổng du lịch); báo nhóm nào chưa đạt |
| `npm run test-scenarios-bulk` | Bộ sinh tự động ~1.400 câu từ dữ liệu thật; báo tỷ lệ đạt theo nhóm |

Chạy thử production trên máy local:

```bash
npm run build
NODE_ENV=production npm start     # mở http://localhost:4000
```

---

## API

Tất cả endpoint ghi dữ liệu (`POST` / `PATCH` / `DELETE`) đều yêu cầu gửi kèm header
`Authorization: Bearer <token>`; token lấy từ `POST /api/auth/login`.

Cố ý **không dùng cookie**: cookie sống qua các lần tải trang nên mở `/admin` là đã
đăng nhập sẵn, trong khi yêu cầu của phường là mỗi lần vào phải nhập lại mật khẩu.
Giao diện giữ token trong bộ nhớ (không `localStorage`), tải lại trang là mất phiên.
Bỏ cookie cũng loại luôn nguy cơ CSRF cho toàn bộ API quản trị.

| Method | Đường dẫn | Ghi chú |
|---|---|---|
| `POST` | `/api/auth/login` · `/logout` · `GET /me` | Giới hạn 5 lần đăng nhập sai / 15 phút |
| `GET` | `/api/heritages` | Lọc `?type=&rank=&ward=&featured=1&q=` |
| `GET` | `/api/heritages/:slug` | Kèm thư viện ảnh |
| `GET` | `/api/festivals` | Lọc `?month=` (tháng âm lịch), `?scale=` |
| `GET` | `/api/lodgings` · `/cuisines` · `/restaurants` · `/articles` · `/slides` | |
| `GET` | `/api/attractions` | 6 điểm đến lân cận ngoài phường (Ngọa Vân, Quỳnh Lâm, đền An Sinh…) |
| `GET` | `/api/weather` | Hiện tại + 24 giờ + 7 ngày · cache 15 phút |
| `GET` | `/api/tide` | Mực nước 3 ngày + giờ nước lớn/ròng · cache 60 phút |
| `POST` | `/api/media/upload` | Tự nén sang WebP 1600px + thumbnail 480px |
| `GET` | `/api/settings` · `PUT /api/settings/:key` | Liên hệ, mạng xã hội, toạ độ, SEO |
| `POST` | `/api/chat` | Trợ lý AI — trả lời từ dữ liệu của phường · giới hạn 30 câu/phút mỗi IP |
| `GET` | `/api/chat/suggestions` | Lời chào + câu hỏi gợi ý cho khung chat |
| `GET` | `/api/chat/logs` | Nhật ký câu hỏi (**cần đăng nhập**) · `?unmatched=1` lọc câu bot chịu thua |

`GET /sitemap.xml` và `/robots.txt` được sinh động từ database.

---

## Trang quản trị

Đăng nhập tại `/admin` để quản lý: **Di tích · Lễ hội · Điểm lân cận · Lưu trú · Ẩm thực · Nhà hàng · Bài viết · Slider trang chủ · Thư viện ảnh · Trợ lý AI · Cài đặt chung**.

Một số điểm đáng chú ý:

- **Bảng màu**: nút 🎨 trên thanh đầu (cả trang công khai lẫn trang quản trị) mở hộp chọn **8 bảng màu** — Paper Heritage, Coral Sunrise, Teal Paradise, Hạ Long Blue, Forest Zen, Rose Lotus, Zen Neutral, Midnight Crimson — kèm công tắc nền sáng/tối. Lựa chọn lưu theo máy, admin và trang công khai dùng chung.
- **Thang chữ dùng mực trung tính, không dùng màu thương hiệu**: `.text-body` · `.text-muted` · `.text-subtle` · `.text-danger` khai trong [`index.css`](client/src/styles/index.css). Hạ cấp bằng **độ đậm**, không bằng cách nhạt dần về màu xanh — lối cũ vừa làm chữ phụ khó đọc (2.59 · 3.56 · 4.29 tương phản, đều dưới ngưỡng AA 4.5) vừa làm chính màu thương hiệu hết nổi vì nó bị bôi lên mọi dòng chữ. Sửa mức độ mờ thì chạy lại `npm run check-contrast` — bài kiểm giữ cả **8 bảng màu** ở mức đạt chuẩn.
- **Nhãn có hai dáng, không phải sáu màu** (`TONES` trong [`ui.jsx`](client/src/components/ui.jsx)): **nền đặc** cho bậc cao của thang xếp hạng, **viền** cho nhãn phân loại. Nhờ vậy nhìn danh sách di tích là biết ngay cái nào xếp hạng cao hơn. `terra` không dùng làm nền chữ được ở bảng màu nào cũng đạt — nó đổi tính hoàn toàn giữa các bảng (gạch nung sẫm ở Paper Heritage, cam tươi ở Midnight Crimson) nên chữ trắng trượt ở 3 bảng còn chữ đậm trượt ở 4 bảng kia; nay nó chỉ còn làm **đường viền**.
- **Đăng nhập lại mỗi lần vào**: khu quản trị không giữ phiên qua lần tải trang. Bấm F5 hay mở tab mới đều phải nhập lại mật khẩu.
- **Thư viện ảnh**: tải lên nhiều ảnh cùng lúc, tự nén WebP, gán mô tả (alt), chọn làm ảnh bìa.
- **Ảnh minh hoạ kèm chú thích**: cả 6 loại nội dung (di tích · lễ hội · điểm lân cận · nhà hàng · ẩm thực · lưu trú) đều có ô **Thư viện ảnh** — mỗi ảnh nhập được chú thích riêng và đổi được thứ tự. Chú thích hiện ngay dưới ảnh ở trang chi tiết, không chỉ nằm trong `alt`. Nhà hàng và điểm lân cận trước đây không có trang chi tiết, nay bấm **"Xem chi tiết"** trên thẻ để mở cửa sổ đầy đủ.
- **Form di tích**: đặt toạ độ bằng cách **bấm thẳng lên bản đồ** hoặc kéo ghim, kèm nút *"Dò từ địa chỉ"*. Hai ô số `lat`/`lng` vẫn giữ cho ai muốn dán toạ độ chính xác từ nguồn khác.
- **Lưu trú**: trang `/luu-tru` cho bấm vào từng cơ sở để xem **chi tiết** (mô tả, giá phòng, tiện nghi, ảnh, bản đồ). Các trường này lấy từ form Lưu trú trong admin — điền càng đầy đủ, cửa sổ chi tiết càng phong phú (hiện dữ liệu gốc mới có tên/địa chỉ/điện thoại).
- **Bài viết**: soạn thảo trực quan (in đậm, tiêu đề, danh sách, chèn ảnh, liên kết).
- **Công tắc "Ảnh minh hoạ"**: bật khi ảnh không phải chụp chính địa điểm đó — trang công khai sẽ hiện nhãn nhỏ để du khách không hiểu nhầm.
- **Công tắc "Đã gọi xác minh"** (Nhà hàng): thông tin lấy từ Internet mặc định hiện nhãn cảnh báo; bật công tắc sau khi bạn gọi kiểm tra để gỡ nhãn.
- **Trợ lý AI**: xem du khách hỏi gì và những câu trợ lý chưa trả lời được — dùng để biết cần bổ sung dữ liệu ở đâu.
- Bật/tắt hiển thị từng mục bằng công tắc *Hiển thị* mà không cần xoá dữ liệu.

---

## Giới hạn dữ liệu hiện tại

Những điểm sau là **hiện trạng dữ liệu nguồn**, không phải lỗi — cần bổ sung dần qua trang quản trị:

| Hạng mục | Hiện trạng | Cách khắc phục |
|---|---|---|
| **Ảnh** | **1/27 mục có ảnh thật** (chùa quán Ngọc Thanh). 26 mục còn lại dùng ảnh bìa placeholder tự vẽ — gradient theo loại hình + badge xếp hạng, trông vẫn chỉn chu. Đã thử tải tự động từ Wikimedia Commons nhưng **kết quả sai lệch nghiêm trọng** (trả về đền Sikh ở Ấn Độ, ảnh đường phố, ảnh người) nên đã gỡ bỏ. | Xem mục [Thêm ảnh cho website](#thêm-ảnh-cho-website) — **cần key Pexels** |
| **Toạ độ GPS** | Chỉ 1/13 di tích có toạ độ trong hồ sơ (đền, chùa Kênh Giang). 12 điểm còn lại ghim theo địa chỉ chữ nên có thể lệch vài trăm mét. Các cơ sở ăn uống, lưu trú thì **46/62 đã có toạ độ** từ bộ khảo sát 2026, nên trợ lý tính được khoảng cách thật khi hỏi *"quán ăn gần đền Yết Kiêu"*. | Admin → Di tích → *"Chọn trên bản đồ"*, bấm lên bản đồ hoặc kéo ghim |
| **Nhà hàng, quán ăn** | Hồ sơ .docx gốc không có danh sách. Nay có **41 mục** (27 quán ăn/nhà hàng + 11 cà phê, trà sữa + 3 điểm dừng chân) từ bộ khảo sát 2026, kèm điểm sao Google, giờ mở cửa, toạ độ và khu phố. Tất cả vẫn gắn cờ `isVerified=false` và hiện nhãn *"chưa xác minh"*. Cơ sở thuộc **phường An Sinh / Bình Khê / Mạo Khê** sau sáp nhập đã ghi rõ ở trường `area`. | Gọi kiểm tra SĐT → Admin → Nhà hàng → bật công tắc *"Đã gọi xác minh"* |
| **Khu phố** | Trợ lý quy đổi được **11/13 di tích** về khu phố mới (qua bảng gộp khu cũ). Còn *Đồn Cao* và *làng Vân Động* chưa quy được vì hồ sơ chỉ ghi "trung tâm phường" / tên thôn không có trong bảng. Khu phố của quán ăn, cà phê phần lớn là **ước tính** từ tên đường và toạ độ. | Đối chiếu sơ đồ khu phố chính thức → Admin → sửa trường `khuPho` |
| **Đánh giá sao** | Điểm sao lấy từ Google Maps chốt ngày 27/07/2026, **không phải đánh giá chính thức của phường**. 42/62 cơ sở có điểm; số còn lại chưa ai đánh giá. | Cập nhật định kỳ bằng `npm run build-dataset` sau khi làm mới file nguồn |
| **Triều cường** | Toạ độ Đông Triều nằm sâu trong đất liền, ngoài lưới hải văn của Open-Meteo (trả về `null`). Hệ thống dùng điểm **cửa Nam Triệu – Bạch Đằng** (20.70, 106.80) làm số liệu **tham chiếu** cho vùng sông Kinh Thầy – Đá Bạc, ghi rõ trên giao diện. | Không cần sửa — đã ghi nhãn minh bạch |
| **Trợ lý AI** | Đã hoạt động, chạy hoàn toàn trên dữ liệu của phường. Vì không dùng mô hình ngôn ngữ nên trợ lý **chỉ hiểu những cách hỏi đã được dạy** — gặp câu lạ sẽ nói thật là chưa biết chứ không bịa. | Xem mục [Trợ lý AI](#trợ-lý-ai-chatbot) để biết cách mở rộng |

---

## Logo và favicon

Logo phường nằm ở `server/data/sources/logo-dong-trieu.png` (953×953, nền trong suốt).
Thay file đó rồi chạy `npm run make-favicon` là sinh lại toàn bộ:

| File trong `client/public/` | Dùng ở đâu |
|---|---|
| `favicon-32.png` | biểu tượng trên tab trình duyệt |
| `favicon-180.png` | biểu tượng khi lưu ra màn hình chính iOS/Android |
| `favicon-512.png` | biểu tượng độ phân giải cao |
| `logo.png` | logo ở header và footer |
| `og-image.png` | ảnh xem trước khi chia sẻ link lên Zalo / Facebook |

Ruột logo vốn trong suốt (chỉ vòng tròn, dãy núi và dòng chữ được vẽ), nên script **lót thêm
một đĩa trắng đúng bằng vòng tròn** — nếu không, đặt lên header chế độ tối hoặc footer
(`bg-jade-950`) thì viền xanh đậm gần như biến mất. Bốn góc vẫn trong suốt nên logo giữ được
hình huy hiệu tròn.

Thẻ `og:image` trong [`client/index.html`](client/index.html) đang dùng đường dẫn tương đối.
Khi lên tên miền thật, nên đổi thành URL tuyệt đối (`https://<tên-miền>/og-image.png`) để chắc
chắn Zalo và Facebook lấy được ảnh.

---

## Thêm ảnh cho website

Có 3 cách, dùng cách nào cũng được:

### Cách 1 — Tải hàng loạt bằng Pexels (nhanh nhất)

Lấy API key miễn phí tại <https://www.pexels.com/api/> (đăng ký ~1 phút), dán vào `server/.env`:

```
PEXELS_API_KEY="chuoi-key-cua-ban"
```

Rồi chạy:

```bash
npm run fetch-images     # tải ảnh về thư mục "Anh di tich/"
npm run import-images    # nén WebP, đưa vào site, gán ảnh bìa
```

Chạy lại nhiều lần an toàn — ảnh đã có sẽ được bỏ qua, **không ghi đè ảnh thật bạn tự thêm**.

> ⚠️ Nếu bỏ trống `PEXELS_API_KEY`, script chuyển sang Wikimedia Commons — **không khuyến khích**.
> Thử nghiệm thực tế cho thấy nguồn này gần như không có ảnh phù hợp cho di tích Đông Triều
> (trả về đền Sikh ở Ấn Độ, ảnh đường phố, ảnh người) và chặn tần suất rất gắt (HTTP 429).
> Nếu vẫn dùng, **hãy xem lại từng ảnh trong `Anh di tich/` và xoá ảnh không phù hợp**
> trước khi chạy `npm run import-images`.

### Cách 2 — Tự bỏ ảnh vào thư mục

Đặt ảnh vào `Anh di tich/` với **tên file trùng slug** của mục, ví dụ:

```
Anh di tich/chua-my-cu-sung-khanh-tu.jpg
Anh di tich/am-chua-ngoa-van.jpg
```

Rồi chạy `npm run import-images`. Ảnh tự thêm được coi là **ảnh thật** nên không gắn nhãn minh hoạ.

### Cách 3 — Tải trực tiếp trên trang quản trị

Admin → mục cần sửa → ô **Ảnh bìa** → chọn hoặc tải ảnh mới. Nhớ bật công tắc
**"Ảnh minh hoạ"** nếu ảnh không phải chụp chính địa điểm đó.

### Ghi chú về nguồn ảnh

File `Anh di tich/_nguon-anh.json` lưu nguồn, giấy phép và đường dẫn gốc của từng ảnh tải tự động —
dùng để đối chiếu bản quyền khi cần.

---

## Trợ lý AI (chatbot)

Nút trò chuyện ở góc phải dưới mọi trang. **Trợ lý chạy hoàn toàn trên máy chủ của bạn** — không
gọi OpenAI, Gemini hay bất kỳ dịch vụ AI nào, không cần API key, không tốn phí, không gửi câu hỏi
của du khách ra ngoài.

### Cách hoạt động

```
Câu hỏi  →  ① Nhận diện ý định (luật tiếng Việt)
              ├─ thời tiết / triều cường  → tính từ số liệu Open-Meteo thời gian thực
              ├─ lễ hội sắp diễn ra       → quy đổi âm lịch → dương lịch
              └─ còn lại ↓
            ② Tra cứu BM25 trên toàn bộ database
            ③ Trích thông tin từ bản ghi có thật → soạn câu trả lời
```

Hệ quả quan trọng: **trợ lý không bịa**. Mọi số điện thoại, địa chỉ, con số trong câu trả lời đều
lấy từ một bản ghi cụ thể trong database. Không tìm được thì nói thẳng là chưa biết.

### Trả lời được những gì

| Nhóm | Ví dụ câu hỏi |
|---|---|
| Thời tiết | *"thời tiết hôm nay thế nào"* · *"ngày mai có mưa không"* · *"thứ bảy trời thế nào"* · *"dự báo 7 ngày tới"* |
| Triều cường | *"triều cường hôm nay"* · *"con nước lên xuống giờ nào"* |
| Gợi ý theo thời tiết | *"hôm nay nên đi đâu"* — chọn di tích trong nhà khi mưa, nơi có bóng mát khi nắng nóng |
| Di tích | *"chùa Mỹ Cụ có gì đặc biệt"* · *"đền Yết Kiêu thờ ai"* · *"Đông Triều có bao nhiêu di tích"* |
| Lễ hội | *"lễ hội nào sắp diễn ra"* (kèm **số ngày còn lại**) · *"lễ hội tháng Giêng có những gì"* |
| Ẩm thực, lưu trú | *"ăn gì ở Đông Triều"* · *"na mùa nào"* · *"khách sạn ở đâu"* (kèm SĐT) |
| **Đánh giá & xếp hạng** | *"quán nào đánh giá cao nhất"* · *"khách sạn nào được đánh giá tốt"* · *"quán nào giá mềm"* — xếp theo sao Google **có xét số lượt đánh giá** |
| **Giờ mở cửa cơ sở** | *"giờ này còn quán nào mở không"* · *"chỗ nào mở 24/24"* · *"ăn khuya ở đâu"* · *"quán nào mở sớm"* |
| **Tìm quanh một di tích** | *"quán ăn gần đền Yết Kiêu"* (khoảng cách thật) · *"chỗ nghỉ gần chùa Quán Ngọc Thanh"* (cùng khu phố) |
| **Khu phố** | *"phường có bao nhiêu khu phố"* · *"khu phố Mỹ Cụ gồm những khu nào"* · *"ăn gì ở khu phố Nguyễn Bình"* |
| **Cà phê, trà sữa** | *"quán cà phê nào đẹp"* · *"trà sữa ở đâu ngon"* |
| Đường đi | *"đi từ Hà Nội thế nào"* · *"Đông Triều cách Hà Nội bao xa"* |
| **Lộ trình cá nhân hoá** | Vẽ đúng khoảng thời gian hỏi và điều chỉnh theo người: *"lộ trình 1 buổi sáng"* (chỉ vẽ sáng) · *"lịch trình cho người lớn tuổi"* (bỏ điểm leo trèo) · *"lộ trình thiên về tâm linh / lịch sử"* · *"gia đình có trẻ nhỏ nên đi đâu"* · *"tôi có 2 triệu thì vạch lộ trình + ăn uống"* (chọn quán theo **giá và đánh giá**) |
| **Lễ hội chi tiết** | *"lễ hội đền An Sinh thờ ai"* · *"lễ hội chùa Quỳnh Lâm có nghi lễ gì"* · *"đi lễ hội Ngọa Vân cần lưu ý gì"* · *"lễ hội Thái Miếu phần hội có gì"* |
| Giới thiệu, vé, giờ mở cửa | *"giới thiệu về Đông Triều"* · *"vé vào cửa bao nhiêu"* · *"mấy giờ mở cửa"* |
| Liên hệ & khẩn cấp | *"số điện thoại UBND phường"* · *"gọi cấp cứu số mấy"* (113/114/115) |

Hiểu cả **chữ không dấu** (*"chua my cu o dau"*) và **lỗi gõ nhẹ** (*"chùa mĩ cụ"*).

Những gì **ngoài phạm vi** (thủ tục hành chính, ATM/bãi đỗ, chuyện ngoài Đông Triều) thì trợ lý **từ chối trung thực và chỉ hướng đúng chỗ** thay vì bịa — ví dụ hỏi làm căn cước thì hướng sang UBND phường / Cổng dịch vụ công. Hỏi xếp hạng theo tiêu chí không có trong dữ liệu (*"quán nào wifi mạnh nhất"*) cũng nói thẳng là chưa có, thay vì trả về một danh sách trông như đã trả lời.

#### Ba nguyên tắc khi dùng dữ liệu đánh giá

Bộ dữ liệu khảo sát 2026 có điểm sao Google Maps cho phần lớn cơ sở. Trợ lý dùng nó theo ba quy tắc:

1. **Xếp hạng có xét độ tin cậy** — quán 5★ với 2 lượt đánh giá không được thắng quán 4,2★ với 80
   lượt. Điểm được kéo về trung bình chung theo số lượt (Bayesian shrinkage) trước khi so sánh.
2. **Không chủ động chê** — đây là cổng thông tin chính thức của phường, nên các câu **gợi ý** chỉ
   lấy cơ sở từ **3,5★ trở lên**. Cơ sở *chưa có lượt đánh giá nào* vẫn được gợi ý (chưa có ≠ dở) và
   không bao giờ hiển thị là "0 sao".
3. **Hỏi đích danh thì trả lời đầy đủ** — hỏi thẳng một quán điểm thấp, trợ lý vẫn đưa nguyên nhận
   xét kể cả phần chưa hay. Giấu thông tin lúc khách hỏi thẳng còn tệ hơn.

Với câu *"gần di tích X"*, trợ lý đi theo đúng thứ tự đáng tin: có toạ độ hai đầu thì **tính khoảng
cách thật**; chỉ biết khu phố thì xếp **cùng khu phố** và nói rõ là cùng khu phố chứ không hứa là gần
nhất; không có gì thì nói thẳng lý do. Hồ sơ di tích hiện chỉ có 1/13 điểm có toạ độ.

### Cách "dạy" thêm cho trợ lý

Trợ lý đọc thẳng từ database, nên **sửa dữ liệu là sửa kiến thức của bot** — không phải huấn luyện
lại gì cả. Có 3 mức:

1. **Thêm nội dung** — Admin → Di tích / Lễ hội / Ẩm thực… Vừa lưu là trợ lý biết ngay.
2. **Dạy cách hỏi mới** — mở [`server/src/lib/vitext.js`](server/src/lib/vitext.js), thêm một dòng
   vào bảng `SYNONYMS`. Ví dụ muốn hiểu *"măm gì"* nghĩa là hỏi ăn uống thì thêm
   `mam: ['am thuc', 'dac san']`.
3. **Thêm dạng câu trả lời mới** — [`server/src/services/chatbot.js`](server/src/services/chatbot.js),
   phần cuối file là danh sách ý định xếp theo thứ tự ưu tiên.
4. **Làm mới bộ dữ liệu khảo sát** — thay file trong `server/data/sources/` rồi chạy
   `npm run build-dataset && npm run db:seed`. Dùng khi cập nhật lại điểm sao, giờ mở cửa
   hoặc bổ sung cơ sở mới từ Google Maps / danh sách UBND phường.

Bộ dữ liệu khảo sát được nạp thành **lớp phủ** (`places.json`, `festival-details.json`,
`khu-pho.json`) chứ không ghi đè `seed-data/` sinh từ .docx — nhờ vậy chạy lại `npm run extract`
không làm mất dữ liệu mới. Khi ghép, bản ghi giữ **tên và loại theo đăng ký UBND** (đáng tin hơn tên
hiển thị trên Google Maps) và lấy sao, toạ độ, giờ mở cửa từ Google.

### Xem trợ lý còn yếu chỗ nào

**Admin → Trợ lý AI**: xem du khách hỏi gì, tỷ lệ trả lời được, và danh sách **câu hỏi bot chịu
thua** — chính là chỗ dữ liệu còn thiếu. Câu nào bị hỏi nhiều lần thì nên bổ sung trước.

Nhật ký chỉ lưu nội dung câu hỏi, **không lưu IP hay bất cứ thông tin nhận dạng người hỏi nào**.

Kiểm tra nhanh chất lượng sau khi sửa dữ liệu:

```bash
npm run test-chatbot                      # chạy ~40 câu mẫu, in câu trả lời
npm run test-chatbot "na mùa nào?"        # hỏi thử một câu
npm run test-scenarios                    # bộ kịch bản CURATED ~110 câu theo nhóm
npm run test-scenarios-bulk               # bộ SINH TỰ ĐỘNG ~1.400 câu (mẫu × dữ liệu × biến thể)
npm run test-scenarios-bulk -- --fails    # in chi tiết câu chưa đạt
npm run test-scenarios-bulk -- --drift    # in cả cảnh báo lệch ý định
```

Hai lớp kiểm thử:

- **Curated** (`chatbot-scenarios.mjs`, ~110 câu) — viết tay, mô phỏng các nhóm câu hỏi của một cổng
  du lịch chính quyền (giới thiệu, di tích, lễ hội, ẩm thực, lưu trú, vé & giờ, thời tiết, đường đi,
  **lộ trình cá nhân hoá**, liên hệ & khẩn cấp, và **các câu ngoài phạm vi phải từ chối trung thực**).
- **Sinh tự động** (`gen-scenarios.mjs`, ~1.400 câu) — ghép **mẫu câu × dữ liệu thật trong database ×
  biến thể** (có dấu / không dấu / thêm từ đệm). Tự phình theo dữ liệu: thêm một di tích là có thêm
  vài chục câu test. Đây là "bản đồ" phát hiện định tuyến sai ở quy mô lớn — mỗi lần chạy báo tỷ lệ
  đạt theo nhóm và liệt kê câu trượt để khoanh vùng.

Muốn mở rộng: thêm một dòng mẫu vào `gen-scenarios.mjs` là sinh thêm hàng loạt câu cho toàn bộ dữ liệu.

---

## Triển khai lên VPS

Xem hướng dẫn chi tiết tại **[DEPLOY.md](DEPLOY.md)** — cài Node/PostgreSQL/Nginx/PM2, cấu hình HTTPS bằng Let's Encrypt, quy trình cập nhật và sao lưu.
