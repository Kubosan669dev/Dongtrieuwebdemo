import { useLocation } from 'react-router-dom';

/**
 * Cổng này là HAI cổng, đi chung một mã nguồn, một cơ sở dữ liệu — và từ nay
 * chung một CỬA VÀO.
 *
 *   · `/`           — trang chủ chung: giới thiệu phường rồi mời chọn lối đi
 *   · `/du-khach`   — cổng du lịch: di tích, lễ hội, ẩm thực, lưu trú
 *   · `/nguoi-dan`  — cổng của người trong phường: khu phố, hành chính, phản ánh
 *
 * ── VÌ SAO LÀ ĐƯỜNG DẪN, KHÔNG PHẢI TRẠNG THÁI NHỚ TRONG MÁY ───────────────
 * Bản đầu dùng một công tắc nhớ trong `localStorage`: cùng địa chỉ `/` nhưng
 * hiện hai nội dung khác nhau tuỳ lần bấm gần nhất. Cách đó gãy ba chỗ, cả ba
 * chỉ lộ ra khi có người thật dùng: không gửi địa chỉ cho ai được, máy tìm kiếm
 * chỉ thấy một bên, và máy dùng chung ở nhà văn hoá thì người trước bấm gì
 * người sau chịu nấy. Ba đường dẫn thì mỗi bên gửi được, tìm được, đánh dấu
 * trang được.
 *
 * ── VÌ SAO CÓ TRANG CHUNG, VÀ VÌ SAO NÓ KHÔNG PHÁ RANH GIỚI HAI CỔNG ───────
 * Bản trước không có trang nào "của cả hai", với lý do: trang như vậy không biết
 * phải hiện thanh điều hướng nào. Lý do đó vẫn đúng — nên trang chung giải bằng
 * cách KHÔNG có thanh điều hướng của bên nào cả. Nó chỉ có logo, một đoạn giới
 * thiệu và hai lối vào. Đi qua nó là đã chọn xong bên, và từ đó trở đi mỗi trang
 * vẫn thuộc đúng một cổng như cũ.
 *
 * Nó cũng thay luôn việc mà nút "Tôi là du khách / Tôi là người dân" trên đầu
 * trang từng làm — nút ấy đã bỏ. Một cái công tắc bé xíu nằm cạnh thanh điều
 * hướng vừa chật chỗ vừa khó hiểu: người dùng không đọc ra rằng bấm vào đó là
 * đổi hẳn nội dung cả cổng. Hai tấm thẻ to trên cửa vào thì nói được điều đó.
 */

export const CHUNG = 'chung';
export const DU_KHACH = 'du-khach';
export const NGUOI_DAN = 'nguoi-dan';

/**
 * Các nhánh thuộc cổng người dân. Còn lại thuộc cổng du lịch, trừ `/` là chung.
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
  '/thu-tuc',
  '/mau-don',
  '/phan-anh',
  '/tin-tuc',
  '/lien-he',
];

/** Đường dẫn này thuộc cổng nào? */
export function vaiCuaDuong(pathname) {
  const p = String(pathname || '/').replace(/\/+$/, '') || '/';
  if (p === '/') return CHUNG;
  // So khớp cả trang con: `/tin-tuc/bai-viet-nao-do` vẫn thuộc cổng người dân.
  const laNguoiDan = NHANH_NGUOI_DAN.some((g) => p === g || p.startsWith(`${g}/`));
  return laNguoiDan ? NGUOI_DAN : DU_KHACH;
}

/** Trang chủ của mỗi bên. `/` là cửa vào chung, logo trên đầu trang luôn trỏ về đó. */
export const TRANG_CHU = { [CHUNG]: '/', [DU_KHACH]: '/du-khach', [NGUOI_DAN]: '/nguoi-dan' };

/** Tên cổng, dùng cho breadcrumb và hộp chọn bảng màu. */
export const TEN_CONG = {
  [CHUNG]: 'Trang chủ',
  [DU_KHACH]: 'Cổng du khách',
  [NGUOI_DAN]: 'Cổng người dân',
};

export function useDoiTuong() {
  const { pathname } = useLocation();
  const doiTuong = vaiCuaDuong(pathname);
  return {
    doiTuong,
    laChung: doiTuong === CHUNG,
    laNguoiDan: doiTuong === NGUOI_DAN,
    laDuKhach: doiTuong === DU_KHACH,
    trangChu: TRANG_CHU[doiTuong],
    tenCong: TEN_CONG[doiTuong],
  };
}
