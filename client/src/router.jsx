import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/ui.jsx';
import RequireAuth from './pages/admin/RequireAuth.jsx';

// Trang public
import Home from './pages/Home.jsx';
import Heritages from './pages/Heritages.jsx';
import HeritageDetail from './pages/HeritageDetail.jsx';
import Festivals from './pages/Festivals.jsx';
import FestivalDetail from './pages/FestivalDetail.jsx';
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

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/di-tich', element: <Heritages /> },
      { path: '/di-tich/:slug', element: <HeritageDetail /> },
      { path: '/le-hoi', element: <Festivals /> },
      { path: '/le-hoi/:slug', element: <FestivalDetail /> },
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
  { path: '/admin/login', element: withSuspense(<AdminLogin />) },
  {
    path: '/admin',
    element: withSuspense(
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>,
    ),
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
]);
