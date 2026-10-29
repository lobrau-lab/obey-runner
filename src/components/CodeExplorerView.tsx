import React, { useState } from 'react';
import { SOURCE_FILES, CodeFile } from '../data/sourceCode';
import { FileCode, Copy, Check, Search, ShieldCheck, Zap, AlertCircle } from 'lucide-react';

export const CodeExplorerView: React.FC = () => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeHighlight, setActiveHighlight] = useState<number | null>(null);

  const file = SOURCE_FILES[selectedFileIndex] || SOURCE_FILES[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(file.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = file.code.split('\n');

  return (
    <div className="space-y-4">
      {/* Top File Selector and Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* File tabs */}
        <div className="flex flex-wrap gap-2">
          {SOURCE_FILES.map((f, idx) => (
            <button
              key={f.name}
              onClick={() => {
                setSelectedFileIndex(idx);
                setActiveHighlight(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                selectedFileIndex === idx
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              {f.name}
            </button>
          ))}
        </div>

        {/* Search & Copy */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono w-44"
            />
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* File Description & Patch Highlights */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div>
            <div className="font-mono text-xs text-indigo-400 font-semibold">{file.path}</div>
            <p className="text-xs text-slate-400 mt-0.5">{file.description}</p>
          </div>
          <span className="text-[11px] font-mono text-slate-500">{lines.length} lines</span>
        </div>

        {/* Patch Highlights Chips */}
        {file.highlights.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-semibold text-slate-400">Patch Highlights:</span>
            {file.highlights.map((h, hIdx) => {
              const isActive = activeHighlight === hIdx;
              return (
                <button
                  key={hIdx}
                  onClick={() => setActiveHighlight(isActive ? null : hIdx)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : h.type === 'security'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20'
                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20'
                  }`}
                >
                  {h.type === 'security' ? (
                    <ShieldCheck className="w-3 h-3 text-rose-400" />
                  ) : (
                    <Zap className="w-3 h-3 text-indigo-400" />
                  )}
                  {h.title} (L{h.lineStart}-{h.lineEnd})
                </button>
              );
            })}
          </div>
        )}

        {/* Highlight detail if selected */}
        {activeHighlight !== null && file.highlights[activeHighlight] && (
          <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs text-amber-200">
            <strong>{file.highlights[activeHighlight].title}: </strong>
            {file.highlights[activeHighlight].description}
          </div>
        )}
      </div>

      {/* Code Viewer with Line Numbers */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((lineText, idx) => {
                const lineNum = idx + 1;
                const highlight = file.highlights.find(
                  h => lineNum >= h.lineStart && lineNum <= h.lineEnd
                );
                const isSelectedHighlight =
                  activeHighlight !== null &&
                  lineNum >= file.highlights[activeHighlight]?.lineStart &&
                  lineNum <= file.highlights[activeHighlight]?.lineEnd;

                const matchesSearch =
                  searchQuery.trim() !== '' &&
                  lineText.toLowerCase().includes(searchQuery.toLowerCase());

                return (
                  <tr
                    key={lineNum}
                    className={`transition-colors ${
                      isSelectedHighlight
                        ? 'bg-amber-500/15'
                        : highlight
                        ? highlight.type === 'security'
                          ? 'bg-rose-950/20'
                          : 'bg-indigo-950/20'
                        : matchesSearch
                        ? 'bg-cyan-950/30'
                        : 'hover:bg-slate-900/50'
                    }`}
                  >
                    <td className="w-12 py-0.5 px-3 text-right select-none text-slate-600 border-r border-slate-900 bg-slate-950/90 text-[11px]">
                      {lineNum}
                    </td>
                    <td className="py-0.5 px-4 text-slate-300 whitespace-pre">
                      {lineText || ' '}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
