"""Xử lý tiếng Việt cho trợ lý: bỏ dấu, tách từ, mở rộng đồng nghĩa.

Đây là bản Python của `server/src/lib/vitext.js`. Cố ý giữ CÙNG cách chuẩn hoá
với bản JavaScript: hai bộ máy đọc chung một kho dữ liệu, nên nếu chuẩn hoá lệch
nhau thì cùng một câu hỏi sẽ khớp hai đằng khác nhau và rất khó dò ra vì sao.
"""

from __future__ import annotations

import re
import unicodedata

__all__ = ["bo_dau", "chuan", "tach_tu", "mo_rong", "co_cum", "khoang_cach_sua"]


def bo_dau(s: str) -> str:
    """Bỏ toàn bộ dấu tiếng Việt, kể cả chữ đ."""
    s = str(s or "")
    # đ/Đ không phải là d + dấu phụ nên NFD không tách được, phải thay tay.
    s = s.replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def chuan(s: str) -> str:
    """Dạng chuẩn để so khớp: bỏ dấu, chữ thường, gom khoảng trắng."""
    s = bo_dau(s).lower()
    s = re.sub(r"[^a-z0-9\s]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


# ── DANH SÁCH HƯ TỪ, CỐ Ý RẤT NGẮN ─────────────────────────────────────────
# Chép đúng danh sách của `server/src/lib/vitext.js`, và ngắn vì một lý do cụ thể.
#
# Bản đầu của tệp này dùng danh sách dài kiểu tiếng Anh (~90 từ) và hỏng ngay:
# bỏ dấu xong thì **chùa → chua** (chưa), **lâm → lam** (làm), **vua → vua**
# (vừa), **hồ → ho** (họ, hộ). Cắt hết đi thì câu "chùa Quỳnh Lâm do ai dựng"
# chỉ còn hai tiếng "quynh dung", và trợ lý trả lời "chưa có thông tin" cho một
# ngôi chùa mà nó có cả hồ sơ.
#
# Trong kho dữ liệu này, "chùa", "vua", "lâm", "hồ" là những từ mang nghĩa nặng
# nhất. Nên chỉ bỏ hư từ nào KHÔNG trùng âm với từ có nghĩa.
#
# Cùng lý do, cố ý KHÔNG có "van": bỏ dấu thì "vẫn" trùng "Vân" trong Ngoạ Vân,
# Vân Động, Vân Giang. Và "cho" thì PHẢI bỏ, vì "cho mình hỏi" quá phổ biến —
# đổi lại nó trùng "chợ" nên chợ phải tra bằng cụm ("chợ Đông Mai").
#
# Bản Python thêm đúng bốn từ để hỏi so với bản JS — vì ở đây độ phủ là một cửa
# chặn thật, nên "nào", "gì" nằm lại trong mẫu số sẽ dìm độ phủ của chính câu
# trả lời đúng. Chỉ thêm từ nào KHÔNG trùng âm với từ có nghĩa nào trong kho.
# Cố ý KHÔNG thêm: "đâu" (trùng ĐẤU vật, Lộc ĐẦU) · "đỗ" (ai ĐỖ tiến sĩ) ·
# "đời" (ĐỜI Trần) · "không" (Nguyễn Minh KHÔNG) · "sao" (5 SAO).
TU_DEM = set(
    (
        "la va voi trong ngoai tren duoi ra vao thi ma nhung cac mot nay kia ay "
        "the nhe duoc bi se dang roi lai cung con hoac neu boi hon nhat cho "
        "xin vui giup minh toi rat "
        "nao gi ai nhi"
    ).split()
)


def _gop_y_i(w: str) -> str:
    """Gộp biến thể chính tả y ↔ i: Mỹ/Mĩ, Kỹ/Kĩ, Lý/Lí, Sỹ/Sĩ đều đúng.

    Chỉ đổi khi "y" đứng CUỐI và trước nó là phụ âm — không đụng "may", "tay",
    "hay", nếu không thì "mấy giờ" hoá thành "mai giờ".
    """
    return re.sub(r"([bcdghklmnprstvx])y$", r"\1i", w)

# ── ĐỒNG NGHĨA ─────────────────────────────────────────────────────────────
# Người dân gõ "chùa", hồ sơ ghi "tự"; gõ "làng", sách ghi "xã" hoặc "thôn".
#
# ── BẢNG NÀY TÍNH VÀO ĐỘ PHỦ, NÊN PHẢI SẠCH ────────────────────────────────
# Đoạn nào chứa một từ đồng nghĩa cũng được tính là đã phủ từ khoá tương ứng.
# Vì thế một âm tiết mơ hồ lọt vào đây là hỏng cả cửa chặn độ phủ.
#
# Bản đầu có "cổ" trong nhóm nghĩa "xưa", và bỏ dấu xong thì **cổ = có**. Hậu
# quả: câu "khu phố Trạo Hà XƯA tên gì" tính là đã phủ chữ "xưa" ở đoạn ghi
# "Khu phố Trạo Hà… CÓ 1012 hộ", rồi trả về số hộ của khu phố hôm nay.
#
# Các âm tiết đã loại vì cùng lỗi đó, dù nghe rất hợp nghĩa:
#   cổ ≡ có · đế ≡ để · đồi ≡ đời · ông ≡ ong · than ≡ thần · thờ ≡ thổ
#   bến ≡ bên · tự ≡ từ/tư · ăn ≡ An (An Sinh, An Biên) · ấp ≡ áp
# Quy tắc rút ra: chỉ nhận từ hai tiếng trở lên, hoặc âm tiết chỉ có một nghĩa.
DONG_NGHIA = [
    {"chua", "pagoda", "thien vien"},
    {"den", "mieu", "nghe", "dinh"},
    {"lang", "thon", "khu pho"},
    {"nui", "ngon nui", "son"},
    {"song", "khe", "suoi", "song ngoi"},
    {"cho", "phien cho"},
    {"vua", "hoang de", "nha vua"},
    {"le hoi", "hoi lang"},
    {"am thuc", "dac san", "mon an", "thuc an"},
    {"o dau", "cho nao", "dia diem", "vi tri"},
    {"lich su", "xua", "ngay xua", "truyen thong", "dien cach"},
    {"nhan vat", "danh nhan", "nguoi"},
    {"tho san", "san vat", "san pham"},
    {"than da", "than mo", "mo than", "khai thac than"},
    {"tien si", "khoa bang", "dai khoa", "bang nhan", "tham hoa", "trang nguyen"},
    # "vì sao GỌI là Mỹ Cụ" phải khớp đoạn có chữ "đặt TÊN là Mỹ Cụ".
    {"ten", "goi", "nghia", "ten goi"},
]

_BANG_DONG_NGHIA: dict[str, set[str]] = {}
for _nhom in DONG_NGHIA:
    for _t in _nhom:
        _BANG_DONG_NGHIA.setdefault(_t, set()).update(_nhom - {_t})


def tach_tu(s: str, giu_tu_dem: bool = False) -> list[str]:
    """Câu → danh sách từ đã chuẩn hoá, gộp y↔i, bỏ hư từ, bỏ từ một ký tự."""
    tu = [_gop_y_i(t) for t in chuan(s).split(" ") if len(t) > 1 or t.isdigit()]
    if giu_tu_dem:
        return tu
    con = [t for t in tu if t not in TU_DEM]
    # Câu toàn hư từ ("nhưng mà thế") thì giữ nguyên còn hơn trả về rỗng.
    return con or tu


def mo_rong(tu: list[str]) -> set[str]:
    """Thêm từ đồng nghĩa — dùng để XẾP HẠNG, không tính vào độ phủ."""
    ra: set[str] = set()
    for t in tu:
        ra.update(_BANG_DONG_NGHIA.get(t, ()))
    # Cụm hai tiếng: "khu pho", "le hoi", "tho san"…
    for i in range(len(tu) - 1):
        ra.update(_BANG_DONG_NGHIA.get(f"{tu[i]} {tu[i + 1]}", ()))
    return ra - set(tu)


def co_cum(chuoi_chuan: str, *cum: str) -> bool:
    """Chuỗi đã chuẩn hoá có chứa cụm nào không, TÍNH THEO TỪ TRỌN VẸN.

    Khớp chuỗi con sẽ sai kiểu "ngoa van o dau" (Ngoạ Vân ở đâu) dính cụm
    "an o dau" (ăn ở đâu) rồi trả về danh sách nhà hàng.
    """
    dem = f" {chuoi_chuan} "
    return any(f" {chuan(c)} " in dem for c in cum)


def khoang_cach_sua(a: str, b: str, toi_da: int = 2) -> int:
    """Khoảng cách Levenshtein, dừng sớm khi đã vượt ngưỡng."""
    if abs(len(a) - len(b)) > toi_da:
        return toi_da + 1
    truoc = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        hien = [i]
        nho_nhat = i
        for j, cb in enumerate(b, 1):
            gia = min(truoc[j] + 1, hien[j - 1] + 1, truoc[j - 1] + (ca != cb))
            hien.append(gia)
            nho_nhat = min(nho_nhat, gia)
        if nho_nhat > toi_da:
            return toi_da + 1
        truoc = hien
    return truoc[-1]
