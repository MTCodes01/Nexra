import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface PresentationContextValue {
  // Session details
  sessionCode: string | null;
  presentationId: string | null;
  presentationTitle: string | null;
  
  // State
  currentSlide: number;
  totalSlides: number;
  viewerCount: number;
  
  // Modes
  isManualMode: boolean;
  setIsManualMode: (manual: boolean) => void;
  syncSlide: (slide: number) => void;
  
  // Connection
  isConnected: boolean;
  isReconnecting: boolean;

  // Init
  joinSession: (code: string, role?: 'viewer' | 'host') => Promise<boolean>;
  leaveSession: () => void;
  
  // Host
  hostToken: string | null;
  setHostToken: (token: string | null) => void;
  changeHostSlide: (slide: number) => void;
}

const PresentationContext = createContext<PresentationContextValue | null>(null);

export function PresentationProvider({ children }: { children: React.ReactNode }) {
  const [hostToken, setHostToken] = useState<string | null>(null);
  
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [presentationTitle, setPresentationTitle] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [hostSlide, setHostSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  
  const [isManualMode, setIsManualMode] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetch('http://localhost:1050/api/auth/me', { credentials: 'include' })
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Not auth');
      })
      .then(data => setHostToken(data.hostId))
      .catch(() => setHostToken(null));
  }, []);

  const leaveSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setSessionCode(null);
    setPresentationId(null);
    setIsConnected(false);
  }, []);

  const changeHostSlide = useCallback((slide: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'slide_change',
        slide
      }));
      // Optimitically update locally
      setHostSlide(slide);
      setCurrentSlide(slide);
    }
  }, []);

  const joinSession = useCallback(async (code: string, role: 'viewer' | 'host' = 'viewer') => {
    try {
      const res = await fetch(`http://localhost:1050/api/session/${code}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Session not found');
      const data = await res.json();
      
      setSessionCode(data.sessionCode);
      setPresentationId(data.presentationId);
      setPresentationTitle(data.presentationTitle);
      setTotalSlides(data.slideCount || 0);
      setHostSlide(data.currentSlide);
      setCurrentSlide(data.currentSlide);
      
      // Connect WebSocket
      const wsUrl = 'ws://localhost:1050/ws';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        setIsConnected(true);
        setIsReconnecting(false);
        ws.send(JSON.stringify({
          type: 'join',
          role,
          sessionCode: data.sessionCode,
          connectionId: Math.random().toString(36).substring(7)
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'slide_changed') {
            setHostSlide(msg.slide);
          } else if (msg.type === 'viewer_count') {
            setViewerCount(msg.count);
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsReconnecting(true);
        // Implement exponential backoff reconnect if needed
      };

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, []);

  // Sync effect
  useEffect(() => {
    if (!isManualMode) {
      setCurrentSlide(hostSlide);
    }
  }, [hostSlide, isManualMode]);

  const syncSlide = useCallback((slide: number) => {
    setCurrentSlide(slide);
  }, []);

  return (
    <PresentationContext.Provider
      value={{
        sessionCode,
        presentationId,
        presentationTitle,
        currentSlide,
        totalSlides,
        viewerCount,
        isManualMode,
        setIsManualMode,
        syncSlide,
        isConnected,
        isReconnecting,
        joinSession,
        leaveSession,
        hostToken,
        setHostToken,
        changeHostSlide
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
