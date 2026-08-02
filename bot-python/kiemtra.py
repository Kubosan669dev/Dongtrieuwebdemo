#!/usr/bin/env python3
"""Bộ kiểm cho trợ lý Python.

    python kiemtra.py            chạy tất cả
    python kiemtra.py --hong     chỉ in phép kiểm hỏng

Chạy được cả khi máy chủ Node chưa bật: lúc đó kho tri thức lùi về đọc các tệp
trong `server/prisma/seed-data/`, nên kết quả vẫn ổn định.

Hai nhóm quan trọng nhất:

  · **Phải từ chối** — câu ngoài phạm vi mà trả lời trôi chảy còn tệ hơn im lặng.
    Ba câu trong nhóm này là lỗi CÓ THẬT đã bắt được trong lúc dựng, giữ lại làm
    bài hồi quy.
  · **Không được bịa** — mọi đoạn trả về phải khớp NGUYÊN VĂN một đoạn có trong
    kho. Đây là điều kiện sống còn của cả cách làm này.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

for _l in (sys.stdout, sys.stderr):
    try:
        _l.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass

from troly import nap  # noqa: E402
from troly import hoi as _hoi  # noqa: E402
from troly.khotritthuc import API_MAC_DINH, THU_MUC_DU_PHONG, TEP_BO_QUA, TEP_DOC, cat_doan, dung_kho  # noqa: E402
from troly.vitext import bo_dau, chuan, co_cum, tach_tu  # noqa: E402

# Cùng biến môi trường với `run.py`, để chạy được ở nơi API nằm địa chỉ khác.
API = os.environ.get("DONGTRIEU_API", API_MAC_DINH)


def hoi(cau: str) -> dict:
    """Luôn hỏi qua ĐÚNG địa chỉ API mà bộ kiểm đang dùng.

    Gọi `_hoi(cau)` trần thì nó lấy địa chỉ mặc định, và chỉ tình cờ đúng nhờ
    kho còn trong hạn cache. Đặt `DONGTRIEU_API` sang chỗ khác là hỏng ngay,
    mà lại hỏng theo kiểu vẫn xanh — loại sai khó thấy nhất.
    """
    return _hoi(cau, API)

dat = hong = 0
CHI_HONG = "--hong" in sys.argv


def kiem(ten: str, ok: bool, chi_tiet: str = "") -> None:
    global dat, hong
    if ok:
        dat += 1
        if not CHI_HONG:
            print(f"  ✓ {ten}")
    else:
        hong += 1
        print(f"  ✗ {ten}" + (f" → {chi_tiet}" if chi_tiet else ""))


def nhom(ten: str) -> None:
    if not CHI_HONG:
        print(f"\n{ten}")


# ═══ 1. Xử lý tiếng Việt ═══
nhom("1. Xử lý tiếng Việt")
kiem("bỏ dấu cả chữ đ", bo_dau("Đông Triều") == "Dong Trieu", bo_dau("Đông Triều"))
kiem("bỏ dấu tên có dấu nặng", bo_dau("Đạm Thuỷ · Mỹ Cụ") == "Dam Thuy · My Cu", bo_dau("Đạm Thuỷ · Mỹ Cụ"))
kiem("chuẩn hoá bỏ dấu câu", chuan("Chùa Mỹ Cụ (Sùng Khánh tự)?") == "chua my cu sung khanh tu")
kiem("tách từ bỏ hư từ", "voi" not in tach_tu("lịch sử với Đông Triều"))
kiem("câu toàn hư từ không ra rỗng", len(tach_tu("nhưng mà thế")) > 0)
kiem("gộp y↔i để Mỹ/Mĩ cùng khớp", tach_tu("Mỹ Cụ") == tach_tu("Mĩ Cụ"), str(tach_tu("Mỹ Cụ")))
# Hư từ trùng âm với từ mang nghĩa thì PHẢI GIỮ. Bỏ "chua"/"lam"/"vua" đi thì
# "chùa Quỳnh Lâm do ai dựng" chỉ còn hai tiếng và trợ lý trả lời "chưa biết"
# cho một ngôi chùa nó có cả hồ sơ — lỗi có thật, giữ lại làm bài hồi quy.
for _tu, _cau in (("chua", "chùa Quỳnh Lâm"), ("lam", "chùa Quỳnh Lâm"), ("vua", "lăng các vua Trần"), ("ho", "núi Hồ Thiên")):
    kiem(f"giữ lại “{_tu}” vì trùng âm với từ có nghĩa", _tu in tach_tu(_cau), str(tach_tu(_cau)))
# Khớp trọn từ, không khớp chuỗi con — nếu không thì "Ngoạ Vân ở đâu" dính cụm
# "ăn ở đâu" rồi trả về danh sách quán ăn.
kiem("co_cum khớp trọn từ", co_cum(chuan("Ngoạ Vân ở đâu"), "o dau"))
kiem("co_cum KHÔNG khớp chuỗi con", not co_cum(chuan("Ngoạ Vân ở đâu"), "an o dau"))

# ═══ 2. Cắt đoạn ═══
nhom("2. Cắt đoạn")
kiem("bỏ thẻ HTML", "<p>" not in " ".join(cat_doan("<p>Một câu đủ dài để không bị gộp mất đi.</p>")))
kiem("chuỗi rỗng ra danh sách rỗng", cat_doan("") == [])
_dai = ". ".join(f"Câu số {i} viết cho đủ dài để bộ cắt phải chia ra làm nhiều đoạn" for i in range(12))
_ra = cat_doan(_dai)
kiem("đoạn dài bị cắt nhỏ", len(_ra) > 1, f"{len(_ra)} đoạn")
kiem("không đoạn nào quá 400 ký tự", all(len(d) <= 400 for d in _ra), str(max(len(d) for d in _ra)))
kiem("cắt theo câu, không cắt cụt giữa chừng", all(not d.endswith(("Câu", "số")) for d in _ra))

# ═══ 3. Đồng bộ với các tệp JSON của dự án ═══
#
# Trợ lý đọc dữ liệu từ API của máy chủ Node, và khi máy chủ không chạy thì đọc
# thẳng `server/prisma/seed-data/*.json`. Đường thứ hai rất dễ trôi mà không ai
# biết: chạy vẫn ra kết quả trông bình thường, chỉ là thiếu dữ liệu.
#
# Bản đầu bỏ sót `festival-details.json` và `places.json` — hai lớp bổ sung mà
# `seed.js` gộp vào lúc gieo — nên hụt 130 trong 653 đoạn (một phần năm), mà
# không có dấu hiệu gì.
nhom("3. Đồng bộ với tệp JSON của dự án")
co_tep = {p.name for p in THU_MUC_DU_PHONG.glob("*.json")}
kiem("thấy thư mục seed-data", len(co_tep) > 5, str(THU_MUC_DU_PHONG))
_quen = co_tep - TEP_DOC - set(TEP_BO_QUA)
kiem(
    "không có tệp JSON nào bị bỏ quên",
    not _quen,
    f"chưa khai trong TEP_DOC: {', '.join(sorted(_quen))}",
)
_thua = TEP_DOC - co_tep
kiem("không khai tệp không tồn tại", not _thua, f"khai thừa: {', '.join(sorted(_thua))}")

kho_tep = dung_kho(ep_tep=True)
kiem("đọc tệp dựng được kho", len(kho_tep.doan) > 500, f"{len(kho_tep.doan)} đoạn")
kiem("nguồn ghi đúng là tệp", kho_tep.nguon == "tep")
_dem_tep: dict[str, int] = {}
for d in kho_tep.doan:
    _dem_tep[d.loai] = _dem_tep.get(d.loai, 0) + 1
# Ba con số này chính là ba chỗ từng hụt. Ghi cứng để lần sau ai sửa bộ nạp mà
# làm mất lớp bổ sung thì thấy ngay.
kiem("gộp festival-details: lễ hội đủ dày", _dem_tep.get("festival", 0) >= 100, str(_dem_tep.get("festival")))
kiem("gộp places: quán ăn đủ dày", _dem_tep.get("restaurant", 0) >= 80, str(_dem_tep.get("restaurant")))
kiem("gộp places: lưu trú đủ dày", _dem_tep.get("lodging", 0) >= 40, str(_dem_tep.get("lodging")))
# Gộp theo tên phải bỏ được tiền tố loại hình. `places.json` ghi tên như trên
# Google Maps ("Nhà nghỉ Hải Yến"), `lodgings.json` ghi tên đăng ký với UBND
# ("Hải Yến") — không cắt tiền tố thì một cơ sở bị đếm thành hai.
_ten_co_so = {d.tieu_de for d in kho_tep.doan if d.loai in ("lodging", "restaurant")}
_trung = sorted(t for t in _ten_co_so if any(o != t and chuan(o).endswith(" " + chuan(t)) for o in _ten_co_so))
kiem("không cơ sở nào bị tách làm hai vì tiền tố loại hình", not _trung, " · ".join(_trung[:4]))

# Nội dung CHỈ có trong hai tệp bổ sung — có thật sự vào kho không.
_muc = {d.muc for d in kho_tep.doan}
kiem("có mục “Ý nghĩa văn hoá” — chỉ festival-details.json mới có", "Ý nghĩa văn hoá" in _muc)
kiem("có mục “Lưu ý khi đi” — chỉ festival-details.json mới có", "Lưu ý khi đi" in _muc)
kiem("có mục “Món đặc trưng” — chỉ places.json mới có", "Món đặc trưng" in _muc)

# ═══ 4. Kho tri thức ═══
nhom("4. Kho tri thức")
kho, chi_muc = nap(API, ep=True)
kiem("dựng được kho", len(kho.doan) > 200, f"{len(kho.doan)} đoạn")
loai = {d.loai for d in kho.doan}
for l in ("heritage", "festival", "dia_chi", "khu_pho", "vung_dat"):
    kiem(f"có đoạn loại {l}", l in loai)
kiem("đoạn nào cũng biết mình từ đâu", all(d.tieu_de and d.muc for d in kho.doan))
kiem("không có đoạn rỗng", all(len(d.noi_dung) >= 25 for d in kho.doan))
_dc = [d for d in kho.doan if d.loai == "dia_chi"]
kiem("địa chí 1896 vào kho đủ dày", len(_dc) >= 80, f"{len(_dc)} đoạn")
kiem("có đoạn về núi Quy Sơn", any("Quy Sơn" in d.muc for d in _dc))
kiem("có đoạn về khu phố xưa", any("Khu phố xưa" in d.muc for d in _dc))

# ═══ 5. Trả lời được ═══
nhom("5. Câu hỏi phải trả lời được")
PHAI_TRA_LOI = [
    ("núi Quy Sơn hình gì", "rùa"),
    ("ai đỗ bảng nhãn đời Trần", "Lê Hiển Phủ"),
    ("thổ sản trúc vằn lấy ở đâu", "Yên Tử"),
    ("chùa Quỳnh Lâm do ai dựng", "Quỳnh Lâm"),
    ("vì sao gọi là Mỹ Cụ", "Mỹ Cụ"),
    ("làng nào giỏi đấu vật", "vật"),
    ("khu phố Trạo Hà xưa tên gì", "Điệu Hà"),
    ("Đông Triều cách Hà Nội bao xa", "85"),
    ("huyện Đông Triều xưa có mấy tổng", "5 tổng"),
    ("chùa Ngọc Thanh ở đâu", "Ngọc Thanh"),
    ("đền Yết Kiêu thờ ai", "Yết Kiêu"),
    ("núi Hồ Thiên có gì", "Hồ Thiên"),
    ("lăng các vua Trần ở đâu", "Trần"),
]
def than_bai(r: dict) -> str:
    """Chỉ phần TRẢ LỜI, bỏ dòng dẫn và mục “Còn thấy ở”.

    Không tách ra thì bài kiểm đạt vì lý do sai: câu "ai đỗ bảng nhãn đời Trần"
    từng trả về mục *Trần Cẩn · Trần Vũ*, còn *Lê Hiển Phủ* chỉ nằm ở danh sách
    gợi ý cuối — mà kiểm trên cả chuỗi thì vẫn thấy đủ chữ nên vẫn xanh.
    """
    return r["reply"].split("\n\nCòn thấy ở")[0]


for cau, mong in PHAI_TRA_LOI:
    r = hoi(cau)
    kiem(f"“{cau}”", r["matched"] and mong in than_bai(r), r["intent"] if not r["matched"] else "thiếu " + mong)

# ═══ 6. PHẢI TỪ CHỐI ═══
nhom("6. Câu ngoài phạm vi — phải từ chối, không được bịa")
# Ba câu đầu là lỗi CÓ THẬT bắt được lúc dựng, giữ lại làm bài hồi quy.
PHAI_TU_CHOI = [
    "thủ đô nước Pháp là gì",   # từng ra hồ sơ chùa Quỳnh Lâm, chỉ vì "nước ta" + "Pháp Loa"
    "tỷ giá đô la hôm nay",
    "cách nấu phở bò gia truyền",
    "kết quả xổ số miền Bắc",
    "ai là tổng thống Hoa Kỳ",
    "giá vàng SJC hôm nay",
    "lịch chiếu phim rạp CGV",
    "bảng xếp hạng ngoại hạng Anh",
    "cách đăng ký kết hôn trực tuyến",
    "thuốc hạ sốt cho trẻ em uống mấy lần",
]
for cau in PHAI_TU_CHOI:
    r = hoi(cau)
    kiem(f"từ chối “{cau}”", not r["matched"], f"lại trả lời: {r['intent']}")

# ═══ 7. KHÔNG ĐƯỢC BỊA ═══
nhom("7. Mọi câu trả lời phải trích nguyên văn từ kho")
_kho_van = {d.noi_dung for d in kho.doan}
_thieu = []
for cau, _ in PHAI_TRA_LOI:
    r = hoi(cau)
    if not r["matched"]:
        continue
    # Bỏ dòng dẫn, dòng cảnh báo và mục "Còn thấy ở" — phần còn lại là thân bài,
    # từng đoạn một PHẢI có mặt nguyên văn trong kho.
    than = r["reply"].split("\n\n")[1:]
    for doan in than:
        doan = doan.strip()
        if not doan or doan.startswith(("_", "Còn thấy ở", "•")):
            continue
        if doan not in _kho_van:
            _thieu.append((cau, doan[:60]))
kiem("không đoạn nào là chữ do máy tự viết", not _thieu, str(_thieu[:2]))

# ═══ 8. Cảnh báo nguồn 1896 ═══
nhom("8. Trích địa chí 1896 phải kèm cảnh báo phạm vi")
# Huyện Đông Triều 1896 thuộc Hải Dương, gồm cả Yên Tử và Mạo Khê — rộng hơn
# phường hôm nay rất nhiều. Trích mà không nói rõ là để người đọc hiểu nhầm.
_co_1896 = 0
for cau in ("núi Quy Sơn hình gì", "ai đỗ bảng nhãn đời Trần", "thổ sản trúc vằn lấy ở đâu"):
    r = hoi(cau)
    if r.get("nguon", {}).get("loai") == "dia_chi":
        _co_1896 += 1
        kiem(f"“{cau}” có câu cảnh báo phạm vi", "1896" in r["reply"] and "rộng hơn phường" in r["reply"])
kiem("có ít nhất một câu lấy từ địa chí 1896", _co_1896 >= 1, str(_co_1896))

# ═══ 9. Xã giao & vỏ bọc ═══
nhom("9. Xã giao và trường hợp biên")
kiem("chào hỏi", hoi("xin chào")["intent"] == "greeting")
kiem("cảm ơn", hoi("cảm ơn bạn nhé")["intent"] == "thanks")
kiem("hỏi bot là ai", hoi("bạn là ai")["intent"] == "help")
kiem("câu rỗng không nổ", hoi("")["matched"] is True)
kiem("câu chỉ có khoảng trắng không nổ", hoi("    ")["matched"] is True)
kiem("câu rất dài không nổ", isinstance(hoi("a" * 3000)["reply"], str))
kiem("gõ KHÔNG DẤU vẫn ra", hoi("nui Quy Son hinh gi")["matched"])
kiem("gõ SAI CHÍNH TẢ vẫn ra", hoi("nui Quy Sonn hinh gi")["matched"])
kiem("mọi câu trả lời đều có gợi ý tiếp", all(hoi(c)["suggestions"] for c, _ in PHAI_TRA_LOI[:3]))

# ═══ 10. Hai đường nạp phải cho ra như nhau ═══
#
# Phép kiểm mạnh nhất về đồng bộ, nhưng cần máy chủ Node đang chạy nên tự bỏ
# qua khi không có — bộ kiểm này phải chạy được cả lúc ngoại tuyến.
nhom("10. API và tệp JSON phải cho ra như nhau")
kho_api = dung_kho(API)
if kho_api.nguon != "api":
    if not CHI_HONG:
        print("  … bỏ qua: máy chủ Node chưa chạy (`npm run dev`)")
else:
    lech = abs(len(kho_tep.doan) - len(kho_api.doan)) / max(len(kho_api.doan), 1)
    kiem(
        "hai đường lệch không quá 5%",
        lech <= 0.05,
        f"API {len(kho_api.doan)} đoạn · tệp {len(kho_tep.doan)} đoạn · lệch {lech * 100:.1f}%",
    )
    _a: dict[str, int] = {}
    _b: dict[str, int] = {}
    for d in kho_api.doan:
        _a[d.loai] = _a.get(d.loai, 0) + 1
    for d in kho_tep.doan:
        _b[d.loai] = _b.get(d.loai, 0) + 1
    kiem("hai đường có cùng các loại nội dung", set(_a) == set(_b), f"chênh: {set(_a) ^ set(_b)}")
    # Từng loại một: hụt hẳn một loại thì tổng vẫn có thể trong ngưỡng 5%.
    for k in sorted(set(_a) | set(_b)):
        x, y = _a.get(k, 0), _b.get(k, 0)
        kiem(f"loại {k} khớp (API {x} · tệp {y})", abs(y - x) <= max(3, x * 0.1))

print(f"\n{'✗' if hong else '✓'} {dat} đạt · {hong} hỏng")
raise SystemExit(1 if hong else 0)
