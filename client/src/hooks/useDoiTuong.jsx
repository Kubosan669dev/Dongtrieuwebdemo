import { useLocation } from 'react-router-dom';

/**
 * Cổng này là HAI cổng, đi chung một mã nguồn và một cơ sở dữ liệu.
 *
 *   · `/`           — cổng du lịch: di tích, lễ hội, ẩm thực, lưu trú
 *   · `/nguoi-dan`  — cổng của người trong phường: khu phố, hành chính, phản ánh
 *
 * ── VÌ SAO LÀ ĐƯỜNG DẪN, KHÔNG CÒN LÀ TRẠNG THÁI NHỚ TRONG MÁY ─────────────
 * Bản trước dùng một công tắc nhớ trong `localStorage`: cùng một địa chỉ `/`
 * nhưng hiện hai nội dung khác nhau tuỳ lần bấm gần nhất. Cách đó có ba chỗ
 * gãy, và cả ba đều chỉ lộ ra khi có người thật dùng:
 *
 *   · **Không gửi được cho ai.** Cán bộ phường muốn gửi bà con "vào đây xem khu
 *     phố" thì chép địa chỉ ra vẫn là `/`, người nhận mở lên thấy trang du lịch.
 *   · **Máy tìm kiếm chỉ thấy một bên.** Một địa chỉ thì chỉ có một bản được
 *     lập chỉ mục, nên nửa nội dung của cổng không ai tìm ra.
 *   · **Máy dùng chung thì lẫn.** Máy ở nhà văn hoá, ở bộ phận một cửa — người
 *     trước bấm gì thì người sau chịu nấy.
 *
 * Hai đường dẫn thì mỗi bên gửi được, tìm được, đánh dấu trang được, và không
 * bên nào nhớ hộ bên nào.
 *
 * ── HAI BÊN KHÔNG CHIA CHUNG TRANG NÀO ─────────────────────────────────────
 * Mỗi trang thuộc đúng một bên. Không có trang nào "của cả hai" — vì trang như
 * vậy thì không biết phải hiện thanh điều hướng nào, và người dùng bấm một mục
 * xong thấy cả đầu trang đổi khác, không hiểu mình vừa đi đâu.
 */

export const DU_KHACH = 'du-khach';
export const NGUOI_DAN = 'nguoi-dan';

/**
 * Các nhánh thuộc cổng người dân. Còn lại thuộc cổng du lịch.
 *
 * Danh sách này là NGUỒN DUY NHẤT quyết định một trang thuộc bên nào — thanh
 * điều hướng, chân trang, thẻ SEO và khung chat đều đọc từ đây. Thêm trang mới
 * cho người dân thì khai đúng một chỗ này.
 */
const NHANH_NGUOI_DAN = [
  '/nguoi-dan',
  '/khu-pho',
  '/hanh-chinh',
  '/van-ban',
  '/phan-anh',
  '/tin-tuc',
  '/lien-he',
];

/** Đường dẫn này thuộc cổng nào? */
export function vaiCuaDuong(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/';
  // So khớp cả trang con: `/tin-tuc/bai-viet-nao-do` vẫn thuộc cổng người dân.
  const laNguoiDan = NHANH_NGUOI_DAN.some((g) => p === g || p.startsWith(`${g}/`));
  return laNguoiDan ? NGUOI_DAN : DU_KHACH;
}

/** Trang chủ của mỗi bên — dùng cho nút chuyển và cho logo ở đầu trang. */
export const TRANG_CHU = { [DU_KHACH]: '/', [NGUOI_DAN]: '/nguoi-dan' };

export function useDoiTuong() {
  const { pathname } = useLocation();
  const doiTuong = vaiCuaDuong(pathname);
  return {
    doiTuong,
    laNguoiDan: doiTuong === NGUOI_DAN,
    laDuKhach: doiTuong === DU_KHACH,
    trangChu: TRANG_CHU[doiTuong],
  };
}
