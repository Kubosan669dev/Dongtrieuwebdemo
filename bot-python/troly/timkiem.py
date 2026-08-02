"""Xếp hạng BM25 trên các đoạn — thuần Python, không thư viện ngoài.

Cùng công thức với `server/src/services/retrieval.js` nhưng xếp hạng ĐOẠN thay vì
cả bản ghi, nên hệ số chuẩn hoá độ dài (B) cao hơn: các đoạn đã gần bằng nhau về
độ dài, đoạn dài hơn không nên được lợi thế chỉ vì chứa nhiều từ hơn.
"""

from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass

from .khotritthuc import Doan
from .vitext import _BANG_DONG_NGHIA, chuan, khoang_cach_sua, mo_rong, tach_tu

K1 = 1.4  # hệ số bão hoà tần suất
B = 0.75  # mức chuẩn hoá theo độ dài đoạn

# Ưu tiên mặc định theo loại nguồn. Hồ sơ di tích là bản ghi gốc của cổng nên
# thắng bài viết; địa chí 1896 hơi thấp hơn vì đó là tư liệu bổ trợ — hỏi "chùa
# Ngọc Thanh ở đâu" thì phải ra địa chỉ hôm nay, không phải câu thơ đời Trần.
UU_TIEN = {
    "heritage": 1.30,
    "attraction": 1.20,
    "cuisine": 1.15,
    "festival": 1.10,
    "khu_pho": 1.10,
    "restaurant": 1.05,
    "lodging": 1.05,
    "vung_dat": 1.05,
    "dia_chi": 1.00,
    "gioi_thieu": 0.95,
    "article": 0.70,
}


@dataclass
class KetQua:
    doan: Doan
    diem: float
    do_phu: float  # bao nhiêu phần từ khoá người dùng gõ có mặt trong đoạn
    goi_ten: bool  # câu hỏi có gọi đúng tên bản ghi không
    do_hiem: float  # từ hiếm nhất mà đoạn này khớp được, tính bằng IDF
    so_cum: int  # số cụm hai tiếng của câu hỏi có mặt LIỀN NHAU trong đoạn
    cum_can: int  # tổng số cụm hai tiếng rút được từ câu hỏi


class ChiMuc:
    def __init__(self, doan: list[Doan]) -> None:
        self.muc: list[tuple[Doan, Counter, int]] = []
        self.df: Counter = Counter()
        for d in doan:
            tf = Counter(d.tu)
            self.muc.append((d, tf, sum(tf.values())))
            self.df.update(tf.keys())
        self.n = len(self.muc) or 1
        self.dai_tb = sum(m[2] for m in self.muc) / self.n
        self.tu_vung = set(self.df)

    def _idf(self, t: str) -> float:
        return math.log(1 + (self.n - self.df[t] + 0.5) / (self.df[t] + 0.5))

    def _sua_chinh_ta(self, t: str) -> tuple[str, float] | None:
        """Từ gõ sai → từ gần nhất trong từ vựng. Từ ngắn thì bỏ qua: sửa dễ sai hơn đúng."""
        if len(t) < 4:
            return None
        toi_da = 1 if len(t) <= 5 else 2
        tot, d_tot = None, toi_da + 1
        for v in self.tu_vung:
            if abs(len(v) - len(t)) > toi_da:
                continue
            d = khoang_cach_sua(t, v, toi_da)
            if d < d_tot:
                tot, d_tot = v, d
                if d == 1:
                    break
        return (tot, 0.6 if d_tot == 1 else 0.35) if d_tot <= toi_da else None

    def tim(self, cau_hoi: str, so_luong: int = 5, diem_toi_thieu: float = 1.0) -> list[KetQua]:
        goc = tach_tu(cau_hoi)
        if not goc:
            return []
        cau_chuan = chuan(cau_hoi)

        # ── CỤM HAI TIẾNG ─────────────────────────────────────────────────────
        # Tiếng Việt tách theo âm tiết, nên túi từ rất dễ bị đánh lừa: "ai là
        # TỔNG THỐNG HOA KỲ" chạm được cả bốn tiếng "tổng", "thông", "hoa", "kỷ"
        # rải rác trong một đoạn tả kiến trúc chùa, và phủ tới 3/4.
        #
        # Nhưng "tổng thống" và "Hoa Kỳ" là hai TỪ GHÉP — chúng phải đứng LIỀN
        # NHAU thì mới mang nghĩa. Câu hỏi thật thì luôn có ít nhất một cụm đứng
        # liền: "Quy Sơn", "Trạo Hà", "Quỳnh Lâm", "đấu vật", "Đông Triều".
        # Đây là tín hiệu độc lập với BM25 lẫn độ phủ, và là tín hiệu duy nhất
        # trong ba cái chặn được đúng lớp lỗi này.
        cum = [f"{goc[i]} {goc[i + 1]}" for i in range(len(goc) - 1)]

        # Từ NGƯỜI DÙNG THỰC SỰ GÕ → dùng để tính độ phủ.
        #
        # Mỗi từ gõ ra ứng với MỘT TẬP từ chấp nhận được: chính nó, bản sửa chính
        # tả, và các từ đồng nghĩa. Đoạn nào chứa bất kỳ từ nào trong tập đó thì
        # tính là đã phủ — nếu chỉ nhận đúng từ gõ ra thì câu "vì sao GỌI là Mỹ
        # Cụ" không bao giờ phủ được đoạn viết "đặt TÊN là Mỹ Cụ".
        da_giai: dict[str, set[str]] = {}
        trong_so: dict[str, float] = {}
        for t in goc:
            nhan: set[str] = set()
            if t in self.df:
                nhan.add(t)
                trong_so[t] = max(trong_so.get(t, 0), 1.0)
            else:
                sua = self._sua_chinh_ta(t)
                if sua:
                    nhan.add(sua[0])
                    trong_so[sua[0]] = max(trong_so.get(sua[0], 0), sua[1])
            for dn in _BANG_DONG_NGHIA.get(t, ()):
                if dn in self.df:
                    nhan.add(dn)
            if nhan:
                da_giai[t] = nhan

        # Từ đồng nghĩa giúp XẾP HẠNG với trọng số thấp hơn từ gõ thẳng.
        for t in mo_rong(goc):
            if t in self.df and t not in trong_so:
                trong_so[t] = 0.55
        if not trong_so:
            return []

        ra: list[KetQua] = []
        for d, tf, dai in self.muc:
            diem = 0.0
            for tu, qw in trong_so.items():
                f = tf.get(tu)
                if not f:
                    continue
                diem += qw * self._idf(tu) * (f * (K1 + 1)) / (f + K1 * (1 - B + B * dai / self.dai_tb))
            if diem <= 0:
                continue

            cham = sum(1 for nhan in da_giai.values() if any(tu in tf for tu in nhan))
            do_phu = cham / len(goc)

            # ── TỪ HIẾM NHẤT MÀ ĐOẠN NÀY KHỚP ĐƯỢC ──────────────────────────
            # Câu ngoài phạm vi vẫn khớp được kha khá, nhưng chỉ khớp toàn tiếng
            # phổ thông: "ai là tổng thống Hoa Kỳ" chạm "tổng", "thông", "hoa",
            # "kỷ" — tiếng nào cũng có mặt ở hàng trăm đoạn nên chẳng nói lên
            # điều gì. Câu hỏi thật thì luôn có ít nhất một tiếng hiếm neo lại:
            # "Quỳnh", "Trạo", "vằn", "nhãn". Đây là tín hiệu ĐỘC LẬP với điểm
            # BM25 và với độ phủ, nên chặn được đúng lớp lỗi mà hai cái kia bỏ sót.
            do_hiem = max(
                (self._idf(tu) for nhan in da_giai.values() for tu in nhan if tu in tf),
                default=0.0,
            )

            # Gọi đúng tên bản ghi ("chùa Mỹ Cụ ở đâu") → ưu tiên mạnh, NHƯNG
            # mức ưu tiên co lại theo độ phủ. Thưởng cứng 2,6 lần thì câu "khu
            # phố Trạo Hà XƯA TÊN gì" ra số hộ của khu phố hôm nay: đoạn đó mang
            # đúng cái tên được gọi nên ăn trọn phần thưởng, dù bỏ sót hai chữ
            # mang cả ý câu hỏi. Gọi đúng tên mà không trả lời được phần còn lại
            # thì không đáng được thưởng như gọi đúng tên và trả lời trọn vẹn.
            goi_ten = len(d.tieu_de_chuan) >= 4 and d.tieu_de_chuan in cau_chuan
            if goi_ten:
                diem *= 1 + 1.6 * do_phu
            diem *= UU_TIEN.get(d.loai, 1.0)

            # ── ĐỘ PHỦ NHÂN VÀO ĐIỂM, VÀ NHÂN BÌNH PHƯƠNG ────────────────────
            # Chỉ dùng độ phủ làm ngưỡng chặn là chưa đủ, vì bảng vẫn sắp theo
            # điểm thô. "Khu phố Trạo Hà XƯA TÊN gì" từng ra số hộ và diện tích
            # của khu phố hôm nay: đoạn đó chứa ba lần chữ "Khu phố Trạo Hà" nên
            # điểm thô gấp đôi, dù bỏ sót đúng hai từ mang cả ý câu hỏi là "xưa"
            # và "tên". Bình phương thì một đoạn phủ 2/3 chỉ còn 44% điểm, đủ để
            # đoạn phủ trọn vẹn vượt lên.
            diem *= do_phu**2

            # Cụm không chỉ dùng làm cửa chặn mà còn tính vào điểm: khớp được
            # NHIỀU cụm nghĩa là đoạn nói đúng chuyện đang hỏi.
            #
            # "ai ĐỖ BẢNG NHÃN ĐỜI TRẦN" từng ra mục *Trần Cẩn · Trần Vũ* thay vì
            # *Lê Hiển Phủ* — chỉ vì chữ "Trần" nằm trong tên mục nên được nhân
            # ba, đủ để thắng sát nút (6,49 so với 6,43). Nhưng đoạn Lê Hiển Phủ
            # khớp hai cụm ("bảng nhãn" và "đời Trần"), đoạn kia chỉ khớp một.
            so_cum = sum(1 for c in cum if f" {c} " in d.van_chuan)
            if cum:
                diem *= 1 + 0.5 * so_cum / len(cum)

            ra.append(KetQua(d, diem, do_phu, goi_ten, do_hiem, so_cum, len(cum)))

        ra.sort(key=lambda r: r.diem, reverse=True)
        return [r for r in ra if r.diem >= diem_toi_thieu][:so_luong]
