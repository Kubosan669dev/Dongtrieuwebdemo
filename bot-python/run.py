#!/usr/bin/env python3
"""Trợ lý Đông Triều chạy bằng Python — điểm khởi động duy nhất.

    python run.py chat     trò chuyện ngay trong cửa sổ dòng lệnh
    python run.py serve    mở dịch vụ HTTP ở cổng 5005 cho máy chủ Node gọi
    python run.py hoi "Đông Triều có núi nào"    hỏi đúng một câu rồi thoát
    python run.py kho      xem kho tri thức đang có gì

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


def _in_kho() -> int:
    kho, _ = nap(API, ep=True)
    theo_loai: dict[str, int] = {}
    for d in kho.doan:
        theo_loai[d.loai] = theo_loai.get(d.loai, 0) + 1
    print(f"Nguồn dữ liệu: {'API ' + API if kho.nguon == 'api' else 'tệp gieo dữ liệu (máy chủ Node chưa chạy)'}")
    print(f"Tổng cộng: {len(kho.doan)} đoạn tra cứu được\n")
    for loai, so in sorted(theo_loai.items(), key=lambda x: -x[1]):
        print(f"  {loai:<12} {so:>5}")
    return 0


def _tro_chuyen() -> int:
    kho, _ = nap(API, ep=True)
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
    lenh = (argv[0] if argv else "chat").lower()
    if lenh in ("serve", "server", "phucvu"):
        return _phuc_vu()
    if lenh in ("kho", "corpus"):
        return _in_kho()
    if lenh in ("hoi", "ask"):
        if len(argv) < 2:
            print('Dùng: python run.py hoi "câu hỏi của bạn"')
            return 2
        kq = hoi(" ".join(argv[1:]), API)
        print(kq["reply"])
        if kq.get("links"):
            print("\nXem thêm: " + " · ".join(f"{l['label']} ({l['url']})" for l in kq["links"]))
        return 0 if kq["matched"] else 1
    if lenh in ("chat", "troChuyen", "trochuyen"):
        return _tro_chuyen()
    print(__doc__)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
