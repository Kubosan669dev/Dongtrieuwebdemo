import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/ui.jsx';
import RequireAuth from './pages/admin/RequireAuth.jsx';

// Trang public
import Portal from './pages/Portal.jsx';
import Home from './pages/Home.jsx';
import Wards from './pages/Wards.jsx';
import Resident from './pages/Resident.jsx';
import Administration from './pages/Administration.jsx';
import Documents from './pages/Documents.jsx';
import Procedures from './pages/Procedures.jsx';
import Forms from './pages/Forms.jsx';
import Feedback from './pages/Feedback.jsx';
import Heritages from './pages/Heritages.jsx';
import HeritageDetail from './pages/HeritageDetail.jsx';
import Festivals from './pages/Festivals.jsx';
import FestivalDetail from './pages/FestivalDetail.jsx';
import Calendar from './pages/Calendar.jsx';
import Cuisine from './pages/Cuisine.jsx';
import CuisineDetail from './pages/CuisineDetail.jsx';
import Lodging from './pages/Lodging.jsx';
import MapPage from './pages/MapPage.jsx';
import Weather from './pages/Weather.jsx';
import News from './pages/News.jsx';
import ArticleDetail from './pages/ArticleDetail.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import NotFound from './pages/NotFound.jsx';
// KHÔNG nạp trễ (`lazy`): đây là màn hình dùng đúng lúc có thứ hỏng, mà một
// trong những thứ hay hỏng nhất chính là việc tải một gói riêng. Nó rất nhẹ.
import RouteError from './pages/RouteError.jsx';

// Admin (lazy — không nạp cho khách vãng lai)
const AdminLogin = lazy(() => import('./pages/admin/Login.jsx'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const AdminHeritages = lazy(() => import('./pages/admin/HeritagesAdmin.jsx'));
const AdminFestivals = lazy(() => import('./pages/admin/FestivalsAdmin.jsx'));
const AdminLodgings = lazy(() => import('./pages/admin/LodgingsAdmin.jsx'));
const AdminCuisines = lazy(() => import('./pages/admin/CuisinesAdmin.jsx'));
const AdminRestaurants = lazy(() => import('./pages/admin/RestaurantsAdmin.jsx'));
const AdminAttractions = lazy(() => import('./pages/admin/AttractionsAdmin.jsx'));
const AdminArticles = lazy(() => import('./pages/admin/ArticlesAdmin.jsx'));
const AdminSlides = lazy(() => import('./pages/admin/SlidesAdmin.jsx'));
const AdminMedia = lazy(() => import('./pages/admin/MediaAdmin.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/SettingsAdmin.jsx'));
const AdminChatLogs = lazy(() => import('./pages/admin/ChatLogsAdmin.jsx'));
const AdminFeedback = lazy(() => import('./pages/admin/FeedbackAdmin.jsx'));

const withSuspense = (el) => <Suspense fallback={<Spinner className="min-h-screen" />}>{el}</Suspense>;

/**
 * Bảng tuyến, tách khỏi `createBrowserRouter` để còn KIỂM được.
 *
 * `createBrowserRouter` gắn chặt vào `history` của trình duyệt nên không dựng
 * lại được trong phép kiểm. Tách bảng tuyến ra thì `scripts/test-loi-trang.mjs`
 * dựng `createMemoryRouter(routes)` từ CHÍNH bảng này — tức là nó kiểm đúng cách
 * `errorElement` đang mắc ở đây, chứ không phải một bản chép lại trong file kiểm
 * rồi lệch dần theo thời gian mà không ai biết.
 */
export const routes = [
  {
    element: <Layout />,
    // Lỗi ở CHÍNH khung trang (đầu trang, chân trang, khung chat) — không còn
    // khung nào bọc ngoài nên màn báo lỗi phải tự dựng lấy logo và đường về.
    errorElement: <RouteError dungRieng />,
    children: [
      {
        // ── LƯỚI HỨNG LỖI CỦA TỪNG TRANG ─────────────────────────────────
        // Tuyến không có `path`, chỉ để đặt `errorElement` bọc quanh mọi trang.
        //
        // Đặt ở ĐÂY chứ không phải ở tuyến `Layout` bên trên là có chủ đích: lỗi
        // của một trang chỉ thay phần ruột, còn đầu trang, thanh điều hướng,
        // chân trang và khung chat vẫn còn nguyên — người dùng bấm sang mục khác
        // được ngay. Gắn lên tuyến `Layout` thì cả cổng biến mất chỉ vì một
        // trang hỏng, đúng cái vừa xảy ra với `n.filter is not a function`.
        //
        // `client/scripts/test-loi-trang.mjs` canh đúng điều này: tháo dòng dưới
        // ra là bộ kiểm đỏ ngay ba mục (mất đầu trang, mất chân trang, màn lỗi
        // không còn nằm trong vùng nội dung).
        errorElement: <RouteError />,
        children: [
          // ── CỬA VÀO CHUNG ──────────────────────────────────────────────
          // `/` không còn là trang chủ cổng du lịch. Nó là trang chọn cổng,
          // không thuộc bên nào, và không hiện thanh điều hướng của bên nào —
          // xem `hooks/useDoiTuong.jsx`.
          { path: '/', element: <Portal /> },

          // ── CỔNG DU KHÁCH ──────────────────────────────────────────────
          { path: '/du-khach', element: <Home /> },

          // ── CỔNG NGƯỜI DÂN ─────────────────────────────────────────────
          // Một cổng riêng, có trang chủ riêng. Danh sách nhánh thuộc cổng này
          // khai ở `hooks/useDoiTuong.jsx` — thêm trang mới cho người dân thì
          // phải khai cả ở đó, nếu không nó hiện thanh nav của cổng du khách.
          { path: '/nguoi-dan', element: <Resident /> },
          { path: '/khu-pho', element: <Wards /> },
          { path: '/hanh-chinh', element: <Administration /> },
          { path: '/van-ban', element: <Documents /> },
          { path: '/thu-tuc', element: <Procedures /> },
          { path: '/mau-don', element: <Forms /> },
          { path: '/phan-anh', element: <Feedback /> },
          { path: '/di-tich', element: <Heritages /> },
          { path: '/di-tich/:slug', element: <HeritageDetail /> },
          { path: '/le-hoi', element: <Festivals /> },
          { path: '/le-hoi/:slug', element: <FestivalDetail /> },
          { path: '/lich', element: <Calendar /> },
          { path: '/am-thuc', element: <Cuisine /> },
          { path: '/am-thuc/:slug', element: <CuisineDetail /> },
          { path: '/luu-tru', element: <Lodging /> },
          { path: '/ban-do', element: <MapPage /> },
          { path: '/thoi-tiet', element: <Weather /> },
          { path: '/tin-tuc', element: <News /> },
          { path: '/tin-tuc/:slug', element: <ArticleDetail /> },
          { path: '/gioi-thieu', element: <About /> },
          { path: '/lien-he', element: <Contact /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  { path: '/admin/login', element: withSuspense(<AdminLogin />), errorElement: <RouteError dungRieng /> },
  {
    path: '/admin',
    element: withSuspense(
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>,
    ),
    errorElement: <RouteError dungRieng />,
    children: [
      { index: true, element: withSuspense(<Dashboard />) },
      { path: 'di-tich', element: withSuspense(<AdminHeritages />) },
      { path: 'le-hoi', element: withSuspense(<AdminFestivals />) },
      { path: 'luu-tru', element: withSuspense(<AdminLodgings />) },
      { path: 'am-thuc', element: withSuspense(<AdminCuisines />) },
      { path: 'nha-hang', element: withSuspense(<AdminRestaurants />) },
      { path: 'diem-lan-can', element: withSuspense(<AdminAttractions />) },
      { path: 'bai-viet', element: withSuspense(<AdminArticles />) },
      { path: 'slider', element: withSuspense(<AdminSlides />) },
      { path: 'thu-vien', element: withSuspense(<AdminMedia />) },
      { path: 'phan-hoi', element: withSuspense(<AdminFeedback />) },
      { path: 'tro-ly-ai', element: withSuspense(<AdminChatLogs />) },
      { path: 'cai-dat', element: withSuspense(<AdminSettings />) },
    ],
  },
];

export const router = createBrowserRouter(routes);
