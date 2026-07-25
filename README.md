# Cổng thông tin du lịch phường Đông Triều

Website du lịch của phường Đông Triều, tỉnh Quảng Ninh — giới thiệu **13 cụm di tích đã xếp hạng**, **17 lễ hội truyền thống**, **15 cơ sở lưu trú**, **8 đặc sản tiêu biểu**, **6 điểm đến lân cận**, kèm bản đồ, dự báo thời tiết – triều cường theo thời gian thực (có gợi ý điểm tham quan phù hợp với thời tiết) và trang quản trị nội dung.

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
Bản đồ: Google Maps nhúng qua iframe (không cần API key).

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
│   ├── scripts/                         # extract-docx · fetch-images · import-images · test-chatbot
│   ├── src/
│   │   ├── lib/                         # vitext.js (xử lý tiếng Việt) · lunar.js (âm lịch)
│   │   ├── services/                    # chatbot.js · knowledge.js · retrieval.js · weather · tide
│   │   ├── routes/ · middleware/
│   ├── data/knowledge_base.md           # bản xuất tĩnh kho tri thức (tham khảo/đối chiếu)
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
| `npm run fetch-images` | Tải ảnh minh hoạ về thư mục `Anh di tich/` (Pexels nếu có key, không thì Wikimedia) |
| `npm run import-images` | Nén ảnh sang WebP, đưa vào `server/uploads/` và gán ảnh bìa theo slug |
| `npm run test-chatbot` | Chạy thử trợ lý AI với ~40 câu hỏi mẫu, in ra câu trả lời |
| `npm run test-chatbot "câu hỏi"` | Hỏi trợ lý một câu bất kỳ ngay trên terminal |
| `npm run test-scenarios` | Bộ kịch bản 67 câu theo 13 nhóm (kiểu cổng du lịch); báo nhóm nào chưa đạt |

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

- **Thư viện ảnh**: tải lên nhiều ảnh cùng lúc, tự nén WebP, gán mô tả (alt), chọn làm ảnh bìa.
- **Form di tích**: có ô nhập `lat`/`lng` kèm nút *"Xem thử trên bản đồ"* để ghim toạ độ chính xác.
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
| **Toạ độ GPS** | Chỉ 1/13 di tích có toạ độ trong hồ sơ (đền, chùa Kênh Giang). 12 điểm còn lại ghim theo địa chỉ chữ nên có thể lệch vài trăm mét. | Admin → Di tích → nhập `lat`/`lng`, có nút *"Xem thử trên bản đồ"* |
| **Nhà hàng, quán ăn** | Hồ sơ gốc không có danh sách. Hiện có **9 mục**: 5 cơ sở thật (tên, địa chỉ, SĐT tổng hợp từ nguồn công khai) + 4 mô tả theo khu vực. Tất cả đang gắn cờ `isVerified=false` và hiện nhãn *"chưa xác minh"*. Một số cơ sở thuộc **phường Mạo Khê / Xuân Sơn** sau sáp nhập — đã ghi rõ ở trường `area`. | Gọi kiểm tra SĐT → Admin → Nhà hàng → bật công tắc *"Đã gọi xác minh"* |
| **Triều cường** | Toạ độ Đông Triều nằm sâu trong đất liền, ngoài lưới hải văn của Open-Meteo (trả về `null`). Hệ thống dùng điểm **cửa Nam Triệu – Bạch Đằng** (20.70, 106.80) làm số liệu **tham chiếu** cho vùng sông Kinh Thầy – Đá Bạc, ghi rõ trên giao diện. | Không cần sửa — đã ghi nhãn minh bạch |
| **Trợ lý AI** | Đã hoạt động, chạy hoàn toàn trên dữ liệu của phường. Vì không dùng mô hình ngôn ngữ nên trợ lý **chỉ hiểu những cách hỏi đã được dạy** — gặp câu lạ sẽ nói thật là chưa biết chứ không bịa. | Xem mục [Trợ lý AI](#trợ-lý-ai-chatbot) để biết cách mở rộng |

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
| Đường đi | *"đi từ Hà Nội thế nào"* · *"Đông Triều cách Hà Nội bao xa"* |
| **Lộ trình cá nhân hoá** | Vẽ đúng khoảng thời gian hỏi và điều chỉnh theo người: *"lộ trình 1 buổi sáng"* (chỉ vẽ sáng) · *"lịch trình cho người lớn tuổi"* (bỏ điểm leo trèo) · *"lộ trình thiên về tâm linh / lịch sử"* · *"gia đình có trẻ nhỏ nên đi đâu"* · *"tôi có 2 triệu thì vạch lộ trình + ăn uống"* (chọn nhà hàng theo giá thực đơn) |
| Gợi ý dịch vụ | *"gợi ý quán giá hợp lý"* · *"nhà hàng nào chất lượng"* |
| Giới thiệu, vé, giờ mở cửa | *"giới thiệu về Đông Triều"* · *"vé vào cửa bao nhiêu"* · *"mấy giờ mở cửa"* |
| Liên hệ & khẩn cấp | *"số điện thoại UBND phường"* · *"gọi cấp cứu số mấy"* (113/114/115) |

Hiểu cả **chữ không dấu** (*"chua my cu o dau"*) và **lỗi gõ nhẹ** (*"chùa mĩ cụ"*).

Những gì **ngoài phạm vi** (thủ tục hành chính, ATM/bãi đỗ, chuyện ngoài Đông Triều) thì trợ lý **từ chối trung thực và chỉ hướng đúng chỗ** thay vì bịa — ví dụ hỏi làm căn cước thì hướng sang UBND phường / Cổng dịch vụ công.

### Cách "dạy" thêm cho trợ lý

Trợ lý đọc thẳng từ database, nên **sửa dữ liệu là sửa kiến thức của bot** — không phải huấn luyện
lại gì cả. Có 3 mức:

1. **Thêm nội dung** — Admin → Di tích / Lễ hội / Ẩm thực… Vừa lưu là trợ lý biết ngay.
2. **Dạy cách hỏi mới** — mở [`server/src/lib/vitext.js`](server/src/lib/vitext.js), thêm một dòng
   vào bảng `SYNONYMS`. Ví dụ muốn hiểu *"măm gì"* nghĩa là hỏi ăn uống thì thêm
   `mam: ['am thuc', 'dac san']`.
3. **Thêm dạng câu trả lời mới** — [`server/src/services/chatbot.js`](server/src/services/chatbot.js),
   phần cuối file là danh sách ý định xếp theo thứ tự ưu tiên.

### Xem trợ lý còn yếu chỗ nào

**Admin → Trợ lý AI**: xem du khách hỏi gì, tỷ lệ trả lời được, và danh sách **câu hỏi bot chịu
thua** — chính là chỗ dữ liệu còn thiếu. Câu nào bị hỏi nhiều lần thì nên bổ sung trước.

Nhật ký chỉ lưu nội dung câu hỏi, **không lưu IP hay bất cứ thông tin nhận dạng người hỏi nào**.

Kiểm tra nhanh chất lượng sau khi sửa dữ liệu:

```bash
npm run test-chatbot                      # chạy ~40 câu mẫu, in câu trả lời
npm run test-chatbot "na mùa nào?"        # hỏi thử một câu
npm run test-scenarios                    # bộ kịch bản CURATED ~79 câu theo nhóm
npm run test-scenarios-bulk               # bộ SINH TỰ ĐỘNG ~950 câu (mẫu × dữ liệu × biến thể)
npm run test-scenarios-bulk -- --fails    # in chi tiết câu chưa đạt
npm run test-scenarios-bulk -- --drift    # in cả cảnh báo lệch ý định
```

Hai lớp kiểm thử:

- **Curated** (`chatbot-scenarios.mjs`, ~79 câu) — viết tay, mô phỏng các nhóm câu hỏi của một cổng
  du lịch chính quyền (giới thiệu, di tích, lễ hội, ẩm thực, lưu trú, vé & giờ, thời tiết, đường đi,
  **lộ trình cá nhân hoá**, liên hệ & khẩn cấp, và **các câu ngoài phạm vi phải từ chối trung thực**).
- **Sinh tự động** (`gen-scenarios.mjs`, ~950 câu) — ghép **mẫu câu × dữ liệu thật trong database ×
  biến thể** (có dấu / không dấu / thêm từ đệm). Tự phình theo dữ liệu: thêm một di tích là có thêm
  vài chục câu test. Đây là "bản đồ" phát hiện định tuyến sai ở quy mô lớn — mỗi lần chạy báo tỷ lệ
  đạt theo nhóm và liệt kê câu trượt để khoanh vùng.

Muốn mở rộng: thêm một dòng mẫu vào `gen-scenarios.mjs` là sinh thêm hàng loạt câu cho toàn bộ dữ liệu.

---

## Triển khai lên VPS

Xem hướng dẫn chi tiết tại **[DEPLOY.md](DEPLOY.md)** — cài Node/PostgreSQL/Nginx/PM2, cấu hình HTTPS bằng Let's Encrypt, quy trình cập nhật và sao lưu.
