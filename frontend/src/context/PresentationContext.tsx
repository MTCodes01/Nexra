import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

export interface SessionSettings {
  allowManualReading: boolean;
  enableDownload: boolean;
  defaultZoom: number; // Used for slideQuality (100 = 1x, 200 = 2x, 300 = 3x)
}

interface PresentationContextValue {
  // Session details
  sessionCode: string | null;
  presentationId: string | null;
  presentationTitle: string | null;
  
  // State
  currentSlide: number;
  totalSlides: number;
  setTotalSlides: (total: number) => void;
  viewerCount: number;
  settings: SessionSettings | null;
  
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
  isAuthLoading: boolean;
  changeHostSlide: (slide: number) => void;
  updateSettings: (newSettings: Partial<SessionSettings>) => Promise<void>;
  regenerateSessionCode: () => Promise<void>;
  
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
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [presentationTitle, setPresentationTitle] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [hostSlide, setHostSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [settings, setSettings] = useState<SessionSettings | null>(null);
  
  const [isManualMode, setIsManualMode] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const [isBlackout, setIsBlackout] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        let res = await fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/auth/me`, { credentials: 'include' });
        
        // If expired, try refresh
        if (res.status === 401) {
          const refreshRes = await fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
          });
          if (refreshRes.ok) {
            // Retry /me
            res = await fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/auth/me`, { credentials: 'include' });
          }
        }
        
        if (res.ok) {
          const data = await res.json();
          setHostToken(data.hostId);
        } else {
          setHostToken(null);
        }
      } catch (e) {
        setHostToken(null);
      } finally {
        setIsAuthLoading(false);
      }
    };
    
    checkAuth();
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
      setViewerCount(data.viewerCount || 0);
      setSettings(data.settings || null);
      if (data.settings && !data.settings.allowManualReading) {
        setIsManualMode(false);
      }
      if (data.notes) setNotes(data.notes);
      
      // Connect WebSocket
      const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
      const wsUrlObj = new URL('/ws', baseUrl);
      wsUrlObj.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(wsUrlObj.toString());
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
          } else if (msg.type === 'settings_updated') {
            setSettings(msg.settings);
            if (!msg.settings.allowManualReading) {
              setIsManualMode(false);
            }
          } else if (msg.type === 'session_code_changed') {
            if (role === 'host') {
              window.location.replace(`/present/${msg.newCode}`);
            } else {
              window.location.replace(`/p/${msg.newCode}`);
            }
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

  const updateSettings = useCallback(async (newSettings: Partial<SessionSettings>) => {
    if (!sessionCode) return;
    try {
      const merged = { ...settings, ...newSettings } as SessionSettings;
      const res = await fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/session/${sessionCode}/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        setSettings(merged);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'settings_updated', settings: merged }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [sessionCode, settings]);

  const regenerateSessionCode = useCallback(async () => {
    if (!sessionCode) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/session/${sessionCode}/regenerate-code`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'session_code_changed', newCode: data.sessionCode }));
        }
        window.location.replace(`/present/${data.sessionCode}`);
      }
    } catch (e) {
      console.error(e);
    }
  }, [sessionCode]);

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
        setTotalSlides,
        viewerCount,
        settings,
        isManualMode,
        setIsManualMode,
        syncSlide,
        isConnected,
        isReconnecting,
        joinSession,
        leaveSession,
        hostToken,
        setHostToken,
        isAuthLoading,
        changeHostSlide,
        updateSettings,
        regenerateSessionCode,
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
