"""Kho tri thức của trợ lý Python — CẮT THÀNH ĐOẠN, không phải cả hồ sơ.

── VÌ SAO KHÁC BẢN JAVASCRIPT ────────────────────────────────────────────────
Bản JS (`server/src/services/knowledge.js`) lấy mỗi bản ghi làm MỘT tài liệu, rồi
mỗi ý định có một câu trả lời viết tay. Cách đó rất tốt cho câu hỏi lặp đi lặp
lại ("hôm nay nên đi đâu", "quán nào mở cửa"), nhưng chịu thua câu hỏi lẻ nằm sâu
trong một đoạn văn dài — mà địa chí 1896 thì toàn văn dài.

Bản Python cắt mọi thứ thành ĐOẠN ngắn rồi xếp hạng từng đoạn. Câu "chùa Quỳnh
Lâm do ai dựng" vì thế trả về đúng câu có chữ "Nguyễn Minh Không triều Lý dựng
lên", thay vì cả hồ sơ rồi để người đọc tự dò.

── MỘT NGUỒN DỮ LIỆU DUY NHẤT ────────────────────────────────────────────────
Đọc qua API công khai của máy chủ Node (`GET /api/…`), KHÔNG nối thẳng vào cơ sở
dữ liệu và KHÔNG giữ bản sao riêng. Quản trị viên sửa nội dung trong trang quản
trị là trợ lý Python đổi theo, giống hệt bản JS. Khi máy chủ Node chưa chạy thì
lùi về đọc các tệp trong `server/prisma/seed-data/` để còn dùng được ngoại tuyến.

Trợ lý KHÔNG BAO GIỜ sinh ra chữ mới: câu trả lời luôn là một đoạn có thật, kèm
tên bản ghi và đường dẫn để người hỏi tự kiểm.
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

from .vitext import chuan, tach_tu

API_MAC_DINH = "http://localhost:4000/api"
THU_MUC_DU_PHONG = Path(__file__).resolve().parents[2] / "server" / "prisma" / "seed-data"

DAI_TOI_DA = 340  # ký tự tối đa một đoạn
NGAN_TOI_THIEU = 60  # đoạn ngắn hơn mức này thì gộp với đoạn sau


@dataclass
class Doan:
    """Một đoạn tra cứu được, luôn biết mình từ đâu ra."""

    id: str
    loai: str  # heritage | festival | cuisine | dia_chi | vung_dat | khu_pho…
    tieu_de: str
    muc: str  # tên mục trong bản ghi gốc: "Lịch sử", "Núi non"…
    noi_dung: str
    url: str = ""
    tu: list[str] = field(default_factory=list)
    tieu_de_chuan: str = ""
    van_chuan: str = ""

    def __post_init__(self) -> None:
        # Tên bản ghi được nhân ba: hỏi đúng tên thì phải thắng hẳn một đoạn chỉ
        # tình cờ nhắc tới tên đó ở giữa bài.
        self.tu = tach_tu(f"{self.tieu_de} {self.tieu_de} {self.tieu_de} {self.muc} {self.noi_dung}")
        self.tieu_de_chuan = chuan(re.sub(r"[（(][^)）]*[)）]", "", self.tieu_de))
        # Giữ nguyên THỨ TỰ chữ (không bỏ hư từ) để còn dò được cụm hai tiếng
        # đứng liền nhau — xem `so_cum` trong timkiem.py. Phải đi qua `tach_tu`
        # chứ không phải `chuan`, vì cụm lấy từ câu hỏi đã gộp y↔i: dùng `chuan`
        # thì cụm "mi cu" (Mỹ Cụ) không bao giờ khớp chuỗi "my cu" trong bài.
        self.van_chuan = " " + " ".join(
            tach_tu(f"{self.tieu_de} {self.muc} {self.noi_dung}", giu_tu_dem=True)
        ) + " "


def _lam_sach(s) -> str:
    """Bỏ thẻ HTML, gom khoảng trắng."""
    if not isinstance(s, str):
        return ""
    s = re.sub(r"<figure[\s\S]*?</figure>", " ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = s.replace("&nbsp;", " ").replace("&amp;", "&")
    return re.sub(r"\s+", " ", s).strip()


def cat_doan(chuoi: str) -> list[str]:
    """Cắt một đoạn văn dài thành các đoạn vừa đọc.

    Cắt theo câu chứ không theo số ký tự: cắt cứng giữa chừng thì đoạn nào cũng
    cụt một nửa ý, mà trợ lý này trả nguyên văn nên câu cụt là câu trả lời hỏng.
    """
    chuoi = _lam_sach(chuoi)
    if not chuoi:
        return []
    cau = re.split(r"(?<=[.!?;])\s+|\n+", chuoi)
    ra: list[str] = []
    dem = ""
    for c in cau:
        c = c.strip()
        if not c:
            continue
        if not dem:
            dem = c
        elif len(dem) < NGAN_TOI_THIEU or len(dem) + len(c) + 1 <= DAI_TOI_DA:
            dem = f"{dem} {c}"
        else:
            ra.append(dem)
            dem = c
    if dem:
        ra.append(dem)
    return ra


class Kho:
    """Toàn bộ đoạn tra cứu được, kèm thời điểm dựng để biết lúc nào nên dựng lại."""

    def __init__(self, doan: list[Doan], nguon: str, cai_dat: dict) -> None:
        self.doan = doan
        self.nguon = nguon  # 'api' hay 'tep'
        self.cai_dat = cai_dat
        self.luc = time.time()


# ── Lấy dữ liệu ────────────────────────────────────────────────────────────


def _goi_api(api: str, duong: str, giay: float) -> dict | None:
    try:
        req = urllib.request.Request(
            f"{api}{duong}", headers={"User-Agent": "TroLyDongTrieu-Python/1.0"}
        )
        with urllib.request.urlopen(req, timeout=giay) as r:
            return json.loads(r.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return None


def _doc_tep(ten: str):
    try:
        return json.loads((THU_MUC_DU_PHONG / ten).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


# ── Tệp gieo dữ liệu mà đường ngoại tuyến ĐỌC ──────────────────────────────
# Danh sách này có phép kiểm canh (xem `kiemtra.py`, muc 3): thêm tệp mới vào
# `server/prisma/seed-data/` mà quên khai ở đây thì bo kiem đỏ, thay vì trợ lý
# lặng lẽ thiếu dữ liệu mà không ai biết.
TEP_DOC = {
    "about.json", "khu-pho.json", "vung-dat.json", "dia-chi-1896.json", "hanh-chinh.json",
    "van-ban.json", "tthc-dat-dai.json", "tthc-mau-don.json",
    "heritages.json", "festivals.json", "festival-details.json", "cuisines.json",
    "attractions.json", "articles.json", "restaurants.json", "lodgings.json",
    "places.json",
}
# Cố ý bỏ qua, kèm lý do — để phép kiểm chống trôi không báo nhầm.
TEP_BO_QUA: dict[str, str] = {}


def _ds(x):
    """Tệp có thể là mảng thẳng, hoặc object bọc một mảng."""
    if isinstance(x, list):
        return x
    if isinstance(x, dict):
        for v in x.values():
            if isinstance(v, list):
                return v
    return []


def _khoa_ten(s: str) -> str:
    """Khoá ghép theo tên cơ sở — bỏ dấu, bỏ tiền tố loại hình.

    `places.json` ghi tên như trên Google Maps ("Nhà nghỉ Hải Yến"), còn
    `lodgings.json` ghi tên đăng ký với UBND ("Hải Yến"). Không cắt tiền tố thì
    hai bên thành hai cơ sở khác nhau và kho bị đếm trùng.
    """
    t = chuan(s)
    for tien_to in ("nha hang ", "nha nghi ", "khach san ", "quan an ", "quan ", "homestay ", "cafe ", "ca phe "):
        if t.startswith(tien_to):
            t = t[len(tien_to):]
    return t.strip()


def _gop_co_so(co_ban: list, places: list, target: str) -> list:
    """Gộp lớp khảo sát 2026 (`places.json`) lên trên tệp cơ sở.

    `seed.js` làm đúng việc này khi gieo dữ liệu: `places.json` là lớp khảo sát
    mới, ghép theo tên lên bản ghi cũ, và tạo mới cơ sở nào chưa có. Đọc mỗi
    `restaurants.json` + `lodgings.json` thì trợ lý chỉ thấy 24 cơ sở trong khi
    cơ sở dữ liệu có 55 — thiếu hơn một nửa.

    Ở đây chỉ GỘP TRƯỜNG để tra cứu, không cần dựng lại toàn bộ luật ưu tiên
    của `seed.js`: trợ lý đọc chữ, không ghi lại vào đâu cả.
    """
    theo_ten = {_khoa_ten(x.get("name", "")): dict(x) for x in co_ban if x.get("name")}
    for p in places:
        if p.get("target") != target or not p.get("name"):
            continue
        k = _khoa_ten(p["name"])
        cu = theo_ten.get(k)
        if cu is None:
            theo_ten[k] = dict(p)
            continue
        # Giữ TÊN của bản ghi cũ — đó là tên đăng ký với UBND, đáng tin hơn tên
        # hiển thị trên Google Maps. Cùng quy tắc với `seed.js`.
        gop = {**{a: b for a, b in p.items() if b not in (None, "", [])}, **{"name": cu["name"]}}
        theo_ten[k] = {**cu, **gop}
    return list(theo_ten.values())


def _lay_du_lieu(api: str, giay: float, ep_tep: bool = False) -> tuple[dict, str]:
    """Ưu tiên API đang chạy; không được thì đọc tệp gieo dữ liệu."""
    cai_dat = None if ep_tep else _goi_api(api, "/settings", giay)
    if cai_dat is not None:
        du = {"settings": cai_dat.get("settings", {})}
        for ten in ("heritages", "festivals", "cuisines", "attractions", "articles", "restaurants", "lodgings"):
            kq = _goi_api(api, f"/{ten}?take=200", giay)
            du[ten] = (kq or {}).get("items", [])
        return du, "api"

    # ── Ngoại tuyến: đọc thẳng các tệp gieo dữ liệu ──
    # Hai tệp dưới đây KHÔNG phải bảng độc lập mà là lớp bổ sung, `seed.js` gộp
    # chúng vào lúc gieo. Không gộp lại ở đây thì đường ngoại tuyến hụt đúng
    # phần nội dung dày nhất.
    places = _ds(_doc_tep("places.json"))
    chi_tiet_le_hoi = {d["slug"]: d for d in _ds(_doc_tep("festival-details.json")) if d.get("slug")}

    le_hoi = []
    for f in _ds(_doc_tep("festivals.json")):
        ct = chi_tiet_le_hoi.get(f.get("slug"))
        le_hoi.append({**f, **{a: b for a, b in (ct or {}).items() if b not in (None, "", [])}})

    return (
        {
            "settings": {
                k: v
                for k, v in (
                    ("about", _doc_tep("about.json")),
                    ("khuPho", _doc_tep("khu-pho.json")),
                    ("vungDat", _doc_tep("vung-dat.json")),
                    ("hanhChinh", _doc_tep("hanh-chinh.json")),
                    ("diaChi1896", _doc_tep("dia-chi-1896.json")),
                    ("vanBan", _doc_tep("van-ban.json")),
                    ("tthcDatDai", _doc_tep("tthc-dat-dai.json")),
                    ("tthcMauDon", _doc_tep("tthc-mau-don.json")),
                )
                if v is not None
            },
            "heritages": _ds(_doc_tep("heritages.json")),
            "festivals": le_hoi,
            "cuisines": _ds(_doc_tep("cuisines.json")),
            "attractions": _gop_co_so(_ds(_doc_tep("attractions.json")), places, "attraction"),
            "articles": _ds(_doc_tep("articles.json")),
            "restaurants": _gop_co_so(_ds(_doc_tep("restaurants.json")), places, "restaurant"),
            "lodgings": _gop_co_so(_ds(_doc_tep("lodgings.json")), places, "lodging"),
        },
        "tep",
    )


# ── Dựng đoạn ──────────────────────────────────────────────────────────────


def _them(ra: list[Doan], *, loai, tieu_de, muc, noi_dung, url="", stt=0) -> int:
    for i, d in enumerate(cat_doan(noi_dung)):
        ra.append(Doan(f"{loai}:{stt}:{muc}:{i}", loai, tieu_de, muc, d, url))
    return stt


def _tu_ban_ghi(ra: list[Doan], items, loai: str, duong: str, truong: dict[str, str]) -> None:
    for i, x in enumerate(items or []):
        ten = x.get("name") or x.get("title") or ""
        if not ten:
            continue
        slug = x.get("slug")
        url = f"{duong}/{slug}" if slug and duong.count("/") == 1 else duong
        for khoa, nhan in truong.items():
            gt = x.get(khoa)
            if isinstance(gt, list):
                gt = ". ".join(str(v) for v in gt if v)
            _them(ra, loai=loai, tieu_de=ten, muc=nhan, noi_dung=gt or "", url=url, stt=i)


def _tu_dia_chi(ra: list[Doan], dc: dict) -> None:
    """Địa chí 1896 — nguồn dày nhất, và là lý do bản Python cắt theo đoạn."""
    if not dc:
        return
    ten = dc.get("nguon") or "Đông Triều huyện địa chí"
    url = "/gioi-thieu#dia-chi-1896"

    def d(muc, noi_dung, stt=0):
        _them(ra, loai="dia_chi", tieu_de=ten, muc=muc, noi_dung=noi_dung, url=url, stt=stt)

    d("Xuất xứ", f"{ten} do {dc.get('tacGia', '')} chép, {dc.get('nienDai', '')}. Ký hiệu {dc.get('kyHieu', '')}. Trích từ {dc.get('trichTu', '')}.")
    pv = dc.get("phamVi") or {}
    if pv:
        d("Phạm vi", f"Huyện Đông Triều ngày xưa, năm 1896, có mấy tổng bao nhiêu xã: còn {pv.get('tong')} tổng ({', '.join(pv.get('tenTong') or [])}) với {pv.get('xaThon')} xã thôn, vốn trước đó là {pv.get('tongCu')} tổng {pv.get('xaCu')} xã. {pv.get('ghiChu', '')}")
    d("Phạm vi", dc.get("canhBao", ""), 1)
    tt = dc.get("thanhTri") or {}
    d("Thành trì", f"{tt.get('moTa', '')} {tt.get('thanhDat', '')}")

    for i, m in enumerate(dc.get("dienCach") or []):
        d(f"Diên cách · {m.get('moc', '')}", m.get("viec", ""), i)
    for i, n in enumerate(dc.get("nui") or []):
        d(f"Núi non · {n.get('ten', '')}", f"{n.get('ten', '')} ở {n.get('o', '')}. {n.get('moTa', '')} {n.get('cauNoi', '')}", i)
    for i, s in enumerate(dc.get("song") or []):
        d(f"Sông ngòi · {s.get('ten', '')}", f"{s.get('ten', '')}. {s.get('moTa', '')}", i)
    for i, c in enumerate(dc.get("coTich") or []):
        d(f"Cổ tích · {c.get('ten', '')}", f"{c.get('ten', '')} ở {c.get('o', '')}. {c.get('moTa', '')} {c.get('cauNoi', '')}", i)
    for i, n in enumerate(dc.get("nhanVat") or []):
        d(f"Nhân vật · {n.get('ten', '')}", f"{n.get('ten', '')}, người {n.get('que', '')}, {n.get('thoi', '')}. {n.get('moTa', '')}", i)
    for i, t in enumerate(dc.get("thoSan") or []):
        d(f"Thổ sản · {t.get('ten', '')}", f"Thổ sản {t.get('ten', '')} lấy ở {t.get('o', '')}. {t.get('moTa', '')}", i)
    for i, k in enumerate((dc.get("khuPhoXua") or {}).get("danhSach") or []):
        xua = k.get("xua") or "không có trong sách"
        # Câu này cố ý chứa cả "xưa" lẫn "tên": người dân hỏi "khu phố Trạo Hà
        # XƯA TÊN gì", mà đoạn khu phố hôm nay cũng có đủ chữ "khu phố Trạo Hà"
        # nên sẽ thắng nếu đoạn này không nói rõ nó đang trả lời chuyện tên xưa.
        d(f"Khu phố xưa · {k.get('khu', '')}", f"Khu phố {k.get('khu', '')} hôm nay, tên xưa là gì: địa chí 1896 chép là {xua}. {k.get('viec', '')}", i)
    for i, t in enumerate(dc.get("doiTen") or []):
        d(f"Đổi tên · {t.get('nay', '')}", f"Xã {t.get('nay', '')} vốn tên cũ là {t.get('xua', '')}. {t.get('ghiChu', '')}", i)

    pt = dc.get("phongTuc") or {}
    d("Phong tục", f"{pt.get('moTa', '')} {pt.get('hocHanh', '')}")
    for i, l in enumerate(pt.get("lang") or []):
        d(f"Phong tục · {l.get('ten', '')}", f"Làng {l.get('ten', '')} nổi trội về {l.get('noiTroi', '')}.", i)
    d("Kỹ nghệ", dc.get("kyNghe", ""))
    cho = ", ".join(c.get("ten", "") for c in dc.get("cho") or [])
    d("Chợ", f"Huyện có {len(dc.get('cho') or [])} cái chợ: {cho}. {dc.get('choGhiChu', '')}")
    d("Cầu", f"Huyện có {len(dc.get('cau') or [])} cây cầu: {', '.join(dc.get('cau') or [])}.")
    for i, h in enumerate(dc.get("hieuDinh") or []):
        d("Hiệu đính", f"Cổng sửa “{h.get('chua', '')}” thành “{h.get('sua', '')}”. {h.get('vi', '')}", i)


def _tu_cai_dat(ra: list[Doan], cd: dict) -> None:
    vd = cd.get("vungDat") or {}
    if vd:
        vt = vd.get("viTri") or {}
        _them(ra, loai="vung_dat", tieu_de="Vùng đất Đông Triều", muc="Vị trí",
              noi_dung=f"{vt.get('moTa', '')} Cách Hà Nội khoảng {vt.get('cachHaNoiKm', '')} km, cách Hạ Long khoảng {vt.get('cachHaLongKm', '')} km.",
              url="/gioi-thieu")
        vc = vd.get("vungCu") or {}
        if vc:
            _them(ra, loai="vung_dat", tieu_de="Vùng đất Đông Triều", muc="Số liệu thành phố cũ",
                  noi_dung=f"{vc.get('ten', '')} {vc.get('hieuLuc', '')}: {vc.get('dienTichKm2', '')} km², dân số {vc.get('danSo', '')} năm {vc.get('namDanSo', '')}. {vc.get('canhBao', '')}",
                  url="/gioi-thieu")
        for i, m in enumerate(vd.get("dongThoiGian") or []):
            _them(ra, loai="vung_dat", tieu_de="Vùng đất Đông Triều", muc=f"Mốc {m.get('moc', '')}",
                  noi_dung=m.get("viec", ""), url="/gioi-thieu", stt=i)
        for i, g in enumerate(vd.get("giaoThong") or []):
            _them(ra, loai="vung_dat", tieu_de="Vùng đất Đông Triều", muc="Giao thông", noi_dung=g, url="/gioi-thieu", stt=i)
        kt = vd.get("kinhTe") or {}
        if kt.get("coCau"):
            cc = ", ".join(f"{c['ten']} {c['phanTram']}%" for c in kt["coCau"])
            _them(ra, loai="vung_dat", tieu_de="Vùng đất Đông Triều", muc="Kinh tế",
                  noi_dung=f"Cơ cấu kinh tế năm {kt.get('nam', '')}: {cc}. Ngành chủ lực: {', '.join(kt.get('nganhChuLuc') or [])}.",
                  url="/gioi-thieu")

    hc = cd.get("hanhChinh") or {}
    if hc:
        # Mỗi đoạn phải TỰ ĐỦ NGHĨA: đường tìm kiếm ở đây chấm điểm từng đoạn
        # riêng lẻ, không có ngữ cảnh của đoạn bên cạnh. Nên đoạn nào cũng nhắc
        # lại "phường Đông Triều" và nhắc lại nguồn — nếu không, đoạn mã bưu
        # chính trả về đúng con số mà người đọc không biết đó là mã của ai.
        ht = hc.get("hopThanhTu") or {}
        if ht.get("danhSach"):
            ds = ", ".join(f"{d.get('ten', '')} ({d.get('phan', '')})" for d in ht["danhSach"])
            _them(ra, loai="hanh_chinh", tieu_de="Hành chính phường Đông Triều", muc="Sáp nhập, hợp thành",
                  noi_dung=f"Phường Đông Triều hiện nay được lập từ ngày {hc.get('hieuLucTu', '')} trên cơ sở sáp nhập {ht.get('tongSo', '')} đơn vị: {ds}. {ht.get('doiSoat', '')}",
                  url="/khu-pho")
        vb = hc.get("vanBan") or {}
        if vb.get("nghiQuyet"):
            _them(ra, loai="hanh_chinh", tieu_de="Hành chính phường Đông Triều", muc="Văn bản thành lập",
                  noi_dung=f"Việc lập phường Đông Triều căn cứ {vb.get('nghiQuyet', '')}, theo {vb.get('deAn', '')}. {vb.get('ghiChuSaiLech', '')}",
                  url="/khu-pho")
        # Hai đoạn dưới cố ý viết theo lối "nhắc lại câu hỏi rồi mới trả lời".
        #
        # Ba cửa của `_nhan_duoc` đo ĐỘ PHỦ câu hỏi trên đoạn, nên câu đầy đủ
        # kiểu "mã bưu chính CỦA PHƯỜNG LÀ BAO NHIÊU" bị rớt ở mức 0,50 trong
        # khi "mã bưu chính phường Đông Triều" đạt 1,00 — cùng một câu hỏi,
        # khác mỗi mấy tiếng đệm. Nới ngưỡng chung thì đụng cả 90 phép kiểm
        # hiện có, nên cách đúng là để đoạn tự chứa các tiếng đệm đó. Cùng thủ
        # pháp đã dùng ở đoạn "khu phố xưa tên là gì" phía trên.
        _them(ra, loai="hanh_chinh", tieu_de="Hành chính phường Đông Triều", muc="Mã hành chính",
              noi_dung=f"Mã bưu chính của phường Đông Triều là bao nhiêu: phường Đông Triều, tỉnh Quảng Ninh có mã bưu chính {hc.get('maBuuChinh', '')}, mã đơn vị hành chính là {hc.get('maDinhDanh', '')}, thuộc vùng kinh tế {hc.get('vungKinhTe', '')}. {hc.get('canhBaoNguon', '')}",
              url="/khu-pho")
        ts = hc.get("truSo") or {}
        if ts:
            cong = ", ".join(f"{c.get('ten', '')} {c.get('url', '')}" for c in hc.get("cong") or [])
            _them(ra, loai="hanh_chinh", tieu_de="Hành chính phường Đông Triều", muc="Trụ sở, cổng thông tin",
                  noi_dung=f"Trụ sở uỷ ban nhân dân phường Đông Triều đặt ở đâu: {ts.get('ten', '')} đặt tại {ts.get('diaDiem', '')}. Cổng thông tin điện tử của phường: {cong}. {ts.get('ghiChu', '')}",
                  url="/khu-pho")
        sl = hc.get("soLieuTheoNguon") or {}
        if sl:
            _them(ra, loai="hanh_chinh", tieu_de="Hành chính phường Đông Triều", muc="Đối chiếu diện tích, dân số",
                  noi_dung=f"Trang tra cứu ghi phường Đông Triều rộng {sl.get('dienTichKm2', '')} km², dân số {sl.get('danSo', '')} người năm {sl.get('namDanSo', '')}, mật độ {sl.get('matDoNguoiTrenKm2', '')} người/km². {sl.get('doiChieuVoiBangKhuPho', '')} {sl.get('viSao', '')}",
                  url="/khu-pho")

    vbs = cd.get("vanBan") or {}
    if vbs:
        ten_cq = {c.get("id"): c.get("ten", "") for c in vbs.get("coQuan") or []}
        ten_nhom = {n.get("id"): n.get("ten", "") for n in vbs.get("nhom") or []}
        for i, d in enumerate(vbs.get("danhSach") or []):
            # Số hiệu đọc không ra thì NÓI RA, không im lặng bỏ trống: người hỏi
            # trợ lý "quyết định xếp hạng chùa Mỹ Cụ số mấy" mà nhận về một câu
            # lấp lửng sẽ tưởng cổng chưa có văn bản đó, trong khi thật ra có bản
            # scan tải về được, chỉ mờ đúng ô số hiệu.
            cq = ten_cq.get(d.get("coQuan"), "")
            so = d.get("soHieu")
            # Hai lối diễn đạt, vì ghép thẳng "Quyết định số <chưa đọc được…>"
            # ra một câu không đọc nổi. Đoạn này là thứ trợ lý đọc nguyên văn cho
            # người dùng nghe, nên nó phải là tiếng Việt bình thường.
            # Tiêu đề PHẢI mang tên di tích, không chỉ số hiệu.
            #
            # Đường tìm kiếm cho tiêu đề trọng số cao nhất. Bản đầu để tiêu đề là
            # "Quyết định 606/QĐ-UBND" thôi, nên hỏi "quyết định xếp hạng CHÙA Mỹ
            # Cụ số mấy" lại trả về ĐÌNH Mỹ Cụ: cả hai đoạn cùng chứa "Mỹ Cụ" ở
            # phần thân, mà tiếng phân biệt duy nhất — chùa / đình — không có
            # trong tiêu đề của đoạn nào. Ghép `tenNgan` vào là chữ đó lên đúng
            # trường nặng ký nhất.
            #
            # Hai tiêu đề phải DỰNG THEO CÙNG MỘT KHUÔN, kể cả khi một bên thiếu
            # số hiệu. Bản trước để bên thiếu số là "Quyết định xếp hạng Chùa Mỹ
            # Cụ" còn bên có số là "Quyết định 606/QĐ-UBND — Đình Mỹ Cụ": tiếng
            # "xếp hạng" chỉ có ở một bên, thế là câu hỏi về ĐÌNH lại khớp mạnh
            # hơn vào tiêu đề của CHÙA. Cùng khuôn thì tiếng phân biệt còn lại
            # đúng là chùa / đình, tức đúng thứ người hỏi muốn phân biệt.
            ten_ngan = d.get("tenNgan", "")
            viec = "phê duyệt" if d.get("nhom") == "tu-bo" else "xếp hạng"
            tieu_de = (
                f"Quyết định {so} {viec} {ten_ngan}"
                if so
                else f"Quyết định {viec} {ten_ngan} ({d.get('ngayHienThi', '')})"
            )
            mo_dau = (
                f"Quyết định số {so} do {cq} ban hành ngày {d.get('ngayHienThi', '')}"
                if so
                else f"Quyết định do {cq} ban hành ngày {d.get('ngayHienThi', '')}, bản scan mờ không đọc ra số hiệu"
            )
            ky = f" Người ký: {d.get('nguoiKy')}." if d.get("nguoiKy") else ""
            thieu = d.get("chuaDocDuoc") or []
            luu_y = f" Bản scan chưa đọc được: {', '.join(thieu)}." if thieu else ""
            # Chi tiết dự án tu bổ (kinh phí, nguồn vốn, hạng mục) nằm trong dữ
            # liệu nhưng trước đó không vào đoạn, nên hỏi "hết bao nhiêu tiền"
            # trợ lý chịu thua trong khi con số có sẵn.
            da = d.get("duAn") or {}
            du_an = ""
            if da:
                # "hết bao nhiêu tiền" nằm sẵn trong đoạn — cùng thủ pháp với mã
                # bưu chính và trụ sở: cửa độ phủ đo cả tiếng đệm của câu hỏi.
                du_an = (
                    f" Dự án tu bổ này hết bao nhiêu tiền, kinh phí bao nhiêu:"
                    f" do {da.get('chuDauTu', '')} làm chủ đầu tư, kinh phí {da.get('kinhPhi', '')}"
                    f" từ {str(da.get('nguonVon', '')).lower()}, thực hiện {str(da.get('thoiGian', '')).lower()}"
                    f" trên diện tích {da.get('dienTich', '')}."
                    f" Các hạng mục: {', '.join(da.get('hangMuc') or [])}."
                )
            _them(
                ra, loai="van_ban",
                tieu_de=tieu_de,
                muc=ten_nhom.get(d.get("nhom"), "Văn bản"),
                noi_dung=f"{mo_dau}: {d.get('trichYeu', '')}{ky}{du_an} {d.get('ghiChu', '')}{luu_y}",
                url="/van-ban", stt=i,
            )

        # Đoạn tổng, cố ý viết theo lối "nhắc lại câu hỏi rồi mới trả lời" — cùng
        # thủ pháp đã dùng cho mã bưu chính và trụ sở ở trên, vì cùng lý do: ba
        # cửa của `_nhan_duoc` đo độ phủ câu hỏi trên đoạn, nên các tiếng đệm
        # ("ở đâu", "có những", "gồm những") phải nằm sẵn trong đoạn.
        _them(
            ra, loai="van_ban", tieu_de="Văn bản chỉ đạo phường Đông Triều", muc="Tra cứu văn bản",
            noi_dung=(
                f"Xem quyết định xếp hạng di tích ở đâu, phường Đông Triều có những văn bản nào: cổng đăng "
                f"{len(vbs.get('danhSach') or [])} quyết định xếp hạng di tích và phê duyệt dự án tu bổ, tải bản "
                f"scan được tại trang Văn bản chỉ đạo. {vbs.get('luuYPhapLy', '')}"
            ),
            url="/van-ban",
        )
        for i, t in enumerate(vbs.get("thieu") or []):
            _them(
                ra, loai="van_ban", tieu_de=f"Quyết định {t.get('soHieu', '')}", muc="Chưa có bản scan",
                noi_dung=(
                    f"Quyết định {t.get('soHieu', '')} ({t.get('viec', '')}) được viện dẫn trong các văn bản khác "
                    f"nhưng cổng chưa có bản scan. {t.get('biet', '')}"
                ),
                url="/van-ban", stt=i,
            )

    # ── Thủ tục hành chính đất đai cấp xã ──────────────────────────────────
    #
    # Bản luật JS đã trả lời được nhóm câu hỏi thẳng ("làm sổ đỏ cần giấy gì").
    # Phần Python lo nhóm câu hỏi NGƯỢC và câu hỏi lẻ nằm sâu trong hồ sơ: "thủ
    # tục nào phải chờ 40 ngày", "cơ quan nào ký quyết định giao đất", "thủ tục
    # nào cần trích lục bản đồ địa chính".
    tt = cd.get("tthcDatDai") or {}
    for i, t in enumerate(tt.get("capXa") or []):
        ten = re.sub(r"^Trình tự,?\s*thủ tục\s*", "", str(t.get("ten", ""))).strip()
        ten = ten[:1].upper() + ten[1:] if ten else ""
        han = str(t.get("thoiHanDanhMuc") or "").split("(")[0].strip()
        ho_so = [h for h in (t.get("hoSo") or []) if not h.lower().startswith("số lượng hồ sơ")]
        _them(
            ra, loai="tthc", tieu_de=f"Thủ tục đất đai: {ten}", muc="Thủ tục cấp xã",
            noi_dung=(
                f"Thủ tục {ten} làm tại phường Đông Triều mất bao lâu, cần giấy tờ gì: thời hạn giải quyết {han}. "
                f"Đối tượng: {' '.join(t.get('doiTuong') or [])} "
                f"Hồ sơ phải nộp: {' '.join(ho_so[:6])} "
                f"Phí, lệ phí: {' '.join(t.get('phiLePhi') or [])} "
                f"Kết quả nhận được: {' '.join(t.get('ketQua') or [])} "
                f"Cơ quan giải quyết: {' '.join(t.get('coQuan') or [])}"
            ),
            url="/thu-tuc", stt=i,
        )

    md = cd.get("tthcMauDon") or {}
    if md.get("danhSach"):
        dan = [m for m in md["danhSach"] if m.get("aiDien") == "dan"]
        _them(
            ra, loai="tthc", tieu_de="Mẫu đơn thủ tục đất đai", muc="Mẫu đơn",
            noi_dung=(
                f"Mẫu đơn nào người dân phải tự điền, tờ khai đất đai lấy ở đâu: trong "
                f"{len(md['danhSach'])} mẫu kèm theo các thủ tục đất đai, người dân chỉ phải điền {len(dan)} mẫu, "
                f"gồm: {'; '.join(f'Mẫu {m['so']} {m['ten']}' for m in dan)}. "
                f"Các mẫu còn lại là giấy tờ cơ quan tự lập khi giải quyết hồ sơ, người dân không phải chuẩn bị."
            ),
            url="/mau-don",
        )
        _them(
            ra, loai="tthc", tieu_de="Nộp hồ sơ đất đai ở đâu", muc="Nơi nộp",
            noi_dung=(
                "Nộp hồ sơ thủ tục đất đai ở đâu, nộp tại đâu: "
                + " ".join(tt.get("noiNop") or [])
                + f" {tt.get('luuY', '')}"
            ),
            url="/thu-tuc",
        )

    kp = cd.get("khuPho") or {}
    for i, k in enumerate(kp.get("danhSach") or []):
        _them(ra, loai="khu_pho", tieu_de=f"Khu phố {k.get('ten', '')}", muc="Khu phố",
              noi_dung=f"Khu phố {k.get('ten', '')} gồm {k.get('gom', '')}. Có {k.get('soHo', '')} hộ, {k.get('nhanKhau', '')} nhân khẩu, diện tích {k.get('dienTichKm2', '')} km². Nhà văn hoá: {k.get('nhaVanHoa', '')}.",
              url="/khu-pho", stt=i)

    ab = cd.get("about") or {}
    _them(ra, loai="gioi_thieu", tieu_de="Giới thiệu phường Đông Triều", muc="Mở đầu",
          noi_dung=ab.get("intro") or "", url="/gioi-thieu")
    for i, s in enumerate(ab.get("sections") or []):
        _them(ra, loai="gioi_thieu", tieu_de="Giới thiệu phường Đông Triều",
              muc=s.get("title") or "Nội dung", noi_dung=s.get("body") or "", url="/gioi-thieu", stt=i)


def dung_kho(api: str = API_MAC_DINH, giay: float = 4.0, ep_tep: bool = False) -> Kho:
    """Dựng toàn bộ kho đoạn. `ep_tep` bỏ qua API, đọc thẳng tệp gieo dữ liệu."""
    du, nguon = _lay_du_lieu(api, giay, ep_tep)
    ra: list[Doan] = []

    _tu_ban_ghi(ra, du.get("heritages"), "heritage", "/di-tich", {
        "summary": "Tóm tắt", "history": "Lịch sử", "architecture": "Kiến trúc",
        "highlights": "Điểm nổi bật", "festivalNote": "Lễ hội", "travelTips": "Kinh nghiệm đi lại",
        "address": "Địa chỉ", "worship": "Thờ ai", "rankLevelText": "Xếp hạng",
    })
    _tu_ban_ghi(ra, du.get("festivals"), "festival", "/le-hoi", {
        "intro": "Giới thiệu", "history": "Lịch sử", "rituals": "Nghi lễ", "activities": "Phần hội",
        "meaningCultural": "Ý nghĩa văn hoá", "meaningSpiritual": "Ý nghĩa tâm linh",
        "visitorTips": "Lưu ý khi đi", "location": "Địa điểm", "lunarTimeText": "Thời gian",
    })
    _tu_ban_ghi(ra, du.get("cuisines"), "cuisine", "/am-thuc", {
        "summary": "Tóm tắt", "description": "Mô tả", "season": "Mùa",
        "whereToBuy": "Mua ở đâu", "priceRange": "Giá",
    })
    _tu_ban_ghi(ra, du.get("attractions"), "attraction", "/di-tich", {
        "summary": "Tóm tắt", "description": "Mô tả", "highlights": "Điểm nổi bật", "address": "Địa chỉ",
    })
    _tu_ban_ghi(ra, du.get("articles"), "article", "/tin-tuc", {
        "excerpt": "Tóm tắt", "contentHtml": "Nội dung",
    })
    # Quán ăn và nơi nghỉ: trợ lý này KHÔNG thay bản JS ở nhóm câu hỏi đó — "giờ
    # này còn quán nào mở" cần biết giờ hiện tại và giờ mở cửa, việc của bản JS.
    # Đưa vào đây để bản Python dùng độc lập vẫn trả lời được "quán X ở đâu".
    _tu_ban_ghi(ra, du.get("restaurants"), "restaurant", "/am-thuc", {
        "description": "Mô tả", "specialties": "Món đặc trưng", "address": "Địa chỉ",
        "priceRange": "Giá", "openHours": "Giờ mở cửa",
    })
    _tu_ban_ghi(ra, du.get("lodgings"), "lodging", "/luu-tru", {
        "description": "Mô tả", "amenities": "Tiện nghi", "address": "Địa chỉ",
        "priceRange": "Giá", "openHours": "Giờ nhận phòng",
    })

    cd = du.get("settings") or {}
    _tu_cai_dat(ra, cd)
    _tu_dia_chi(ra, cd.get("diaChi1896") or {})

    return Kho([d for d in ra if len(d.noi_dung) >= 25], nguon, cd)
