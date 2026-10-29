import React, { useState } from 'react';
import { PATCH_ITEMS } from '../data/sourceCode';
import { ShieldCheck, CheckCircle2, AlertCircle, FileCode, ArrowRight, Lock, Terminal, RefreshCw } from 'lucide-react';

export const PatchAuditView: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<number>(1);
  const [filter, setFilter] = useState<'all' | 'blockers' | 'security'>('all');

  const filteredItems = PATCH_ITEMS.filter(item => {
    if (filter === 'blockers') return item.severity === 'BLOCKER';
    if (filter === 'security') return item.severity === 'SECURITY';
    return true;
  });

  const activeDetail = PATCH_ITEMS.find(item => item.id === selectedItem) || PATCH_ITEMS[0];

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-900/40 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                MERGE READY
              </span>
              <h2 className="text-lg font-bold text-white">Patch 4 Audit & Technical Review Summary</h2>
            </div>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              All 4 blocking items and secondary security defects have been systematically closed.
              The success gate is centralized, loops cannot poison the skill store, timing attack vulnerabilities are neutralized,
              and cross-tenant prompt leakage is prevented.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter:</span>
            <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                All (8)
              </button>
              <button
                onClick={() => setFilter('blockers')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filter === 'blockers' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Blockers (4)
              </button>
              <button
                onClick={() => setFilter('security')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${filter === 'security' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Security (2)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Patch Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List of items */}
        <div className="lg:col-span-5 space-y-2.5">
          {filteredItems.map(item => {
            const isSelected = item.id === selectedItem;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide ${
                        item.severity === 'BLOCKER'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : item.severity === 'SECURITY'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {item.tag}
                    </span>
                    <span className="text-xs font-mono text-slate-400 truncate max-w-[180px]">
                      {item.file}
                    </span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {item.problem}
                </p>
              </div>
            );
          })}

          {/* Cleared non-issues callout */}
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl mt-4">
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Prior Non-Issues Clarified (Retained from Patch 3)
            </h4>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li>• <strong className="text-slate-300">rules.py dead strict branch:</strong> Removed in patch 3; guarded via <code className="text-cyan-300">enable_shell: false</code> in strict config.</li>
              <li>• <strong className="text-slate-300">web_fetch approval:</strong> <code className="text-cyan-300">requires_approval=False</code>, protected by robust SSRF IP validation.</li>
              <li>• <strong className="text-slate-300">Skill keywords:</strong> Uses tokenized matching with a 2-keyword threshold, not naive substring <code className="text-cyan-300">k in low</code>.</li>
            </ul>
          </div>
        </div>

        {/* Selected Item Detail */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 sticky top-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded tracking-wide ${
                      activeDetail.severity === 'BLOCKER'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : activeDetail.severity === 'SECURITY'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {activeDetail.tag}
                  </span>
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-800/40">
                    {activeDetail.file}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{activeDetail.title}</h3>
              </div>
            </div>

            {/* Problem Section */}
            <div className="bg-rose-950/20 border border-rose-900/30 rounded-lg p-3.5">
              <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Defect / Security Risk
              </h4>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                {activeDetail.problem}
              </p>
            </div>

            {/* Solution Section */}
            <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-3.5">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Architectural Resolution in Patch 4
              </h4>
              <p className="text-xs text-emerald-200/90 leading-relaxed font-mono">
                {activeDetail.solution}
              </p>
            </div>

            {/* Impact Section */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3.5">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Operational & Security Impact
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeDetail.impact}
              </p>
            </div>

            {/* Code Highlight Snippet based on item */}
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-xs">
              <div className="text-[11px] text-slate-400 mb-1.5 flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-amber-400" /> Patch 4 Implementation Excerpt
                </span>
                <span className="text-emerald-400 font-semibold">Verified Active</span>
              </div>
              <pre className="text-slate-300 overflow-x-auto p-1 leading-snug">
                {selectedItem === 1 && `def _trace_succeeded(self, final_text: str, trace: ExecutionTrace) -> bool:
    if not final_text or final_text == "NO OUTPUT":
        return False
    if final_text.startswith(ERROR_PREFIXES):
        return False
    return not any(s.result.startswith(ERROR_PREFIXES) for s in trace.steps)`}

                {selectedItem === 2 && `ERROR_PREFIXES = (
    # _dispatch-produced
    "TOOL ERROR", "TOOL BLOCKED", "TOOL ARG ERROR", "UNKNOWN TOOL",
    # _step_once-produced
    "MODEL ERROR", "MAX ITERATIONS",
    # generic tool failure prefix (edit_file, shell, etc.)
    "ERROR", "BLOCKED",
    # compound tool failure prefixes
    "SEARCH ERROR", "FETCH ERROR", "FETCH BLOCKED", "SYNTAX ERROR",
)`}

                {selectedItem === 3 && `def step(self, order: str) -> str:
    trace = self.tracker.start(order)
    final_text = self._step_once(order, tracker=trace)
    success = self._trace_succeeded(final_text, trace)
    trace = self.tracker.finish(success=success)
    self._learn_from_trace(trace)
    return final_text or "NO OUTPUT"`}

                {selectedItem === 4 && `# In interfaces/api.py run_order():
cfg.memory.semantic_top_k = 0
cfg.learning.enabled = False
runner = Runner(cfg, approver=_make_approver(req.approve_tools))`}

                {selectedItem === 5 && `def require_key(x_api_key: str = Header(default="")) -> None:
    expected = os.getenv("OBEY_API_KEY", "")
    if expected and not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail="invalid API key")`}

                {selectedItem === 6 && `if name == "run_shell":
    # Never let the model smuggle an "approved": true via args.
    safe = {k: v for k, v in args.items() if k != "approved"}
    result = spec.fn(**safe, approved=approved)`}

                {selectedItem === 7 && `def finish(self, success: bool) -> ExecutionTrace | None:
    trace = self.current
    if trace is not None:
        trace.success = success
    self.current = None  # prevent double-finish / stale reuse
    return trace`}

                {selectedItem === 8 && `# Bounded solve_loop regex check:
success = bool(re.search(r"\\bDONE\\b", result.upper())) and runner._trace_succeeded(result, trace)`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
