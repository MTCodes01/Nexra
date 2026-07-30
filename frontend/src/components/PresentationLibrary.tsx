import React, { useState, useEffect, useCallback, memo } from 'react';
import { PresentationFile } from '../types';
import { getLibrary, uploadPresentation, selectPresentation, deletePresentation } from '../api/client';

interface PresentationLibraryProps {
  activeFile: string | null;
  onSelect: (filename: string) => void;
}

const PresentationLibrary = memo(function PresentationLibrary({
  activeFile,
  onSelect,
}: PresentationLibraryProps) {
  const [files, setFiles] = useState<PresentationFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { files } = await getLibrary();
      setFiles(files);
    } catch (e: any) {
      setError(e.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.pdf')) {
      setError('Only PDF files are allowed');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(`Uploading ${file.name}…`);

    try {
      const { filename } = await uploadPresentation(file, (percent) => {
        setUploadProgress(`Uploading ${file.name} (${percent}%)`);
      });
      setUploadProgress('Upload complete!');
      await load();
      setTimeout(() => setUploadProgress(''), 2000);
    } catch (err: any) {
      setError(err.message);
      setUploadProgress('');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSelect = async (filename: string) => {
    try {
      await selectPresentation(filename);
      onSelect(filename);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      await deletePresentation(filename);
      setDeleteTarget(null);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Header & Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Your Library</h2>
        <button
          onClick={load}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {/* Upload */}
      <div className="relative">
        <label
          htmlFor="pdf-upload"
          className={`group flex items-center gap-3 w-full px-5 py-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
            isUploading
              ? 'border-purple-500/50 bg-purple-900/10 cursor-wait'
              : 'border-gray-700/50 hover:border-purple-500/50 hover:bg-purple-900/10'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
            <span className="text-xl">{isUploading ? '⏳' : '📄'}</span>
          </div>
          <div>
            <p className="text-white font-medium text-sm">
              {isUploading ? uploadProgress : 'Upload New Presentation'}
            </p>
            <p className="text-gray-500 text-xs">PDF files up to 300MB</p>
          </div>
          {!isUploading && (
            <div className="ml-auto px-3 py-1.5 rounded-lg bg-purple-600/80 text-white text-xs font-medium">
              Browse
            </div>
          )}
        </label>
        <input
          id="pdf-upload"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleUpload}
          disabled={isUploading}
        />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* File list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <div className="text-4xl mb-3">📂</div>
          <p>No presentations in library</p>
          <p className="text-sm mt-1">Upload your first PDF above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => {
            const isActive = file.filename === activeFile;
            return (
              <div
                key={file.filename}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'border-purple-500/50 bg-purple-900/20'
                    : 'border-gray-700/40 bg-gray-800/30 hover:border-gray-600/50'
                }`}
              >
                {/* PDF icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg ${isActive ? 'bg-purple-500/30' : 'bg-gray-700/50'}`}>
                  📋
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{file.filename}</p>
                  <p className="text-gray-500 text-xs">
                    {formatSize(file.size)} · {new Date(file.modified).toLocaleDateString()}
                  </p>
                </div>

                {/* Active badge */}
                {isActive && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 flex-shrink-0">
                    Active
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => handleSelect(file.filename)}
                      className="px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
                    >
                      Select
                    </button>
                  )}
                  {deleteTarget === file.filename ? (
                    <>
                      <button
                        onClick={() => handleDelete(file.filename)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteTarget(null)}
                        className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteTarget(file.filename)}
                      className="w-8 h-8 rounded-lg bg-red-900/20 hover:bg-red-900/40 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors flex items-center justify-center text-sm"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default PresentationLibrary;
