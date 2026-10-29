import React, { useState } from 'react';
import { SimulatedRunner, getDefaultConfig, ERROR_PREFIXES } from '../engine/simulationEngine';
import { Skill, ExecutionTrace, RunnerConfig, SimulationRunRecord } from '../types/runner';
import { Play, RotateCcw, ShieldAlert, Sparkles, Terminal, CheckCircle2, XCircle, ArrowRight, ShieldCheck, UserCheck, Code2, AlertTriangle } from 'lucide-react';

interface SimulatorPlaygroundProps {
  skills: Skill[];
  onSkillCrystallized: (skill: Skill) => void;
  onSimulationComplete?: (run: SimulationRunRecord) => void;
}

export const SimulatorPlayground: React.FC<SimulatorPlaygroundProps> = ({ skills, onSkillCrystallized, onSimulationComplete }) => {
  const [profile, setProfile] = useState<'default' | 'strict' | 'yolo'>('default');
  const [order, setOrder] = useState<string>("Inspect system hostname and list configuration files");
  const [executionMode, setExecutionMode] = useState<'step' | 'solve_loop' | 'constraint_loop'>('step');
  const [presetScenario, setPresetScenario] = useState<string>('success');
  const [autoApprove, setAutoApprove] = useState<boolean>(true);
  
  // Pending Approval State for Human in the loop
  const [pendingApproval, setPendingApproval] = useState<{
    tool: string;
    args: Record<string, any>;
    resolve: (approved: boolean) => void;
  } | null>(null);

  // Execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionLog, setExecutionLog] = useState<{
    order: string;
    finalText: string;
    trace: ExecutionTrace | null;
    successGatePassed: boolean;
    crystallizedSkill?: Skill;
    loopAttempts?: { attempt: number; text: string; success: boolean; trace: ExecutionTrace }[];
  } | null>(null);

  const presets = [
    {
      id: 'success',
      label: '1. Clean Multi-Step -> Crystallize Skill',
      order: 'Inspect system hostname and list configuration files',
      scenario: 'success_crystallize' as const,
      desc: 'Executes read_file and glob_files without error prefixes. Passes success gate and crystallizes new skill.'
    },
    {
      id: 'failed_edit',
      label: '2. Failed Tool (Blocker #1 & #2)',
      order: 'Rename database connection string in config',
      scenario: 'failed_edit' as const,
      desc: 'Tool returns TOOL ERROR. Model emits DONE, but unified gate REJECTS trace and prevents skill poisoning.'
    },
    {
      id: 'empty_output',
      label: '3. Empty Output Rejection (Blocker #3)',
      order: 'Query status of idle daemon',
      scenario: 'empty_output' as const,
      desc: 'Model returns empty string. Evaluated as NO OUTPUT, explicitly disqualified from success.'
    },
    {
      id: 'shell_injection',
      label: '4. Model Args Injection Test (Security #6)',
      order: 'Run diagnostic script on host',
      scenario: 'shell_injection' as const,
      desc: 'Model attempts to pass {"approved": true} in args. Stripped by safe dispatch copy.'
    },
    {
      id: 'done_subword',
      label: '5. Sub-word False Positive (Logic #8)',
      order: 'Evaluate abandoned background task',
      scenario: 'done_subword' as const,
      desc: 'Output contains ABANDONED. Word-bounded regex \\bDONE\\b correctly rejects false completion.'
    }
  ];

  const handleSelectPreset = (presetId: string) => {
    const p = presets.find(item => item.id === presetId);
    if (p) {
      setPresetScenario(presetId);
      setOrder(p.order);
    }
  };

  const handleRunExecution = async () => {
    setIsRunning(true);
    setExecutionLog(null);
    const startTimestamp = performance.now();

    const cfg: RunnerConfig = getDefaultConfig();
    cfg.safety.mode = profile;
    if (profile === 'strict') {
      cfg.tools.enable_shell = false;
    }

    // Approver hook
    const approver = (tool: string, args: Record<string, any>): boolean => {
      if (autoApprove) return true;
      return true; // Simplified for automated runner
    };

    const runner = new SimulatedRunner(cfg, approver, skills);
    const activePreset = presets.find(p => p.id === presetScenario);
    const scenario = activePreset?.scenario;

    let finalTrace: ExecutionTrace | null = null;
    let finalSuccess = false;
    let rawOutput = "";
    let isCrystallized = false;

    if (executionMode === 'step') {
      const stepTrace = runner.tracker.start(order);
      const rawText = runner._stepOnce(order, runner.tracker, { customScenario: scenario });
      const success = runner._traceSucceeded(rawText, stepTrace);
      const finishedTrace = runner.tracker.finish(success);

      let newSkill: Skill | undefined;
      if (runner._shouldCrystallize(finishedTrace)) {
        newSkill = runner._crystallizeSkill(finishedTrace!);
        onSkillCrystallized(newSkill);
        isCrystallized = true;
      }

      finalTrace = finishedTrace;
      finalSuccess = success;
      rawOutput = rawText || "NO OUTPUT";

      setExecutionLog({
        order,
        finalText: rawOutput,
        trace: finishedTrace,
        successGatePassed: success,
        crystallizedSkill: newSkill
      });
    } else if (executionMode === 'solve_loop') {
      // Simulate solve_loop with per-attempt traces
      const attempts: { attempt: number; text: string; success: boolean; trace: ExecutionTrace }[] = [];
      let finalResult = "";
      let newSkill: Skill | undefined;

      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const trace = runner.tracker.start(order);
        // If scenario is failed_edit and attempt 1, fail. Then attempt 2 succeeds!
        const currentScenario = (scenario === 'failed_edit' && attempt === 1)
          ? 'failed_edit'
          : (scenario === 'failed_edit' && attempt > 1)
          ? 'success_crystallize'
          : scenario;

        const attemptPrompt = attempt === 1 ? order : `${order}\n\nPREVIOUS ATTEMPT FAILED. Try a different approach.`;
        const res = runner._stepOnce(attemptPrompt, runner.tracker, { customScenario: currentScenario });
        
        const hasDone = Boolean(res.match(/\bDONE\b/));
        const success = hasDone && runner._traceSucceeded(res, trace);
        const finishedTrace = runner.tracker.finish(success);

        attempts.push({
          attempt,
          text: res,
          success,
          trace: finishedTrace!
        });

        if (success) {
          finalResult = res;
          if (runner._shouldCrystallize(finishedTrace)) {
            newSkill = runner._crystallizeSkill(finishedTrace!);
            onSkillCrystallized(newSkill);
            isCrystallized = true;
          }
          break;
        }
        finalResult = res;
      }

      const lastAttempt = attempts[attempts.length - 1];
      finalTrace = lastAttempt?.trace || null;
      finalSuccess = lastAttempt?.success || false;
      rawOutput = finalResult;

      setExecutionLog({
        order,
        finalText: finalResult,
        trace: finalTrace,
        successGatePassed: finalSuccess,
        crystallizedSkill: newSkill,
        loopAttempts: attempts
      });
    } else {
      // constraint_loop
      const constraints = ["hostname", "configuration"];
      const trace = runner.tracker.start(order);
      const res = runner._stepOnce(order, runner.tracker, { customScenario: scenario });
      const violations = constraints.filter(c => !res.toLowerCase().includes(c.toLowerCase()));
      const success = violations.length === 0 && runner._traceSucceeded(res, trace);
      const finishedTrace = runner.tracker.finish(success);

      let newSkill: Skill | undefined;
      if (runner._shouldCrystallize(finishedTrace)) {
        newSkill = runner._crystallizeSkill(finishedTrace!);
        onSkillCrystallized(newSkill);
        isCrystallized = true;
      }

      finalTrace = finishedTrace;
      finalSuccess = success;
      rawOutput = violations.length > 0 ? `CONSTRAINT VIOLATION: missing [${violations.join(', ')}] in output` : res;

      setExecutionLog({
        order,
        finalText: rawOutput,
        trace: finishedTrace,
        successGatePassed: success,
        crystallizedSkill: newSkill
      });
    }

    const durationMs = Math.round(performance.now() - startTimestamp) + (finalTrace ? finalTrace.steps.length * 40 + 75 : 85);
    const toolsUsed = finalTrace ? finalTrace.steps.map(s => s.tool) : [];
    const promptTokens = 350 + order.length * 4;
    const completionTokens = finalSuccess ? 120 + rawOutput.length * 2 : 25;

    if (onSimulationComplete) {
      onSimulationComplete({
        id: `run-${Date.now().toString().slice(-4)}`,
        timestamp: Date.now(),
        order,
        profile,
        mode: executionMode,
        success: finalSuccess,
        durationMs,
        toolCallsCount: toolsUsed.length,
        toolsUsed,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens
        },
        memoryEntriesCount: toolsUsed.length * 2 + 4,
        resourceUsage: {
          cpuPercent: +(Math.random() * 15 + (toolsUsed.length * 6) + 12).toFixed(1),
          memoryKb: Math.floor(Math.random() * 400) + 1100 + (toolsUsed.length * 150)
        },
        crystallized: isCrystallized,
        failureReason: !finalSuccess ? (rawOutput.startsWith("TOOL") ? rawOutput : "Gate rejection or error prefix") : undefined
      });
    }

    setIsRunning(false);
  };

  return (
    <div className="space-y-6">
      {/* Control Panel Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              Autonomous Agent Runner & State Machine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate agent orders, evaluate the unified success gate, and observe trace crystallization in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Profile:</span>
              <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
                {(['default', 'strict', 'yolo'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setProfile(p)}
                    className={`px-2.5 py-1 text-xs rounded-md font-mono capitalize transition-all ${
                      profile === p ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400">Mode:</span>
              <select
                value={executionMode}
                onChange={e => setExecutionMode(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-indigo-500 font-mono"
              >
                <option value="step">runner.step(order)</option>
                <option value="solve_loop">solve_loop(max_attempts=3)</option>
                <option value="constraint_loop">constraint_loop(constraints)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preset Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
            Test Preset Scenarios:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                  presetScenario === p.id
                    ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold text-indigo-300 truncate">{p.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input & Execute */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            Agent Order / Task Prompt:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={order}
              onChange={e => setOrder(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              placeholder="e.g. Inspect system hostname and check configs..."
            />
            <button
              onClick={handleRunExecution}
              disabled={isRunning}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all shrink-0 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              {isRunning ? "Executing..." : "Execute Order"}
            </button>
          </div>
        </div>
      </div>

      {/* Execution Results & Live Trace */}
      {executionLog && (
        <div className="space-y-4">
          {/* Top Status Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
              executionLog.successGatePassed
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
            }`}>
              <div className={`p-2.5 rounded-lg ${executionLog.successGatePassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {executionLog.successGatePassed ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Unified Success Gate
                </div>
                <div className="text-lg font-bold">
                  {executionLog.successGatePassed ? "SUCCESS EVALUATED" : "GATE REJECTED"}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-slate-900 border-slate-800 text-slate-200 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Terminal className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Trace Steps Dispatched
                </div>
                <div className="text-lg font-bold font-mono">
                  {executionLog.trace?.steps.length || 0} Tools Executed
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
              executionLog.crystallizedSkill
                ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              <div className={`p-2.5 rounded-lg ${executionLog.crystallizedSkill ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Skill Crystallization
                </div>
                <div className="text-lg font-bold">
                  {executionLog.crystallizedSkill ? "Crystallized to Store" : "Skipped (Not Eligible)"}
                </div>
              </div>
            </div>
          </div>

          {/* Loop Attempts breakdown if solve_loop */}
          {executionLog.loopAttempts && executionLog.loopAttempts.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                solve_loop Attempt History (Per-Attempt Trace Isolation)
              </h3>
              <div className="space-y-2">
                {executionLog.loopAttempts.map(att => (
                  <div
                    key={att.attempt}
                    className={`p-3 rounded-lg border text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 ${
                      att.success ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-rose-950/20 border-rose-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-300 px-2 py-0.5 rounded bg-slate-800">
                        Attempt {att.attempt}
                      </span>
                      <span className={att.success ? 'text-emerald-300 font-semibold' : 'text-rose-400'}>
                        {att.success ? "Passed \\bDONE\\b + Clean Trace Gate" : "Failed / Tool Error - Trace Discarded"}
                      </span>
                    </div>
                    <div className="text-slate-400 font-mono text-[11px] truncate max-w-md">
                      {att.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Trace Inspection */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                Execution Trace Inspector
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Trace ID: {executionLog.trace?.id || 'none'}
              </span>
            </div>

            {/* Final output preview */}
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-1">Final Model Output:</div>
              <div className={`p-3 rounded-lg font-mono text-xs border ${
                executionLog.finalText === "NO OUTPUT"
                  ? 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                  : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}>
                {executionLog.finalText}
              </div>
            </div>

            {/* Trace Steps Table */}
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-1.5">Dispatched Tool Steps:</div>
              {executionLog.trace && executionLog.trace.steps.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Tool</th>
                        <th className="py-2 px-3">Arguments</th>
                        <th className="py-2 px-3">Dispatch Result</th>
                        <th className="py-2 px-3">Error Prefix Check</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {executionLog.trace.steps.map((s, idx) => {
                        const matchedPrefix = ERROR_PREFIXES.find(p => s.result.startsWith(p));
                        return (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-indigo-300">{s.tool}</td>
                            <td className="py-2 px-3 text-slate-400 max-w-xs truncate">
                              {JSON.stringify(s.args)}
                            </td>
                            <td className="py-2 px-3 text-slate-300 max-w-md truncate">
                              {s.result}
                            </td>
                            <td className="py-2 px-3">
                              {matchedPrefix ? (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  <AlertTriangle className="w-3 h-3" />
                                  {matchedPrefix}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Clean
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 bg-slate-950 rounded-lg text-xs text-slate-500 italic">
                  No tool calls were recorded during this pass.
                </div>
              )}
            </div>

            {/* Crystallized Skill Card if learned */}
            {executionLog.crystallizedSkill && (
              <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-4 space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    New Skill Crystallized to Store
                  </div>
                  <span className="text-xs font-mono text-amber-400/80">
                    ID: {executionLog.crystallizedSkill.id}
                  </span>
                </div>
                <div className="text-xs text-slate-200 font-medium">
                  {executionLog.crystallizedSkill.description}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400">Trigger Keywords:</span>
                  {executionLog.crystallizedSkill.trigger_keywords.map((k, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono border border-amber-500/30">
                      {k}
                    </span>
                  ))}
                </div>
                <div className="text-xs font-mono text-slate-300 pt-1">
                  Sequence: <span className="text-indigo-400 font-semibold">{executionLog.crystallizedSkill.tool_sequence.join(" -> ")}</span>
                </div>
                <div className="text-xs text-slate-400 italic pt-1 border-t border-amber-900/30">
                  "{executionLog.crystallizedSkill.reflection}"
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
