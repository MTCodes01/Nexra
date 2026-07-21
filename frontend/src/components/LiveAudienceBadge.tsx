import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveAudienceBadgeProps {
  count: number;
  visible: boolean;
}

const LiveAudienceBadge = memo(function LiveAudienceBadge({ count, visible }: LiveAudienceBadgeProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-4 right-4 z-50"
        >
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gray-900/80 backdrop-blur-md px-4 py-3 shadow-2xl">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-purple-500/5 rounded-2xl" />

            <div className="relative flex items-center gap-3">
              {/* Pulsing dot */}
              <div className="relative flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping opacity-75" />
              </div>

              <div>
                <div className="text-xl font-bold text-white leading-none">
                  {count}{' '}
                  <span className="text-sm font-normal text-gray-400">online</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default LiveAudienceBadge;
