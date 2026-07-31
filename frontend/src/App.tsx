import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PresentationProvider } from './context/PresentationContext';

const LoginPage = React.lazy(() => import('./routes/LoginPage'));
const ViewerPage = React.lazy(() => import('./routes/ViewerPage'));
const HostPage = React.lazy(() => import('./routes/HostPage'));
const PresenterPage = React.lazy(() => import('./routes/PresenterPage'));

const LoadingFallback = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  return (
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
  );
}
