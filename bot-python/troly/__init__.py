"""Trợ lý Đông Triều chạy bằng Python — thuần thư viện chuẩn, không cần cài gì.

    from troly import hoi
    print(hoi("Đông Triều có núi nào")["reply"])
"""

from .traloi import TEN, hoi, nap

__all__ = ["hoi", "nap", "TEN"]
