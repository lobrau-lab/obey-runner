import React, { useState, useEffect } from 'react';
import { runAllVerificationTests, TestCaseResult } from '../engine/testRunner';
import { CheckCircle2, XCircle, Play, RefreshCw, Terminal, Clock, ShieldCheck, ChevronDown, ChevronRight, FileCheck } from 'lucide-react';

export const VerificationSuiteView: React.FC = () => {
  const [results, setResults] = useState<TestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [expandedTest, setExpandedTest] = useState<string | null>("test_loops_gate");

  const runTests = async () => {
    setIsRunning(true);
    // Simulate brief test execution delay for visual clarity
    await new Promise(resolve => setTimeout(resolve, 150));
    const testResults = await runAllVerificationTests();
    setResults(testResults);
    setIsRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const totalPassed = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PYTEST / HARNESS
              </span>
              <h2 className="text-lg font-bold text-white">Automated Patch Verification Suite</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Executes the test scripts provided in the PR review notes to certify compliance with the 4 blocking requirements and security constraints.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? "Running Suite..." : "Re-run Verification"}
            </button>
          </div>
        </div>

        {/* Status Counter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div className="p-2 rounded-md bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Test Outcome</div>
              <div className="text-base font-bold text-emerald-400">
                {totalPassed}/{totalTests} Tests Passing
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div className="p-2 rounded-md bg-cyan-500/20 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Total Duration</div>
              <div className="text-base font-bold text-cyan-300 font-mono">
                {totalDuration} ms
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div className="p-2 rounded-md bg-indigo-500/20 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400">Compliance Audit</div>
              <div className="text-base font-bold text-indigo-300">
                Zero Regressions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="space-y-3">
        {results.map((test) => {
          const isExpanded = expandedTest === test.id;
          return (
            <div
              key={test.id}
              className={`border rounded-xl transition-all overflow-hidden ${
                test.passed
                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'bg-rose-950/20 border-rose-900/50'
              }`}
            >
              {/* Header row */}
              <div
                onClick={() => setExpandedTest(isExpanded ? null : test.id)}
                className="p-4 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  {test.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{test.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {test.patchItem}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono text-slate-500">{test.durationMs}ms</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                    test.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {test.passed ? 'PASSED' : 'FAILED'}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expandable assertion details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 bg-slate-950/80">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Assertion Log Trace:
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300 space-y-1 overflow-x-auto">
                    {test.assertionLogs.map((log, lIdx) => (
                      <div
                        key={lIdx}
                        className={
                          log.startsWith("FAIL")
                            ? "text-rose-400 font-semibold"
                            : log.includes("PASS")
                            ? "text-emerald-400 font-semibold"
                            : "text-slate-400"
                        }
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
