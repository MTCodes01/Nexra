import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RevealModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const RevealModal = memo(function RevealModal({ visible, onDismiss }: RevealModalProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative max-w-2xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Card */}
            <div className="relative overflow-hidden rounded-xl border border-gray-700 bg-gray-900 p-8 md:p-10 shadow-2xl">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                  <span className="text-3xl">💡</span>
                </div>
              </div>

              {/* Heading */}
              <h1 className="text-2xl md:text-3xl font-bold text-center text-white mb-2">
                Important Disclosure
              </h1>

              {/* Subheading */}
              <p className="text-base text-gray-400 text-center font-medium mb-8">
                A critical lesson in cybersecurity
              </p>

              {/* Message */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8 text-center">
                <p className="text-gray-200 text-base leading-relaxed">
                  The login page you used to join this seminar was actually a <strong className="text-white">simulated phishing trap</strong>.
                  By entering your name and date of birth, you demonstrated how easily personal information can be collected on unfamiliar or unverified websites.
                </p>
                <p className="text-gray-400 text-sm mt-4">
                  (Don't worry, your data is safe. It was only collected for this educational demonstration and will be deleted immediately after the seminar.)
                </p>
              </div>

              {/* Key takeaway */}
              <div className="flex flex-col gap-4 mb-8">
                {[
                  { icon: '🔍', text: 'Always verify the URL before entering credentials' },
                  { icon: '🛡️', text: 'Be cautious of unexpected login prompts' },
                  { icon: '🔐', text: 'Use a password manager to protect against fake sites' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-4 text-sm text-gray-300">
                    <span className="text-lg flex-shrink-0 bg-gray-800 w-8 h-8 rounded flex items-center justify-center border border-gray-700">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Dismiss */}
              <button
                onClick={onDismiss}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-base transition-colors"
              >
                Back to Presentation
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default RevealModal;
