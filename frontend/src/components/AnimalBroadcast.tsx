import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BroadcastPayload } from '../context/PresentationContext';

export interface MascotInfo {
  name: string;
  title: string;
  emoji: string;
  bgGradient: string;
  badgeBg: string;
}

export const MASCOTS: Record<string, MascotInfo> = {
  owl: {
    name: 'Wise Owl',
    title: 'Tips & Insights',
    emoji: '🦉',
    bgGradient: 'from-amber-400 to-orange-500',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  cat: {
    name: 'Playful Cat',
    title: 'Fun Remark',
    emoji: '🐱',
    bgGradient: 'from-pink-400 to-rose-500',
    badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
  },
  dog: {
    name: 'Alert Dog',
    title: 'Important Alert',
    emoji: '🐶',
    bgGradient: 'from-yellow-400 to-amber-500',
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
  },
  penguin: {
    name: 'Cool Penguin',
    title: 'Announcement',
    emoji: '🐧',
    bgGradient: 'from-cyan-400 to-blue-500',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  },
  fox: {
    name: 'Clever Fox',
    title: 'Quick Hint',
    emoji: '🦊',
    bgGradient: 'from-orange-400 to-red-500',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
  },
  bear: {
    name: 'Calm Bear',
    title: 'Friendly Reminder',
    emoji: '🐻',
    bgGradient: 'from-emerald-400 to-teal-500',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  }
};

export function AnimalBroadcast({
  broadcast,
  onDismiss
}: {
  broadcast: BroadcastPayload | null;
  onDismiss: () => void;
}) {
  const mascotKey = broadcast?.animal && MASCOTS[broadcast.animal] ? broadcast.animal : 'owl';
  const mascot = MASCOTS[mascotKey];

  return (
    <AnimatePresence>
      {broadcast && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="fixed bottom-6 right-6 z-50 flex items-end gap-3 max-w-sm sm:max-w-md pointer-events-auto select-none"
        >
          {/* Speech Bubble */}
          <div className="relative flex-1 bg-gray-900/95 backdrop-blur-md border border-gray-700/80 p-4 rounded-2xl shadow-2xl text-white">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-gray-800">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base">{mascot.emoji}</span>
                <span className="font-bold text-xs sm:text-sm text-gray-200 truncate">{mascot.name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${mascot.badgeBg}`}>
                  {mascot.title}
                </span>
              </div>
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800 text-xs"
                title="Dismiss"
              >
                ✕
              </button>
            </div>

            {/* Message Body */}
            <p className="text-sm sm:text-base text-gray-100 font-medium leading-snug break-words">
              {broadcast.message}
            </p>

            {/* Auto-dismiss timer progress bar */}
            <div className="mt-3 w-full bg-gray-800 rounded-full h-1 overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className={`h-full bg-gradient-to-r ${mascot.bgGradient}`}
              />
            </div>

            {/* Speech bubble tail pointing towards mascot */}
            <div className="absolute -bottom-2 right-4 w-3.5 h-3.5 bg-gray-900 border-r border-b border-gray-700/80 rotate-45" />
          </div>

          {/* Peeking Mascot Avatar */}
          <motion.div
            animate={{ 
              y: [0, -6, 0],
              rotate: [0, -3, 3, 0],
              transition: {
                y: { repeat: Infinity, duration: 2.4, ease: 'easeInOut' },
                rotate: { repeat: Infinity, duration: 2.8, ease: 'easeInOut' }
              }
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr ${mascot.bgGradient} p-0.5 shadow-2xl flex-shrink-0 cursor-pointer`}
            onClick={onDismiss}
            title={`${mascot.name} (Click to dismiss)`}
          >
            <div className="w-full h-full bg-gray-900 rounded-[14px] flex items-center justify-center">
              <span className="text-2xl sm:text-3xl select-none filter drop-shadow">
                {mascot.emoji}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
