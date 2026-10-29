import React, { useState } from 'react';
import { Header, TabId } from './components/Header';
import { PatchAuditView } from './components/PatchAuditView';
import { SimulatorPlayground } from './components/SimulatorPlayground';
import { VerificationSuiteView } from './components/VerificationSuiteView';
import { CodeExplorerView } from './components/CodeExplorerView';
import { SkillStoreView } from './components/SkillStoreView';
import { ApiTesterView } from './components/ApiTesterView';
import { INITIAL_SKILLS } from './engine/simulationEngine';
import { Skill } from './types/runner';
import { ShieldCheck, Cpu, GitPullRequest, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('audit');
  const [skills, setSkills] = useState<Skill[]>(INITIAL_SKILLS);

  const handleSkillCrystallized = (newSkill: Skill) => {
    setSkills(prev => [newSkill, ...prev]);
  };

  const handleDeleteSkill = (id: string) => {
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  const handleResetSkills = () => {
    setSkills(INITIAL_SKILLS);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        skillsCount={skills.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'audit' && <PatchAuditView />}

        {activeTab === 'simulator' && (
          <SimulatorPlayground
            skills={skills}
            onSkillCrystallized={handleSkillCrystallized}
          />
        )}

        {activeTab === 'verification' && <VerificationSuiteView />}

        {activeTab === 'code' && <CodeExplorerView />}

        {activeTab === 'skills' && (
          <SkillStoreView
            skills={skills}
            onAddSkill={handleSkillCrystallized}
            onDeleteSkill={handleDeleteSkill}
            onResetSkills={handleResetSkills}
          />
        )}

        {activeTab === 'api' && <ApiTesterView />}
      </main>

      {/* Bottom Status Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">OBEY-RUNNER Patch 4 Workbench</span>
            <span>•</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> All 4 Blockers Closed & Mergeable
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
            <span>Anchored startswith gate</span>
            <span>•</span>
            <span>Constant-time secrets digest</span>
            <span>•</span>
            <span>Single-tenant per-request isolation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
