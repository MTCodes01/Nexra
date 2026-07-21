import React, { memo } from 'react';

interface SlideOverlayProps {
  isStarted: boolean;
  isBlackScreen: boolean;
  isReconnecting: boolean;
}

const SlideOverlay = memo(function SlideOverlay({
  isStarted,
  isBlackScreen,
  isReconnecting,
}: SlideOverlayProps) {
  if (isReconnecting) {
    return (
      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-gray-950">
        <div className="w-10 h-10 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-yellow-300 text-lg font-medium animate-pulse">Reconnecting…</p>
        <p className="text-gray-500 text-sm mt-2">Please wait</p>
      </div>
    );
  }

  if (isBlackScreen) {
    return <div className="absolute inset-0 z-40 bg-black" />;
  }

  if (!isStarted) {
    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gray-950">
        {/* Ambient background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl animate-pulse-slow" />
        </div>

        <div className="relative text-center">
          {/* Spinning loader */}
          <div className="relative w-16 h-16 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-purple-400/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Waiting for presenter…</h2>
          <p className="text-gray-500 text-sm">The presentation will begin shortly</p>

          {/* Decorative dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
});

export default SlideOverlay;
