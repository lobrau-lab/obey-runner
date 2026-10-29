import React, { useState } from 'react';
import { Skill } from '../types/runner';
import { Sparkles, Search, Plus, Trash2, ArrowRight, Brain, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface SkillStoreViewProps {
  skills: Skill[];
  onAddSkill: (skill: Skill) => void;
  onDeleteSkill: (id: string) => void;
  onResetSkills: () => void;
}

export const SkillStoreView: React.FC<SkillStoreViewProps> = ({
  skills,
  onAddSkill,
  onDeleteSkill,
  onResetSkills
}) => {
  const [testOrder, setTestOrder] = useState<string>("Inspect git repository and review git status");
  const [newKeywordInput, setNewKeywordInput] = useState<string>("");

  // Evaluates token-based keyword matching using exact runner _matches logic
  const checkMatches = (order: string, kws: string[]): { matched: boolean; hits: number; hitWords: string[] } => {
    if (!kws || kws.length === 0) return { matched: false, hits: 0, hitWords: [] };
    const tokens = new Set((order.toLowerCase().match(/\b[a-z0-9_]+\b/g) || []));
    const hitWords = kws.filter(k => tokens.has(k.toLowerCase()));
    const hits = hitWords.length;
    const matched = kws.length >= 2 ? hits >= 2 : hits >= 1;
    return { matched, hits, hitWords };
  };

  return (
    <div className="space-y-6">
      {/* Overview & Keyword Match Tester */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Crystallized Skill Store & Token Matching Engine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified successful execution traces crystallize into structured skills.
              Injected into prompts only when token-level trigger thresholds (≥2 keywords) are met.
            </p>
          </div>

          <button
            onClick={onResetSkills}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            Reset Default Skills
          </button>
        </div>

        {/* Live Token Matcher Interactive Test */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              Test Skill Injection Trigger Logic (_matches):
            </span>
            <span className="text-[11px] font-mono text-cyan-300">
              Threshold: min 2 keyword hits (if len ≥ 2)
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={testOrder}
              onChange={e => setTestOrder(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
              placeholder="Type an order prompt to test keyword matching..."
            />
          </div>

          <div className="text-xs text-slate-400">
            Prompt tokens parsed:{' '}
            <span className="font-mono text-indigo-300">
              [{(testOrder.toLowerCase().match(/\b[a-z0-9_]+\b/g) || []).slice(0, 10).join(', ')}]
            </span>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Active Skills in Repository ({skills.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map((skill) => {
            const matchResult = checkMatches(testOrder, skill.trigger_keywords);
            return (
              <div
                key={skill.id}
                className={`p-4 rounded-xl border transition-all ${
                  matchResult.matched
                    ? 'bg-indigo-950/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {skill.description}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-500">ID: {skill.id}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {matchResult.matched ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> MATCHED ({matchResult.hits} hits)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                        {matchResult.hits} hits (untriggered)
                      </span>
                    )}

                    <button
                      onClick={() => onDeleteSkill(skill.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete skill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Trigger Keywords */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                  <span className="text-[11px] text-slate-400">Keywords:</span>
                  {skill.trigger_keywords.map((kw, i) => {
                    const isHit = matchResult.hitWords.includes(kw);
                    return (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          isHit
                            ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400 font-bold'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {kw}
                      </span>
                    );
                  })}
                </div>

                {/* Tool Sequence */}
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-xs font-mono mb-2 flex items-center gap-1.5 overflow-x-auto text-slate-300">
                  <span className="text-slate-500 text-[10px] uppercase">Sequence:</span>
                  {skill.tool_sequence.map((tool, idx) => (
                    <React.Fragment key={idx}>
                      <span className="text-cyan-300 font-semibold">{tool}</span>
                      {idx < skill.tool_sequence.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Reflection */}
                <div className="text-xs text-slate-400 italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                  <span className="font-semibold text-slate-300 not-italic">Reflection: </span>
                  "{skill.reflection}"
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
