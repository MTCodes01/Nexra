import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePresentationContext } from '../context/PresentationContext';
import PDFViewer from '../components/PDFViewer';

export default function PresenterPage() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  
  const {
    sessionCode,
    presentationId,
    joinSession,
    leaveSession,
    currentSlide,
    totalSlides,
    isConnected,
    hostToken,
    changeHostSlide,
    viewerCount
  } = usePresentationContext();
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hostToken) {
      navigate('/');
      return;
    }

    if (!code) {
      navigate('/host', { replace: true });
      return;
    }
    
    joinSession(code, 'host').then(success => {
      setLoading(false);
      if (!success) {
        setError('Session not found or has ended');
      }
    });

    return () => {
      leaveSession();
    };
  }, [code, joinSession, navigate, leaveSession, hostToken]);

  const handlePrev = useCallback(() => {
    if (currentSlide > 1) changeHostSlide(currentSlide - 1);
  }, [currentSlide, changeHostSlide]);

  const handleNext = useCallback(() => {
    if (currentSlide < totalSlides) changeHostSlide(currentSlide + 1);
  }, [currentSlide, totalSlides, changeHostSlide]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-purple-400 animate-pulse">Initializing Presenter View...</div>;
  }

  if (error || !sessionCode) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl text-white mb-4">Oops!</h1>
        <p className="text-red-400 mb-6">{error || 'Invalid session'}</p>
        <button onClick={() => navigate('/host')} className="px-6 py-2 bg-purple-600 rounded-lg text-white font-medium">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-950 overflow-hidden flex flex-col">
      {/* Top Bar */}
      <div className="flex-shrink-0 h-14 border-b border-purple-900 bg-gray-900/80 backdrop-blur-md px-4 flex items-center justify-between z-10 relative shadow-[0_0_15px_rgba(168,85,247,0.2)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-sm shadow-lg shadow-purple-900/20">
            👑
          </div>
          <span className="text-sm font-semibold text-white">Presenter View</span>
          {!isConnected && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30 ml-2">Reconnecting...</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-lg">
            <span className="text-sm text-gray-400">Viewers:</span>
            <span className="text-sm font-bold text-purple-400">{viewerCount}</span>
          </div>
          <span className="text-sm font-medium text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700/50">
            Slide {currentSlide} / {totalSlides}
          </span>
          <button 
            onClick={() => navigate('/host')}
            className="px-4 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white border border-gray-700 text-sm font-medium transition-colors"
          >
            Exit to Dashboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex">
        <div className="flex-1 relative">
          <PDFViewer
            url={`${import.meta.env.VITE_PUBLIC_URL}/api/presentation/${presentationId}/download`}
            token={hostToken}
            currentSlide={currentSlide}
            className="w-full h-full"
          />
        </div>

        {/* Presenter Sidebar Controls */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 p-6 flex flex-col gap-6">
          <div>
            <h2 className="text-white font-bold text-lg mb-2">Controls</h2>
            <div className="flex gap-2">
              <button 
                onClick={handlePrev} 
                disabled={currentSlide <= 1}
                className="flex-1 py-4 rounded-xl flex items-center justify-center bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors border border-gray-700"
              >
                ← Prev
              </button>
              <button 
                onClick={handleNext}
                disabled={currentSlide >= totalSlides}
                className="flex-1 py-4 rounded-xl flex items-center justify-center bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-lg shadow-purple-900/20"
              >
                Next →
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-3 text-center">Use Left/Right arrow keys or Spacebar to navigate.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
