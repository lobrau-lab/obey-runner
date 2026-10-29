import React from 'react';
import { ShieldCheck, Cpu, Terminal, FileCode2, Sparkles, Network, CheckCircle2, AlertTriangle, BarChart3 } from 'lucide-react';

export type TabId = 'dashboard' | 'audit' | 'simulator' | 'verification' | 'code' | 'skills' | 'api';

interface HeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  skillsCount: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, skillsCount }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl shadow-lg shadow-indigo-500/20 text-white font-bold flex items-center justify-center">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">OBEY-RUNNER</h1>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Patch 4
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Tree Mergeable
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Autonomous Agent Execution Engine • Unified Success Gate • Timing-Safe Auth • Skill Crystallization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono text-emerald-400 font-semibold">4/4</span> Blockers Closed
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>secrets.compare_digest</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{skillsCount} Skills Active</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-1 mt-4 pt-2 border-t border-slate-800/80 scrollbar-none">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Metrics Dashboard
          </button>

          <button
            onClick={() => onTabChange('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Patch 4 Audit & Review
          </button>

          <button
            onClick={() => onTabChange('simulator')}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'simulator'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Agent Simulator & Playground
          </button>

          <button
            onClick={() => onTabChange('verification')}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'verification'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Verification Test Suite
          </button>

          <button
            onClick={() => onTabChange('code')}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'code'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            Codebase Inspector
          </button>

          <button
            onClick={() => onTabChange('skills')}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'skills'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Skill Store & Memory
          </button>

          <button
            onClick={() => onTabChange('api')}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'api'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Network className="w-4 h-4" />
            FastAPI Sandbox
          </button>
        </div>
      </div>
    </header>
  );
};
