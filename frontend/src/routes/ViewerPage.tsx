import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usePresentationContext } from '../context/PresentationContext';
import PDFViewer from '../components/PDFViewer';

export default function ViewerPage() {
  const navigate = useNavigate();
  const { code: routeCode } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get('code');
  
  const targetCode = routeCode || queryCode;
  
  const {
    sessionCode,
    presentationId,
    joinSession,
    leaveSession,
    currentSlide,
    totalSlides,
    isManualMode,
    setIsManualMode,
    syncSlide,
    isConnected,
    isBlackout,
    broadcastMessage,
    clearBroadcast,
    setTotalSlides,
    settings,
  } = usePresentationContext();
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.error(err));
      }
    }
  };

  useEffect(() => {
    if (!targetCode) {
      navigate('/', { replace: true });
      return;
    }
    
    joinSession(targetCode).then(success => {
      setLoading(false);
      if (!success) {
        setError('Session not found or has ended');
      }
    });

    return () => {
      leaveSession();
    };
  }, [targetCode, joinSession, navigate, leaveSession]);

  // Clear broadcast message after 5 seconds
  useEffect(() => {
    if (broadcastMessage) {
      const timer = setTimeout(() => {
        clearBroadcast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [broadcastMessage, clearBroadcast]);

  const handlePrev = useCallback(() => {
    if (currentSlide > 1) syncSlide(currentSlide - 1);
  }, [currentSlide, syncSlide]);

  const handleNext = useCallback(() => {
    if (currentSlide < totalSlides) syncSlide(currentSlide + 1);
  }, [currentSlide, totalSlides, syncSlide]);

  const handleDownload = () => {
    if (presentationId) {
      window.open(`${import.meta.env.VITE_PUBLIC_URL}/api/presentation/${presentationId}/download`, '_blank');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-purple-400 animate-pulse">Joining Session...</div>;
  }

  if (error || !sessionCode) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl text-white mb-4">Oops!</h1>
        <p className="text-red-400 mb-6">{error || 'Invalid session'}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-purple-600 rounded-lg text-white font-medium">Go Home</button>
      </div>
    );
  }

  const isLastSlide = currentSlide === totalSlides;

  return (
    <div className="fixed inset-0 bg-gray-950 overflow-hidden flex flex-col">
      {/* Top Bar Hover Trigger */}
      <div className="absolute top-0 left-0 right-0 z-50 h-6 group">
        {/* Top Bar Content */}
        <div className="absolute top-0 left-0 right-0 min-h-[3.5rem] py-2 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md px-4 flex flex-wrap items-center justify-between gap-3 transform transition-transform duration-300 -translate-y-full group-hover:translate-y-0 focus-within:translate-y-0 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-sm shadow-lg shadow-purple-900/20 shrink-0">
              🎤
            </div>
            <span className="text-sm font-semibold text-white">Live Session</span>
            {!isConnected && (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30 ml-2">Reconnecting...</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700/50">
              Slide {currentSlide} / {totalSlides}
            </span>
            {settings?.allowManualReading !== false && (
              isManualMode ? (
                <button 
                  onClick={() => setIsManualMode(false)}
                  className="px-3 md:px-4 py-1.5 rounded-lg bg-purple-600 text-white text-xs md:text-sm font-medium hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/30"
                >
                  Follow Presenter
                </button>
              ) : (
                <button 
                  onClick={() => setIsManualMode(true)}
                  className="px-3 md:px-4 py-1.5 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 text-xs md:text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Read at my own pace
                </button>
              )
            )}
            {settings?.enableDownload && (
              <button
                onClick={handleDownload}
                className="px-3 md:px-4 py-1.5 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 text-xs md:text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Download PDF
              </button>
            )}
            <button
              onClick={toggleFullscreen}
              className="px-3 md:px-4 py-1.5 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 text-xs md:text-sm font-medium hover:bg-gray-700 transition-colors flex items-center gap-1"
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative min-h-0 min-w-0">
        {isBlackout && (
          <div className="absolute inset-0 z-50 bg-black flex items-center justify-center">
            <h2 className="text-gray-500 text-xl font-light">Eyes up front</h2>
          </div>
        )}
        
        {broadcastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-purple-600 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce">
            <span className="font-bold mr-2">📢 Host:</span>
            {broadcastMessage}
          </div>
        )}

        <PDFViewer
          url={presentationId ? `${import.meta.env.VITE_PUBLIC_URL}/api/presentation/${presentationId}/download` : null}
          currentSlide={currentSlide}
          onTotalPagesLoaded={setTotalSlides}
          qualityMultiplier={settings?.defaultZoom ? settings.defaultZoom / 100 : 1}
          className="w-full h-full"
        />

        {/* Manual Navigation Controls */}
        {isManualMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900/90 backdrop-blur border border-gray-700 p-2 rounded-xl shadow-2xl">
            <button 
              onClick={handlePrev} 
              disabled={currentSlide <= 1}
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              ←
            </button>
            <span className="px-4 text-sm font-medium text-gray-300">
              Slide {currentSlide}
            </span>
            <button 
              onClick={handleNext}
              disabled={currentSlide >= totalSlides}
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              →
            </button>
          </div>
        )}

        {/* Download Button on Final Slide */}
        {isLastSlide && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow-xl shadow-green-900/40 hover:scale-105 transition-transform"
            >
              <span>📥</span> Download Presentation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
