# Báo cáo dự án — Cổng thông tin du lịch & Trợ lý AI phường Đông Triều

*Lập ngày 03/08/2026 · Nhánh `nang-cap-kham-pha-dong-trieu`*

---

## 1. Tóm tắt

Dự án xây một cổng thông tin du lịch cho phường Đông Triều (Quảng Ninh) kèm một
trợ lý hỏi đáp chạy hoàn toàn trên dữ liệu của phường. Toàn bộ nội dung được rút
từ hồ sơ lý lịch di tích dạng `.docx` do phường cung cấp và từ *Đông Triều huyện
địa chí* — địa chí Hán Nôm do Tri huyện Ngô Sinh chép năm 1896.

| Hạng mục | Quy mô hiện tại |
|---|---|
| Bảng dữ liệu (Prisma) | 14 |
| Nội dung đã nạp | 13 di tích · 17 lễ hội · 8 đặc sản · 41 quán ăn · 21 cơ sở lưu trú · 7 điểm lân cận · 6 bài viết |
| Ý định trợ lý nhận diện | 49 |
| Bộ kiểm tự động | 140 kịch bản + 1.376 câu sinh tự động + 90 phép kiểm Python |
| Bảng màu giao diện | 8, đều đạt WCAG AA |

Nguyên tắc xuyên suốt: **trợ lý không được bịa**. Mọi câu trả lời đều trích từ
một bản ghi có thật; không đủ căn cứ thì nói thẳng là chưa biết.

---

## 2. Ý tưởng — bài toán và những quyết định nền tảng

### 2.1 Bài toán

Phường Đông Triều có 13 cụm di tích đã xếp hạng: **1 quốc gia đặc biệt** (Chùa quán
Ngọc Thanh), **3 quốc gia**, **9 cấp tỉnh**. Hồ sơ đầy đủ nhưng nằm rải trong các
tệp `.docx` — thứ không ai tra cứu được, không lên được tìm kiếm, và du khách
không đọc.

Thêm một ràng buộc thời sự: từ 01/7/2025 thành phố Đông Triều giải thể, 19 đơn vị
cũ sắp xếp lại thành phường. Mọi địa chỉ trong hồ sơ đều ghi theo tên xã/phường
**cũ**. Cổng phải nói được cả hai hệ, nếu không du khách tra "đình Triều Khê" sẽ
không biết nó nay thuộc khu phố nào.

### 2.2 Quyết định lớn nhất: trợ lý không gọi mô hình ngôn ngữ ngoài

Đây là quyết định định hình cả dự án, và có ba lý do:

1. **Không được bịa.** Đây là cổng thông tin của chính quyền. Một mô hình ngôn ngữ
   trả lời trôi chảy nhưng sai niên đại một sắc phong, hay gán nhầm vị thần được
   thờ, thì tác hại lớn hơn hẳn việc trả lời "mình chưa biết".
2. **Chi phí và phụ thuộc.** Cổng phường không nên treo vào một API tính tiền theo
   lượt hỏi, cũng không nên ngừng hoạt động khi hết hạn mức.
3. **Cách "dạy" phải nằm trong tầm tay cán bộ phường.** Ở dự án này, dạy bot =
   **sửa dữ liệu trong trang quản trị**, không phải huấn luyện lại mô hình. Kho
   tri thức dựng thẳng từ database (`services/knowledge.js`), có bộ nhớ đệm 5 phút
   — quản trị viên sửa mô tả một di tích thì chưa đầy 5 phút sau trợ lý đã trả lời
   theo nội dung mới.

Đổi lại, trợ lý mất khả năng diễn đạt tự do và phải bù bằng công sức xử lý ngôn
ngữ tiếng Việt — chính là phần được mô tả ở mục 5.

---

## 3. Quy trình — từ tệp .docx đến trang web đang chạy

Đường ống dữ liệu gồm 5 bước, mỗi bước là một lệnh chạy lại được nhiều lần:

```
Hồ sơ .docx  ──►  npm run extract        ──►  seed-data/*.json
                  (đọc .docx, tách cấu trúc)

seed-data/*.json ─►  npm run build-dataset ──►  data/sources/*.json
                     (gộp thành bộ dữ liệu cho trợ lý)

                  ──►  npm run db:migrate   ──►  cấu trúc bảng
                  ──►  npm run db:seed      ──►  dữ liệu vào PostgreSQL
                  ──►  npm run import-images──►  ảnh WebP + gán ảnh bìa
```

**Vì sao có tầng JSON trung gian mà không nạp thẳng vào database?** Vì tệp `.docx`
là nguồn do người soạn, sẽ còn sửa. Có tầng JSON thì mỗi lần phường gửi bản cập
nhật, ta chạy lại `extract` và **đọc được diff** — thấy đúng chỗ nào đổi, thay vì
nạp đè một cách mù mờ. Tầng JSON cũng chính là thứ trợ lý Python đọc khi chạy
tách rời máy chủ.

Toàn bộ dự án là một npm workspace bốn phần:

| Thư mục | Vai trò |
|---|---|
| `client/` | Giao diện React + Vite + Tailwind |
| `server/` | API Express + Prisma + trợ lý bản luật |
| `shared/` | Mã dùng chung hai phía (ảnh, lịch âm, thời tiết, chống spam) |
| `bot-python/` | Trợ lý tra cứu theo đoạn, Python thuần thư viện chuẩn |

`shared/` tồn tại vì một lý do cụ thể: máy chủ cần kiểm tra dữ liệu ảnh đầu vào,
giao diện cần hiển thị ảnh đó — hai bên phải hiểu **giống hệt nhau**. Tách làm hai
bản là sớm muộn lệch.

---

## 4. Module ngôn ngữ tiếng Việt

Đây là phần kỹ thuật đặc thù nhất của dự án, nằm ở `server/src/lib/vitext.js`
(194 dòng) và bản song song `bot-python/troly/vitext.py` (158 dòng).

### 4.1 Vì sao phải tự viết

Du khách gõ tiếng Việt rất tuỳ hứng: có dấu, không dấu, viết tắt, sai chính tả.
Bốn cách gõ dưới đây phải cùng ra một kết quả:

> "Đền Yết Kiêu" · "den yet kieu" · "đền Yết Kiêu ở đâu ạ" · "den yet kiu"

### 4.2 Bốn tầng xử lý

| Tầng | Việc | Ví dụ |
|---|---|---|
| `deaccent()` | Bỏ dấu qua NFD, xử riêng `đ/Đ` | "Đền Yết Kiêu" → "den yet kieu" |
| `norm()` | Chữ thường, bỏ ký tự lạ, gộp khoảng trắng | "Chùa Mỹ Cụ (Sùng Khánh tự)" → "chua my cu sung khanh tu" |
| `tokenize()` | Tách từ, bỏ hư từ, gộp biến thể `y/i` | "Mỹ Cụ" và "Mĩ Cụ" cùng ra `mi cu` |
| `expand()` | Nở từ đồng nghĩa | "ngủ" → "lưu trú, khách sạn, nhà nghỉ" |

### 4.3 Bẫy lớn nhất: bỏ dấu làm nhiều từ đụng nhau

Đây là chỗ tốn công nhất và là nguồn của phần lớn lỗi định tuyến đã gặp:

| Sau khi bỏ dấu | Các từ cùng đụng vào | Hậu quả nếu xử ẩu |
|---|---|---|
| `den` | **đền** (nơi thờ) · **đến** (tới) | Xoá `đến` như hư từ là mất luôn khả năng tìm ra đền |
| `tu` | **tự** (chùa: Báo Ân *tự*) · **từ** | Mất tên chùa |
| `cho` | **chợ** · **cho** (giới từ) | "cho mình hỏi" khớp nhầm "Chợ trung tâm" |
| `van` | **Vân** (Ngoạ *Vân*) · **vẫn** | Xoá `vẫn` thì "Ngoạ Vân" chỉ còn một tiếng, không đủ gọi tên |
| `an` | **ăn** · **An** (*An* Biên, *An* Sinh) | "khu phố An Biên gồm những khu nào" bị hiểu thành hỏi chỗ **ăn** |
| `may` | **mấy** · **mai** | Gộp `y→i` bừa thì "mấy giờ mở cửa" thành hỏi thời tiết **mai** |

Ba cách xử đã áp dụng:

1. **Danh sách hư từ cố ý ngắn.** Chỉ liệt kê từ chắc chắn vô nghĩa khi tra cứu.
   Cố ý giữ lại các từ mang ý định hỏi (gì, đâu, nào, bao, mấy, sao).
2. **Gộp `y→i` có điều kiện.** Chỉ đổi khi `y` đứng cuối từ và trước nó là phụ âm
   (`Mỹ→Mĩ`, `Lý→Lí`), không đụng `may`, `tay`, `hay`.
3. **`has()` khớp trọn từ, không khớp chuỗi con.** Hàm nhận diện ý định đệm khoảng
   trắng hai đầu trước khi so. Không làm vậy thì "ngoa van o dau" (Ngoạ Vân ở đâu)
   sẽ khớp cụm "an o dau" (ăn ở đâu) và trả về danh sách nhà hàng.

### 4.4 Bảng từ đồng nghĩa — chỗ "dạy" bot hiểu cách hỏi mới

`SYNONYMS` ánh xạ cách nói dân dã sang từ khoá có trong dữ liệu: `ngu → lưu trú`,
`ankhuya → 24h, mở khuya`, `xephang → đánh giá, sao`. Thêm một dòng vào bảng này là
bot hiểu ngay một cách hỏi mới, không phải huấn luyện lại gì cả.

### 4.5 Sửa lỗi chính tả

`editDistance()` cài Levenshtein có ngưỡng cắt sớm. Bộ tìm kiếm chỉ sửa từ dài từ
4 ký tự trở lên (ngắn hơn thì sửa dễ sai hơn đúng), và **hạ điểm** kết quả sửa
được — sai 1 ký tự còn 60% điểm, sai 2 còn 35%.

---

## 5. Trợ lý AI — ý tưởng hình thành và cách dựng

### 5.1 Ý tưởng đến từ đâu

Ba nguồn, theo đúng thứ tự thời gian trong lịch sử commit:

1. **Học từ cổng đã có.** Lấy Cổng thông tin du lịch TP Huế làm mẫu để liệt kê
   những nhóm câu hỏi mà một trợ lý cổng chính quyền/du lịch buộc phải xử lý.
   Kết quả là bộ 21 nhóm kịch bản trong `scripts/chatbot-scenarios.mjs`.
2. **Nghe chính dữ liệu.** Trường `travelTips`, `openHours`, `rating` có sẵn trong
   dữ liệu đã gợi ra các năng lực mà ban đầu không nghĩ tới: "giờ này quán nào còn
   mở", "quán nào đánh giá cao nhất", "chỗ ăn gần đền Yết Kiêu".
3. **Nghe chỗ bot chịu thua.** Mỗi câu rơi vào `fallback` được ghi vào bảng
   `ChatLog`. Đây là bản đồ chỉ ra thiếu dữ liệu ở đâu và thiếu luật ở đâu.

### 5.2 Hai bộ máy, cố ý làm hai việc khác nhau

|  | Bản luật (`server/src/services/chatbot.js`) | Bản đoạn (`bot-python/`) |
|---|---|---|
| Cách làm | Nhận diện ý định bằng luật → câu trả lời có cấu trúc | Cắt bản ghi thành **đoạn**, xếp hạng BM25, trả **nguyên văn** đoạn tốt nhất |
| Mạnh ở | Câu cần **tính theo giờ hiện tại**: thời tiết, triều cường, quán còn mở, lễ hội sắp tới, lộ trình theo ngân sách | Câu hỏi lẻ nằm sâu trong một đoạn văn dài |
| Yếu ở | Câu nào chưa có luật thì chịu | Không biết mấy giờ, không tính được lịch âm |
| Quy mô | 2.514 dòng · 49 ý định | 978 dòng Python |

Ví dụ bản luật chịu thua mà bản Python trả lời được — hầu hết nằm trong địa chí
1896, toàn văn dài, đúng thứ luật viết tay không với tới:

> *"chùa Quỳnh Lâm do ai dựng"* · *"ai đỗ bảng nhãn đời Trần"* ·
> *"thổ sản trúc vằn lấy ở đâu"* · *"làng nào giỏi đấu vật"*

**Thứ tự gọi rất quan trọng:** luôn chạy bản luật trước, chỉ khi nó trả `matched:
false` mới hỏi sang Python. Gọi Python trước sẽ cướp mất nhóm câu cần tính theo
giờ hiện tại — mà đó lại là nhóm câu hỏi nhiều nhất.

Cầu nối (`services/pybot.js`) có **cầu dao**: chờ tối đa 2,5 giây, hỏng hai lần
liên tiếp thì nghỉ 60 giây. Không bật Python thì cổng chạy y như cũ. Dịch vụ phụ
không bao giờ được phép làm sập cổng chính.

### 5.3 Bộ tìm kiếm BM25

Không có mô hình ngôn ngữ nào, chỉ có xếp hạng độ liên quan trên chính dữ liệu
của phường:

- Trọng số theo trường: **tên 6 · tên gọi khác 4 · từ khoá 2,5 · thân bài 1** —
  khớp ở tên di tích quan trọng hơn nhiều so với khớp trong thân bài.
- `K1 = 1,4`, `B = 0,5`. `B` hạ xuống 0,5 vì độ dài tài liệu chênh nhau rất lớn:
  hồ sơ di tích dài hàng nghìn chữ, bản ghi quán ăn chỉ vài dòng.
- Ưu tiên theo loại: di tích ×1,3 — trang web lấy di tích làm trung tâm, nên câu
  mơ hồ "chùa Mỹ Cụ có gì đặc biệt" phải cho hồ sơ di tích thắng bài lễ hội cùng tên.

### 5.4 Ba cửa chặn của bản Python — mỗi cửa sinh ra từ một lỗi có thật

| Cửa | Chặn được | Lỗi đã bắt được |
|---|---|---|
| Điểm BM25 ≥ 3 | Đoạn không liên quan | |
| Độ phủ ≥ 0,75 (bình phương vào điểm) | Đoạn chỉ chạm vài chữ | *"làng nào giỏi đấu vật"* → trả về **Khoai lang làng Trạo** |
| Cụm hai tiếng phải đứng liền nhau | Túi từ bị âm tiết đánh lừa | *"ai là tổng thống Hoa Kỳ"* → hồ sơ **kiến trúc chùa**, nhờ bốn tiếng "tổng · thông · hoa · kỷ" nằm rải rác |

### 5.5 Ranh giới trung thực

Trợ lý có các câu từ chối **riêng cho từng loại vượt phạm vi**, không dùng chung
một câu chối chung chung:

- Thủ tục hành chính (căn cước, hộ khẩu, hộ chiếu…) → chỉ sang UBND phường và
  Cổng dịch vụ công quốc gia.
- Tiện ích chưa có dữ liệu (ATM, cây xăng, bãi đỗ) → nói rõ là chưa thu thập.
- Xin xếp hạng theo tiêu chí không có trong dữ liệu ("quán nào wifi mạnh nhất") →
  nói rõ dữ liệu chỉ có điểm sao **tổng thể**, không chấm riêng từng tiêu chí.
  Nhánh này xét **trước** mọi nhánh gợi ý, nếu không sẽ trả về một danh sách xếp
  theo sao trông như đã trả lời đúng câu hỏi.

---

## 6. Thiết kế giao diện

### 6.1 Bảng màu ba lớp

8 bảng màu (`heritage`, `halong`, `lotus`, `zen`, `coral`, `teal`, `forest`,
`crimson`), mỗi bảng có bản sáng và bản tối. Màu khai báo bằng biến CSS ba lớp:
biến gốc → biến ngữ nghĩa → lớp tiện ích Tailwind. Nhờ vậy đổi bảng màu không
phải sửa một dòng JSX nào.

Quy tắc: **không bao giờ ghi mã màu cứng trong thành phần**. Bản trước của
`HeritageCover` ghi cứng mã hex nên ảnh thay thế luôn ra xanh ngọc kể cả khi khách
đã chọn bảng Hạ Long Blue — nay trỏ vào biến bảng màu.

### 6.2 Độ tương phản có bộ kiểm tự động

`npm run check-contrast` đọc thẳng `themes.css` và tính tỷ lệ tương phản 20 cặp
chữ/nền cho cả 8 bảng theo WCAG 2.1 AA. Đọc thẳng tệp CSS nên không bao giờ lệch
với màu thật đang chạy. Hiện tại bảng thấp nhất đạt 4,54 — trên ngưỡng 4,5.

Bộ kiểm còn một ngưỡng riêng **1,15 cho đường viền thẻ**. Đây không phải mốc của
WCAG mà sinh ra từ một lỗi thật: viền thẻ để ở 5% độ mờ chỉ đạt ~1,06, tức mắt
thường không thấy gì và cả lưới thẻ tan vào nền giấy.

### 6.3 Nguyên tắc trình bày nội dung

- **Trường nào có dữ liệu mới hiện**, không bịa chỗ trống. Trang chi tiết tự đầy
  lên khi quản trị viên bổ sung.
- **Ảnh không chụp đúng địa điểm phải gắn nhãn "Ảnh minh hoạ"** — cổng chính thức
  của phường không được để du khách hiểu nhầm.
- **Tab rỗng thì không hiện.** Hồ sơ di tích nào cũng thiếu vài mục; một tab bấm
  vào ra trang trắng khiến du khách tưởng web hỏng. Còn đúng một tab thì bỏ luôn
  thanh tab.

### 6.4 Đường ống ảnh

Thông số nén gom về một chỗ (`server/src/lib/images.js`), dùng chung cho cả route
tải ảnh của trang quản trị lẫn script nhập ảnh:

| Bản | Kích thước | Chất lượng | Làm nét |
|---|---|---|---|
| Đầy đủ | ≤ 2000px | WebP 88 | Chỉ khi thật sự có thu nhỏ |
| Thu nhỏ | ≤ 640px, cắt vuông | WebP 82 | Chỉ khi thật sự có thu nhỏ |

Ba điều quyết định ảnh có nét, theo thứ tự ảnh hưởng: (1) **không phóng to** ảnh
nhỏ — kéo giãn không thêm chi tiết, chỉ làm nhoè phần đang có; (2) **làm nét lại
sau khi thu nhỏ** bằng unsharp mask nhẹ, để `m1 = 0` cho vùng phẳng như trời, tường
vôi khỏi nổi hạt; (3) **chất lượng đủ cao** vì mái ngói, chữ Hán trên hoành phi,
hoa văn gỗ đều là chi tiết tần số cao — thứ đầu tiên bị nén nuốt mất.

Phía giao diện, hoạt ảnh phóng ảnh bìa trang chủ giảm từ 1,12× xuống 1,06× và
thêm `will-change: transform`. Không báo trước thì trình duyệt vẽ lớp ảnh ở tỉ lệ
1× rồi kéo giãn cả lớp suốt hoạt ảnh — ảnh mờ đi trong khi tệp gốc vẫn đủ nét.

### 6.5 Khả năng tiếp cận

Thanh tab dùng chung cài đúng thông lệ `role="tablist"`: chuyển tab bằng mũi tên
trái/phải, cả thanh chỉ chiếm **một** chặng Tab, và tab đang chọn có viền hội tụ
thấy được. Ngược lại, lớp nền phủ của hộp thoại cố ý **không** hội tụ được — biến
nó thành phần tử nhận Tab chỉ thêm một chặng vô nghĩa trước khi tới nội dung thật.

---

## 7. Kiểm thử & chất lượng

### 7.1 Bốn lớp kiểm

| Bộ kiểm | Quy mô | Kiểm điều gì |
|---|---|---|
| `npm run lint` | Toàn repo | ESLint, gồm cả quy tắc `jsx-a11y` |
| `npm run test-scenarios` | 140 câu / 21 nhóm | Kịch bản viết tay theo mẫu cổng du lịch |
| `npm run test-scenarios-bulk` | 1.376 câu | **Sinh tự động từ dữ liệu thật** |
| `python kiemtra.py` | 90 phép | Trợ lý Python, gồm đối chiếu nguyên văn |
| `npm run check-contrast` | 8 bảng × 20 cặp | Tương phản WCAG AA |

Bộ sinh tự động là điểm đáng nói: nó **đọc dữ liệu thật rồi mới sinh câu hỏi và kỳ
vọng**. Ví dụ khu phố nào chưa có quán nào thì bài kiểm bắt buộc bot phải từ chối
trung thực chứ không được bịa. Nhờ vậy dữ liệu đổi thì bài kiểm tự đổi theo, không
bao giờ lạc hậu.

Mỗi câu còn gắn kỳ vọng hai mức: `answer` (bắt buộc trả lời được) và `graceful`
(bắt buộc **từ chối** trung thực). Mức thứ hai quan trọng ngang mức thứ nhất.

### 7.2 Kết quả lần chạy 03/08/2026

```
ESLint toàn repo                     0 lỗi
Kịch bản viết tay                    140/140
Sinh tự động                         1376/1376  (lệch ý định: 13, cảnh báo)
Trợ lý Python                        90/90
Tương phản WCAG AA                   8/8 bảng màu (thấp nhất 4,54)
Build giao diện                      thành công
API (10 đầu mối)                     200 OK
```

### 7.3 Ba lỗi tìm được và đã sửa trong lần kiểm này

**Lỗi 1 — "làm hộ chiếu ở đâu" được trả lời bằng vị trí Đông Triều.**
Bộ lọc thủ tục hành chính thiếu từ khoá "hộ chiếu", nên câu rơi xuống nhánh
`'o dau'` phía dưới và nhận về bài giới thiệu phường cách Hà Nội bao nhiêu cây số —
trông như đã trả lời, thật ra lạc đề. Đã sửa **tận gốc**: cụm `'o dau'` đứng một
mình bắt quá rộng, nay chỉ tính khi câu có nhắc tới chính vùng đất này. Nhờ vậy
"xin visa ở đâu", "làm giấy khai tử ở đâu", "đăng ký kết hôn ở đâu" cũng thôi bị
trả lời sai mà chuyển sang từ chối trung thực.

**Lỗi 2 — "chỗ nghỉ gần <di tích>" trả về hồ sơ di tích thay vì danh sách nhà nghỉ.**
Ảnh hưởng 13 câu. Nhánh khu phố đã coi "chỗ nghỉ" là từ chỉ lưu trú, riêng nhánh
danh mục thì bỏ quên. Đã bổ sung "chỗ nghỉ", "nơi nghỉ".

**Lỗi 3 — "khu phố An Biên gồm những khu nào" trả về danh sách quán ăn.**
Đúng bẫy dấu ở mục 4.3: "**An** Biên" bỏ dấu thành `an`, trùng với "**ăn**". Đã sửa
bằng cách gỡ tên khu phố ra khỏi câu trước khi dò từ khoá món ăn.

Cả ba đều đã có bài hồi quy giữ lại. Sau khi sửa, số cảnh báo lệch ý định giảm từ
29 xuống 13.

### 7.4 Hạn chế đã biết

- **5 câu lệch ý định quanh "Quán ăn dọc Quốc lộ 18".** Một bản ghi nhà hàng đặt
  tên trùng tên quốc lộ, nên câu hỏi về quán bị nhánh giao thông bắt trước. Chưa
  sửa vì phải động vào điểm số truy hồi mà 1.516 bài kiểm đang phụ thuộc — rủi ro
  lớn hơn lợi ích. Cách xử nhẹ nhất là đổi tên bản ghi trong dữ liệu.
- **8 câu lệch còn lại là kỳ vọng lỏng**, không phải lỗi: bot trả về ý định *cụ thể
  hơn* mức bài kiểm mong (`about_location` thay vì `about`).
- **Thư viện ảnh chi tiết còn trống.** Cả ba module đều chưa có ảnh chi tiết nào;
  lễ hội mới 1/17 có ảnh bìa, ẩm thực 2/8. Khung đã dựng xong, chờ nạp nội dung.
- **Toạ độ di tích thiếu.** Phần lớn hồ sơ không có toạ độ, nên chức năng "gần
  đây" chạy hai mức: có toạ độ thì tính khoảng cách thật, không có thì xếp theo
  cùng khu phố và **nói rõ** là "cùng khu phố" chứ không hứa là gần nhất.

---

## 8. Hướng phát triển

1. **Nạp ảnh chi tiết** cho di tích, lễ hội, ẩm thực — việc cho giá trị cao nhất
   trên mỗi giờ bỏ ra, vì toàn bộ khung hiển thị đã sẵn sàng.
2. **Bổ sung toạ độ** 13 di tích để chức năng "gần đây" chạy đúng mức tốt nhất.
3. **Đọc nhật ký `ChatLog`** định kỳ, lấy các câu `fallback` làm danh sách việc
   cần bổ sung — dữ liệu hay luật.
4. **Cân nhắc srcset cho ảnh** nếu lưu lượng di động tăng; hiện mỗi ảnh chỉ có một
   cỡ đầy đủ.

---

## Phụ lục — lệnh thường dùng

```bash
npm run dev                          # chạy cả máy chủ và giao diện
npm run setup                        # cài, trích dữ liệu, tạo bảng, nạp dữ liệu

npm run test-scenarios               # 140 kịch bản viết tay
npm run test-scenarios-bulk          # 1.376 câu sinh tự động
npm run test-chatbot "câu hỏi"       # hỏi trợ lý ngay trên terminal
npm run check-contrast               # tương phản WCAG của 8 bảng màu
npm run lint                         # ESLint toàn repo

npm run import-images                # nén ảnh mới, gán ảnh bìa theo slug
npm run reprocess-images             # dựng lại bản thu nhỏ theo thông số hiện hành
npm run reprocess-images -- --sharpen# làm nét thêm bản đầy đủ (có sao lưu)

cd bot-python && python kiemtra.py   # 90 phép kiểm trợ lý Python
cd bot-python && python run.py serve # bật dịch vụ Python ở cổng 5005
```
