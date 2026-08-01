import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePresentationContext } from '../context/PresentationContext';

interface Presentation {
  id: string;
  title: string;
  slideCount: number;
  uploadTimestamp: string;
}

export default function HostPage() {
  const navigate = useNavigate();
  const { hostToken, isAuthLoading } = usePresentationContext();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeSessionCode, setActiveSessionCode] = useState<string | null>(null);
  
  useEffect(() => {
    if (isAuthLoading) return;
    if (!hostToken) {
      navigate('/');
      return;
    }
    loadLibrary();
  }, [hostToken, navigate, isAuthLoading]);

  const loadLibrary = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/presentation/library`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setPresentations(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !hostToken) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/presentation/library/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        await loadLibrary();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/presentation/library/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      await loadLibrary();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/presentation/library/${id}/duplicate`, {
        method: 'POST',
        credentials: 'include'
      });
      await loadLibrary();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRename = async (id: string, currentTitle: string) => {
    const newTitle = prompt('Enter new title:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    try {
      await fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/presentation/library/${id}/rename`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      });
      await loadLibrary();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartSession = async (id: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_PUBLIC_URL}/api/session`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ presentationId: id })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSessionCode(data.sessionCode);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isAuthLoading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-purple-400 animate-pulse">Loading...</div>;
  }

  if (!hostToken) return null;

  if (activeSessionCode) {
    // Basic active session view
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">Session Active!</h1>
        <div className="bg-gray-900 p-6 md:p-8 rounded-2xl border border-purple-500 shadow-2xl text-center w-full max-w-lg">
          <p className="text-gray-400 mb-2">Share this link with your audience:</p>
          <div className="text-3xl md:text-4xl font-mono text-purple-400 font-bold mb-6 tracking-widest">{activeSessionCode}</div>
          <div className="bg-gray-800 px-4 py-3 rounded-lg mb-6 break-all font-mono text-xs md:text-sm text-gray-300">
            {`${window.location.origin}/p/${activeSessionCode}`}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button 
              onClick={() => {
                window.open(`/present/${activeSessionCode}`, '_blank');
              }}
              className="px-6 py-2 bg-purple-600 rounded-lg text-white font-medium hover:bg-purple-500 transition-colors"
            >
              Open Presenter View
            </button>
            <button 
              onClick={() => setActiveSessionCode(null)}
              className="px-6 py-2 bg-gray-800 rounded-lg text-white font-medium hover:bg-gray-700 transition-colors"
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Presentation Library</h1>
            <p className="text-gray-400 mt-1">Manage your presentations and start sessions.</p>
          </div>
          <div className="w-full sm:w-auto">
            <label className="w-full sm:w-auto flex justify-center px-6 py-3 bg-purple-600 rounded-xl text-white font-medium cursor-pointer hover:bg-purple-500 transition-colors shadow-lg">
              {uploading ? 'Uploading...' : 'Upload PDF'}
              <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500 animate-pulse">Loading library...</div>
        ) : presentations.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No presentations found. Upload one to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {presentations.map(p => (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-900/30 text-purple-400 flex items-center justify-center text-xl">📄</div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1 truncate">{p.title}</h3>
                <p className="text-sm text-gray-500 mb-6">Uploaded: {new Date(p.uploadTimestamp).toLocaleDateString()}</p>
                
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleStartSession(p.id)}
                    className="w-full px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-600/30 transition-colors mb-2"
                  >
                    Start Session
                  </button>
                  <button 
                    onClick={() => handleRename(p.id, p.title)}
                    className="flex-1 px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:text-white transition-colors"
                  >
                    Rename
                  </button>
                  <button 
                    onClick={() => handleDuplicate(p.id)}
                    className="flex-1 px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm hover:text-white transition-colors"
                  >
                    Copy
                  </button>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="flex-1 px-3 py-2 bg-red-900/20 text-red-400 rounded-lg text-sm hover:bg-red-900/40 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
