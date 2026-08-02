# Trợ lý Đông Triều — bản Python

Chatbot tra cứu cho cổng thông tin phường Đông Triều, viết bằng **Python thuần
thư viện chuẩn**. Không có `requirements.txt` vì không cần cài gì: chỉ cần
Python 3.9 trở lên.

```bash
cd bot-python

python run.py chat                          # trò chuyện ngay trong cửa sổ lệnh
python run.py hoi "Đông Triều có núi nào"    # hỏi một câu rồi thoát
python run.py serve                          # mở dịch vụ HTTP ở cổng 5005
python run.py kho                            # xem kho tri thức đang có gì
python kiemtra.py                            # chạy bộ kiểm (65 phép)
```

## Nó khác bản JavaScript ở chỗ nào

Cổng có **hai** bộ máy trả lời, cố ý làm hai việc khác nhau.

|  | `server/src/services/chatbot.js` | `bot-python/` |
|---|---|---|
| Cách làm | nhận diện ý định bằng luật, trả câu viết sẵn | cắt dữ liệu thành **đoạn**, xếp hạng BM25, trả **nguyên văn** đoạn tốt nhất |
| Mạnh ở | câu cần tính theo giờ hiện tại — thời tiết, triều cường, "giờ này quán nào còn mở", "lễ hội nào sắp tới" | câu hỏi lẻ nằm sâu trong một đoạn văn dài |
| Yếu ở | câu nào chưa có luật thì chịu | không biết mấy giờ, không tính được lịch âm |

Ví dụ bản luật chịu thua mà bản Python trả lời được:

- *"chùa Quỳnh Lâm do ai dựng"*
- *"ai đỗ bảng nhãn đời Trần"*
- *"thổ sản trúc vằn lấy ở đâu"*
- *"làng nào giỏi đấu vật"*

Phần lớn những câu này nằm trong **"Đông Triều huyện địa chí"** — địa chí Hán Nôm
do Tri huyện Ngô Sinh chép năm 1896, toàn văn dài, đúng thứ mà luật viết tay
không với tới.

## Nó KHÔNG bịa

Câu trả lời luôn là **một đoạn có thật** trong dữ liệu của phường, kèm tên bản
ghi và đường dẫn để tự kiểm. Phần duy nhất do máy viết là câu dẫn ("Theo hồ sơ
…") và lời từ chối. Không đạt ngưỡng thì nói thẳng là chưa biết.

Phép kiểm số 6 trong `kiemtra.py` đối chiếu từng đoạn trong câu trả lời với kho —
đoạn nào không khớp nguyên văn là hỏng.

## Ba cửa chặn

Một câu trả lời phải qua cả ba, mỗi cửa chặn một lớp lỗi khác nhau. Cả ba đều
sinh ra từ lỗi **có thật** bắt được lúc dựng, và đều có bài hồi quy giữ lại:

| Cửa | Chặn được | Lỗi đã bắt |
|---|---|---|
| Điểm BM25 ≥ 3 | đoạn không liên quan | |
| Độ phủ ≥ 0,75 (nhân bình phương vào điểm) | đoạn chỉ chạm vài chữ | *"làng nào giỏi đấu vật"* → đặc sản **Khoai lang làng Trạo** |
| Cụm hai tiếng phải đứng liền nhau | túi từ bị âm tiết đánh lừa | *"ai là tổng thống Hoa Kỳ"* → hồ sơ **kiến trúc chùa**, nhờ bốn tiếng "tổng · thông · hoa · kỷ" nằm rải rác |

Cửa thứ ba là cửa đặc thù tiếng Việt: chữ viết tách theo âm tiết nên túi từ rất
dễ bị lừa, còn từ ghép thì phải đứng liền nhau mới mang nghĩa.

## Hai cái bẫy tiếng Việt đã vấp

**Danh sách hư từ dài là hỏng.** Bỏ dấu xong thì `chùa → chua` (chưa),
`lâm → lam` (làm), `vua → vua` (vừa), `hồ → ho` (họ). Danh sách hư từ kiểu tiếng
Anh cắt hết những chữ mang nghĩa nặng nhất của kho này — câu *"chùa Quỳnh Lâm do
ai dựng"* chỉ còn hai tiếng `quynh dung` và trợ lý trả lời "chưa có thông tin"
cho một ngôi chùa nó có cả hồ sơ. Danh sách hiện tại rất ngắn, chép theo bản JS.

**Bảng đồng nghĩa cũng vậy.** Bảng này tính vào độ phủ nên phải sạch: `cổ` ≡ `có`
từng khiến *"khu phố Trạo Hà **xưa** tên gì"* trả về số hộ của khu phố hôm nay,
vì đoạn đó có chữ "**có** 1012 hộ". Đã loại: cổ · đế · đồi · ông · than · thờ ·
bến · tự · ăn · ấp.

## Nguồn dữ liệu

Đọc qua **API công khai** của máy chủ Node — không nối thẳng vào cơ sở dữ liệu,
không giữ bản sao riêng. Quản trị viên sửa nội dung trong trang quản trị là trợ
lý Python đổi theo, giống hệt bản JS.

Máy chủ Node chưa chạy thì lùi về đọc `server/prisma/seed-data/*.json`, nên
`python run.py chat` và `kiemtra.py` vẫn dùng được ngoại tuyến.

```
DONGTRIEU_API=http://localhost:4000/api   # đổi địa chỉ API
PYBOT_PORT=5005                            # đổi cổng dịch vụ
```

## Nối vào cổng

`server/src/services/pybot.js` gọi sang đây **chỉ khi bản luật đã chịu thua**
(`matched === false`). Thứ tự đó quan trọng: gọi Python trước sẽ cướp mất các câu
cần tính theo giờ hiện tại, mà đó mới là nhóm câu hỏi nhiều nhất.

Không bật Python thì cổng chạy y như trước. Có cầu dao: hai lần gọi hỏng liên
tiếp thì nghỉ 60 giây, nên khi không ai chạy Python thì mỗi câu fallback cũng
không phải chờ hết thời gian chờ.

```
PYBOT_URL=http://127.0.0.1:5005   # mặc định
PYBOT_URL=off                     # tắt hẳn
PYBOT_TIMEOUT_MS=2500
```

Câu nào do Python đỡ thì nhật ký chat ghi ý định có tiền tố `py_`, để trang quản
trị phân biệt được.

Dịch vụ chỉ nghe trên `127.0.0.1`: đây là dịch vụ nội bộ, không có xác thực và
không nên mở ra mạng ngoài.

## Cấu trúc

```
run.py               chat · serve · hoi · kho
kiemtra.py           bộ kiểm, 65 phép
troly/
  vitext.py          bỏ dấu, tách từ, đồng nghĩa, khoảng cách sửa
  khotritthuc.py     nạp dữ liệu, cắt thành đoạn
  timkiem.py         BM25 + độ phủ + cụm hai tiếng
  traloi.py          ghép câu trả lời, ba cửa chặn
```
