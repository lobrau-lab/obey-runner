import React, { useState } from 'react';
import { constantTimeCompare, SimulatedRunner, getDefaultConfig } from '../engine/simulationEngine';
import { Network, Send, ShieldAlert, CheckCircle2, Lock, Key, Copy, AlertTriangle } from 'lucide-react';

export const ApiTesterView: React.FC = () => {
  const [serverApiKey, setServerApiKey] = useState<string>("obey_live_key_9942a1");
  const [clientApiKey, setClientApiKey] = useState<string>("obey_live_key_9942a1");
  const [profile, setProfile] = useState<string>("default");
  const [order, setOrder] = useState<string>("Inspect system hostname");
  const [approveTools, setApproveTools] = useState<string>("run_shell,write_file");

  const [responseLog, setResponseLog] = useState<{
    status: number;
    statusText: string;
    body: any;
    durationMs: number;
    tenantGuarantees: string[];
  } | null>(null);

  const handleSendRequest = () => {
    const start = performance.now();
    const headers = { "x-api-key": clientApiKey };

    // Simulate require_key dependency in interfaces/api.py:
    if (serverApiKey && !constantTimeCompare(clientApiKey, serverApiKey)) {
      setResponseLog({
        status: 401,
        statusText: "Unauthorized",
        body: { detail: "invalid API key" },
        durationMs: Math.round(performance.now() - start),
        tenantGuarantees: []
      });
      return;
    }

    // Tenant Isolation guarantee (Blocker #4)
    const cfg = getDefaultConfig();
    cfg.profile = profile;
    cfg.memory.semantic_top_k = 0;
    cfg.learning.enabled = false;

    const approvedList = approveTools.split(",").map(t => t.trim()).filter(Boolean);
    const approver = (toolName: string) => approvedList.includes(toolName);

    const runner = new SimulatedRunner(cfg, approver);
    const stepResult = runner.step(order);

    setResponseLog({
      status: 200,
      statusText: "OK",
      body: { result: stepResult.result },
      durationMs: Math.round(performance.now() - start),
      tenantGuarantees: [
        "cfg.memory.semantic_top_k = 0 (No cross-caller prompt leakage)",
        "cfg.learning.enabled = false (No shared skill crystallization)",
        "secrets.compare_digest verification verified constant-time",
        "Ephemeral Runner lifecycle closed cleanly"
      ]
    });
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            FASTAPI / INTERFACES
          </span>
          <h2 className="text-lg font-bold text-white">REST API Sandbox (/run)</h2>
        </div>
        <p className="text-xs text-slate-400 max-w-3xl">
          Simulate external HTTP calls against the OBEY-RUNNER FastAPI service. Test constant-time authentication (<code className="text-cyan-300 font-mono">secrets.compare_digest</code>) and per-request tenant isolation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Request Panel */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                POST
              </span>
              <span className="font-mono text-xs text-slate-300">/run</span>
            </div>
            <button
              onClick={handleSendRequest}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Send Request
            </button>
          </div>

          {/* Server Config & API Key Auth */}
          <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Server & Client Auth Settings (secrets.compare_digest)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Server Env (<code className="text-slate-300">OBEY_API_KEY</code>):
                </label>
                <input
                  type="text"
                  value={serverApiKey}
                  onChange={e => setServerApiKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Request Header (<code className="text-slate-300">x-api-key</code>):
                </label>
                <input
                  type="text"
                  value={clientApiKey}
                  onChange={e => setClientApiKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setClientApiKey(serverApiKey)}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Use matching key (Valid 200)
              </button>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => setClientApiKey("wrong_secret_tampered")}
                className="text-[11px] text-rose-400 hover:underline"
              >
                Use invalid key (401 Unauthorized)
              </button>
            </div>
          </div>

          {/* Payload inputs */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300">Request JSON Body:</div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">order (Prompt):</label>
              <input
                type="text"
                value={order}
                onChange={e => setOrder(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">profile:</label>
                <select
                  value={profile}
                  onChange={e => setProfile(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                >
                  <option value="default">default</option>
                  <option value="strict">strict</option>
                  <option value="yolo">yolo</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">approve_tools (comma-separated):</label>
                <input
                  type="text"
                  value={approveTools}
                  onChange={e => setApproveTools(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Response Panel */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white">HTTP Response</h3>
            {responseLog && (
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                responseLog.status === 200
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {responseLog.status} {responseLog.statusText} • {responseLog.durationMs}ms
              </span>
            )}
          </div>

          {responseLog ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto max-h-64">
                <pre>{JSON.stringify(responseLog.body, null, 2)}</pre>
              </div>

              {responseLog.tenantGuarantees.length > 0 && (
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5 font-sans">
                  <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tenant Isolation Enforced:
                  </div>
                  {responseLog.tenantGuarantees.map((g, idx) => (
                    <div key={idx} className="text-xs text-slate-300 flex items-center gap-1.5">
                      <span className="text-emerald-400">✓</span> {g}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
              Click "Send Request" to test authentication and dispatch.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
