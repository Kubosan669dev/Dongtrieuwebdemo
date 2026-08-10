import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Home, RefreshCw, TriangleAlert } from 'lucide-react';
import Brand from '../components/Brand.jsx';
import { useDoiTuong } from '../hooks/useDoiTuong.jsx';
import { SITE_NAME } from '../lib/site.js';

/**
 * Màn hình khi một trang ném lỗi lúc dựng giao diện.
 *
 * ── VÌ SAO CẦN, VÀ VÌ SAO CẦN BẰNG TIẾNG VIỆT ──────────────────────────────
 * Không khai `errorElement` thì React Router dùng màn hình mặc định của nó:
 * nền tối, tiêu đề "Unexpected Application Error!", nguyên vệt stack trỏ vào mã
 * đã nén (`at yp (index-C0xTh-6N.js:400:19696)`), và một đoạn nhắn bằng tiếng
 * Anh gửi cho lập trình viên. Nó thay TOÀN BỘ trang — không còn logo, không
 * còn thanh điều hướng, không còn một cái nút nào để đi tiếp.
 *
 * Với người được nhờ chạy thử, đó là "web hỏng" và hết chuyện: họ không có lối
 * quay lại, cũng không có gì đọc được để báo lại cho ai. Một lỗi ở đúng một
 * khối nhỏ ăn mất cả cổng.
 *
 * ── ĐẶT Ở HAI TẦNG ────────────────────────────────────────────────────────
 * Trong `router.jsx` màn này gắn ở hai chỗ, và khác nhau ở chỗ `dungRieng`:
 *
 *   · Bọc quanh các trang, BÊN TRONG `Layout` → lỗi của một trang chỉ thay phần
 *     ruột; đầu trang, chân trang, khung chat còn nguyên nên người dùng bấm
 *     tiếp được ngay. Lúc đó không cần vẽ lại logo (`dungRieng` = false).
 *   · Ở tầng gốc → dành cho trường hợp hỏng chính `Layout` (đầu trang, chân
 *     trang). Không còn khung nào bọc ngoài nên màn này phải tự dựng lấy logo
 *     và đường về (`dungRieng` = true).
 *
 * Có một trường hợp thứ ba mà `dungRieng` không mô tả được, nên nó tự suy lấy:
 * trang chọn cổng `/` nằm ở tầng trang nhưng CỐ Ý không có đầu trang lẫn chân
 * trang. Ở đó `dungRieng` là false mà quanh màn lỗi vẫn trống không — nên biến
 * quyết định thật là `dungMotMinh`, cộng thêm điều kiện `laChung`.
 *
 * ── VẪN CHO XEM NGUYÊN VĂN LỖI, NHƯNG GẤP LẠI ─────────────────────────────
 * Giấu hẳn thì người test không có gì để chụp màn hình gửi lại, và lập trình
 * viên phải tự dựng lại lỗi từ lời kể. Phơi ra giữa trang thì người dùng thường
 * tưởng máy mình hỏng. Nên nó nằm trong một mục gập, mặc định đóng.
 */
export default function RouteError({ dungRieng = false }) {
  const err = useRouteError();
  // Trang chọn cổng (`/`) cố ý không có đầu trang lẫn chân trang — xem
  // `components/Layout.jsx`. Nên lỗi xảy ra ở ĐÓ tuy vẫn là lỗi tầng trang,
  // nhưng quanh nó chẳng còn khung nào: không tự dựng lấy logo và đường về thì
  // người dùng nhìn thấy một khối chữ lơ lửng giữa màn hình trắng, không lối ra.
  const { laChung } = useDoiTuong();
  const dungMotMinh = dungRieng || laChung;

  // Ghi ra console để người mở DevTools thấy đủ ngăn xếp — mục gập bên dưới chỉ
  // hiện dòng tóm tắt.
  if (typeof console !== 'undefined') console.error('Lỗi khi dựng trang:', err);

  const laPhanHoi = isRouteErrorResponse(err);
  const tomTat = laPhanHoi
    ? `${err.status} ${err.statusText}`
    : (err?.message ?? String(err ?? 'Không rõ nguyên nhân'));
  const chiTiet = laPhanHoi ? (typeof err.data === 'string' ? err.data : JSON.stringify(err.data)) : err?.stack;

  return (
    <div className={dungMotMinh ? 'flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-16 text-center' : 'flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center'}>
      {dungMotMinh && (
        <Link to="/" className="mb-10">
          <Brand size={48} title={SITE_NAME} titleClass="text-lg text-jade-900 dark:text-jade-50" />
        </Link>
      )}

      <span className="grid h-16 w-16 place-items-center rounded-full bg-gold-100 text-gold-600 dark:bg-jade-800 dark:text-gold-400">
        <TriangleAlert size={30} aria-hidden="true" />
      </span>

      <h1 className="mt-5 font-serif text-2xl font-semibold text-jade-900 dark:text-jade-50">
        Trang này gặp lỗi
      </h1>
      <p className="mt-2 max-w-md text-muted">
        Lỗi nằm ở phía cổng thông tin, không phải ở máy bạn. Các trang khác vẫn dùng bình thường — bạn thử tải
        lại, hoặc quay về trang chủ để đi tiếp.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {/* `window.location.reload` chứ không phải `navigate(0)`: khi lỗi xảy ra
            lúc dựng giao diện thì trạng thái trong bộ nhớ đã có thể hỏng, nạp
            lại cả trang là cách duy nhất chắc chắn dựng lại từ đầu. */}
        <button onClick={() => window.location.reload()} className="btn-primary">
          <RefreshCw size={16} /> Tải lại trang
        </button>
        <Link to="/" className="btn-ghost">
          <Home size={16} /> Về trang chủ
        </Link>
      </div>

      <details className="mt-10 w-full max-w-xl text-left">
        <summary className="cursor-pointer text-xs text-subtle hover:text-jade-700 dark:hover:text-jade-200">
          Chi tiết kỹ thuật — chụp lại phần này nếu bạn cần báo lỗi
        </summary>
        <p className="mt-2 break-words rounded-md bg-jade-50 p-3 font-mono text-xs text-jade-900 ring-1 ring-inset ring-jade-900/[0.12] dark:bg-jade-900/60 dark:text-jade-100 dark:ring-white/10">
          {tomTat}
        </p>
        {chiTiet && (
          // `overflow-x-auto` để ngăn xếp dài không đẩy rộng cả trang sinh thanh
          // cuộn ngang — đúng lúc trang đang hỏng thì càng không nên hỏng thêm.
          <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-jade-950 p-3 text-[11px] leading-relaxed text-jade-100">
            {chiTiet}
          </pre>
        )}
      </details>
    </div>
  );
}
