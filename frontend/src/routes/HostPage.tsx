import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  memo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loginHost, getHostState, changePassword, sendControl, clearAllData } from '../api/client';
import { usePresentationContext } from '../context/PresentationContext';
import PDFViewer from '../components/PDFViewer';
import HostControls from '../components/HostControls';
import AudienceTable from '../components/AudienceTable';
import PresentationLibrary from '../components/PresentationLibrary';
import PresenterNotesPanel from '../components/PresenterNotes';
import RevealModal from '../components/RevealModal';
import { PresentationStatus } from '../types';

// ── Host Login Gate ────────────────────────────────────────────────────────────
function HostLoginGate({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { token } = await loginHost(password);
      localStorage.setItem('host_token', token);
      onLogin(token);
    } catch (err: any) {
      setError(err.message || 'Invalid password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-900/15 rounded-full blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-sm"
      >
        <div className="relative overflow-hidden rounded-3xl border border-gray-700/50 bg-gray-900/90 backdrop-blur-xl p-8 shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-800 flex items-center justify-center shadow-lg mb-4">
              <span className="text-3xl">🎛️</span>
            </div>
            <h1 className="text-xl font-bold text-white">Host Panel</h1>
            <p className="text-gray-500 text-sm mt-1">Presenter access only</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter host password"
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-gray-800/60 border border-gray-700/50 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm"
              />
            </div>
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-900/30 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-purple-900/40 active:scale-[0.98]"
            >
              {isLoading ? 'Authenticating…' : 'Enter Host Panel →'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ── Change Password Modal ──────────────────────────────────────────────────────
const ChangePasswordModal = memo(function ChangePasswordModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { setError('Passwords do not match'); return; }
    if (next.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(null);
    setIsLoading(true);
    try {
      await changePassword(current, next);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-gray-700/50 bg-gray-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-5">Change Password</h2>
        {success ? (
          <div className="py-6 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-green-400 font-medium">Password updated!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Current Password', val: current, set: setCurrent },
              { label: 'New Password', val: next, set: setNext },
              { label: 'Confirm New Password', val: confirm, set: setConfirm },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
                <input
                  type="password"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                />
              </div>
            ))}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 text-sm font-medium hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {isLoading ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
});

// ── Main Host Page ─────────────────────────────────────────────────────────────
type Tab = 'presentation' | 'audience' | 'library' | 'settings';

export default function HostPage() {
  const { token: viewerToken, setToken, pdfUrl, pdfToken, viewerCount, isConnected, showReveal, dismissReveal } = usePresentationContext();

  const [hostToken, setHostToken] = useState<string | null>(localStorage.getItem('host_token'));
  const [activeTab, setActiveTab] = useState<Tab>('presentation');
  const [status, setStatus] = useState<PresentationStatus & { viewerCount: number }>({
    activeFile: null,
    currentSlide: 1,
    totalSlides: 0,
    isStarted: false,
    isBlackScreen: false,
    viewerCount: 0,
  });
  const [totalPages, setTotalPages] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [confirmClearData, setConfirmClearData] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);

  const hostPdfUrl = hostToken && status.activeFile
    ? `/api/presentation/pdf?v=${encodeURIComponent(status.activeFile)}`
    : pdfUrl;

  const handleClearAllData = async () => {
    setIsClearingData(true);
    try {
      await clearAllData();
      setConfirmClearData(false);
      setStatus({
        activeFile: null,
        currentSlide: 1,
        totalSlides: 0,
        isStarted: false,
        isBlackScreen: false,
        viewerCount: 0,
      });
    } catch {}
    setIsClearingData(false);
  };

  // Use host token for WS + API
  useEffect(() => {
    if (hostToken) {
      // Replace viewer token with host token in the context
      localStorage.setItem('host_token', hostToken);
    }
  }, [hostToken]);

  // Load initial state when host logs in
  useEffect(() => {
    if (!hostToken) return;
    getHostState()
      .then((s) => setStatus({ ...s, viewerCount: s.viewerCount || 0 }))
      .catch(() => {});
  }, [hostToken]);

  // Keep viewerCount in sync from context
  useEffect(() => {
    setStatus((prev) => ({ ...prev, viewerCount }));
  }, [viewerCount]);

  const handleLogin = (token: string) => {
    setHostToken(token);
    setToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('host_token');
    setHostToken(null);
  };

  const handleStatusChange = (newStatus: Partial<PresentationStatus & { viewerCount: number }>) => {
    setStatus((prev) => ({ ...prev, ...newStatus }) as PresentationStatus & { viewerCount: number });
  };

  const handleTotalPagesLoaded = useCallback((n: number) => {
    setTotalPages(n);
    if (n !== status.totalSlides && hostToken) {
      sendControl('setTotalSlides', { totalSlides: n }).catch(() => {});
    }
  }, [status.totalSlides, hostToken]);

  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 50) return;
    const action = dx < 0 ? 'next' : 'prev';
    sendControl(action)
      .then((res) => handleStatusChange(res))
      .catch(() => {});
  };

  if (!hostToken) {
    return <HostLoginGate onLogin={handleLogin} />;
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'presentation', label: 'Present', icon: '🎬' },
    { id: 'audience', label: 'Audience', icon: '👥' },
    { id: 'library', label: 'Library', icon: '📚' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <header className="flex-shrink-0 border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-sm">
              🎤
            </div>
            <div>
              <div className="text-sm font-bold text-white">Seminar Host</div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-500">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </div>

          {/* Status pills */}
          <div className="hidden sm:flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
              status.isStarted
                ? 'bg-green-500/15 border-green-500/30 text-green-400'
                : 'bg-gray-800/50 border-gray-700/30 text-gray-500'
            }`}>
              {status.isStarted ? '● Live' : '○ Idle'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/15 border border-purple-500/30 text-purple-400">
              {status.viewerCount} viewers
            </span>
            {status.activeFile && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-800/50 border border-gray-700/30 text-gray-400 max-w-[150px] truncate">
                {status.activeFile}
              </span>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Tab navigation */}
      <nav className="flex-shrink-0 border-b border-gray-800/50 bg-gray-900/60 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-300'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id === 'audience' && status.viewerCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-purple-500/30 text-purple-300 text-xs flex items-center justify-center font-bold">
                  {status.viewerCount > 9 ? '9+' : status.viewerCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            {/* ── Presentation Tab ── */}
            {activeTab === 'presentation' && (
              <motion.div
                key="presentation"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6"
              >
                {/* Left: Preview */}
                <div className="space-y-4">
                  {/* PDF Preview */}
                  <div 
                    className="relative overflow-hidden rounded-2xl border border-gray-700/40 bg-gray-900 aspect-video"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  >
                    {status.activeFile ? (
                      <>
                        <PDFViewer
                          url={hostPdfUrl || `/api/presentation/pdf`}
                          token={hostToken}
                          currentSlide={status.currentSlide}
                          onTotalPagesLoaded={handleTotalPagesLoaded}
                          className="w-full h-full"
                        />
                        {/* Fullscreen button */}
                        <button
                          onClick={() => setIsFullscreen(true)}
                          className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                          title="Fullscreen preview"
                        >
                          ⛶
                        </button>
                        {/* Black screen overlay */}
                        {status.isBlackScreen && (
                          <div className="absolute inset-0 bg-black flex items-center justify-center">
                            <span className="text-gray-700 text-sm">Black Screen Active</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                        <div className="text-5xl mb-3">📋</div>
                        <p className="text-sm">No presentation selected</p>
                        <button
                          onClick={() => setActiveTab('library')}
                          className="mt-3 px-4 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-400 text-sm transition-colors"
                        >
                          Open Library →
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Presenter Notes */}
                  <div className="rounded-2xl border border-gray-700/40 bg-gray-900/50 p-4">
                    <PresenterNotesPanel currentSlide={status.currentSlide} activeFile={status.activeFile} />
                  </div>
                </div>

                {/* Right: Controls */}
                <div className="rounded-2xl border border-gray-700/40 bg-gray-900/50 p-4 h-fit lg:sticky lg:top-4">
                  <HostControls
                    status={status}
                    onStatusChange={handleStatusChange}
                    totalPages={totalPages}
                  />
                </div>
              </motion.div>
            )}

            {/* ── Audience Tab ── */}
            {activeTab === 'audience' && (
              <motion.div
                key="audience"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-white">Audience</h2>
                  <p className="text-gray-500 text-sm mt-0.5">Live attendee list</p>
                </div>
                <AudienceTable viewerCount={status.viewerCount} />
              </motion.div>
            )}

            {/* ── Library Tab ── */}
            {activeTab === 'library' && (
              <motion.div
                key="library"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-white">Presentation Library</h2>
                  <p className="text-gray-500 text-sm mt-0.5">Manage your PDF presentations</p>
                </div>
                <PresentationLibrary
                  activeFile={status.activeFile}
                  onSelect={(filename) => {
                    setStatus((prev) => ({ 
                      ...prev, 
                      activeFile: filename, 
                      currentSlide: 1,
                      isStarted: false,
                      isBlackScreen: false
                    }));
                    setActiveTab('presentation');
                  }}
                />
              </motion.div>
            )}

            {/* ── Settings Tab ── */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="max-w-xl space-y-4"
              >
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-white">Settings</h2>
                  <p className="text-gray-500 text-sm mt-0.5">Host panel configuration</p>
                </div>

                {/* Change password card */}
                <div className="rounded-2xl border border-gray-700/40 bg-gray-900/50 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold text-sm">Admin Password</h3>
                      <p className="text-gray-500 text-xs mt-0.5">Update your host panel password</p>
                    </div>
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="px-4 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* QR code info */}
                <div className="rounded-2xl border border-gray-700/40 bg-gray-900/50 p-5">
                  <h3 className="text-white font-semibold text-sm mb-2">Audience URL</h3>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/40">
                    <code className="text-purple-300 text-sm font-mono break-all">
                      {window.location.origin}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(window.location.origin)}
                      className="ml-auto text-gray-500 hover:text-gray-300 text-sm transition-colors flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Clear All Data */}
                <div className="rounded-2xl border border-red-900/40 bg-red-900/10 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-white font-semibold text-sm">Clear All Data</h3>
                      <p className="text-gray-400 text-xs mt-0.5">Wipe all audience logs, presenter notes, and reset presentation state</p>
                    </div>
                    {confirmClearData ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={handleClearAllData}
                          disabled={isClearingData}
                          className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {isClearingData ? 'Clearing…' : 'Confirm Clear'}
                        </button>
                        <button
                          onClick={() => setConfirmClearData(false)}
                          className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmClearData(true)}
                        className="px-4 py-2 rounded-xl bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-red-400 hover:text-red-300 text-sm font-medium transition-colors flex-shrink-0"
                      >
                        Clear Data
                      </button>
                    )}
                  </div>
                </div>

                {/* Sign out */}
                <div className="rounded-2xl border border-red-900/30 bg-red-900/10 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold text-sm">Sign Out</h3>
                      <p className="text-gray-500 text-xs mt-0.5">Clear host session</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-xl bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Fullscreen PDF preview */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <PDFViewer
              url={hostPdfUrl || `/api/presentation/pdf`}
              token={hostToken}
              currentSlide={status.currentSlide}
              className="w-full h-full"
            />
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-lg transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change password modal */}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {/* Reveal modal */}
      <RevealModal visible={showReveal} onDismiss={dismissReveal} />
    </div>
  );
}
