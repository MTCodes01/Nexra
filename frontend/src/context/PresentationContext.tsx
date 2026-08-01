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
  
  // Presenter features
  isBlackout: boolean;
  toggleBlackout: (blackout: boolean) => void;
  broadcastMessage: string | null;
  sendBroadcast: (message: string) => void;
  notes: Record<number, string>;
  saveNotes: (newNotes: Record<number, string>) => Promise<void>;
  clearBroadcast: () => void;
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

  const [isBlackout, setIsBlackout] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/auth/me`, { credentials: 'include' })
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
      const res = await fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/session/${code}`, {
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
      setIsBlackout(data.isBlackout || false);
      if (data.notes) setNotes(data.notes);
      
      // Connect WebSocket
      const wsUrl = `${import.meta.env.VITE_PUBLIC_URL?.replace(/^http/, 'ws')}/ws`;
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
          } else if (msg.type === 'blackout') {
            setIsBlackout(msg.isBlackout);
          } else if (msg.type === 'broadcast') {
            setBroadcastMessage(msg.message);
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

  const toggleBlackout = useCallback((blackout: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'blackout', isBlackout: blackout }));
      setIsBlackout(blackout);
    }
  }, []);

  const sendBroadcast = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'broadcast', message }));
    }
  }, []);

  const clearBroadcast = useCallback(() => setBroadcastMessage(null), []);

  const saveNotes = useCallback(async (newNotes: Record<number, string>) => {
    if (!presentationId) return;
    try {
      await fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/presentation/library/${presentationId}/notes`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes })
      });
      setNotes(newNotes);
    } catch (e) {
      console.error(e);
    }
  }, [presentationId]);

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
        changeHostSlide,
        isBlackout,
        toggleBlackout,
        broadcastMessage,
        sendBroadcast,
        notes,
        saveNotes,
        clearBroadcast
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
