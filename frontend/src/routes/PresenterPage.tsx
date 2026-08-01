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
    setTotalSlides
  } = usePresentationContext();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastInput, setBroadcastInput] = useState('');
  const [currentNote, setCurrentNote] = useState('');

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
    <div className="min-h-screen bg-gray-950 flex flex-col h-screen">
      {/* Top Bar */}
      <div className="h-auto md:h-16 border-b border-gray-800 bg-gray-900 px-4 md:px-6 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 py-4 md:py-0">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-sm shadow-lg shadow-purple-900/20">
            👑
          </div>
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

      {/* Main Content */}
      <div className="flex-1 relative flex flex-col md:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 relative min-h-0 min-w-0 bg-black">
          <PDFViewer
            url={presentationId ? `${import.meta.env.VITE_PUBLIC_URL}/api/presentation/${presentationId}/download` : null}
            token={hostToken}
            currentSlide={currentSlide}
            onTotalPagesLoaded={setTotalSlides}
            className="w-full h-full"
          />
        </div>

        {/* Presenter Sidebar Controls */}
        <div className="w-full md:w-80 h-auto md:h-full bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 p-4 md:p-6 flex flex-col gap-4 md:gap-6 shrink-0 overflow-y-auto">
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

      {/* Settings Modal (Placeholder for now) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl w-96 shadow-2xl text-center">
            <h3 className="text-xl font-bold text-white mb-2">Session Settings</h3>
            <p className="text-gray-400 mb-6">Settings management coming soon...</p>
            <button 
              onClick={() => setShowSettings(false)}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
