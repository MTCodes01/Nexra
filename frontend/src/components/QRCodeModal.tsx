import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  sessionCode: string;
  isOpen?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

export default function QRCodeModal({ sessionCode, isOpen = true, onClose, inline = false }: Props) {
  const [copied, setCopied] = useState(false);
  if (!isOpen && !inline) return null;

  const joinUrl = `${window.location.origin}/p/${sessionCode.toUpperCase()}`;

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const card = (
    <div className="flex flex-col items-center text-center p-6 bg-gray-900 border border-purple-500/30 rounded-3xl shadow-2xl max-w-sm w-full mx-auto">
      <div className="flex items-center justify-between w-full mb-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>📱</span> Scan to Join Presentation
        </h3>
        {onClose && !inline && (
          <button onClick={onClose} className="text-gray-400 hover:text-white text-base">✕</button>
        )}
      </div>

      <div className="p-3 bg-white rounded-2xl shadow-lg my-2">
        <QRCodeSVG value={joinUrl} size={190} level="M" />
      </div>

      <p className="text-xs text-gray-400 mt-2">Scan with any device camera to sync live</p>
      
      <div className="mt-3 px-3 py-1 bg-gray-800 rounded-lg text-purple-400 font-mono font-bold tracking-widest text-xl">
        {sessionCode.toUpperCase()}
      </div>

      <button
        onClick={copyLink}
        className="mt-4 w-full py-2 px-4 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
      >
        {copied ? '✓ Link Copied' : 'Copy Join Link'}
      </button>
    </div>
  );

  if (inline) return card;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        {card}
      </div>
    </div>
  );
}
