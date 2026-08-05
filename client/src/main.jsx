import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60 * 1000 },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Không còn Provider cho "du khách / người dân": vai của một trang nay
            suy thẳng từ đường dẫn (xem hooks/useDoiTuong.jsx), nên không có
            trạng thái nào phải giữ ở gốc cây. */}
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
