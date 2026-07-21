import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { WSMessage, PresentationStatus } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { getPresentationStatus, getPDFUrl, getPDFAuthToken } from '../api/client';

interface PresentationContextValue {
  // State
  currentSlide: number;
  totalSlides: number;
  isStarted: boolean;
  isBlackScreen: boolean;
  viewerCount: number;
  activeFile: string | null;
  showReveal: boolean;
  dismissReveal: () => void;

  // Connection
  isConnected: boolean;
  isReconnecting: boolean;

  // PDF
  pdfUrl: string | null;
  pdfToken: string | null;

  // Auth
  token: string | null;
  setToken: (t: string | null) => void;

  // Host-only setters (for optimistic updates)
  setCurrentSlide: (n: number) => void;
  setTotalSlides: (n: number) => void;
  setIsStarted: (v: boolean) => void;
  setIsBlackScreen: (v: boolean) => void;
}

const PresentationContext = createContext<PresentationContextValue | null>(null);

export function PresentationProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    sessionStorage.getItem('viewer_token') || localStorage.getItem('host_token')
  );
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isBlackScreen, setIsBlackScreen] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [showReveal, setShowReveal] = useState(false);

  const basePdfUrl = token ? getPDFUrl() : null;
  const pdfUrl = basePdfUrl && activeFile 
    ? `${basePdfUrl}?v=${encodeURIComponent(activeFile)}` 
    : basePdfUrl;
  const pdfToken = getPDFAuthToken();

  const handleMessage = useCallback((msg: WSMessage) => {
    // Sync active file whenever ANY server message provides activeFile or filename
    const file = (msg as any).activeFile || (msg as any).filename;
    if (file && typeof file === 'string' && file !== activeFile) {
      setActiveFile(file);
    }

    switch (msg.type) {
      case 'slideChange':
        setCurrentSlide(msg.slide);
        break;
      case 'presentationStarted':
        setIsStarted(true);
        setCurrentSlide(1);
        if (msg.totalSlides) setTotalSlides(msg.totalSlides);
        break;
      case 'presentationEnded':
        setIsStarted(false);
        break;
      case 'viewerCountChanged':
      case 'viewerConnected':
      case 'viewerDisconnected':
        setViewerCount(msg.count);
        break;
      case 'blackScreen':
        setIsBlackScreen(msg.active);
        break;
      case 'reveal':
        setShowReveal(true);
        break;
      case 'pdfUpdated':
        setActiveFile(msg.filename);
        setCurrentSlide(1);
        setIsBlackScreen(false);
        setIsStarted(false);
        break;
    }
  }, [activeFile]);

  const { isConnected, isReconnecting } = useWebSocket({
    token,
    onMessage: handleMessage,
    enabled: !!token,
  });

  // Fetch initial status when authenticated or reconnected
  useEffect(() => {
    if (!token) return;
    getPresentationStatus()
      .then((status) => {
        if (status.activeFile) setActiveFile(status.activeFile);
        if (status.currentSlide) setCurrentSlide(status.currentSlide);
        if (status.totalSlides) setTotalSlides(status.totalSlides);
        setIsStarted(status.isStarted);
        setIsBlackScreen(status.isBlackScreen);
      })
      .catch(() => {});
  }, [token, isConnected]);

  const dismissReveal = useCallback(() => setShowReveal(false), []);

  return (
    <PresentationContext.Provider
      value={{
        currentSlide,
        totalSlides,
        isStarted,
        isBlackScreen,
        viewerCount,
        activeFile,
        showReveal,
        dismissReveal,
        isConnected,
        isReconnecting,
        pdfUrl,
        pdfToken,
        token,
        setToken,
        setCurrentSlide,
        setTotalSlides,
        setIsStarted,
        setIsBlackScreen,
      }}
    >
      {children}
    </PresentationContext.Provider>
  );
}

export function usePresentationContext() {
  const ctx = useContext(PresentationContext);
  if (!ctx) throw new Error('usePresentationContext must be used within PresentationProvider');
  return ctx;
}
