"""Bộ máy trả lời — ghép đoạn tìm được thành câu trả lời có nguồn.

── NGUYÊN TẮC KHÔNG BỊA ────────────────────────────────────────────────────
Trợ lý này KHÔNG sinh ra chữ mới. Mọi câu trả lời là một hoặc vài ĐOẠN CÓ THẬT
lấy nguyên văn từ dữ liệu của phường, kèm tên bản ghi và đường dẫn để người hỏi
tự kiểm. Phần duy nhất do máy viết là câu dẫn ("Theo hồ sơ …") và lời từ chối.

Không đạt ngưỡng thì nói thẳng là chưa biết. Thà chịu một câu "mình chưa có
thông tin này" còn hơn một câu nghe rất trôi chảy mà sai — đây là cổng thông tin
chính thức của phường.
"""

from __future__ import annotations

import time

from .khotritthuc import API_MAC_DINH, dung_kho
from .timkiem import ChiMuc
from .vitext import chuan, co_cum

TEN = "Trợ lý Đông Triều (Python)"
TTL = 300  # giây — dựng lại kho sau 5 phút, giống bản JS

# Ngưỡng nhận câu trả lời.
#
# ── VÌ SAO ĐỘ PHỦ PHẢI CAO ĐẾN THẾ ────────────────────────────────────────
# Bản này xếp hạng ĐOẠN chứ không xếp hạng bản ghi, nên không có tín hiệu "câu
# hỏi gọi đúng tên mục nào" mạnh như bản JS. Cái thay thế là đòi câu hỏi phải
# được đoạn đó phủ gần hết.
#
# Ngưỡng 0,5 từng cho ra hai câu trả lời sai thật:
#   · "thủ đô nước Pháp là gì" → hồ sơ chùa Quỳnh Lâm, chỉ vì đoạn đó có chữ
#     "nước ta" và "Pháp Loa" — phủ 2/3 mà vẫn đủ qua.
#   · "làng nào giỏi đấu vật" → đặc sản **Khoai lang làng Trạo**, chỉ vì chữ
#     "làng" nằm trong tên món.
# Ở mức 0,75 cả hai đều bị loại, còn các câu hỏi thật thì vẫn phủ 3/3 hoặc 4/4.
DIEM_NHAN = 3.0
PHU_NHAN = 0.75


def _nhan_duoc(r) -> bool:
    """Ba cửa phải qua hết, mỗi cửa chặn một lớp lỗi khác nhau.

      · điểm BM25    — đoạn phải thật sự liên quan
      · độ phủ       — câu hỏi phải được đoạn đó phủ gần hết
      · cụm hai tiếng — từ ghép trong câu hỏi phải đứng LIỀN NHAU trong đoạn

    Cửa thứ ba là cửa duy nhất chặn được "ai là tổng thống Hoa Kỳ": câu đó phủ
    tới 3/4 một đoạn tả kiến trúc chùa nhờ bốn tiếng "tổng · thông · hoa · kỷ"
    nằm rải rác, nhưng không đoạn nào có "tổng thống" hay "hoa kỳ" đứng liền.

    Câu hỏi một tiếng ("Ngoạ Vân") không rút ra được cụm nào — lúc đó bỏ qua
    cửa này, vì đòi một điều không tồn tại thì thành ra không bao giờ trả lời.
    """
    if r.cum_can and r.so_cum == 0:
        return False
    return r.goi_ten or (r.diem >= DIEM_NHAN and r.do_phu >= PHU_NHAN)

_kho = None
_chi_muc: ChiMuc | None = None
_api = API_MAC_DINH


def nap(api: str = API_MAC_DINH, ep: bool = False, ep_tep: bool = False):
    """Lấy kho tri thức, dựng lại khi quá hạn hoặc khi bị ép.

    `ep_tep` bỏ qua API, đọc thẳng tệp gieo dữ liệu — dùng để chạy ngoại tuyến
    và để bộ kiểm đối chiếu hai nguồn với nhau.
    """
    global _kho, _chi_muc, _api
    _api = api
    if ep or ep_tep or _kho is None or time.time() - _kho.luc > TTL:
        _kho = dung_kho(api, ep_tep=ep_tep)
        _chi_muc = ChiMuc(_kho.doan)
    return _kho, _chi_muc


GOI_Y = [
    "Địa chí 1896 chép Đông Triều có núi nào?",
    "Khu phố Mỹ Cụ xưa tên gì?",
    "Chùa Quỳnh Lâm do ai dựng?",
    "Đông Triều có bao nhiêu khu phố?",
]


def _chao():
    return {
        "intent": "greeting",
        "matched": True,
        "reply": (
            f"Xin chào 👋 Mình là {TEN}.\n\n"
            "Mình trả lời bằng cách trích NGUYÊN VĂN một đoạn có thật trong dữ liệu của phường — "
            "hồ sơ di tích, lịch lễ hội, danh sách khu phố, và “Đông Triều huyện địa chí” năm 1896. "
            "Mình không tự viết thêm, nên câu nào không có trong dữ liệu thì mình nói là chưa biết."
        ),
        "links": [],
        "suggestions": GOI_Y,
    }


def _tro_giup(kho):
    theo_loai: dict[str, int] = {}
    for d in kho.doan:
        theo_loai[d.loai] = theo_loai.get(d.loai, 0) + 1
    dong = "\n".join(f"• {k}: {v} đoạn" for k, v in sorted(theo_loai.items(), key=lambda x: -x[1]))
    return {
        "intent": "help",
        "matched": True,
        "reply": (
            f"Mình đang giữ **{len(kho.doan)} đoạn** tra cứu được, lấy từ "
            f"{'API của máy chủ' if kho.nguon == 'api' else 'tệp dữ liệu gieo sẵn (máy chủ chưa chạy)'}:\n\n"
            f"{dong}\n\nCứ hỏi thẳng bằng tiếng Việt, có dấu hay không dấu đều được."
        ),
        "links": [],
        "suggestions": GOI_Y,
    }


NHAN_LOAI = {
    "heritage": "hồ sơ di tích",
    "attraction": "hồ sơ điểm đến",
    "festival": "hồ sơ lễ hội",
    "cuisine": "hồ sơ đặc sản",
    "restaurant": "danh sách quán ăn",
    "lodging": "danh sách nơi lưu trú",
    "article": "bài viết",
    "khu_pho": "danh sách khu phố",
    "vung_dat": "bối cảnh vùng đất",
    "gioi_thieu": "phần giới thiệu của phường",
    "dia_chi": "Đông Triều huyện địa chí (1896)",
}

# Nguồn 1896 nói về HUYỆN Đông Triều thuộc Hải Dương — 5 tổng 52 xã thôn, gồm cả
# Yên Tử và Mạo Khê. Trích một đoạn từ đó mà không nói rõ thì người hỏi sẽ tưởng
# đó là phường mình. Cùng lý do với `dauNguonXua` bên bản JavaScript.
CANH_BAO_XUA = (
    "_Địa danh trong sách là của huyện Đông Triều thuộc Hải Dương năm 1896, "
    "rộng hơn phường Đông Triều hiện nay rất nhiều._"
)


def hoi(cau: str, api: str = API_MAC_DINH) -> dict:
    """Trả lời một câu hỏi. Cấu trúc kết quả khớp với `POST /api/chat` của Node."""
    cau = str(cau or "").strip()[:500]
    if not cau:
        return _chao()

    kho, chi_muc = nap(api)
    q = chuan(cau)

    if co_cum(q, "xin chao", "chao ban", "chao bot", "hello", "hi", "alo") or q in {"chao", "hi", "hello"}:
        return _chao()
    if co_cum(q, "cam on", "thanks", "thank you"):
        return {"intent": "thanks", "matched": True, "reply": "Rất vui được giúp bạn 😊", "links": [], "suggestions": GOI_Y}
    if co_cum(q, "ban la ai", "ban biet gi", "giup duoc gi", "ban lam duoc gi", "help", "huong dan"):
        return _tro_giup(kho)

    kq = chi_muc.tim(cau, so_luong=8)
    if not kq:
        return _khong_biet([])

    # Lấy đoạn ĐIỂM CAO NHẤT MÀ ĐẠT NGƯỠNG, không phải cứ đoạn đầu bảng.
    #
    # Xét mỗi đoạn đầu bảng thì "làng nào giỏi đấu vật" bị từ chối oan: đoạn đúng
    # (Phong tục · Lâm Xá · Quế Cức) xếp thứ hai, còn đứng đầu là một đoạn điểm
    # cao hơn nhưng độ phủ thấp. Bảng đã sắp theo điểm nên đoạn đầu tiên vượt
    # ngưỡng vẫn là đoạn tốt nhất trong số các đoạn dùng được.
    dat = (r for r in kq if _nhan_duoc(r))
    tot = next(dat, None)
    if tot is None:
        return _khong_biet(kq)

    # Gộp thêm các đoạn CÙNG bản ghi và cùng mục — một mục dài bị cắt làm đôi thì
    # trả nửa đầu rồi bỏ nửa sau là câu trả lời cụt.
    cung = [r for r in kq if r is not tot and r.doan.tieu_de == tot.doan.tieu_de and r.doan.muc == tot.doan.muc][:2]
    than = "\n\n".join([tot.doan.noi_dung] + [r.doan.noi_dung for r in cung])

    nhan = NHAN_LOAI.get(tot.doan.loai, "dữ liệu của phường")
    dau = f"📄 Theo **{nhan}** — {tot.doan.tieu_de} · _{tot.doan.muc}_:"
    duoi = f"\n\n{CANH_BAO_XUA}" if tot.doan.loai == "dia_chi" else ""

    # Đoạn liên quan ở bản ghi KHÁC — để người hỏi biết còn chỗ nào nữa mà xem.
    da_co = {(tot.doan.tieu_de, tot.doan.muc)} | {(r.doan.tieu_de, r.doan.muc) for r in cung}
    khac = [r for r in kq if (r.doan.tieu_de, r.doan.muc) not in da_co][:3]
    them = ""
    if khac:
        them = "\n\nCòn thấy ở:\n" + "\n".join(f"• {r.doan.tieu_de} — {r.doan.muc}" for r in khac)

    lien_ket = []
    for r in [tot, *khac]:
        if r.doan.url and not any(l["url"] == r.doan.url for l in lien_ket):
            lien_ket.append({"label": r.doan.tieu_de, "url": r.doan.url})

    return {
        "intent": f"doan_{tot.doan.loai}",
        "matched": True,
        "reply": f"{dau}\n\n{than}{duoi}{them}",
        "links": lien_ket[:4],
        "suggestions": GOI_Y,
        "nguon": {"loai": tot.doan.loai, "tieuDe": tot.doan.tieu_de, "muc": tot.doan.muc, "diem": round(tot.diem, 2)},
    }


def _khong_biet(gan):
    return {
        "intent": "fallback",
        "matched": False,
        "reply": (
            "Xin lỗi, mình chưa có thông tin này trong dữ liệu của phường 😔\n\n"
            "Mình chỉ trích lại những gì có thật trong hồ sơ di tích, lịch lễ hội, danh sách khu phố "
            "và địa chí 1896, nên có những câu mình đành chịu."
            + ("\n\nCó thể bạn đang tìm một trong những mục dưới đây?" if gan else "")
        ),
        "links": [
            {"label": r.doan.tieu_de, "url": r.doan.url} for r in gan[:3] if r.doan.url
        ],
        "suggestions": GOI_Y,
    }
