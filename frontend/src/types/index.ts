// Viewer / Audience types
export interface Viewer {
  id: string;
  name: string;
  dob: string;
  ip: string;
  browser: string;
  sessionId: string;
  joinTime: string;
  lastSeen: string;
  isOnline: boolean;
}

// Presentation state from server
export interface PresentationStatus {
  activeFile: string | null;
  currentSlide: number;
  totalSlides: number;
  isStarted: boolean;
  isBlackScreen: boolean;
  viewerCount?: number;
}

// Presentation library entry
export interface PresentationFile {
  filename: string;
  size: number;
  modified: string;
}

// Presenter notes map: slideNumber (as string) -> note text
export type PresenterNotes = Record<string, string>;

// WebSocket message types from server
export type WSMessage =
  | { type: 'slideChange'; slide: number; activeFile?: string | null }
  | { type: 'presentationStarted'; totalSlides: number; activeFile?: string | null }
  | { type: 'presentationEnded' }
  | { type: 'viewerCountChanged'; count: number }
  | { type: 'viewerConnected'; count: number }
  | { type: 'viewerDisconnected'; count: number }
  | { type: 'blackScreen'; active: boolean; activeFile?: string | null }
  | { type: 'reveal'; activeFile?: string | null }
  | { type: 'pdfUpdated'; filename: string }
  | { type: 'pong' }
  | { type: 'identified'; role: 'viewer' | 'host' }
  | { type: 'error'; message: string };

// Auth tokens
export interface AuthTokens {
  viewerToken: string | null;
  hostToken: string | null;
}

// Control action
export type ControlAction =
  | 'start'
  | 'end'
  | 'next'
  | 'prev'
  | 'jump'
  | 'black'
  | 'unblack'
  | 'reveal'
  | 'setTotalSlides';
