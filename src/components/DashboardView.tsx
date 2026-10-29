import React, { useState, useMemo } from 'react';
import { SimulationRunRecord } from '../types/runner';
import { generateRandomSimulationRun } from '../data/simulationMetrics';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Cpu,
  Sparkles,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Activity,
  Zap,
  Layers,
  Filter,
  BarChart3
} from 'lucide-react';

interface DashboardViewProps {
  runs: SimulationRunRecord[];
  onAddBatchRuns: (newRuns: SimulationRunRecord[]) => void;
  onResetRuns: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ runs, onAddBatchRuns, onResetRuns }) => {
  const [profileFilter, setProfileFilter] = useState<'all' | 'default' | 'strict' | 'yolo'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'step' | 'solve_loop' | 'constraint_loop'>('all');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Filtered runs based on user selection
  const filteredRuns = useMemo(() => {
    return runs.filter(r => {
      if (profileFilter !== 'all' && r.profile !== profileFilter) return false;
      if (modeFilter !== 'all' && r.mode !== modeFilter) return false;
      return true;
    });
  }, [runs, profileFilter, modeFilter]);

  // Aggregate Key Performance Indicators
  const kpis = useMemo(() => {
    if (filteredRuns.length === 0) {
      return {
        total: 0,
        successCount: 0,
        failCount: 0,
        successRate: 0,
        avgDuration: 0,
        p95Duration: 0,
        minDuration: 0,
        maxDuration: 0,
        avgCpu: 0,
        avgMemoryKb: 0,
        totalTokens: 0,
        crystallizedCount: 0,
        crystallizationRate: 0
      };
    }

    const total = filteredRuns.length;
    const successCount = filteredRuns.filter(r => r.success).length;
    const failCount = total - successCount;
    const successRate = +((successCount / total) * 100).toFixed(1);

    const durations = [...filteredRuns.map(r => r.durationMs)].sort((a, b) => a - b);
    const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / total);
    const p95Idx = Math.floor(total * 0.95);
    const p95Duration = durations[Math.min(p95Idx, total - 1)];
    const minDuration = durations[0];
    const maxDuration = durations[durations.length - 1];

    const avgCpu = +(filteredRuns.reduce((acc, r) => acc + r.resourceUsage.cpuPercent, 0) / total).toFixed(1);
    const avgMemoryKb = Math.round(filteredRuns.reduce((acc, r) => acc + r.resourceUsage.memoryKb, 0) / total);
    const totalTokens = filteredRuns.reduce((acc, r) => acc + r.tokens.total, 0);

    const crystallizedCount = filteredRuns.filter(r => r.crystallized).length;
    const crystallizationRate = +((crystallizedCount / total) * 100).toFixed(1);

    return {
      total,
      successCount,
      failCount,
      successRate,
      avgDuration,
      p95Duration,
      minDuration,
      maxDuration,
      avgCpu,
      avgMemoryKb,
      totalTokens,
      crystallizedCount,
      crystallizationRate
    };
  }, [filteredRuns]);

  // Time-series Chart 1: Success Rate & Rolling Reliability Trend
  const successTrendData = useMemo(() => {
    let cumulativeSuccesses = 0;
    return filteredRuns.map((run, idx) => {
      if (run.success) cumulativeSuccesses++;
      const rollingRate = +((cumulativeSuccesses / (idx + 1)) * 100).toFixed(1);
      return {
        runIndex: `#${idx + 1}`,
        id: run.id,
        successScore: run.success ? 100 : 0,
        rollingRate,
        duration: run.durationMs,
        order: run.order.slice(0, 24) + "..."
      };
    });
  }, [filteredRuns]);

  // Chart 2: Execution Time per Run with Status Color Coding
  const executionTimeData = useMemo(() => {
    return filteredRuns.map((run, idx) => ({
      index: `#${idx + 1}`,
      duration: run.durationMs,
      promptTokens: run.tokens.prompt,
      completionTokens: run.tokens.completion,
      success: run.success,
      profile: run.profile,
      mode: run.mode
    }));
  }, [filteredRuns]);

  // Chart 3: Resource Usage Dynamics (CPU % vs Memory KB)
  const resourceData = useMemo(() => {
    return filteredRuns.map((run, idx) => ({
      run: `#${idx + 1}`,
      cpu: run.resourceUsage.cpuPercent,
      memoryMb: +(run.resourceUsage.memoryKb / 1024).toFixed(2),
      tokens: run.tokens.total
    }));
  }, [filteredRuns]);

  // Chart 4: Tool Distribution Frequency
  const toolDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRuns.forEach(r => {
      r.toolsUsed.forEach(t => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });

    const colors = [
      '#6366f1', // Indigo
      '#06b6d4', // Cyan
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#ec4899', // Pink
      '#8b5cf6', // Purple
      '#3b82f6', // Blue
      '#14b8a6', // Teal
      '#f97316'  // Orange
    ];

    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length]
    })).sort((a, b) => b.value - a.value);
  }, [filteredRuns]);

  // Chart 5: Profile Breakdown
  const profileBreakdownData = useMemo(() => {
    const profiles = ['default', 'strict', 'yolo'] as const;
    return profiles.map(p => {
      const pRuns = runs.filter(r => r.profile === p);
      const total = pRuns.length;
      const success = pRuns.filter(r => r.success).length;
      const rate = total > 0 ? +((success / total) * 100).toFixed(1) : 0;
      const avgMs = total > 0 ? Math.round(pRuns.reduce((a, b) => a + b.durationMs, 0) / total) : 0;
      return {
        profile: p,
        runs: total,
        successRate: rate,
        avgDuration: avgMs
      };
    });
  }, [runs]);

  // Handle batch simulation generation
  const handleBatchSimulate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    const newBatch: SimulationRunRecord[] = [];
    for (let i = 0; i < 5; i++) {
      newBatch.push(generateRandomSimulationRun());
    }
    onAddBatchRuns(newBatch);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                TELEMETRY & ANALYTICS
              </span>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                Agent Simulation Metrics Dashboard
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Real-time visualization of agent reliability, latency percentiles, and hardware resource overhead across OBEY-RUNNER executions.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchSimulate}
              disabled={isGenerating}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isGenerating ? 'animate-pulse' : ''}`} />
              {isGenerating ? "Simulating..." : "Simulate 5 Runs"}
            </button>
            <button
              onClick={onResetRuns}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Data
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Profile Filter:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              {(['all', 'default', 'strict', 'yolo'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setProfileFilter(p)}
                  className={`px-2.5 py-1 rounded text-xs font-mono capitalize transition-all ${
                    profileFilter === p
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Mode Filter:</span>
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              {(['all', 'step', 'solve_loop', 'constraint_loop'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setModeFilter(m)}
                  className={`px-2.5 py-1 rounded text-xs font-mono capitalize transition-all ${
                    modeFilter === m
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m === 'all' ? 'All' : m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto text-slate-500 font-mono text-[11px]">
            Showing {filteredRuns.length} of {runs.length} runs
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Success Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Success Rate</span>
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white flex items-baseline gap-1.5 font-mono">
              {kpis.successRate}%
              <span className="text-xs text-slate-400 font-normal">
                ({kpis.successCount}/{kpis.total})
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{kpis.failCount} failed or rejected by gate</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Execution Latency */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg Latency</span>
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-cyan-300 font-mono">
              {kpis.avgDuration} <span className="text-xs font-normal text-slate-400">ms</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>P95: {kpis.p95Duration}ms</span>
              <span>Range: {kpis.minDuration}–{kpis.maxDuration}ms</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Resource Overhead */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Resource Usage</span>
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-indigo-300 font-mono">
              {kpis.avgCpu}% <span className="text-xs font-normal text-slate-400">CPU</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>RAM: {(kpis.avgMemoryKb / 1024).toFixed(1)} MB</span>
              <span>Tokens: {kpis.totalTokens.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Skill Crystallization */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Crystallization</span>
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-300 font-mono">
              {kpis.crystallizationRate}%
            </div>
            <div className="text-xs text-slate-400 mt-1">
              <span>{kpis.crystallizedCount} traces learned into store</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Success Rate & Rolling Reliability (Area Chart) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Cumulative Success Rate & Reliability Trend
              </h3>
              <p className="text-xs text-slate-400">
                Rolling % of executions passing the unified _trace_succeeded gate.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              {kpis.successRate}% Current
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={successTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="runIndex" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc'
                  }}
                  formatter={(val: any) => [`${val}%`, 'Rolling Success Rate']}
                />
                <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Target: 80%', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                <Area
                  type="monotone"
                  dataKey="rollingRate"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSuccess)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Execution Time Latency (Bar Chart with status coloring) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Execution Latency per Simulation Run
              </h3>
              <p className="text-xs text-slate-400">
                Duration in milliseconds. Emerald = Success, Rose = Failed / Gate Rejected.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
              Avg {kpis.avgDuration}ms
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={executionTimeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="index" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="ms" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc'
                  }}
                  formatter={(val: any, name: any, item: any) => [
                    `${val} ms (${item.payload.success ? 'Success' : 'Failed'})`,
                    'Execution Time'
                  ]}
                />
                <ReferenceLine y={kpis.avgDuration} stroke="#06b6d4" strokeDasharray="3 3" />
                <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                  {executionTimeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.success ? '#10b981' : '#f43f5e'}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Resource Usage Dynamics (CPU % vs Memory MB) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                Hardware Overhead: CPU Load vs Memory (MB)
              </h3>
              <p className="text-xs text-slate-400">
                Host CPU utilization percent and working memory footprint.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-indigo-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span> CPU %
              </span>
              <span className="flex items-center gap-1 text-cyan-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span> RAM MB
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={resourceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="run" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#818cf8" fontSize={11} tickLine={false} unit="%" domain={[0, 60]} />
                <YAxis yAxisId="right" orientation="right" stroke="#22d3ee" fontSize={11} tickLine={false} unit="MB" domain={[0, 4]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc'
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cpu"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#6366f1' }}
                  name="CPU Load (%)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="memoryMb"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#06b6d4' }}
                  name="Memory (MB)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Tool Distribution (Pie & Frequency Chart) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                Tool Invocation Distribution
              </h3>
              <p className="text-xs text-slate-400">
                Frequency of tools dispatched across simulation traces.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
              {toolDistributionData.reduce((acc, t) => acc + t.value, 0)} Total Calls
            </span>
          </div>

          <div className="h-64 w-full flex flex-col sm:flex-row items-center justify-between pt-2">
            <div className="w-full sm:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={toolDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {toolDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f8fafc'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend list */}
            <div className="w-full sm:w-1/2 flex flex-col justify-center space-y-1.5 pl-2">
              {toolDistributionData.slice(0, 6).map((tool, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tool.color }}></span>
                    <span className="text-slate-300 font-mono truncate">{tool.name}</span>
                  </div>
                  <span className="font-mono text-slate-400 font-semibold">{tool.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Profile & Mode Performance Breakdown Row */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-400" />
          Safety Profile Comparative Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profileBreakdownData.map(p => (
            <div key={p.profile} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-indigo-300 px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800">
                  {p.profile}
                </span>
                <span className="text-xs text-slate-400 font-mono">{p.runs} runs</span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs text-slate-400">Success Rate:</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">{p.successRate}%</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Avg Duration:</span>
                <span className="text-sm font-bold text-cyan-300 font-mono">{p.avgDuration} ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Simulation Traces Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Detailed Simulation Run Logs
          </h3>
          <span className="text-xs font-mono text-slate-500">
            {filteredRuns.length} total entries
          </span>
        </div>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">Run ID</th>
                <th className="py-2.5 px-3">Order Task</th>
                <th className="py-2.5 px-3">Profile</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Tools</th>
                <th className="py-2.5 px-3">CPU / RAM</th>
                <th className="py-2.5 px-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRuns.slice().reverse().map((run) => (
                <tr key={run.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-300">{run.id}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans max-w-xs truncate" title={run.order}>
                    {run.order}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                      {run.profile}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{run.mode}</td>
                  <td className="py-2.5 px-3 text-cyan-300">{run.durationMs}ms</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {run.toolsUsed.length > 0 ? run.toolsUsed.join(", ") : "none"}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {run.resourceUsage.cpuPercent}% / {(run.resourceUsage.memoryKb / 1024).toFixed(1)}MB
                  </td>
                  <td className="py-2.5 px-3">
                    {run.success ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Success
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 truncate max-w-[140px]"
                        title={run.failureReason || "Failed"}
                      >
                        <XCircle className="w-3 h-3" />
                        {run.failureReason ? run.failureReason.split(':')[0] : "Failed"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
