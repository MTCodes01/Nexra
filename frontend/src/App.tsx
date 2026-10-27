import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PresentationProvider } from './context/PresentationContext';

const LoginPage = React.lazy(() => import('./routes/LoginPage'));
const ViewerPage = React.lazy(() => import('./routes/ViewerPage'));
const HostPage = React.lazy(() => import('./routes/HostPage'));
const PresenterPage = React.lazy(() => import('./routes/PresenterPage'));

type Theme = 'dark' | 'light';

const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  const [theme, setTheme] = useState<Theme>(() =>
    window.localStorage.getItem('nexra-theme') === 'light' ? 'light' : 'dark'
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('nexra-theme', theme);
  }, [theme]);

  return (
    <>
      <BrowserRouter>
        <PresentationProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/join" element={<ViewerPage />} />
              <Route path="/p/:code" element={<ViewerPage />} />
              <Route path="/host" element={<HostPage />} />
              <Route path="/present/:code" element={<PresenterPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </PresentationProvider>
      </BrowserRouter>
      <button
        type="button"
        onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}
        className="fixed bottom-4 right-4 z-[100] flex h-11 w-11 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-white shadow-lg transition-colors hover:bg-gray-700"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        aria-pressed={theme === 'light'}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
          </svg>
        )}
      </button>
    </>
  );
}
