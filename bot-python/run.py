#!/usr/bin/env python3
"""Trợ lý Đông Triều chạy bằng Python — điểm khởi động duy nhất.

    python run.py chat        trò chuyện ngay trong cửa sổ dòng lệnh
    python run.py serve       mở dịch vụ HTTP ở cổng 5005 cho máy chủ Node gọi
    python run.py hoi "..."   hỏi đúng một câu rồi thoát
    python run.py kho         xem kho tri thức đang có gì
    python run.py doi-chieu   so kho dựng từ API với kho dựng từ tệp JSON

Thêm cờ `--tep` vào `chat` / `hoi` / `kho` để bỏ qua API, đọc thẳng các tệp
trong `server/prisma/seed-data/` — dùng khi máy chủ Node không chạy.

Không cần `pip install`: toàn bộ chạy bằng thư viện chuẩn của Python 3.9+.
"""

from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Cửa sổ lệnh Windows mặc định không phải UTF-8, in tiếng Việt ra là vỡ chữ.
for luong in (sys.stdout, sys.stderr):
    try:
        luong.reconfigure(encoding="utf-8")
    except (AttributeError, OSError):
        pass

from troly import TEN, hoi, nap  # noqa: E402
from troly.khotritthuc import API_MAC_DINH  # noqa: E402

API = os.environ.get("DONGTRIEU_API", API_MAC_DINH)
CONG = int(os.environ.get("PYBOT_PORT", "5005"))


def _dem(kho) -> dict[str, int]:
    ra: dict[str, int] = {}
    for d in kho.doan:
        ra[d.loai] = ra.get(d.loai, 0) + 1
    return ra


def _in_kho(ep_tep: bool) -> int:
    kho, _ = nap(API, ep=True, ep_tep=ep_tep)
    print(f"Nguồn dữ liệu: {'API ' + API if kho.nguon == 'api' else 'tệp gieo dữ liệu trong server/prisma/seed-data/'}")
    print(f"Tổng cộng: {len(kho.doan)} đoạn tra cứu được\n")
    for loai, so in sorted(_dem(kho).items(), key=lambda x: -x[1]):
        print(f"  {loai:<12} {so:>5}")
    return 0


def _doi_chieu() -> int:
    """So kho dựng từ API với kho dựng từ tệp — hai đường phải cho ra như nhau.

    Đây là cách duy nhất phát hiện đường ngoại tuyến bị hụt. Bản đầu thiếu
    `festival-details.json` và `places.json` (hai lớp bổ sung mà `seed.js` gộp
    vào lúc gieo), hụt mất 130 đoạn — mà chạy vẫn ra kết quả trông rất bình
    thường, không có dấu hiệu gì.
    """
    from troly.khotritthuc import dung_kho

    tep = dung_kho(API, ep_tep=True)
    api = dung_kho(API)
    if api.nguon != "api":
        print(f"! Không gọi được API ở {API} — hãy chạy `npm run dev` trước.")
        print(f"  Kho từ tệp: {len(tep.doan)} đoạn.")
        return 2

    a, b = _dem(api), _dem(tep)
    print(f"{'loại':<14}{'API':>7}{'tệp':>7}{'chênh':>8}")
    for k in sorted(set(a) | set(b)):
        x, y = a.get(k, 0), b.get(k, 0)
        dau = "" if x == y else ("   ← tệp hụt" if y < x else "   ← tệp dư")
        print(f"{k:<14}{x:>7}{y:>7}{y - x:>+8}{dau}")
    print(f"{'TỔNG':<14}{len(api.doan):>7}{len(tep.doan):>7}{len(tep.doan) - len(api.doan):>+8}")

    lech = abs(len(tep.doan) - len(api.doan)) / max(len(api.doan), 1)
    print(f"\nLệch {lech * 100:.1f}%.", "Đạt." if lech <= 0.05 else "QUÁ NGƯỠNG 5% — xem TEP_DOC trong troly/khotritthuc.py.")
    return 0 if lech <= 0.05 else 1


def _tro_chuyen(ep_tep: bool = False) -> int:
    kho, _ = nap(API, ep=True, ep_tep=ep_tep)
    print(f"┌─ {TEN}")
    print(f"│  {len(kho.doan)} đoạn · nguồn: {'API' if kho.nguon == 'api' else 'tệp gieo dữ liệu'}")
    print("│  Gõ câu hỏi rồi Enter. Gõ 'thoat' để kết thúc.")
    print("└─────────────────────────────────────────────")
    while True:
        try:
            cau = input("\nBạn ▸ ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nTạm biệt 👋")
            return 0
        if not cau:
            continue
        if cau.lower() in {"thoat", "thoát", "exit", "quit", "q"}:
            print("Tạm biệt 👋")
            return 0
        kq = hoi(cau, API)
        print(f"\nTrợ lý ▸ {kq['reply']}")
        if kq.get("links"):
            print("        Xem thêm: " + " · ".join(f"{l['label']} ({l['url']})" for l in kq["links"]))


class _Handler(BaseHTTPRequestHandler):
    """Dịch vụ HTTP tối giản. Chỉ nghe trên máy nội bộ — xem `_phuc_vu`."""

    def _tra(self, ma: int, du: dict) -> None:
        than = json.dumps(du, ensure_ascii=False).encode("utf-8")
        self.send_response(ma)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(than)))
        self.end_headers()
        self.wfile.write(than)

    def do_GET(self) -> None:  # noqa: N802 — tên do thư viện chuẩn quy định
        if self.path.rstrip("/") in ("/suc-khoe", "/health"):
            kho, _ = nap(API)
            self._tra(200, {"ok": True, "soDoan": len(kho.doan), "nguon": kho.nguon, "ten": TEN})
        else:
            self._tra(404, {"error": "Chỉ có GET /suc-khoe và POST /hoi."})

    def do_POST(self) -> None:  # noqa: N802
        if self.path.rstrip("/") != "/hoi":
            return self._tra(404, {"error": "Chỉ có GET /suc-khoe và POST /hoi."})
        try:
            n = int(self.headers.get("Content-Length") or 0)
            # Chặn thân yêu cầu quá khổ: câu hỏi dài nhất cũng chỉ 500 ký tự.
            if n > 8192:
                return self._tra(413, {"error": "Câu hỏi quá dài."})
            du = json.loads(self.rfile.read(n).decode("utf-8") or "{}")
        except (ValueError, UnicodeDecodeError):
            return self._tra(400, {"error": "Thân yêu cầu không phải JSON hợp lệ."})

        cau = str(du.get("message") or du.get("cauHoi") or "").strip()
        if not cau:
            return self._tra(400, {"error": "Bạn chưa nhập câu hỏi."})
        try:
            self._tra(200, hoi(cau, API))
        except Exception as e:  # dịch vụ phụ trợ hỏng không được làm sập cả cổng
            self._tra(500, {"error": f"Lỗi khi trả lời: {e}"})

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write(f"  {self.address_string()} {fmt % args}\n")


def _phuc_vu() -> int:
    nap(API, ep=True)
    # Chỉ nghe trên 127.0.0.1: đây là dịch vụ nội bộ để máy chủ Node gọi, không
    # có xác thực và không nên mở ra mạng ngoài.
    may = ThreadingHTTPServer(("127.0.0.1", CONG), _Handler)
    print(f"▸ {TEN} đang nghe ở http://127.0.0.1:{CONG}")
    print(f"  POST /hoi        {{\"message\": \"câu hỏi\"}}")
    print(f"  GET  /suc-khoe   kiểm tra sống")
    print(f"  Kho dữ liệu lấy từ {API}\n")
    try:
        may.serve_forever()
    except KeyboardInterrupt:
        print("\nĐã dừng.")
    finally:
        may.server_close()
    return 0


def main(argv: list[str]) -> int:
    ep_tep = "--tep" in argv
    argv = [a for a in argv if a != "--tep"]
    lenh = (argv[0] if argv else "chat").lower()
    if lenh in ("serve", "server", "phucvu"):
        return _phuc_vu()
    if lenh in ("kho", "corpus"):
        return _in_kho(ep_tep)
    if lenh in ("doi-chieu", "doichieu", "diff"):
        return _doi_chieu()
    if lenh in ("hoi", "ask"):
        if len(argv) < 2:
            print('Dùng: python run.py hoi "câu hỏi của bạn"')
            return 2
        nap(API, ep=True, ep_tep=ep_tep)
        kq = hoi(" ".join(argv[1:]), API)
        print(kq["reply"])
        if kq.get("links"):
            print("\nXem thêm: " + " · ".join(f"{l['label']} ({l['url']})" for l in kq["links"]))
        return 0 if kq["matched"] else 1
    if lenh in ("chat", "troChuyen", "trochuyen"):
        return _tro_chuyen(ep_tep)
    print(__doc__)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
