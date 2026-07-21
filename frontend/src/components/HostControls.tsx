import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  memo,
} from 'react';
import { sendControl } from '../api/client';
import { PresentationStatus } from '../types';

interface HostControlsProps {
  status: PresentationStatus & { viewerCount: number };
  onStatusChange: (s: PresentationStatus & { viewerCount: number }) => void;
  totalPages: number;
}

const HostControls = memo(function HostControls({
  status,
  onStatusChange,
  totalPages,
}: HostControlsProps) {
  const [jumpSlide, setJumpSlide] = useState('');
  const [isBlack, setIsBlack] = useState(status.isBlackScreen);
  const [isActing, setIsActing] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStartRef = useRef(0);

  useEffect(() => setIsBlack(status.isBlackScreen), [status.isBlackScreen]);

  // Timer execution
  useEffect(() => {
    if (timerRunning) {
      timerStartRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timerStartRef.current) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  // Reset timer when presentation changes
  useEffect(() => {
    setElapsed(0);
    setTimerRunning(false);
  }, [status.activeFile]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const act = useCallback(
    async (action: string, params?: { slide?: number; totalSlides?: number }) => {
      setIsActing(action);
      try {
        const res = await sendControl(action, params);
        onStatusChange(res);
      } catch {}
      setIsActing(null);
    },
    [onStatusChange]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          act('next');
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          act('prev');
          break;
        case 'b':
        case 'B':
          act(isBlack ? 'unblack' : 'black');
          break;
        case 'F5':
          e.preventDefault();
          if (!status.isStarted) act('start');
          break;
        case 'Escape':
          if (status.isStarted) act('end');
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [act, isBlack, status.isStarted]);

  // Touch/swipe support
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) act('next');
    else act('prev');
  };

  const slideProgress =
    totalPages > 0 ? (status.currentSlide / totalPages) * 100 : 0;

  return (
    <div
      className="flex flex-col gap-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide counter + progress */}
      <div className="relative overflow-hidden rounded-2xl bg-gray-800/50 border border-gray-700/40 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-4xl font-bold text-white tabular-nums">
              {String(status.currentSlide).padStart(2, '0')}
              <span className="text-2xl text-gray-500 font-normal">
                /{String(totalPages || status.totalSlides).padStart(2, '0')}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Current Slide</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-400">{status.viewerCount}</div>
            <div className="text-xs text-gray-500">Online</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-gray-700/50 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
            style={{ width: `${slideProgress}%` }}
          />
        </div>
      </div>

      {/* Timer */}
      <div className="rounded-2xl bg-gray-800/50 border border-gray-700/40 p-4">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-mono font-bold text-white tabular-nums">
            {fmt(elapsed)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTimerRunning((r) => !r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timerRunning
                  ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                  : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
              }`}
            >
              {timerRunning ? '⏸ Pause' : '▶ Start'}
            </button>
            <button
              onClick={() => { setElapsed(0); setTimerRunning(false); }}
              className="px-3 py-1.5 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              ↺ Reset
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-1">Presentation Timer</div>
      </div>

      {/* Main controls */}
      <div className="grid grid-cols-3 gap-3">
        {/* Prev */}
        <button
          onClick={() => act('prev')}
          disabled={isActing === 'prev' || status.currentSlide <= 1}
          className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-gray-800/60 border border-gray-700/40 hover:border-purple-500/40 hover:bg-gray-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <span className="text-2xl">←</span>
          <span className="text-xs text-gray-400 font-medium">Prev</span>
          <span className="text-xs text-gray-600">↑ / ←</span>
        </button>

        {/* Start/End */}
        {!status.isStarted ? (
          <button
            onClick={() => { act('start'); setTimerRunning(true); setElapsed(0); }}
            disabled={isActing === 'start' || !status.activeFile}
            className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-gradient-to-b from-green-600/80 to-green-700/80 hover:from-green-500/80 hover:to-green-600/80 border border-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-green-900/30"
          >
            <span className="text-2xl">▶</span>
            <span className="text-xs text-green-200 font-medium">Start</span>
            <span className="text-xs text-green-400/60">F5</span>
          </button>
        ) : (
          <button
            onClick={() => { act('end'); setTimerRunning(false); }}
            disabled={isActing === 'end'}
            className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-gradient-to-b from-red-700/80 to-red-800/80 hover:from-red-600/80 hover:to-red-700/80 border border-red-500/30 disabled:opacity-30 transition-all active:scale-95 shadow-lg shadow-red-900/30"
          >
            <span className="text-2xl">⏹</span>
            <span className="text-xs text-red-200 font-medium">End</span>
            <span className="text-xs text-red-400/60">Esc</span>
          </button>
        )}

        {/* Next */}
        <button
          onClick={() => act('next')}
          disabled={isActing === 'next' || (totalPages > 0 && status.currentSlide >= totalPages)}
          className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-gray-800/60 border border-gray-700/40 hover:border-purple-500/40 hover:bg-gray-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <span className="text-2xl">→</span>
          <span className="text-xs text-gray-400 font-medium">Next</span>
          <span className="text-xs text-gray-600">↓ / →</span>
        </button>
      </div>

      {/* Jump to slide */}
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          max={totalPages || 999}
          value={jumpSlide}
          onChange={(e) => setJumpSlide(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && jumpSlide) {
              act('jump', { slide: parseInt(jumpSlide, 10) });
              setJumpSlide('');
            }
          }}
          placeholder="Jump to slide…"
          className="flex-1 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
        />
        <button
          onClick={() => {
            if (jumpSlide) {
              act('jump', { slide: parseInt(jumpSlide, 10) });
              setJumpSlide('');
            }
          }}
          disabled={!jumpSlide}
          className="px-4 py-3 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white text-sm font-medium disabled:opacity-30 transition-colors"
        >
          Go
        </button>
      </div>

      {/* Black screen + Reveal */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => act(isBlack ? 'unblack' : 'black')}
          className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl border font-medium text-sm transition-all active:scale-95 ${
            isBlack
              ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20'
              : 'border-gray-700/40 bg-gray-800/50 text-gray-300 hover:border-gray-600'
          }`}
        >
          <span>{isBlack ? '☀️' : '🌑'}</span>
          {isBlack ? 'Show Screen' : 'Black Screen'}
        </button>

        <button
          onClick={() => act('reveal')}
          disabled={isActing === 'reveal'}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-purple-500/40 bg-purple-900/30 hover:bg-purple-800/40 text-purple-300 font-medium text-sm transition-all active:scale-95"
        >
          <span>🎭</span>
          Reveal
        </button>
      </div>

      {/* Keyboard shortcuts info */}
      <div className="rounded-xl bg-gray-800/30 border border-gray-700/30 p-3">
        <div className="text-xs text-gray-600 mb-2 font-medium">Keyboard Shortcuts</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
          <span><kbd className="text-gray-500">→ / Space</kbd> Next</span>
          <span><kbd className="text-gray-500">←</kbd> Prev</span>
          <span><kbd className="text-gray-500">B</kbd> Black screen</span>
          <span><kbd className="text-gray-500">F5</kbd> Start</span>
          <span><kbd className="text-gray-500">Esc</kbd> End</span>
          <span><kbd className="text-gray-500">Swipe</kbd> Navigate</span>
        </div>
      </div>
    </div>
  );
});

export default HostControls;
