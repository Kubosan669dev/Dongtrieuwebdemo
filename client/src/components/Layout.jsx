import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import ChatWidget from './ChatWidget.jsx';
import { useTheme } from '../hooks/useTheme.js';

export default function Layout() {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();

  // Cuộn lên đầu khi đổi trang
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header theme={theme} onToggleTheme={toggle} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
