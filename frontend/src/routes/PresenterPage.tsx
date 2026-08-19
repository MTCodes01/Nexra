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
    isAuthLoading,
    changeHostSlide,
    viewerCount,
    isBlackout,
    toggleBlackout,
    sendBroadcast,
    notes,
    saveNotes,
    setTotalSlides,
    settings,
    updateSettings,
    regenerateSessionCode
  } = usePresentationContext();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastInput, setBroadcastInput] = useState('');
  const [currentNote, setCurrentNote] = useState('');
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => {
          console.error('Fullscreen failed', e);
          setIsFullscreen(true); // Fallback
        });
      } else {
        setIsFullscreen(true); // iOS fallback
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else {
        setIsFullscreen(false);
      }
    }
  };

  const handleExitFullscreen = () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen();
    } else {
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    setCurrentNote(notes?.[currentSlide] || '');
  }, [currentSlide, notes]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentNote(e.target.value);
  };

  const handleNoteBlur = () => {
    if (notes?.[currentSlide] !== currentNote) {
      saveNotes({ ...notes, [currentSlide]: currentNote });
    }
  };

  const handleBroadcastSubmit = () => {
    if (broadcastInput.trim()) {
      sendBroadcast(broadcastInput.trim());
      setBroadcastInput('');
      setShowBroadcast(false);
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;
    
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
  }, [code, joinSession, navigate, leaveSession, hostToken, isAuthLoading]);

  const handlePrev = useCallback(() => {
    if (currentSlide > 1) changeHostSlide(currentSlide - 1);
  }, [currentSlide, changeHostSlide]);

  const handleNext = useCallback(() => {
    if (currentSlide < totalSlides) changeHostSlide(currentSlide + 1);
  }, [currentSlide, totalSlides, changeHostSlide]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

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

  if (isAuthLoading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-purple-400 animate-pulse">Authenticating...</div>;
  }

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
    <div className={`bg-gray-950 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen h-screen'}`}>
      {/* Top Bar */}
      {!isFullscreen && (
      <div className="h-auto md:h-16 border-b border-gray-800 bg-gray-900 px-4 md:px-6 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 py-4 md:py-0">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <img src="/favicon.svg" alt="Nexra Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.4)] shrink-0" />
          <span className="text-sm font-semibold text-white">Presenter View</span>
          {!isConnected && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">Reconnecting...</span>
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
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-center w-full md:w-auto">

          <button 
            onClick={() => setShowBroadcast(true)}
            className="px-4 py-1.5 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-sm font-medium transition-colors border border-purple-500/20 flex-1 md:flex-none"
          >
            Broadcast
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="px-4 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white border border-gray-700 text-sm font-medium transition-colors flex-1 md:flex-none"
          >
            Settings
          </button>
          <button 
            onClick={() => navigate('/host')}
            className="px-4 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white border border-gray-700 text-sm font-medium transition-colors flex-1 md:flex-none"
          >
            Exit to Dashboard
          </button>
        </div>
      </div>
      )}

      {/* Main Content */}
      <div 
        className={`flex-1 relative flex min-h-0 overflow-hidden ${isFullscreen ? 'flex-row' : 'flex-col md:flex-row'}`}
        onTouchStart={isFullscreen ? onTouchStart : undefined}
        onTouchMove={isFullscreen ? onTouchMove : undefined}
        onTouchEnd={isFullscreen ? onTouchEndHandler : undefined}
      >
        <div className={`relative min-h-0 min-w-0 bg-black ${isFullscreen ? 'w-[75%]' : 'flex-1'}`}>
          <PDFViewer
            url={presentationId ? `${import.meta.env.VITE_PUBLIC_URL}/api/presentation/${presentationId}/download` : null}
            token={hostToken}
            currentSlide={currentSlide}
            onTotalPagesLoaded={setTotalSlides}
            qualityMultiplier={settings?.defaultZoom ? settings.defaultZoom / 100 : 1}
            className="w-full h-full"
          />
          <button 
            onClick={isFullscreen ? handleExitFullscreen : toggleFullscreen} 
            className="absolute top-4 right-4 z-50 p-2 bg-gray-800/80 rounded-full text-white backdrop-blur-sm hover:bg-gray-700"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
              </svg>
            )}
          </button>
        </div>

        {isFullscreen ? (
          <div className="w-[25%] bg-gray-900 border-l border-gray-800 p-3 flex flex-col shrink-0 overflow-y-auto">
            <h2 className="text-white font-bold text-sm mb-2 truncate">Notes</h2>
            <textarea
              className="flex-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-gray-300 resize-none focus:outline-none focus:border-purple-500"
              placeholder="Notes..."
              value={currentNote}
              onChange={handleNoteChange}
              onBlur={handleNoteBlur}
            />
            <div className="mt-4 flex flex-col gap-2 opacity-50">
              <p className="text-[10px] text-gray-500 text-center leading-tight">Swipe left/right to change slides</p>
            </div>
          </div>
        ) : (
          <div className="w-full md:w-80 h-auto md:h-full bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 p-4 md:p-6 flex flex-col gap-4 md:gap-6 shrink-0 overflow-y-auto">
            {/* Presenter Sidebar Controls */}
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
            
            <button
              onClick={() => toggleBlackout(!isBlackout)}
              className={`py-3 rounded-xl flex items-center justify-center font-medium transition-colors border ${isBlackout ? 'bg-red-900/40 text-red-400 border-red-500/50' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'}`}
            >
              {isBlackout ? 'Resume Presentation' : 'Black Screen'}
            </button>

            <div className="flex-1 flex flex-col min-h-0 min-h-[150px] md:min-h-0">
              <h2 className="text-white font-bold text-sm mb-2">Slide Notes</h2>
              <textarea
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-gray-300 resize-none focus:outline-none focus:border-purple-500"
                placeholder="Add your presenter notes here..."
                value={currentNote}
                onChange={handleNoteChange}
                onBlur={handleNoteBlur}
              />
              <p className="text-xs text-gray-500 mt-2 text-right">Auto-saves when you click away</p>
            </div>
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl w-96 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Send Broadcast</h3>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white mb-4 focus:outline-none focus:border-purple-500"
              placeholder="Type a message to show to all viewers..."
              rows={3}
              value={broadcastInput}
              onChange={e => setBroadcastInput(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowBroadcast(false)}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={handleBroadcastSubmit}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Session Settings</h3>
            
            <div className="space-y-6">
              {/* Allow Manual Reading */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-white font-medium">Read at own pace</div>
                  <div className="text-xs text-gray-400 mt-1">Allow viewers to navigate slides independently</div>
                </div>
                <div className="relative inline-block w-12 h-6 rounded-full bg-gray-700">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={settings?.allowManualReading ?? true}
                    onChange={(e) => updateSettings({ allowManualReading: e.target.checked })}
                  />
                  <div className="w-12 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </div>
              </label>

              {/* Allow Download */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-white font-medium">Allow PDF Download</div>
                  <div className="text-xs text-gray-400 mt-1">Let viewers download the presentation</div>
                </div>
                <div className="relative inline-block w-12 h-6 rounded-full bg-gray-700">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={settings?.enableDownload ?? false}
                    onChange={(e) => updateSettings({ enableDownload: e.target.checked })}
                  />
                  <div className="w-12 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </div>
              </label>

              {/* Slide Quality */}
              <div>
                <label className="text-white font-medium mb-2 block">Slide Render Quality</label>
                <div className="text-xs text-gray-400 mb-3">Higher quality is sharper but uses more memory</div>
                <div className="flex gap-2">
                  {[100, 200, 300].map(zoom => (
                    <button
                      key={zoom}
                      onClick={() => updateSettings({ defaultZoom: zoom })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${settings?.defaultZoom === zoom ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'}`}
                    >
                      {zoom / 100}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Regenerate Code */}
              <div className="pt-4 border-t border-gray-800">
                <button
                  onClick={() => {
                    if (confirm('This will change the session link and redirect all connected viewers. Continue?')) {
                      regenerateSessionCode();
                    }
                  }}
                  className="w-full py-2.5 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/40 text-sm font-medium transition-colors border border-red-500/20"
                >
                  Regenerate Session Code
                </button>
              </div>
            </div>

            <div className="mt-8 text-right">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
