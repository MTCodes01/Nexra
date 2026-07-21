import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { loginViewer } from '../api/client';

import { usePresentationContext } from '../context/PresentationContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setToken } = usePresentationContext();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !dob) {
        setError('Please fill in all fields');
        return;
      }
      setError(null);
      setIsLoading(true);
      try {
        const { token } = await loginViewer(name, dob);
        sessionStorage.setItem('viewer_token', token);
        setToken(token);
        navigate('/viewer', { replace: true });
      } catch (err: any) {
        setError(err.message || 'Failed to join. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [name, dob, navigate]
  );

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-900/15 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(168,85,247,1) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-xl shadow-2xl p-8">
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-900/50 mb-4">
              <span className="text-3xl">🎤</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Live Seminar</h1>
            <p className="text-gray-400 text-sm mt-1">Interactive Session</p>
          </div>

          {/* Tagline */}
          <div className="rounded-xl bg-purple-900/20 border border-purple-500/20 px-4 py-3 mb-6">
            <p className="text-purple-300 text-xs text-center leading-relaxed">
              Welcome! Please register to join the live presentation.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                id="login-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-gray-800/60 border border-gray-700/50 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Date of Birth
              </label>
              <input
                id="login-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-gray-800/60 border border-gray-700/50 text-white focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm [color-scheme:dark]"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="px-4 py-3 rounded-xl bg-red-900/30 border border-red-500/30 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-gray-700 disabled:to-gray-800 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 active:scale-[0.98] disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Joining…
                </span>
              ) : (
                'Join Presentation →'
              )}
            </button>
          </form>

          {/* Host link */}
          <div className="mt-6 text-center">
            <a
              href="/host"
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Presenter? →
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
