/**
 * Phần chạy TRONG trình duyệt của phép kiểm màn hình lỗi.
 *
 * ── VÌ SAO PHẢI TÁCH LÀM HAI TỆP ──────────────────────────────────────────
 * Node không đọc được JSX, còn `errorElement` thì chỉ chạy được khi có DOM. Nên
 * tệp này (JSX, dựng cây React thật) được `esbuild` gói lại rồi mới nạp vào,
 * còn `test-loi-trang.mjs` lo dựng DOM giả và chấm điểm. Tệp này KHÔNG tự khẳng
 * định điều gì — nó chỉ dựng, rồi trả về những gì quan sát được.
 *
 * ── VÌ SAO KHÔNG KIỂM ĐƯỢC BẰNG `renderToString` ──────────────────────────
 * Lần trước bộ kiểm dùng kết xuất phía máy chủ, và nó báo "LỖI THOÁT RA NGOÀI"
 * dù cấu hình hoàn toàn đúng: React CỐ Ý không chạy error boundary khi kết xuất
 * ở máy chủ — gặp lỗi thì nó vứt kết quả đi và dựng lại ở trình duyệt. Muốn kiểm
 * đúng nhánh này thì bắt buộc phải có DOM, nên mới có `happy-dom`.
 *
 * ── LẤY BẢNG TUYẾN THẬT, KHÔNG CHÉP LẠI ───────────────────────────────────
 * `routes` nhập thẳng từ `src/router.jsx` rồi mới thay một phần tử bằng khối
 * ném lỗi. Nhờ vậy phép kiểm đo đúng cách `errorElement` đang mắc trong ứng
 * dụng thật; sửa `router.jsx` mà mắc sai tầng là bộ kiểm đỏ ngay. Chép lại bảng
 * tuyến vào đây thì nó sẽ lệch dần theo thời gian mà không ai hay.
 */
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/hooks/useAuth.jsx';
import Layout from '../src/components/Layout.jsx';
import { routes } from '../src/router.jsx';

/** Nguyên văn lỗi cố ý ném ra — bộ chấm dò đúng chuỗi này trong mục gập. */
export const LOI_GIA = 'Kiem thu: mot khoi trong trang nem loi luc dung giao dien';

function NemLoi() {
  throw new Error(LOI_GIA);
}

/** Thay phần tử của MỘT trang (giữ nguyên mọi thứ khác trong bảng tuyến). */
function thayTrang(ds, duong, el) {
  return ds.map((r) => {
    if (r.path === duong) return { ...r, element: el };
    if (r.children) return { ...r, children: thayTrang(r.children, duong, el) };
    return r;
  });
}

/** Thay chính khung trang — nhận diện bằng `Layout` thật, không đếm chỉ số. */
function thayKhung(ds, el) {
  return ds.map((r) => (r.element?.type === Layout ? { ...r, element: el } : r));
}

/**
 * Nuốt tiếng ồn của React.
 *
 * Gặp lỗi được error boundary bắt, React vẫn in nguyên ngăn xếp ra `console.error`
 * kèm cảnh báo — ở đây đó là hành vi ĐÚNG, không phải hỏng. Giữ lại để bộ chấm
 * soi, nhưng không cho lẫn vào bảng kết quả.
 */
function batTiengOn() {
  const dong = [];
  const goc = { error: console.error, warn: console.warn };
  console.error = (...a) => dong.push(String(a[0]));
  console.warn = (...a) => dong.push(String(a[0]));
  // React ở chế độ dev còn ném lại lỗi ra `window` sau khi boundary đã bắt, để
  // DevTools bắt được. Không chặn thì DOM giả coi đó là lỗi chưa ai xử lý.
  const nuot = (e) => e.preventDefault();
  window.addEventListener('error', nuot);
  return {
    dong,
    thoi() {
      Object.assign(console, goc);
      window.removeEventListener('error', nuot);
    },
  };
}

/**
 * Dựng cổng trong DOM giả rồi trả về những gì quan sát được.
 *
 * @param {object} o
 * @param {string} o.mo        đường dẫn mở đầu
 * @param {'trang'|'khung'|null} o.hong  thay gì bằng khối ném lỗi
 * @param {string|null} o.diTiepToi      sau khi dựng xong thì bấm đi đâu
 */
export async function dungThu({ mo = '/', hong = null, diTiepToi = null } = {}) {
  let ds = routes;
  if (hong === 'trang') ds = thayTrang(ds, mo, <NemLoi />);
  if (hong === 'khung') ds = thayKhung(ds, <NemLoi />);

  const router = createMemoryRouter(ds, { initialEntries: [mo] });
  // `retry: false` — máy chủ không chạy lúc kiểm, để mặc định thì mỗi truy vấn
  // thử lại rồi treo phép kiểm bằng những lần chờ vô ích.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });

  const hop = document.createElement('div');
  document.body.appendChild(hop);
  const root = createRoot(hop);

  const oOn = batTiengOn();
  let thoatRaNgoai = null;
  try {
    await act(async () => {
      root.render(
        <StrictMode>
          <QueryClientProvider client={qc}>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </QueryClientProvider>
        </StrictMode>,
      );
    });
    // Chờ các truy vấn lắng xuống rồi mới chấm.
    //
    // Nhiều trang trả về `<Spinner/>` ở lần vẽ đầu và chỉ dựng nội dung thật sau
    // khi `useQuery` có dữ liệu. Không có nhịp chờ này thì bộ kiểm luôn chỉ nhìn
    // thấy vòng xoay — nó vẫn bắt được lỗi văng ra ngoài, nhưng mọi phép soi nội
    // dung đều rỗng, tức là xanh vì không nhìn thấy gì chứ không phải vì đúng.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    if (diTiepToi) {
      await act(async () => {
        await router.navigate(diTiepToi);
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
    }
  } catch (err) {
    // Lỗi tới được đây nghĩa là KHÔNG có lưới nào hứng — đúng cái phải chặn.
    thoatRaNgoai = err?.message ?? String(err);
  }

  const chuTrongMain = hop.querySelector('main')?.textContent ?? '';
  const dauTrang = hop.querySelector('header');
  const lienKetDauTrang = [...(dauTrang?.querySelectorAll('a') ?? [])];
  const ketQua = {
    thoatRaNgoai,
    chu: hop.textContent ?? '',
    html: hop.innerHTML,
    coHeader: !!hop.querySelector('header'),
    coFooter: !!hop.querySelector('footer'),
    coMain: !!hop.querySelector('main'),
    // Màn lỗi nằm trong <main> = chỉ phần ruột bị thay, khung trang còn nguyên.
    loiTrongMain: chuTrongMain.includes('Trang này gặp lỗi'),
    coDuongVeGoc: !!hop.querySelector('a[href="/"]'),
    // Hai đường về khác nghĩa nhau trong đầu trang, và đã có lần bị trỏ chung
    // một chỗ: mục "Trang chủ" về đầu CỔNG đang đứng, logo ra hẳn cửa chọn cổng.
    // Gom cả danh sách chứ không lấy cái đầu tiên — nav máy tính và nav điện
    // thoại có thể cùng nằm trong DOM, và cả hai đều phải trỏ đúng.
    navTrangChu: lienKetDauTrang.filter((a) => a.textContent.trim() === 'Trang chủ').map((a) => a.getAttribute('href')),
    logoVe: lienKetDauTrang[0]?.getAttribute('href') ?? null,
    coNutTaiLai: [...hop.querySelectorAll('button')].some((b) => b.textContent.includes('Tải lại trang')),
    soChiTiet: hop.querySelectorAll('details').length,
    soChiTietDangMo: [...hop.querySelectorAll('details')].filter((d) => d.open).length,
    consoleDaGhi: oOn.dong.some((d) => d.includes('Lỗi khi dựng trang')),
  };

  await act(async () => root.unmount());
  hop.remove();
  qc.clear();
  oOn.thoi();
  return ketQua;
}
