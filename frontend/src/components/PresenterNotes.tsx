import React, { useState, useEffect, useCallback, memo } from 'react';
import { PresenterNotes } from '../types';
import { getNotes, saveNotes } from '../api/client';

interface PresenterNotesProps {
  currentSlide: number;
  activeFile?: string | null;
}

const PresenterNotesPanel = memo(function PresenterNotesPanel({
  currentSlide,
  activeFile,
}: PresenterNotesProps) {
  const [notes, setNotes] = useState<PresenterNotes>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    getNotes()
      .then(({ notes }) => setNotes(notes))
      .catch(() => {});
  }, []);

  const noteKey = activeFile ? `${activeFile}::${currentSlide}` : String(currentSlide);
  const currentNote = notes[noteKey] ?? notes[String(currentSlide)] ?? '';

  const handleChange = useCallback(
    async (value: string) => {
      const updated = { ...notes, [noteKey]: value };
      setNotes(updated);

      // Debounced auto-save
      setIsSaving(true);
      try {
        await saveNotes(updated);
        setSavedAt(new Date());
      } catch {}
      setIsSaving(false);
    },
    [notes, noteKey]
  );

  const activeSlideKeys = Object.keys(notes)
    .filter((k) => notes[k]?.trim())
    .map((k) => {
      if (activeFile && k.startsWith(`${activeFile}::`)) {
        return k.split('::')[1];
      }
      if (!k.includes('::')) {
        return k;
      }
      return null;
    })
    .filter((s): s is string => s !== null);

  const uniqueSlideKeys = Array.from(new Set(activeSlideKeys)).sort(
    (a, b) => Number(a) - Number(b)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-purple-400">📝</span>
          <h3 className="text-sm font-semibold text-gray-300">
            Notes — Slide {currentSlide}
          </h3>
        </div>
        {isSaving ? (
          <span className="text-xs text-gray-500 animate-pulse">Saving…</span>
        ) : savedAt ? (
          <span className="text-xs text-green-500">
            Saved {savedAt.toLocaleTimeString()}
          </span>
        ) : null}
      </div>

      <textarea
        value={currentNote}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={`Notes for slide ${currentSlide}…`}
        className="flex-1 w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700/50 text-gray-200 placeholder-gray-600 text-sm resize-none focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors leading-relaxed"
        rows={6}
      />

      {/* Slide indicators */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {uniqueSlideKeys.map((k) => (
          <span
            key={k}
            className={`px-2 py-0.5 rounded-md text-xs font-medium ${
              k === String(currentSlide)
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40'
                : 'bg-gray-700/50 text-gray-500'
            }`}
          >
            {k}
          </span>
        ))}
        {uniqueSlideKeys.length === 0 && (
          <span className="text-xs text-gray-600">No notes yet</span>
        )}
      </div>
    </div>
  );
});

export default PresenterNotesPanel;
