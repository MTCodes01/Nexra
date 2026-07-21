import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePresentationContext } from '../context/PresentationContext';
import PDFViewer from '../components/PDFViewer';
import LiveAudienceBadge from '../components/LiveAudienceBadge';
import RevealModal from '../components/RevealModal';
import SlideOverlay from '../components/SlideOverlay';
import { sendControl } from '../api/client';

export default function ViewerPage() {
  const navigate = useNavigate();
  const {
    token,
    currentSlide,
    totalSlides,
    isStarted,
    isBlackScreen,
    isReconnecting,
    viewerCount,
    pdfUrl,
    pdfToken,
    showReveal,
    dismissReveal,
    setTotalSlides,
    activeFile,
  } = usePresentationContext();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token) navigate('/', { replace: true });
  }, [token, navigate]);

  // Notify server of total pages after PDF loads
  const handleTotalPagesLoaded = useCallback(
    (n: number) => {
      if (n !== totalSlides) {
        setTotalSlides(n);
        // Inform server (best-effort, viewer role can still call this but server ignores non-host)
        // Actually skip — only host should set this. We set it locally for badge display.
      }
    },
    [totalSlides, setTotalSlides]
  );

  if (!token) return null;

  return (
    <div className="fixed inset-0 bg-gray-950 overflow-hidden select-none">
      {/* Full-screen PDF viewer */}
      <PDFViewer
        url={pdfUrl}
        token={pdfToken}
        currentSlide={currentSlide}
        onTotalPagesLoaded={handleTotalPagesLoaded}
        className="w-full h-full"
      />

      {/* State overlays (waiting / reconnecting / black) */}
      <SlideOverlay
        isStarted={isStarted}
        isBlackScreen={isBlackScreen}
        isReconnecting={isReconnecting}
      />

      {/* Live audience badge — Slide 2 only */}
      <LiveAudienceBadge count={viewerCount} visible={currentSlide === 2 && isStarted} />

      {/* Reveal modal */}
      <RevealModal visible={showReveal} onDismiss={dismissReveal} />

      {/* Connection status indicator (subtle) */}
      {!isReconnecting && (
        <div className="fixed bottom-3 right-3 z-20 opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-900/80 border border-gray-700/50 text-xs text-gray-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Live
          </div>
        </div>
      )}
    </div>
  );
}
