import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Viewer } from '../types';
import { getAudience, clearAudience, getCSVExportUrl } from '../api/client';

interface AudienceTableProps {
  viewerCount: number;
}

const AudienceTable = memo(function AudienceTable({ viewerCount }: AudienceTableProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof Viewer>('joinTime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const token = localStorage.getItem('host_token') || '';

  const load = useCallback(async () => {
    try {
      const { viewers } = await getAudience();
      setViewers(viewers);
    } catch {}
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, viewerCount]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return viewers
      .filter((v) =>
        v.name.toLowerCase().includes(q) ||
        v.browser.toLowerCase().includes(q) ||
        v.ip.includes(q) ||
        v.dob.includes(q)
      )
      .sort((a, b) => {
        const av = String(a[sortKey]);
        const bv = String(b[sortKey]);
        const cmp = av.localeCompare(bv);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [viewers, search, sortKey, sortDir]);

  const handleSort = (key: keyof Viewer) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleClear = async () => {
    await clearAudience();
    setViewers([]);
    setShowClearConfirm(false);
  };

  const handleExportCSV = () => {
    const a = document.createElement('a');
    a.href = getCSVExportUrl();
    // Pass token as query param workaround for file download
    a.href = `${getCSVExportUrl()}?token=${encodeURIComponent(token)}`;
    // Use Authorization header via fetch instead
    fetch(getCSVExportUrl(), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audience-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      });
  };

  const SortIcon = ({ col }: { col: keyof Viewer }) => (
    <span className="ml-1 text-xs opacity-50">
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, browser, IP…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/30">
            {filtered.length} / {viewers.length} viewers
          </span>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Clear confirm */}
      {showClearConfirm && (
        <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-4 flex items-center justify-between">
          <p className="text-red-300 text-sm">Delete all {viewers.length} audience records?</p>
          <div className="flex gap-2">
            <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors">Cancel</button>
            <button onClick={handleClear} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-500 transition-colors">Delete All</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-700/40 overflow-hidden bg-gray-800/30">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/50 bg-gray-800/50">
                {[
                  { key: 'name', label: 'Name' },
                  { key: 'dob', label: 'DOB' },
                  { key: 'ip', label: 'IP' },
                  { key: 'browser', label: 'Browser' },
                  { key: 'joinTime', label: 'Joined' },
                  { key: 'lastSeen', label: 'Last Seen' },
                  { key: 'isOnline', label: 'Status' },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key as keyof Viewer)}
                    className="text-left px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-purple-300 transition-colors select-none whitespace-nowrap"
                  >
                    {label}
                    <SortIcon col={key as keyof Viewer} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-600 py-12">
                    No audience records found
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">{v.name}</td>
                    <td className="px-4 py-3 text-gray-400">{v.dob}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{v.ip}</td>
                    <td className="px-4 py-3 text-gray-400">{v.browser}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(v.joinTime).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(v.lastSeen).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          v.isOnline
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-gray-700/50 text-gray-500'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${v.isOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
                        {v.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default AudienceTable;
