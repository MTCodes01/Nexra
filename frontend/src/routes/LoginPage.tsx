import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePresentationContext } from '../context/PresentationContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setHostToken } = usePresentationContext();
  const [mode, setMode] = useState<'viewer' | 'host_login' | 'host_register'>('viewer');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (mode === 'viewer') {
      if (!roomCode.trim()) {
        setError('Please enter a room code');
        return;
      }
      navigate(`/p/${roomCode.trim().toUpperCase()}`);
      return;
    }

    if (!username.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const endpoint = mode === 'host_login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(`${import.meta.env.VITE_PUBLIC_URL}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      setHostToken(data.hostId);
      navigate('/host', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-900/15 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="relative overflow-hidden rounded-3xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-xl shadow-2xl p-8">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-900/50 mb-4 p-3">
              <img src="/favicon.svg" alt="Nexra Logo" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {mode === 'viewer' ? 'Join Nexra Session' : 'Nexra Host Portal'}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {mode === 'viewer' 
                ? 'Enter a session code to join' 
                : mode === 'host_login' 
                  ? 'Sign in to present' 
                  : 'Create an account to present'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'viewer' ? (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Session Code
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB123C"
                  maxLength={6}
                  className="w-full px-4 py-3.5 rounded-xl bg-gray-800/60 border border-gray-700/50 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm font-mono text-center tracking-[0.25em]"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="w-full px-4 py-3.5 rounded-xl bg-gray-800/60 border border-gray-700/50 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3.5 rounded-xl bg-gray-800/60 border border-gray-700/50 text-white focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
                  />
                </div>
              </>
            )}

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
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-gray-700 disabled:to-gray-800 text-white font-semibold text-sm transition-all shadow-lg active:scale-[0.98] mt-2"
            >
              {isLoading 
                ? 'Processing…' 
                : mode === 'viewer' 
                  ? 'Join Session →'
                  : mode === 'host_login' 
                    ? 'Sign In →' 
                    : 'Create Account →'}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center text-xs">
            {mode === 'viewer' ? (
              <button
                onClick={() => { setMode('host_login'); setError(null); }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Host a presentation? Sign in here
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setMode(mode === 'host_login' ? 'host_register' : 'host_login'); setError(null); }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {mode === 'host_login' ? "Don't have an account? Register" : "Already have an account? Sign in"}
                </button>
                <button
                  onClick={() => { setMode('viewer'); setError(null); }}
                  className="text-gray-500 hover:text-gray-300 transition-colors mt-2"
                >
                  Have a code?
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
