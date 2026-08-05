# Báo cáo — Cách xây dựng trợ lý AI Đông Triều

*Lập ngày 03/08/2026 · Bổ trợ cho [BAO-CAO-DU-AN.md](BAO-CAO-DU-AN.md)*

---

## 1. Trợ lý này là gì

Một trợ lý hỏi đáp tiếng Việt cho cổng thông tin du lịch phường Đông Triều, chạy
**hoàn toàn cục bộ**, không gọi bất kỳ dịch vụ AI bên ngoài nào.

| Thành phần | Tệp | Quy mô |
|---|---|---|
| Bộ điều phối ý định | `server/src/services/chatbot.js` | 2.882 dòng · 56 ý định |
| Kho tri thức | `server/src/services/knowledge.js` | 341 dòng |
| Bộ tìm kiếm BM25 | `server/src/services/retrieval.js` | 179 dòng |
| Module ngôn ngữ tiếng Việt | `server/src/lib/vitext.js` | 194 dòng |
| Cầu nối sang Python | `server/src/services/pybot.js` | 78 dòng |
| Trợ lý tra đoạn (Python) | `bot-python/troly/` | 1.019 dòng · 664 đoạn |
| Khung chat | `client/src/components/ChatWidget.jsx` | 273 dòng |
| Bộ kiểm | 3 bộ | 211 + 1.376 + 91 phép |

---

## 2. Quyết định nền tảng: không dùng mô hình ngôn ngữ

Đây là quyết định đầu tiên và nó chi phối toàn bộ phần còn lại.

### Vì sao

| Lý do | Diễn giải |
|---|---|
| **Không được bịa** | Cổng thông tin của chính quyền. Một mô hình trả lời trôi chảy nhưng sai niên đại sắc phong, hay gán nhầm vị thần được thờ, thì tác hại lớn hơn hẳn câu "mình chưa biết". |
| **Không phụ thuộc** | Cổng phường không nên treo vào một API tính tiền theo lượt hỏi, cũng không nên ngừng chạy khi hết hạn mức. |
| **Dạy được bằng tay cán bộ** | Ở đây, "dạy bot" = **sửa dữ liệu trong trang quản trị**. Không ai phải huấn luyện lại mô hình. |

### Cái giá phải trả

Trợ lý mất khả năng diễn đạt tự do. Bù lại bằng ba thứ: một module xử lý tiếng
Việt viết riêng (mục 4), một bộ luật nhận diện ý định đủ dày (mục 6), và một bộ
kiểm tự động đủ lớn để mỗi lần thêm luật không làm gãy luật cũ (mục 11).

---

## 3. Luồng xử lý một câu hỏi

```
Du khách gõ câu hỏi
        │
        ▼
  POST /api/chat          ← giới hạn 30 câu/phút/IP · cắt tối đa 500 ký tự
        │
        ▼
  ┌──────────────────────────────────────────────┐
  │  BƯỚC 1 — Chuẩn hoá tiếng Việt (vitext)      │
  │  "Đền Yết Kiêu ở đâu ạ" → "den yet kieu o dau ạ"
  └──────────────────────────────────────────────┘
        │
        ▼
  ┌──────────────────────────────────────────────┐
  │  BƯỚC 2 — Tra cứu BM25 TRƯỚC khi phân loại   │
  │  → biết câu hỏi có gọi đích danh mục nào không│
  │    (`strongName`)                             │
  └──────────────────────────────────────────────┘
        │
        ▼
  ┌──────────────────────────────────────────────┐
  │  BƯỚC 3 — Bộ điều phối 56 ý định             │
  │  Xét theo THỨ TỰ ĐÃ THIẾT KẾ, dừng ở nhánh   │
  │  đầu tiên khớp                                │
  └──────────────────────────────────────────────┘
        │
   khớp │                    │ không khớp (matched: false)
        ▼                    ▼
  Câu trả lời         ┌──────────────────────────┐
  có cấu trúc         │  Hỏi trợ lý Python       │
  + liên kết          │  (tra theo ĐOẠN)         │
  + gợi ý tiếp        │  chờ tối đa 2,5 giây     │
        │             └──────────────────────────┘
        │                    │
        └────────┬───────────┘
                 ▼
        Ghi ChatLog (câu hỏi · ý định · có trả lời được không)
                 ▼
             Trả về khách
```

Điểm mấu chốt: **tra cứu chạy trước phân loại**, không phải sau. Nhờ biết trước
"câu hỏi có gọi đích danh một mục cụ thể không", bộ điều phối tránh được cả một
lớp lỗi — "đền Yết Kiêu có lễ hội gì" phải trả lời về đền Yết Kiêu, không phải
liệt kê toàn bộ lễ hội của phường.

---

## 4. Bước 1 — Kho tri thức dựng từ database

`services/knowledge.js` gom 7 bảng nội dung + cài đặt trang thành một tập tài
liệu thống nhất, có bộ nhớ đệm **5 phút**.

**Cố ý KHÔNG đọc tệp `knowledge_base.md`.** Tệp đó là bản xuất tĩnh, sẽ cũ đi ngay
khi quản trị viên sửa nội dung. Lấy thẳng từ database thì mọi chỉnh sửa trong
trang quản trị lập tức thành kiến thức mới của bot — đây chính là cơ chế "dạy"
bot của dự án.

Mỗi tài liệu có **bốn trường token riêng biệt**, vì khớp ở tên quan trọng hơn
nhiều so với khớp trong thân bài:

```js
tokens: {
  title:   tokenize(title),                  // trọng số 6
  alias:   tokenize(allAliases.join(' ')),   // trọng số 4
  keyword: tokenize(keywords.join(' ')),     // trọng số 2,5
  body:    tokenize(body),                   // trọng số 1
}
```

Hai xử lý đáng chú ý ở bước dựng kho:

- **Tách phần trong ngoặc thành tên gọi khác.** Hồ sơ ghi "Chùa Mỹ Cụ (Sùng Khánh
  tự)" nhưng du khách chỉ gõ "chùa Mỹ Cụ". Tách ra thì cả hai cách hỏi đều nhận ra
  đúng di tích.
- **Quy đổi khu phố sẵn một lần.** Chỉ 1/13 di tích có toạ độ, nên khu phố là cách
  duy nhất biết cơ sở nào gần di tích nào.

### 4.1 Nguồn ngoài duy nhất — dữ liệu hành chính, và cách nó bị kiểm soát

Mọi nội dung khác của cổng đều do phường tự có: hồ sơ .docx, khảo sát cơ sở, địa
chí 1896. **Khoá `hanhChinh` là ngoại lệ duy nhất** — chép lại từ trang tra cứu
`tinhthanhvn.com`. Nó trả lời nhóm câu hỏi của *người dân* chứ không phải của du
khách: phường ghép từ những đơn vị nào, mã bưu chính là bao nhiêu, trụ sở ở đâu.

Một nguồn ngoài thì phải kèm cơ chế giữ, nếu không nó lặng lẽ mục đi:

| Rủi ro | Cách xử lý |
|---|---|
| Trang tự nhận chỉ "mang tính tham khảo" | Mọi câu trả lời đóng một dòng nguồn, khuyên đối chiếu với UBND trước khi dùng vào giấy tờ |
| Trang dẫn **sai** văn bản (Nghị quyết 202/2025/QH15 là nghị quyết sắp xếp cấp **tỉnh**, không phải văn bản lập phường) | Chép lại số hiệu đúng theo tra cứu văn bản, kèm cờ `canDoiSoat` vì chưa đọc được bản công báo gốc |
| Số của trang lệch số của cổng (40,42 km² · 43.712 người ↔ 40,41 km² · 42.454 nhân khẩu cộng từ bảng khu phố) | Cổng vẫn lấy tổng từ bảng khu phố; số của trang chỉ để đối chiếu, kèm lời giải thích vì sao lệch |
| Trang sửa dữ liệu mà không báo ai | `npm run check-hanh-chinh` tải lại trang, dò 11 giá trị, **cố ý không tự ghi đè** — chỉ báo chỗ lệch để người phụ trách tự quyết |
| Trang liệt kê phường giáp ranh sai (có cả Quảng Yên, Hiệp Hoà — cách rất xa) | Không dùng; ranh giới vẫn lấy từ khoá `vungDat` |

Điểm đối soát mạnh nhất lại đến từ **chính dữ liệu sẵn có của cổng**: năm đơn vị
cũ mà trang liệt kê (Thuỷ An · Hưng Đạo · Hồng Phong · Nguyễn Huệ · Đức Chính)
trùng khớp tuyệt đối với trường `wardOld` trên 13 hồ sơ di tích — hai bộ dữ liệu
độc lập, cùng một kết quả.

Còn thứ trang **không** có: danh sách khu phố. Cổng vốn đã có đủ hơn — 11 khu phố
kèm diện tích, số hộ, nhân khẩu, nhà văn hoá — nên phần đó giữ nguyên.

---

## 5. Bước 2 — Module ngôn ngữ tiếng Việt

Đây là phần đặc thù nhất. Bốn cách gõ dưới đây phải cùng ra một kết quả:

> "Đền Yết Kiêu" · "den yet kieu" · "đền Yết Kiêu ở đâu ạ" · "den yet kiu"

### 5.1 Bốn tầng

| Hàm | Việc | Ví dụ |
|---|---|---|
| `deaccent()` | Bỏ dấu qua NFD, xử riêng `đ/Đ` | "Đền Yết Kiêu" → "den yet kieu" |
| `norm()` | Chữ thường, bỏ ký tự lạ, gộp khoảng trắng | "Chùa Mỹ Cụ (Sùng Khánh tự)" → "chua my cu sung khanh tu" |
| `tokenize()` | Tách từ, bỏ hư từ, gộp `y/i` | "Mỹ Cụ" và "Mĩ Cụ" cùng ra `mi cu` |
| `expand()` | Nở từ đồng nghĩa | "ngủ" → "lưu trú, khách sạn, nhà nghỉ" |

### 5.2 Bẫy lớn nhất: bỏ dấu làm nhiều từ đụng nhau

Đây là nguồn của phần lớn lỗi định tuyến đã gặp trong dự án:

| Sau khi bỏ dấu | Các từ đụng nhau | Hậu quả nếu xử ẩu |
|---|---|---|
| `den` | **đền** (nơi thờ) · **đến** (tới) | Xoá "đến" như hư từ là mất luôn khả năng tìm ra đền |
| `tu` | **tự** (Báo Ân *tự*) · **từ** | Mất tên chùa |
| `cho` | **chợ** · **cho** (giới từ) | "cho mình hỏi" khớp nhầm "Chợ trung tâm" |
| `van` | **Vân** (Ngoạ *Vân*) · **vẫn** | Xoá "vẫn" thì "Ngoạ Vân" chỉ còn một tiếng, không đủ gọi tên |
| `an` | **ăn** · **An** (*An* Biên) | "khu phố An Biên gồm những khu nào" bị hiểu thành hỏi chỗ **ăn** |
| `may` | **mấy** · **mai** | Gộp `y→i` bừa thì "mấy giờ mở cửa" thành hỏi thời tiết **mai** |
| `ve` | **vé** · **về** | Nhầm câu hỏi giá vé với câu hỏi đường về |

Ba nguyên tắc rút ra:

1. **Danh sách hư từ phải NGẮN và thận trọng.** Chỉ liệt kê từ chắc chắn vô nghĩa
   khi tra cứu. Cố ý giữ lại các từ mang ý định hỏi (gì, đâu, nào, bao, mấy, sao).
2. **Gộp `y→i` có điều kiện**: chỉ khi `y` đứng cuối từ và trước nó là phụ âm
   (`Mỹ→Mĩ`, `Lý→Lí`), không đụng `may`, `tay`, `hay`.
3. **`has()` phải khớp TRỌN TỪ**, không khớp chuỗi con:

   ```js
   export function has(haystackNorm, ...phrases) {
     const padded = ` ${haystackNorm} `;
     return phrases.some((p) => padded.includes(` ${norm(p)} `));
   }
   ```

   Không đệm khoảng trắng thì "ngoa van o dau" (Ngoạ Vân ở đâu) sẽ khớp cụm
   "an o dau" (ăn ở đâu) và trả về danh sách nhà hàng.

### 5.3 Bảng từ đồng nghĩa — chỗ dạy bot cách hỏi mới

```js
const SYNONYMS = {
  ngu:      ['luu tru', 'khach san', 'nha nghi'],
  ankhuya:  ['24h', 'mo khuya', 'an dem'],
  xephang:  ['danh gia', 'sao'],
  // …
};
```

Thêm một dòng là bot hiểu ngay một cách hỏi mới, không phải huấn luyện lại gì cả.
Đây là điểm mở rộng **rẻ nhất** của cả hệ thống.

### 5.4 Sửa lỗi chính tả

Levenshtein có ngưỡng cắt sớm. Chỉ sửa từ dài từ 4 ký tự (ngắn hơn thì sửa dễ sai
hơn đúng), và **hạ điểm** kết quả sửa được: sai 1 ký tự còn 60% điểm, sai 2 còn 35%.

---

## 6. Bước 3 — Bộ tìm kiếm BM25

Không có mô hình ngôn ngữ nào, chỉ có xếp hạng độ liên quan trên chính dữ liệu
của phường. Ưu điểm kèm theo: bot **không bao giờ bịa** — mọi câu đều trích từ
bản ghi có thật.

```js
const FIELD_WEIGHTS = { title: 6, alias: 4, keyword: 2.5, body: 1 };
const K1 = 1.4;   // hệ số bão hoà tần suất
const B  = 0.5;   // mức chuẩn hoá theo độ dài
```

**Vì sao `B = 0,5` chứ không phải 0,75 như mặc định?** Vì độ dài tài liệu chênh
nhau rất lớn: hồ sơ di tích dài hàng nghìn chữ, bản ghi quán ăn chỉ vài dòng. Hạ
`B` xuống là bớt phạt tài liệu dài, để hồ sơ di tích không bị thiệt.

**Ưu tiên theo loại** (`KIND_PRIOR`): di tích ×1,3. Trang web lấy di tích làm
trung tâm, nên câu mơ hồ "chùa Mỹ Cụ có gì đặc biệt" phải cho hồ sơ di tích thắng
bài lễ hội cùng tên.

**Hai tín hiệu quan trọng nhất trả về:**

```js
const strongName = Boolean(top && (top.exactName || top.titleCoverage >= 0.6));
```

- `exactName` — câu hỏi chứa nguyên tên bản ghi hoặc một tên gọi khác.
- `titleCoverage` — tỷ lệ từ trong tên bản ghi có mặt ở câu hỏi.

`strongName` là biến được dùng nhiều nhất trong bộ điều phối. Nó trả lời câu
"người dùng có đang gọi đích danh một mục cụ thể không?" — và rất nhiều nhánh
phải hỏi câu đó trước khi hành động.

---

## 7. Bước 4 — Bộ điều phối 56 ý định

### 7.1 Thứ tự xét là thiết kế, không phải ngẫu nhiên

Đây là phần khó nhất và cũng là nơi phát sinh nhiều lỗi nhất. Bộ điều phối xét
tuần tự và dừng ở nhánh đầu tiên khớp, nên **thứ tự chính là logic**:

| Thứ tự | Nhánh | Vì sao phải đứng ở đó |
|---|---|---|
| 1 | Xã giao | Rẻ nhất, chặn sớm |
| 2 | Triều cường | Trước thời tiết, vì "con nước" cũng chứa từ thời tiết |
| 3b | Lộ trình | Trước "nên đi đâu", vì câu lộ trình thường kèm cụm đó |
| 3d | Thủ tục hành chính | Trước mọi nhánh "ở đâu" |
| 3e | Tiện ích chưa có dữ liệu | Trước nhánh "gần đây", để "ATM gần đây" không thành điểm lân cận |
| 3e2 | Xếp hạng theo tiêu chí không có | Trước mọi nhánh gợi ý |
| 3g | Giờ mở cửa quán | Trước nhánh danh mục, vì "quán nào mở 24/24" chứa cả "quán" lẫn "mở cửa" |
| 8 | Vé & giờ mở cửa di tích | Trước nhánh liệt kê di tích |
| 9 | Tra cứu tự do | Cuối cùng |
| 10 | Nói thật là chưa biết | Không bao giờ bịa |

Ví dụ cụ thể về nhánh 3e2: nếu để sau nhánh gợi ý, câu "quán nào wifi mạnh nhất"
sẽ trả về một danh sách xếp theo sao — **trông như đã trả lời đúng** trong khi dữ
liệu hoàn toàn không chấm wifi. Đây là kiểu sai nguy hiểm nhất vì người đọc không
nhận ra.

### 7.2 Toàn bộ 56 ý định, chia 11 nhóm

| Nhóm | Số | Ý định |
|---|---:|---|
| Xã giao | 3 | `greeting` `help` `thanks` |
| Thời tiết & thuỷ triều | 4 | `weather_now` `weather_day` `weather_range` `tide` |
| Liệt kê nội dung | 7 | `list_heritage` `list_festival` `list_cuisine` `list_lodging` `list_restaurant` `list_cafe` `list_attraction` |
| Hỏi sâu về lễ hội | 4 | `lookup_festival` `festival_aspect` `festival_month` `festival_upcoming` |
| Không gian & thời gian | 8 | `near` `hours` `ticket` `directions` `route` `where_today` `where_day` `recommend` |
| Địa phương & khu phố | 8 | `about` `about_location` `about_history` `about_economy` `about_transport` `about_size` `khu_pho_info` `khu_pho_list` |
| Căn cước hành chính | 3 | `about_admin_merge` `about_admin_code` `about_admin_office` |
| Địa chí 1896 | 10 | `about_diachi` `about_nui` `about_song` `about_nhanvat` `about_thosan` `about_phongtuc` `about_cotich` `about_tenlang` `about_diencach` `about_khupho_xua` |
| Liên hệ & khẩn cấp | 2 | `contact` `contact_emergency` |
| Phản ánh & góp ý | 3 | `feedback_ward` `feedback_legal` `feedback_portal` |
| Ranh giới | 4 | `out_of_scope_admin` `out_of_scope_facility` `out_of_scope_ranking` `fallback` |

Nhóm "Địa chí 1896" là đơn vị nội dung thứ ba của cổng, bên cạnh hồ sơ di tích và
dữ liệu dịch vụ — trích từ *Đông Triều huyện địa chí* do Tri huyện Ngô Sinh chép
năm 1896.

### 7.3 Các bộ nhận diện phụ

Ngoài `has()`, bộ điều phối còn có các hàm dò chuyên biệt:

```js
detectBudget(q)      // "2 triệu" → có ngân sách. \b để không đụng "2 ngày", "2 kg", món "ngán"
detectOpenMode(q)    // → 'now' | 'late' | 'early' | 'allday' | null
detectKhuPho(q)      // bắt buộc có chữ "khu", vì tên khu phố trùng tên di tích
detectLunarMonth(q)  // "tháng giêng" → 1, "tháng chạp" → 12
detectRoute(q)       // buổi sáng / chiều / cả ngày / 2 ngày + sở thích + sức khoẻ
```

`detectKhuPho` minh hoạ rõ nguyên tắc chung: tên khu phố trùng tên nhiều di tích
(Mỹ Cụ, An Biên, Bình Lục), nên **bắt buộc phải có chữ "khu"** thì mới coi là hỏi
về khu phố. Không có ràng buộc này thì "chùa Mỹ Cụ có gì" bị hiểu thành hỏi khu
phố Mỹ Cụ.

---

## 8. Bước 5 — Ranh giới trung thực

Trợ lý có câu từ chối **riêng cho từng loại vượt phạm vi**, không dùng chung một
câu chối chung chung. Đây là chủ ý: một lời từ chối có ích phải chỉ được đường đi
tiếp.

| Loại | Ý định | Trả lời |
|---|---|---|
| Thủ tục hành chính | `out_of_scope_admin` | Chỉ sang UBND phường + `dichvucong.gov.vn` |
| Tiện ích chưa thu thập | `out_of_scope_facility` | Nói rõ chưa có dữ liệu ATM/xăng/bãi đỗ |
| Xếp hạng theo tiêu chí không có | `out_of_scope_ranking` | Nói rõ dữ liệu chỉ có điểm sao **tổng thể** |
| Không tìm thấy | `fallback` | Nói thẳng chưa biết + gợi ý câu hỏi khác |

### 8.1 Ranh giới khó nhất: cổng không được hứa hộ chính quyền

Nhóm `feedback_*` là chỗ ranh giới dễ vượt qua nhất mà lại khó thấy nhất, vì
vượt bằng sự tử tế chứ không bằng sự bịa đặt.

Người dân gõ *"tôi muốn phản ánh"* đang muốn ba việc rất khác nhau, và cổng chỉ
làm được **một**:

| Việc | Cổng làm được gì | Ý định |
|---|---|---|
| Báo nội dung sai trên chính cổng này | **Nhận trực tiếp** qua biểu mẫu Liên hệ — đây là thứ duy nhất cổng hứa được | `feedback_portal` |
| Phản ánh đời sống: rác, đường hỏng, tiếng ồn | **Không nhận được.** Chỉ đường tới UBND phường, `dichvucong.gov.vn`, `nguoidan.chinhphu.vn` | `feedback_ward` |
| Khiếu nại, tố cáo | **Không được nhận.** Thủ tục có trình tự, thời hạn, cần đơn có chữ ký | `feedback_legal` |

Cám dỗ ở đây là gộp cả ba rồi chỉ sang biểu mẫu Liên hệ cho gọn — nghe rất chu
đáo, nhưng là **hứa hộ chính quyền một việc cổng không làm**: người dân gửi
phản ánh về rác vào biểu mẫu du lịch rồi ngồi chờ một hồi âm không bao giờ tới.
Nên `feedback_ward` đóng lại bằng đúng một câu nói thẳng: *"Cổng này là cổng
thông tin du lịch, không phải kênh tiếp nhận phản ánh."*

**Việc gấp thì số điện thoại đứng trước biểu mẫu.** *"Cây đổ chắn đường báo ai"*
mà đáp bằng đường dẫn tới một biểu mẫu web thì đúng hình thức nhưng sai việc, nên
`feedback_ward` mở đầu bằng 113 · 114 · 115. Cùng lý do, câu nào chạm từ khoá khẩn
cấp thì nhánh khẩn cấp thắng tuyệt đối: nhầm về phía số 114 cùng lắm là thừa, nhầm
về phía biểu mẫu web thì có thể là mất mạng người.

Đo lúc dựng nhóm này còn lộ ra một lỗ hổng đã nằm sẵn: *"cháy nhà gọi số nào"*,
*"có trộm gọi số nào"*, *"tai nạn giao thông gọi ai"* đều rơi xuống `fallback` —
người đang cần cứu hộ thì bot đáp *"mình chưa có thông tin này"*. Danh sách từ
khoá khẩn cấp được bổ sung, **trừ cụm `chay` trần**: bỏ dấu thì **cháy** ≡ **chay**,
mà cổng có hẳn mục ẩm thực, nên *"quán ăn chay ở đâu"* sẽ được đáp lại bằng số 114.

---

## 9. Đơn vị thứ hai — trợ lý Python tra theo đoạn

### 9.1 Vì sao cần bộ máy thứ hai

Bản luật rất tốt cho câu hỏi lặp lại và câu cần **tính theo giờ hiện tại**. Nhưng
đúng vì thế nó chỉ trả lời được câu nào đã có luật. Câu hỏi lẻ nằm sâu trong một
đoạn văn dài thì rơi vào `fallback` — mà địa chí 1896 thì toàn văn dài như vậy.

|  | Bản luật (JS) | Bản đoạn (Python) |
|---|---|---|
| Cách làm | Nhận diện ý định → câu trả lời có cấu trúc | Cắt bản ghi thành **đoạn**, xếp hạng, trả **nguyên văn** đoạn tốt nhất |
| Mạnh ở | Thời tiết, triều cường, quán còn mở, lễ hội sắp tới, lộ trình theo ngân sách | Câu hỏi lẻ trong văn bản dài |
| Yếu ở | Câu nào chưa có luật thì chịu | Không biết mấy giờ, không tính được lịch âm |

Ví dụ bản luật chịu thua mà bản Python trả lời được:

> *"chùa Quỳnh Lâm do ai dựng"* · *"ai đỗ bảng nhãn đời Trần"* ·
> *"thổ sản trúc vằn lấy ở đâu"* · *"làng nào giỏi đấu vật"*

### 9.2 Kho 664 đoạn

| Loại | Số đoạn | | Loại | Số đoạn |
|---|---:|---|---|---:|
| heritage | 172 | | attraction | 37 |
| festival | 105 | | cuisine | 35 |
| dia_chi | 103 | | article | 33 |
| restaurant | 92 | | vung_dat | 14 |
| lodging | 46 | | khu_pho | 11 |
| | | | gioi_thieu | 5 |

Python thuần thư viện chuẩn, **không có `requirements.txt`** vì không cần cài gì.
Đọc dữ liệu từ API máy chủ, hoặc đọc thẳng tệp JSON khi chạy ngoại tuyến.

### 9.3 Xếp hạng đoạn khác xếp hạng bản ghi ở đâu

Cùng công thức BM25 nhưng `B = 0,75` thay vì 0,5: các đoạn đã gần bằng nhau về độ
dài, nên đoạn dài hơn **không nên** được lợi thế chỉ vì chứa nhiều từ hơn.

### 9.4 Ba cửa chặn — mỗi cửa sinh ra từ một lỗi CÓ THẬT

```python
def _nhan_duoc(r) -> bool:
    if r.cum_can and r.so_cum == 0:
        return False
    return r.goi_ten or (r.diem >= 3.0 and r.do_phu >= 0.75)
```

| Cửa | Chặn được | Lỗi đã bắt |
|---|---|---|
| Điểm BM25 ≥ 3 | Đoạn không liên quan | |
| Độ phủ ≥ 0,75 | Đoạn chỉ chạm vài chữ | *"làng nào giỏi đấu vật"* → **Khoai lang làng Trạo**, chỉ vì chữ "làng" nằm trong tên món |
| Cụm hai tiếng phải đứng LIỀN NHAU | Túi từ bị âm tiết đánh lừa | *"ai là tổng thống Hoa Kỳ"* → hồ sơ **kiến trúc chùa**, nhờ bốn tiếng "tổng · thông · hoa · kỷ" nằm rải rác, phủ tới 3/4 |

Cửa thứ ba đáng nói nhất. Tiếng Việt tách theo âm tiết nên túi từ rất dễ bị đánh
lừa. Nhưng "tổng thống" và "Hoa Kỳ" là **từ ghép** — chúng phải đứng liền nhau
mới mang nghĩa. Câu hỏi thật thì luôn có ít nhất một cụm đứng liền: "Quy Sơn",
"Trạo Hà", "Quỳnh Lâm", "đấu vật". Đây là tín hiệu **độc lập** với cả BM25 lẫn độ
phủ, và là tín hiệu duy nhất trong ba cái chặn được đúng lớp lỗi này.

Ngoại lệ: câu hỏi một tiếng ("Ngoạ Vân") không rút ra được cụm nào — lúc đó bỏ qua
cửa này, vì đòi một điều không tồn tại thì thành ra không bao giờ trả lời.

### 9.5 Hai tinh chỉnh điểm số, mỗi cái từ một lỗi thật

**Độ phủ nhân bình phương vào điểm**, không chỉ làm ngưỡng chặn:

> *"Khu phố Trạo Hà XƯA TÊN gì"* từng ra số hộ và diện tích của khu phố hôm nay —
> đoạn đó chứa ba lần chữ "Khu phố Trạo Hà" nên điểm thô gấp đôi, dù bỏ sót đúng
> hai từ mang cả ý câu hỏi. Bình phương thì đoạn phủ 2/3 chỉ còn 44% điểm.

**Phần thưởng "gọi đúng tên" co lại theo độ phủ** (`× (1 + 1,6 × độ_phủ)` thay vì
thưởng cứng 2,6 lần): gọi đúng tên mà không trả lời được phần còn lại thì không
đáng được thưởng như gọi đúng tên và trả lời trọn vẹn.

### 9.6 Cầu dao — dịch vụ phụ không được làm sập cổng chính

```js
const CHO_TOI_DA = 2500;   // chờ tối đa 2,5 giây
const HONG_TOI_DA = 2;     // hỏng 2 lần liên tiếp
const NGHI = 60_000;       // thì nghỉ 60 giây
```

Không bật Python thì cổng chạy y như cũ. Tắt hẳn bằng `PYBOT_URL=off`. Mọi lỗi
đều nuốt, trả `null`, giữ nguyên câu từ chối của bản JS.

**Thứ tự gọi rất quan trọng:** luôn chạy bản luật trước. Gọi Python trước sẽ cướp
mất nhóm câu cần tính theo giờ hiện tại — mà đó lại là nhóm câu hỏi nhiều nhất.

---

## 9bis. Đơn vị thứ ba — tầng diễn đạt Gemini (tuỳ chọn, TẮT mặc định)

Bổ sung 03/08/2026. Đây là hiện thực của khuyến nghị ở mục 15: **mô hình ngôn ngữ
chỉ được viết lại đoạn đã truy hồi, không được là nguồn tri thức.**

### 9bis.1 Vai trò và vị trí

```
Luật (JS) ──► Đoạn nguyên văn (Python) ──► Diễn đạt lại (Gemini) ──► Từ chối thật thà
```

Gemini đứng CUỐI và chỉ chạy khi hai bản trên đều chịu thua. Nhờ thứ tự này, phần
lớn câu hỏi không tốn một lượt gọi ra ngoài nào.

Ngữ liệu của nó là **113 tài liệu từ 7 bảng nội dung** (di tích, lễ hội, ẩm thực,
lưu trú, nhà hàng, điểm lân cận, bài viết). Địa chí 1896 **không** nằm trong chỉ
mục JS — đó vẫn là địa hạt của bản Python, vốn chạy trước nên không bao giờ tới
lượt Gemini.

### 9bis.2 Ba lớp giữ ranh giới

| Lớp | Chặn gì |
|---|---|
| **Cửa truy hồi** | Không có ngữ liệu đúng chuyện thì KHÔNG gọi. Câu ngoài phạm vi chết ở đây, trước khi tốn lượt gọi. |
| **Hợp đồng đầu ra** | Bắt trả JSON có cờ `du_lieu_du`. Mô hình tự khai thiếu ngữ liệu thì bỏ, giữ câu từ chối của bản luật. |
| **Hậu kiểm** | Loại câu rỗng, quá dài, hoặc tự chèn URL — liên kết chỉ được lấy từ tài liệu ta đã đưa vào. |

### 9bis.3 Cửa truy hồi phải đo mới chọn được ngưỡng

Bản đầu tiên dùng ngưỡng điểm BM25 và **hỏng ngay**: *"ai là tổng thống Hoa Kỳ"*
lọt qua và gọi API. Đo trên dữ liệu thật cho thấy vì sao — điểm và độ phủ đều
không tách được hai nhóm:

| Câu | Điểm | Độ phủ | |
|---|---:|---:|---|
| "tỷ giá đô la hôm nay" | 11,44 | 0,50 | ngoài phạm vi |
| "lịch chiếu phim" | 6,43 | **1,00** | ngoài phạm vi |
| "làng nào giỏi đấu vật" | **7,04** | 0,60 | câu hỏi thật |
| "thổ sản trúc vằn lấy ở đâu" | 11,31 | 0,67 | câu hỏi thật |

Một câu ngoài phạm vi phủ **trọn 1,00** còn câu hỏi thật chỉ phủ 0,60 — đúng bẫy
âm tiết ở mục 5.2. Cách giải là mượn lại **cửa cụm hai tiếng** đã chứng minh được
ở bản Python: "tổng thống", "lịch chiếu" không đứng liền nhau ở đâu trong hồ sơ,
còn "đấu vật", "Quỳnh Lâm", "trúc vằn" thì có.

Sau khi đổi sang tín hiệu này: **18/18 tách đúng** (10 câu ngoài phạm vi bị chặn
hết, 8 câu trong phạm vi qua hết).

### 9bis.4 Vận hành

| Thiết lập | Mặc định | Ý nghĩa |
|---|---|---|
| `GEMINI_API_KEY` | rỗng → **TẮT HẲN** | Không khoá thì cổng chạy y như trước, không gọi ra ngoài lần nào |
| `GEMINI_MODEL` | `gemini-flash-latest` | Bí danh `-latest`, chọn theo đo đạc — xem 9bis.6 |
| `GEMINI_TIMEOUT_MS` | 6000 | Chờ tối đa mỗi lượt |
| Thử lại | 1 lần với 429/5xx, cách 600ms | Google trả 503 khá thường xuyên và chỉ nhất thời |
| Cầu dao | hỏng 2 lần → nghỉ 60 giây | Giống `pybot.js` |
| Bộ nhớ đệm | 24 giờ theo câu hỏi đã chuẩn hoá | Giảm số lượt gọi. Câu mô hình từ chối cũng được nhớ |
| Nhiệt độ | 0,15 | Việc ở đây là thuật lại trung thành, không phải sáng tác |
| `maxOutputTokens` | 800 | Rộng hơn mức cần: model đời mới tiêu một phần cho suy luận nội bộ |

Câu trả lời luôn kèm dòng *"do trợ lý tổng hợp từ các hồ sơ dưới đây"* cùng liên
kết tới từng bản ghi nguồn, và mang ý định riêng `gemini_grounded` để nhật ký chat
tách được câu nào do tầng này đỡ.

**Cân nhắc trước khi bật:** câu hỏi của du khách và các đoạn hồ sơ liên quan sẽ
được gửi sang máy chủ Google. Dữ liệu hồ sơ vốn đã công khai trên cổng, nhưng đây
vẫn là quyết định cần cân nhắc với một cổng thông tin của chính quyền.

### 9bis.5 Bài kiểm

`npm run test-gemini` — 17 phép, dùng `fetch` giả nên **không cần khoá API thật**
và không gọi ra ngoài. Canh cả bảy nhóm: cửa truy hồi, đường đi thuận, hợp đồng
đầu ra, hậu kiểm, bộ nhớ đệm, nội dung thân gửi đi, và trạng thái tắt mặc định.

### 9bis.6 Chạy thật với khoá thật — bốn điều chỉ lộ ra khi gọi

Bốn phát hiện dưới đây đều đến từ việc gọi API thật, không phát hiện được bằng
`fetch` giả. Mỗi cái đều dẫn tới một thay đổi trong mã.

**1. Model ghim số bị rút không báo trước.** Bản đầu ghim `gemini-2.5-flash`, gọi
tới thì Google trả **404 "no longer available to new users"**. Cổng phường không
có ai theo dõi lịch rút model hằng tháng, nên chuyển sang bí danh `-latest` để nó
tự trôi theo bản hiện hành.

**2. Hạng `flash-lite` không đủ tin cậy.** Chọn model theo **đo**, không theo giá.
Thử 3 lượt mỗi model trên chính khoá của dự án:

| Model | Kết quả | Ghi chú |
|---|---|---|
| `gemini-flash-latest` | **3/3** | Chọn cái này |
| `gemini-flash-lite-latest` | 1/3 | Hai lần 503 "high demand" |
| `gemini-3.5-flash-lite` | 0/3 | 503 cả ba |
| `gemini-2.0-flash-lite` | 0/3 | 429 — khoá không có hạn mức |

Hạng lite rẻ và nhanh hơn thật (~1,0–1,6s so với ~3,0–4,6s), nhưng một tầng chỉ
đỡ phần dư của câu hỏi thì **chạy được** mới là điều đáng giá nhất.

**3. 503 nhất thời làm cầu dao nhảy oan.** Hai câu hỏi liên tiếp gặp 503 là tầng
này tắt suốt 60 giây vì một sự cố thoáng qua. Đã thêm **một lần thử lại** với
429/5xx, cách 600ms — theo đúng mẫu `fetchRetry` vốn có trong `fetch-images.mjs`.
Chỉ thử lại một lần vì đây là đường đi có người đang ngồi chờ.

**4. Nuốt lỗi im lặng là không chẩn đoán được.** Bản đầu `catch {}` trống nên khi
Google trả 503 thì trợ lý chỉ "bỗng nông đi", không để lại dấu vết nào — mất khá
nhiều công mới truy ra. Nay ghi một dòng `console.warn` kèm mã lỗi, và một dòng
nữa khi cầu dao nhảy.

**Kiểm chứng không bịa.** Đối chiếu từng chi tiết trong câu trả lời với hồ sơ gốc
trong CSDL: **11/11 khớp nguyên văn**.

> *"kiến trúc chùa Mỹ Cụ thế nào"* → "chữ Đinh", "7 gian bái đường", "3 gian hậu
> cung", "656m²", "ngói mũi sấu thời Lê", "ngói mũi hài thời Nguyễn" — 6/6 có
> nguyên văn trong trường `architecture`.
>
> *"món nào ăn được quanh năm"* → "luộc chấm muối chanh lá chanh", "nướng mật
> ong", "lẩu gà nấu chua", "quanh năm", "mùa lễ hội xuân" — 5/5 có nguyên văn.

**Kiểm cả chuỗi qua HTTP.** Chạy máy chủ ở cổng 4100 với `PYBOT_URL=off`, gửi
`POST /api/chat` câu *"chùa nào còn giữ ngói thời Lê"* → trả về
`intent: "gemini_grounded"` kèm ba bản ghi nguồn. Chuỗi luật → Python → Gemini
chạy thông.

### 9bis.7 Phạm vi thật — nhỏ hơn tưởng tượng

Đo trên 10 câu hỏi "sâu": chỉ **4 câu** rơi xuống tới Gemini. 6 câu còn lại bản
luật đã nhận.

Địa hạt thật của tầng này là **câu hỏi ngược** — mô tả một đặc điểm rồi hỏi bản
ghi nào có. Bản luật tra xuôi (tên → hồ sơ) chứ không tra ngược được:

> *"chùa nào còn giữ ngói thời Lê"* → Chùa Mỹ Cụ ✔
> *"món nào ăn được quanh năm"* → Gà đồi Đông Triều ✔
> *"đền nào gắn với Yết Kiêu"* → Đền Kênh Giang ✔

**Hạn chế đã biết, chưa sửa:** vài câu bản luật "nhận" nhưng trả lời khá chung
chung (*"tượng nào cao nhất trong các di tích"* → chỉ liệt kê danh sách di tích).
Cho Gemini đỡ luôn nhóm này sẽ phủ thêm 2–3/10 câu, nhưng đụng vào vùng 1.516 bài
kiểm đang phủ — đã cân nhắc và quyết định **không** mở rộng.

**Về độ ổn định:** trong lúc kiểm, Google trả 503 khá thường xuyên ngay cả với
`gemini-flash-latest`. Khi đó tầng này im lặng nhường lại câu từ chối trung thực
của bản luật — đúng thiết kế, du khách không bao giờ thấy lỗi. Nhưng nghĩa là
**một phần câu hỏi vẫn rơi về fallback** tuỳ tải của Google lúc đó.

---

## 10. Khung chat phía giao diện

`ChatWidget.jsx` — 273 dòng. Hai điểm đáng nói:

**Cố ý KHÔNG dùng `dangerouslySetInnerHTML`.** Nội dung tuy do máy chủ sinh ra
nhưng có lẫn dữ liệu do người dùng nhập trong trang quản trị, nên render bằng
React cho an toàn tuyệt đối trước XSS.

**Bộ tách định dạng đi đúng một tầng lồng.** Bot viết `**đậm**`, `_nghiêng_` và
dòng bắt đầu bằng `• `. Cần một tầng lồng vì dòng đóng dấu nguồn của địa chí 1896
có dạng `_Theo **tên sách** — tác giả_`. Bản trước tách một lượt duy nhất nên cụm
ấy nhả nguyên hai dấu sao ra màn hình.

---

## 11. Vòng phản hồi — biết bot còn thiếu gì

Mỗi câu hỏi được ghi vào bảng `ChatLog` cùng ý định và cờ `matched`. Việc ghi log
**không bao giờ được làm hỏng câu trả lời cho du khách**:

```js
prisma.chatLog.create({ data: {...} })
  .catch((err) => console.warn('Không ghi được nhật ký chat:', err.message));
```

Trang quản trị (`/api/chat/logs`) gom các câu `matched: false` theo nội dung và
xếp theo số lần bị hỏi. Đây là **bản đồ việc cần làm**: câu nào bị hỏi nhiều mà
bot chịu thua thì hoặc thiếu dữ liệu, hoặc thiếu luật.

---

## 12. Kiểm thử

### 12.1 Ba tầng

| Bộ kiểm | Quy mô | Kiểm gì |
|---|---|---|
| `npm run test-scenarios` | 211 câu / 26 nhóm | Kịch bản viết tay theo mẫu cổng du lịch |
| `npm run test-scenarios-bulk` | 1.376 câu | **Sinh tự động từ dữ liệu thật** |
| `python kiemtra.py` | 91 phép | Trợ lý Python, gồm đối chiếu nguyên văn từng đoạn |

### 12.2 Bộ sinh kịch bản tự động — điểm đáng học nhất

Thay vì viết tay hàng nghìn câu:

```
MẪU CÂU  ×  DỮ LIỆU THẬT (lấy từ database)  ×  BIẾN THỂ
```

Biến thể gồm: câu gốc, bản **không dấu**, và bản có từ đệm ("cho mình hỏi …ạ").

Điều quan trọng nhất: **kỳ vọng cũng sinh từ dữ liệu thật**. Ví dụ khu phố nào
chưa có quán nào thì bài kiểm bắt buộc bot phải từ chối trung thực chứ không được
bịa. Nhờ vậy dữ liệu đổi thì bài kiểm tự đổi theo, không bao giờ lạc hậu.

Mỗi câu gắn kỳ vọng hai mức — và mức thứ hai quan trọng ngang mức thứ nhất:

- `answer` → bot **phải trả lời được**
- `graceful` → bot **phải từ chối trung thực**, không được bịa

Ngoài ra có `accept` = tập ý định hợp lệ; sai khác chỉ **cảnh báo**, không tính
trượt. Tách hai mức này ra rất có ích: cảnh báo cho thấy bot trả lời được nhưng
đi nhầm nhánh — đó thường là dấu hiệu sớm của một lỗi định tuyến sắp lộ ra.

### 12.3 Kết quả lần chạy 03/08/2026

```
Kịch bản viết tay     211/211
Sinh tự động          1376/1376   (cảnh báo lệch ý định: 13)
Trợ lý Python         90/90
```

---

## 13. Bốn lỗi điển hình đã gặp và cách chúng được tìm ra

Ba lỗi đầu do **bộ sinh tự động** phát hiện. Lỗi thứ tư thì không bộ kiểm nào bắt
được — người dùng báo — và chính điều đó đã lộ ra một lỗ hổng của cách kiểm.

**1 — "làm hộ chiếu ở đâu" được trả lời bằng vị trí Đông Triều.**
Bộ lọc thủ tục hành chính thiếu từ khoá "hộ chiếu" nên câu rơi xuống nhánh `'o dau'`
và nhận về bài giới thiệu phường cách Hà Nội bao nhiêu cây số. Sửa tận gốc: cụm
`'o dau'` đứng một mình bắt quá rộng, nay chỉ tính khi câu có nhắc tới chính vùng
đất này.

**2 — "chỗ nghỉ gần \<di tích\>" trả về hồ sơ di tích** (13 câu).
Nhánh khu phố đã coi "chỗ nghỉ" là từ chỉ lưu trú, riêng nhánh danh mục bỏ quên.

**3 — "khu phố An Biên gồm những khu nào" trả về danh sách quán ăn.**
Đúng bẫy ở mục 5.2: "**An** Biên" bỏ dấu thành `an`, trùng "**ăn**". Sửa bằng cách
gỡ tên khu phố ra khỏi câu trước khi dò từ khoá món ăn.

**4 — "ăn gì vào buổi sáng" trả về một bản lộ trình vãn cảnh chùa.**

Đây là lỗi đáng học nhất, vì hai lẽ.

*Thứ nhất, nó là lỗi thứ tự chứ không phải lỗi từ khoá.* Nhánh lộ trình (mục 3b)
đứng rất sớm, và `hasSang` nhận `'buoi sang'` **đứng một mình** — không đòi chút ý
định đi chơi nào. Nhánh đứng sớm mà bắt rộng thì các nhánh sau không còn cơ hội.
Đo ra mới thấy nó nuốt cả một họ câu hỏi, 9/14 câu thử:

> *"ăn gì vào buổi sáng"* · *"cà phê buổi sáng ở đâu"* · *"đặc sản buổi sáng"* ·
> *"quán nào mở cả ngày"* (câu này còn cướp mất nhánh giờ mở cửa ở mục 3g)

Sửa: **mọi** từ chỉ buổi/ngày đều phải đi kèm ý định đi chơi. Kèm theo phải bổ
sung `'di nhung dau'` vào danh sách ý định — `has()` khớp trọn cụm liền nhau nên
"đi **những** đâu" không khớp "đi đâu", và bài kiểm cũ bắt được ngay chỗ này.

*Thứ hai, không bộ kiểm nào bắt được nó* — vì cả hai bộ đều chỉ hỏi "bot có trả
lời được không". Bot trả lời rất trôi chảy, `matched = true`, chỉ có điều trả lời
sang chuyện khác. Bộ sinh tự động thì có so ý định nhưng chỉ **cảnh báo**, không
tính trượt.

Nên `chatbot-scenarios.mjs` được mở rộng: mỗi câu nay gắn thêm được **tập ý định
hợp lệ**, đi nhầm nhánh là TRƯỢT. Nhóm hồi quy `S` ghim cả hai chiều — câu ăn
uống/giờ giấc không được thành lộ trình, mà câu lộ trình thật vẫn phải ra lộ
trình, và chữ "sáng" trong câu hỏi thời tiết vẫn phải là thời tiết.

Hai bài học:

1. **Mọi lỗi định tuyến của trợ lý tiếng Việt đều xoay quanh việc bỏ dấu làm hai
   từ khác nghĩa đụng nhau, hoặc một nhánh đứng sớm bắt quá rộng.** Ai xây bot
   tiếng Việt kiểu này nên lập bảng va chạm ngay từ đầu, và soát lại thứ tự nhánh
   mỗi lần thêm luật.
2. **Kiểm `matched` là chưa đủ.** Với bot theo luật, "trả lời trôi chảy nhưng lạc
   nhánh" mới là lớp lỗi hay gặp và khó thấy nhất — người dùng đọc xong mới biết
   là lạc đề. Phải kiểm cả ý định thì mới chặn được.

---

## 14. Cách mở rộng, xếp theo chi phí từ rẻ tới đắt

| # | Cách | Khi nào dùng | Chi phí |
|---|---|---|---|
| 1 | **Sửa dữ liệu trong trang quản trị** | Bot trả lời đúng nhánh nhưng nội dung thiếu | Không cần lập trình |
| 2 | **Thêm dòng vào `SYNONYMS`** | Du khách gõ cách nói mà bot chưa hiểu | 1 dòng |
| 3 | **Thêm từ khoá vào một nhánh `has()`** | Có nhánh đúng rồi, chỉ thiếu cách gọi | 1 dòng + chạy lại bộ kiểm |
| 4 | **Thêm nhánh ý định mới** | Năng lực hoàn toàn mới | Hàm trả lời + đặt đúng vị trí trong thứ tự + bổ sung kịch bản |

**Quy tắc bắt buộc với cách 3 và 4:** chạy lại cả hai bộ kiểm trước khi commit.
Thứ tự các nhánh là logic của hệ thống — thêm một nhánh sai chỗ có thể làm hỏng
nhánh khác một cách hoàn toàn im lặng.

---

## 15. Đánh giá kiến trúc

**Được:**
- Không bao giờ bịa — mọi câu trích từ bản ghi có thật, kiểm được.
- Chi phí vận hành bằng không, chạy ngoại tuyến, không phụ thuộc nhà cung cấp.
- Cán bộ phường dạy được bot bằng cách sửa dữ liệu.
- 1.516 bài kiểm tự đồng bộ với dữ liệu, bắt được lỗi mà mắt người bỏ sót.

**Chưa được:**
- Không diễn đạt lại được câu trả lời theo ngữ cảnh hội thoại; mỗi câu hỏi độc lập.
- Bộ điều phối 2.514 dòng phụ thuộc thứ tự — thêm nhánh mới ngày càng khó.
- Câu hỏi nhiều bước ("so sánh chùa A với chùa B") chưa xử lý được.

**Hướng đi này đã được hiện thực** ở mục 9bis: giữ nguyên tầng dữ liệu và tầng
truy hồi làm nguồn sự thật, thêm một tầng diễn đạt Gemini ở trên — mô hình chỉ
được **viết lại** đoạn đã truy hồi, không được tự sinh nội dung. Tắt mặc định.

Còn hai việc chưa làm nếu muốn đi tiếp:

- **Đưa địa chí 1896 vào chỉ mục JS** để Gemini cũng đọc được (hiện chỉ bản Python
  đọc). Việc này đổi `corpus.docs` nên đổi luôn kết quả BM25 của bản luật — phải
  chạy lại toàn bộ 1.516 bài kiểm và chấp nhận rủi ro lệch định tuyến.
- **Ngữ cảnh hội thoại nhiều lượt.** Hiện mỗi câu hỏi vẫn độc lập.

---

## Phụ lục — lệnh liên quan tới trợ lý

```bash
npm run test-chatbot                 # ~40 câu mẫu, in ra câu trả lời
npm run test-chatbot "câu hỏi"       # hỏi một câu bất kỳ trên terminal
npm run test-scenarios               # 140 kịch bản viết tay
npm run test-scenarios -- --fails    # chỉ in câu chưa đạt
npm run test-scenarios-bulk          # 1.376 câu sinh tự động
npm run test-scenarios-bulk -- --drift  # xem các câu lệch ý định

cd bot-python
python run.py chat                   # trò chuyện trong cửa sổ lệnh
python run.py hoi "Đông Triều có núi nào"
python run.py serve                  # dịch vụ HTTP cổng 5005
python run.py kho                    # xem kho tri thức đang có gì
python run.py doi-chieu              # so kho từ API với kho từ tệp JSON
python kiemtra.py                    # 91 phép kiểm
```
