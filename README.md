# Phường Đông Triều

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

### Hai cổng tách rời: du khách và người dân

Đây là **hai cổng riêng**, đi chung một mã nguồn, một cơ sở dữ liệu và một
**cửa vào**:

| | Trang chủ | Thanh điều hướng | Nội dung |
|---|---|---|---|
| **Cửa vào chung** | `/` | *không có* | giới thiệu phường · hai lối vào · ba lối đi ai cũng cần |
| **Du khách** | `/du-khach` | Di tích · Lễ hội · Ẩm thực · Lưu trú · Bản đồ · Thời tiết · Giới thiệu | giới thiệu · mùa lễ hội · di tích · bản đồ · lễ hội · ẩm thực · cảm nhận · lưu trú |
| **Người dân** | `/nguoi-dan` | Khu phố · Hành chính · Văn bản · Đất đai · Phản ánh · Tin tức · Liên hệ | tổng quan phường · lối đi nhanh · 11 khu phố · dịch vụ công · thông báo · phản ánh |

**Trang chủ chung không có thanh điều hướng của bên nào, và cũng không có khung
chat.** Nó chưa thuộc cổng nào, nên hiện nav hay gắn trợ lý của một bên vào là
chọn hộ người dùng. Việc chọn lối để hai tấm thẻ to giữa trang lo
([`pages/Portal.jsx`](client/src/pages/Portal.jsx)).

**Vì sao là hai đường dẫn, không phải một công tắc.** Bản đầu dùng một nút nhớ
trong `localStorage`: cùng địa chỉ `/` hiện hai nội dung tuỳ lần bấm gần nhất.
Ba chỗ gãy, và cả ba chỉ lộ ra khi có người thật dùng:

- **Không gửi được cho ai** — cán bộ muốn gửi bà con "vào đây xem khu phố" thì
  chép ra vẫn là `/`, người nhận mở lên thấy trang du lịch.
- **Máy tìm kiếm chỉ thấy một bên** — một địa chỉ thì chỉ một bản được lập chỉ
  mục, nửa nội dung của cổng không ai tìm ra.
- **Máy dùng chung thì lẫn** — máy ở nhà văn hoá, ở bộ phận một cửa: người trước
  bấm gì thì người sau chịu nấy.

**Hai thanh nav không được có mục nào trùng nhau.** Đây là ràng buộc chứ không
phải sở thích: vai của một trang suy từ chính đường dẫn của nó
([`vaiCuaDuong`](client/src/hooks/useDoiTuong.jsx)), nên nav người dân mà chứa
một mục thuộc cổng du lịch thì bấm vào đó là cả đầu trang đổi sang bên kia.

**Hai chỗ hai cổng gặp nhau: trang chủ chung và chân trang.** Chân trang là bản
đồ toàn cổng, chia rõ hai cột; trang chủ `/` là cửa vào. Cả hai đều là cái cửa
thấy được, chứ không phải trượt sang lúc nào không biết.

> Trước đây việc chuyển cổng do một cặp chip "Tôi là du khách / Tôi là người dân"
> nằm cạnh thanh điều hướng đảm nhiệm. Nó đã bỏ: chật chỗ (chính nó đẩy hàng đầu
> trang tràn dòng), khó đọc (chữ sẫm trên ảnh bìa tối), và quan trọng nhất là
> **không nói được nó làm gì** — hai chữ "Du khách" cạnh thanh nav trông như một
> bộ lọc, không ai đoán được bấm vào là đổi cả nội dung, thanh nav lẫn trợ lý AI.

Thêm trang mới cho người dân thì phải khai vào `NHANH_NGUOI_DAN` trong
[`useDoiTuong.jsx`](client/src/hooks/useDoiTuong.jsx) — đó là nguồn duy nhất
quyết định một trang thuộc cổng nào.

### Các trang của cổng người dân

Ngoài trang chủ `/nguoi-dan` và trang Khu phố, cổng này có hai trang riêng cho
mảng chính quyền — dựng sẵn để sau này thêm một trợ lý chuyên cho mảng này mà
không phải gỡ nội dung ra khỏi chỗ khác.

- **[`/hanh-chinh`](client/src/pages/Administration.jsx)** — mã bưu chính, mã đơn
  vị hành chính, năm đơn vị cũ hợp thành, văn bản thành lập, trụ sở, cổng thông
  tin, và khối **đối chiếu hai bộ số liệu** (bảng khu phố ↔ trang tra cứu ngoài).
  Chỗ nào cổng chưa đối chiếu được bản gốc thì nói thẳng ra — đây là trang người
  dân mang đi làm giấy tờ.
- **[`/phan-anh`](client/src/pages/Feedback.jsx)** — ba luồng: báo nội dung sai
  trên cổng (cổng **nhận** trực tiếp), phản ánh đời sống (cổng **không** nhận),
  khiếu nại tố cáo (cổng **không** nhận thay). Số khẩn cấp đứng trước mọi biểu mẫu.

Trang chủ `/nguoi-dan` chỉ giữ bản tóm tắt dẫn sang hai trang này. Cố ý không lặp
nội dung: đây là loại nội dung nói cổng nhận việc gì và KHÔNG nhận việc gì, hai
bản chép thì sớm muộn bản cũ sẽ hứa hộ chính quyền một việc bản mới đã rút lại.

**Chuẩn bị cho trợ lý riêng của chính quyền.** `POST /api/chat` nhận thêm trường
`audience` (`du-khach` | `nguoi-dan`), khung chat tự gửi kèm vai đang chọn, và cột
`ChatLog.audience` ghi lại. Máy chủ hiện **chỉ ghi, chưa đổi câu trả lời** — đổi
cách trả lời theo vai là quyết định cần dữ liệu thật để quyết chứ không phải đoán.
`GET /api/chat/logs` trả thêm `theoVai` để thấy người dân thật sự hỏi gì và câu
nào bot chịu thua với riêng họ; đó là tập câu hỏi **có thật** để bám vào khi dựng
bot ấy, thay cho một danh sách phỏng đoán.

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

### Bối cảnh vùng đất — và một cái bẫy về số liệu

Khoá cài đặt `vungDat` ([`seed-data/vung-dat.json`](server/prisma/seed-data/vung-dat.json))
giữ vị trí, dòng thời gian hành chính từ thời Trần tới nghị quyết sắp xếp 2025, cơ
cấu kinh tế và giao thông. Trang `/gioi-thieu` dựng thành hình, trợ lý AI dùng để
trả lời *"Đông Triều ở đâu"*, *"vì sao gọi là Đông Triều"*, *"có ga tàu không"*.

⚠️ **"Đông Triều" trỏ tới HAI đơn vị hành chính khác nhau, chênh nhau gần mười lần:**

| | Diện tích | Dân số | Trạng thái |
|---|---|---|---|
| **Thành phố** Đông Triều | 395,95 km² | 248.896 (2022) | **đã giải thể 01/7/2025** |
| **Phường** Đông Triều | 40,41 km² | 42.454 | đơn vị hiện nay — cổng này |

Cổng là của **phường**. Nên mọi chỗ hiện số của thành phố cũ đều bắt buộc kèm câu
cảnh báo và một lối dẫn sang trang Khu phố; trợ lý AI cũng luôn nêu số của phường
TRƯỚC rồi mới đối chiếu. Không làm vậy thì cổng tự mâu thuẫn với chính trang Khu
phố của mình. `flow-vungdat.mjs` giữ đúng điều này bằng phép kiểm.

Khoảng cách tới Hà Nội / Hạ Long lấy theo **hồ sơ 13 di tích đã có sẵn trong dự án**
(85 km / 80 km), không lấy theo Wikipedia (100 km / 60 km — tính từ trung tâm thành
phố cũ). Cố ý giữ một con số duy nhất trên toàn cổng; bài kiểm đối chiếu hai nguồn
này với nhau.

### Căn cước hành chính — nguồn ngoài duy nhất của cổng

Khoá cài đặt `hanhChinh` ([`seed-data/hanh-chinh.json`](server/prisma/seed-data/hanh-chinh.json))
giữ mã bưu chính **02427**, mã đơn vị hành chính **07093**, năm đơn vị cũ hợp thành
phường, trụ sở và các cổng thông tin. Đây là nhóm câu hỏi của **người dân** chứ
không phải của du khách, trước đây cổng chưa trả lời được câu nào.

Khác mọi dữ liệu còn lại, phần này **chép từ một trang bên ngoài**
(`tinhthanhvn.com`) — trang tự ghi chỉ có giá trị tham khảo, và thực tế đã dẫn sai
một văn bản. Nên nó đi kèm ba lớp giữ:

- Bản thu thập thô để nguyên ở [`data/sources/hanh-chinh-tinhthanhvn.json`](server/data/sources/hanh-chinh-tinhthanhvn.json),
  tách khỏi bản đã hiệu đính — nhìn là biết chỗ nào chép, chỗ nào đã sửa và vì sao.
- Mọi câu trả lời của trợ lý đóng một dòng nguồn, khuyên đối chiếu với UBND phường
  trước khi dùng vào giấy tờ.
- `npm run check-hanh-chinh` tải lại trang và dò 11 giá trị. Nó **cố ý không tự ghi
  đè**: tự động đồng bộ với một nguồn ngoài tầm kiểm soát là cách nhanh nhất để dữ
  liệu sai lặng lẽ chui vào cổng.

Số liệu diện tích / dân số của trang (40,42 km² · 43.712 người) **không** thay số
của cổng — cổng vẫn cộng từ bảng khu phố như cũ, vì đó là con số duy nhất khớp với
từng trang khu phố. Chênh lệch được ghi lại kèm lý do ngay trong tệp.

### Địa chí Hán Nôm 1896 — và một đơn vị hành chính THỨ BA

Khoá cài đặt `diaChi1896` ([`seed-data/dia-chi-1896.json`](server/prisma/seed-data/dia-chi-1896.json))
là **"Đông Triều huyện địa chí"** — Tri huyện **Ngô Sinh** chép ngày 8 tháng 8 năm
Thành Thái thứ 8 (**1896**), ký hiệu A.1940. Sách chép đủ thành trì, 9 ngọn núi,
6 con sông, 13 cây cầu, 6 cái chợ, đường sá, diên cách, 18 mục nhân vật, phong tục,
7 cổ tích, kỹ nghệ và 15 thứ thổ sản.

⚠️ **Huyện Đông Triều năm 1896 KHÔNG phải phường Đông Triều, cũng không phải thành
phố Đông Triều cũ.** Khi ấy nó thuộc tỉnh **Hải Dương**, còn 5 tổng với 52 xã thôn —
gồm cả núi Yên Tử, Mạo Khê, Hồ Thiên, nay thuộc Uông Bí và các phường xã khác. Gần
như mọi địa danh trong sách không nằm trong địa giới phường. Nên mọi chỗ hiện dữ
liệu này — cả trang lẫn câu trả lời của trợ lý — đều đóng dấu năm và phạm vi.

**Phần đáng giá nhất không phải núi sông, mà là bảng đối chiếu khu phố.** 8 trong 11
khu phố hôm nay mang đúng tên xã sách đã chép (Mỹ Cụ, Mễ Xá, Đoàn Xá, Bình Lục, Yên
Lâm, Đạm Thuỷ, Đông Mai, An Biên ← Yên Biên); 2 khu là **phỏng đoán** và được đánh
dấu rõ như vậy (Trạo Hà ← thôn Điệu Hà, Vân Giang ← Vân Động + Kênh Giang); khu
Nguyễn Bình thì nói thẳng là không có trong sách. Mỗi dòng dẫn thẳng tới hồ sơ di
tích còn đứng trong khu đó.

**Văn bản qua OCR, và cổng đã sửa 6 chỗ.** Mục *Hiệu đính* ở cuối trang liệt kê từng
chỗ kèm lý do — ví dụ *Tự Đức thứ 13 (1850)* là điều không thể vì năm thứ 13 không
thể trước năm thứ 5, và chính mục Diên cách trong cùng văn bản chép đúng là **1860**;
*Minh Mạng thứ 11 (1812)* cũng vậy, vua Minh Mạng lên ngôi năm 1820 nên năm thứ 11 là
**1830**. Đây là cổng thông tin chính thức của phường: sửa chữ của một văn bản gốc
thì phải nói rõ sửa chỗ nào, vì sao.

`flow-diachi.mjs` (73 phép) giữ tất cả những điều trên, kể cả việc mọi liên kết chéo
phải trỏ tới bản ghi có thật chứ không phải slug chết.

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
├── bot-python/                          # Trợ lý Python — lớp thứ hai, thuần thư viện chuẩn
│   ├── run.py · kiemtra.py              # chat · serve · hoi · kho  ·  bộ kiểm 65 phép
│   └── troly/                           # vitext · khotritthuc (cắt đoạn) · timkiem (BM25) · traloi
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
npm install
npm run db:migrate
npm run db:seed
```

`npm install` tự chạy `prisma generate` (qua `scripts/postinstall.mjs`) — **bước bắt
buộc** mà nếu thiếu thì `npm run dev` sẽ gãy ngay với lỗi
`@prisma/client did not initialize yet`.

> **Không cần chạy `extract` hay `build-dataset`.** Toàn bộ dữ liệu đã sinh sẵn và
> có trong kho (`server/prisma/seed-data/*.json`, 15 tệp). Hai lệnh đó chỉ dùng khi
> bạn muốn **tạo lại** dữ liệu từ 29 file `.docx` gốc — đọc thêm ở bảng lệnh bên dưới.
>
> `npm run setup` gộp cả năm bước và vẫn chạy được, nhưng nó dựng lại dữ liệu từ
> `.docx` nên lâu hơn và có thêm chỗ để hỏng.

### 4. Khởi động

```bash
npm run dev
```

Mở **<http://localhost:4000>** — chỉ một địa chỉ duy nhất. Giao diện, khu quản trị
(`/admin`) và API (`/api/…`) đều nằm sau cùng cổng đó.

> Lúc dev, Vite chạy ở **chế độ middleware** bên trong Express thay vì tự mở cổng
> riêng: một tiến trình, một cổng, vẫn nạp nóng đầy đủ (kênh HMR cũng đi qua
> 4000). Không còn cổng 5173, không còn `npm run dev:client`, và cũng không cần
> `CORS_ORIGIN` nữa vì giao diện với API nay cùng origin. Xem
> [`server/src/index.js`](server/src/index.js).

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

### 5. Chạy không lên thì xem đây

Máy chủ tự kiểm tra bốn thứ trước khi mở cổng và in thẳng lệnh cần gõ
([`server/src/lib/preflight.js`](server/src/lib/preflight.js)). Bảng này để tra nhanh:

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `@prisma/client did not initialize yet` | Chưa sinh Prisma Client. Hay gặp khi tải mã về máy mới rồi chạy thẳng `npm run dev` | `npm run db:generate` |
| `TỆP .env ĐỂ NHẦM CHỖ` | Đã chép `.env.example` thành `.env` ngay tại thư mục gốc | Chuyển sang `server/.env` — không chỗ nào đọc tệp ở gốc |
| `THIẾU DATABASE_URL` | Chưa có `server/.env` | `copy .env.example server\.env` rồi sửa mật khẩu |
| `SAI TÀI KHOẢN PostgreSQL` | Mật khẩu trong `DATABASE_URL` không khớp | Sửa `server/.env` |
| `CHƯA TẠO CƠ SỞ DỮ LIỆU` | Chưa có database `dongtrieu` | `createdb -U postgres dongtrieu` |
| `KHÔNG KẾT NỐI ĐƯỢC PostgreSQL` | Dịch vụ PostgreSQL chưa chạy | Windows: Services → `postgresql-x64-16` → Start |
| `CHƯA TẠO BẢNG` | Chưa migrate | `npm run db:migrate` rồi `npm run db:seed` |
| Web chạy nhưng trống trơn, trợ lý AI không trả lời | Chưa nạp dữ liệu | `npm run db:seed` |
| `prisma generate` báo `EPERM` (Windows) | Có tiến trình `npm run dev` đang giữ tệp engine | Tắt hết cửa sổ đang chạy dev rồi thử lại |

---

## Các lệnh npm

| Lệnh | Tác dụng |
|---|---|
| `npm install` | Cài gói **và tự sinh Prisma Client** |
| `npm run db:generate` | Sinh lại Prisma Client (khi `npm install` báo sinh không được) |
| `npm run setup` | Cài đặt + **dựng lại dữ liệu từ .docx** + migrate + seed |
| `npm run dev` | Chạy dev — 1 process, 1 cổng (:4000): Express + Vite ở chế độ middleware, có nạp nóng |
| `npm run build` | Build giao diện React ra `client/dist` |
| `npm start` | Chạy production — 1 process phục vụ cả API lẫn giao diện (:4000) |
| `npm run extract` | Đọc lại 29 file `.docx` → `server/prisma/seed-data/*.json` |
| `npm run build-dataset` | Chuyển `server/data/sources/*.json` (khảo sát 2026) → 3 lớp phủ seed |
| `npm run make-favicon` | Sinh lại favicon, logo header/footer và ảnh chia sẻ từ logo phường |
| `npm run db:migrate` | Tạo & áp dụng migration (khi sửa `schema.prisma`) |
| `npm run db:seed` | Nạp lại dữ liệu (an toàn khi chạy nhiều lần) |
| `npm run db:studio` | Mở Prisma Studio để xem/sửa database trực quan |
| `npm run fetch-images` | Tải ảnh minh hoạ về thư mục `Anh di tich/` (Pexels nếu có key, không thì Wikimedia) |
| `npm run import-images` | Nén ảnh sang WebP, đưa vào `server/uploads/` và gán ảnh bìa theo slug |
| `npm run reprocess-images` | Dựng lại bản thu nhỏ của ảnh đã có theo thông số nén hiện hành |
| `npm run reprocess-images -- --sharpen` | Như trên, thêm bước làm nét bản đầy đủ (có sao lưu vào `server/image-backup/`) |
| `npm run test-chatbot` | Chạy thử trợ lý AI với ~40 câu hỏi mẫu, in ra câu trả lời |
| `npm run test-gemini` | 17 phép kiểm tầng Gemini (dùng fetch giả, không cần khoá API) |
| `npm run test-chatbot "câu hỏi"` | Hỏi trợ lý một câu bất kỳ ngay trên terminal |
| `npm run test-scenarios` | Bộ kịch bản 211 câu theo 26 nhóm (kiểu cổng du lịch); báo nhóm nào chưa đạt |
| `npm run test-scenarios-bulk` | Bộ sinh tự động ~1.400 câu từ dữ liệu thật; báo tỷ lệ đạt theo nhóm |
| `npm run check-hanh-chinh` | Tải lại trang tra cứu, đối chiếu với `hanh-chinh.json`; **chỉ báo lệch, không tự ghi đè** |
| `npm run test-lich` | 38 phép kiểm trang Lịch: dò khoảng ngày trong hồ sơ, cắm lễ hội đúng ô, tháng nhuận không nhân đôi |
| `npm run test-loi-trang` | 39 phép kiểm khung trang trong DOM giả: cố ý cho một trang ném lỗi rồi đòi đầu/chân trang còn nguyên, và canh hai đường về trong đầu trang |

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
| `POST` | `/api/media/upload` | Tự nén sang WebP 2000px + bản thu nhỏ 640px, làm nét sau khi thu nhỏ (thông số ở `src/lib/images.js`) |
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

#### Lớp thứ hai: trợ lý Python

Cách làm ở trên rất tốt cho nhóm câu hỏi lặp lại — thời tiết, giờ mở cửa, lễ hội sắp tới — vì những
câu đó cần **tính theo giờ hiện tại** chứ không phải tra chữ. Nhưng đúng vì thế nó chỉ trả lời được
câu nào đã có luật, còn câu hỏi lẻ nằm sâu trong một đoạn văn dài thì rơi vào *"chưa biết"*.

[`bot-python/`](bot-python/) là bộ máy thứ hai, viết bằng **Python thuần thư viện chuẩn** (không cần
`pip install` gì). Nó cắt mọi bản ghi thành **đoạn** rồi xếp hạng từng đoạn, nên trả về đúng câu chứa
câu trả lời:

```bash
cd bot-python
python run.py chat                        # trò chuyện trong cửa sổ lệnh
python run.py serve                       # dịch vụ HTTP ở cổng 5005
python run.py doi-chieu                   # so kho từ API với kho từ tệp JSON
python kiemtra.py                         # bộ kiểm, 91 phép
```

Nó đọc dữ liệu **qua API của máy chủ Node**, và khi máy chủ không chạy thì lùi về
đọc thẳng `server/prisma/seed-data/*.json` (ép bằng cờ `--tep`). Hai đường phải
cho ra như nhau — hiện **663 so với 664 đoạn**, lệch 0,2% — và có bộ kiểm canh:
thêm tệp JSON mới vào `seed-data/` mà bộ nạp Python quên đọc thì `kiemtra.py` đỏ.
Chi tiết ở [`bot-python/README.md`](bot-python/README.md).

`server/src/services/pybot.js` gọi sang đây **chỉ khi bộ luật đã chịu thua**. Thứ tự đó quan trọng:
gọi Python trước sẽ cướp mất các câu cần tính theo giờ. Không bật Python thì cổng chạy y như trước —
có cầu dao, hai lần gọi hỏng liên tiếp thì nghỉ 60 giây. Câu nào do Python đỡ thì nhật ký chat ghi ý
định có tiền tố `py_`, tức là danh sách việc cần bổ sung cho bộ luật.

Ví dụ bộ luật chịu thua mà Python trả lời được: *"chùa Quỳnh Lâm do ai dựng"* · *"ai đỗ bảng nhãn đời
Trần"* · *"bia miếu Đạm Thuỷ dựng năm nào"* · *"làng nào giỏi đấu vật"*. Chi tiết ở
[`bot-python/README.md`](bot-python/README.md), trong đó có hai cái bẫy tiếng Việt đã vấp và cách sửa
(danh sách hư từ dài cắt mất chính chữ `chùa`/`lâm`/`vua`; bảng đồng nghĩa có `cổ` ≡ `có`).

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
| **Địa chí Hán Nôm 1896** | *"địa chí 1896 là sách gì"* · *"Đông Triều có núi nào"* · *"núi Quy Sơn ở đâu"* · *"danh nhân Đông Triều là ai"* · *"thổ sản Đông Triều xưa có gì"* · *"phong tục Đông Triều xưa thế nào"* · *"Đông Triều xưa là phủ hay huyện"* |
| **Tên làng cũ** | *"Mỹ Cụ nghĩa là gì"* (Ưu Đà → Mỹ Cụ, 1802) · *"tên cũ của Mễ Xá"* · *"khu phố Trạo Hà xưa tên gì"* · *"khu phố nào có tên từ xưa"* |
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
npm run test-scenarios                    # bộ kịch bản viết tay 211 câu theo nhóm
npm run test-scenarios-bulk               # bộ SINH TỰ ĐỘNG ~1.400 câu (mẫu × dữ liệu × biến thể)
npm run test-scenarios-bulk -- --fails    # in chi tiết câu chưa đạt
npm run test-scenarios-bulk -- --drift    # in cả cảnh báo lệch ý định
```

Hai lớp kiểm thử:

- **Curated** (`chatbot-scenarios.mjs`, 211 câu) — viết tay, mô phỏng các nhóm câu hỏi của một cổng
  du lịch chính quyền (giới thiệu, di tích, lễ hội, ẩm thực, lưu trú, vé & giờ, thời tiết, đường đi,
  **lộ trình cá nhân hoá**, liên hệ & khẩn cấp, và **các câu ngoài phạm vi phải từ chối trung thực**).
- **Sinh tự động** (`gen-scenarios.mjs`, ~1.400 câu) — ghép **mẫu câu × dữ liệu thật trong database ×
  biến thể** (có dấu / không dấu / thêm từ đệm). Tự phình theo dữ liệu: thêm một di tích là có thêm
  vài chục câu test. Đây là "bản đồ" phát hiện định tuyến sai ở quy mô lớn — mỗi lần chạy báo tỷ lệ
  đạt theo nhóm và liệt kê câu trượt để khoanh vùng.

Muốn mở rộng: thêm một dòng mẫu vào `gen-scenarios.mjs` là sinh thêm hàng loạt câu cho toàn bộ dữ liệu.

---

## Đưa lên mạng miễn phí (Render + Neon)

Cho bản demo để người khác vào trải nghiệm. Kho đã có sẵn
[`render.yaml`](render.yaml), nên phần lớn việc là bấm nút.

**1. Cơ sở dữ liệu — [Neon](https://neon.tech).** Tạo project, chép chuỗi kết
nối (nhớ đuôi `?sslmode=require`).

> ⚠️ **Chép chuỗi TRỰC TIẾP, không phải chuỗi pooled.** Neon đưa hai địa chỉ,
> khác nhau đúng sáu chữ `-pooler`. `prisma migrate deploy` lấy một khoá tư vấn
> cấp *phiên*, mà PgBouncer không giữ phiên — migrate xong thì phiên nền vẫn nằm
> trong hồ và **ôm khoá mãi**, nên lần triển khai *sau* chết với `Timed out
> trying to acquire a postgres advisory lock`. Bẫy ở chỗ lần đầu vẫn báo thành
> công, nên rất dễ đổ lỗi cho thay đổi vừa đẩy lên.
>
> ```
> …@ep-xxx-pooler.c-3.ap-southeast-1.aws.neon.tech/…   ← đừng dùng
> …@ep-xxx.c-3.ap-southeast-1.aws.neon.tech/…          ← dùng cái này
> ```
>
> Lỡ kẹt rồi thì nối bằng chuỗi trực tiếp và ngắt phiên đang ôm khoá:
> ```sql
> SELECT pg_terminate_backend(l.pid) FROM pg_locks l
>   JOIN pg_stat_activity a ON a.pid = l.pid
>  WHERE l.locktype = 'advisory' AND l.granted AND a.state = 'idle';
> ```

> Vì sao không dùng Postgres miễn phí của chính Render: **nó bị xoá sau 30
> ngày.** Bản demo để cho người ta xem dần thì một tháng sau tự chết mà không
> báo. Neon gói free không hết hạn.

**2. Ứng dụng — [Render](https://render.com).** New → **Blueprint** → trỏ vào
kho này. Nó đọc `render.yaml` và dựng sẵn mọi thứ; bạn chỉ điền hai ô:

| Biến | Điền gì |
|---|---|
| `DATABASE_URL` | chuỗi kết nối Neon ở bước 1 |
| `ADMIN_PASSWORD` | mật khẩu quản trị, **tối thiểu 10 ký tự** |

`JWT_SECRET` Render tự sinh. `PUBLIC_SITE_URL` **không cần điền** — máy chủ tự
lấy `RENDER_EXTERNAL_URL`, nên sitemap và thẻ chia sẻ trỏ đúng địa chỉ thật ngay
lần đầu. `GEMINI_API_KEY` để trống thì trợ lý chạy bằng bản luật như thường.

Lệnh build tự chạy migration và **chỉ nạp dữ liệu mẫu ở lần triển khai đầu** —
xem [`seed-if-empty.mjs`](server/scripts/seed-if-empty.mjs) để biết vì sao không
gọi thẳng `db:seed` (gợi ý: `seed.js` có ba lệnh `deleteMany`).

### Ba giới hạn phải biết trước

- **Ngủ sau ~15 phút vắng khách.** Lượt vào kế tiếp chờ khoảng một phút để dậy.
  Gói free của Render là vậy, không có cách nào lách.
- **Ảnh tải lên sau khi triển khai sẽ mất.** Đĩa là tạm, mỗi lần khởi động lại
  `server/uploads/` trở về đúng những gì có trong git. Ảnh của dự án đã commit
  nên luôn đủ; nhưng ảnh quản trị viên thêm qua trang Admin thì không sống qua
  lần khởi động sau. Cần giữ thì phải sang nơi có volume (Fly.io) hoặc đẩy ảnh
  lên kho ngoài — cả hai đều phải sửa mã.
- **Không có trợ lý Python.** `PYBOT_URL=off`. Bản luật JS và tầng Gemini vẫn
  chạy; chỉ mất tầng tra đoạn văn bằng BM25.

Chạy thật, lâu dài, có tên miền riêng thì đừng dùng gói free — xem mục dưới.

## Triển khai lên VPS

Xem hướng dẫn chi tiết tại **[DEPLOY.md](DEPLOY.md)** — cài Node/PostgreSQL/Nginx/PM2, cấu hình HTTPS bằng Let's Encrypt, quy trình cập nhật và sao lưu.
