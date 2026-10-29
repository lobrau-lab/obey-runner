import { SimulationRunRecord } from '../types/runner';

export const INITIAL_SIMULATION_RUNS: SimulationRunRecord[] = [
  {
    id: "run-001",
    timestamp: Date.now() - 3600000 * 5,
    order: "Inspect system hostname and check configs",
    profile: "default",
    mode: "step",
    success: true,
    durationMs: 142,
    toolCallsCount: 2,
    toolsUsed: ["read_file", "glob_files"],
    tokens: { prompt: 412, completion: 98, total: 510 },
    memoryEntriesCount: 6,
    resourceUsage: { cpuPercent: 18.5, memoryKb: 1240 },
    crystallized: true
  },
  {
    id: "run-002",
    timestamp: Date.now() - 3600000 * 4.5,
    order: "Audit python code in src/utils.py with AST",
    profile: "default",
    mode: "step",
    success: true,
    durationMs: 185,
    toolCallsCount: 2,
    toolsUsed: ["analyze_python", "diff_files"],
    tokens: { prompt: 530, completion: 120, total: 650 },
    memoryEntriesCount: 6,
    resourceUsage: { cpuPercent: 24.2, memoryKb: 1480 },
    crystallized: true
  },
  {
    id: "run-003",
    timestamp: Date.now() - 3600000 * 4,
    order: "Rename database connection string in config",
    profile: "default",
    mode: "solve_loop",
    success: false,
    durationMs: 310,
    toolCallsCount: 1,
    toolsUsed: ["edit_file"],
    tokens: { prompt: 390, completion: 45, total: 435 },
    memoryEntriesCount: 5,
    resourceUsage: { cpuPercent: 32.0, memoryKb: 1620 },
    crystallized: false,
    failureReason: "TOOL ERROR (edit_file): File not found"
  },
  {
    id: "run-004",
    timestamp: Date.now() - 3600000 * 3.5,
    order: "Retry database connection string replacement",
    profile: "default",
    mode: "solve_loop",
    success: true,
    durationMs: 245,
    toolCallsCount: 2,
    toolsUsed: ["read_file", "edit_file"],
    tokens: { prompt: 680, completion: 140, total: 820 },
    memoryEntriesCount: 8,
    resourceUsage: { cpuPercent: 28.5, memoryKb: 1530 },
    crystallized: true
  },
  {
    id: "run-005",
    timestamp: Date.now() - 3600000 * 3,
    order: "Execute shell diagnostic under strict profile",
    profile: "strict",
    mode: "step",
    success: false,
    durationMs: 65,
    toolCallsCount: 1,
    toolsUsed: ["run_shell"],
    tokens: { prompt: 290, completion: 32, total: 322 },
    memoryEntriesCount: 4,
    resourceUsage: { cpuPercent: 12.1, memoryKb: 980 },
    crystallized: false,
    failureReason: "TOOL BLOCKED: Shell execution disabled in strict profile"
  },
  {
    id: "run-006",
    timestamp: Date.now() - 3600000 * 2.5,
    order: "Query external API documentation via web_search",
    profile: "default",
    mode: "step",
    success: true,
    durationMs: 290,
    toolCallsCount: 2,
    toolsUsed: ["web_search", "read_file"],
    tokens: { prompt: 780, completion: 195, total: 975 },
    memoryEntriesCount: 7,
    resourceUsage: { cpuPercent: 35.4, memoryKb: 1820 },
    crystallized: true
  },
  {
    id: "run-007",
    timestamp: Date.now() - 3600000 * 2,
    order: "Probe metadata service at 169.254.169.254",
    profile: "default",
    mode: "step",
    success: false,
    durationMs: 80,
    toolCallsCount: 1,
    toolsUsed: ["web_fetch"],
    tokens: { prompt: 310, completion: 40, total: 350 },
    memoryEntriesCount: 4,
    resourceUsage: { cpuPercent: 14.0, memoryKb: 1050 },
    crystallized: false,
    failureReason: "FETCH BLOCKED: SSRF protection triggered for private/local IP range"
  },
  {
    id: "run-008",
    timestamp: Date.now() - 3600000 * 1.5,
    order: "Assert hostname and yaml configuration in output",
    profile: "default",
    mode: "constraint_loop",
    success: true,
    durationMs: 220,
    toolCallsCount: 2,
    toolsUsed: ["read_file", "glob_files"],
    tokens: { prompt: 540, completion: 155, total: 695 },
    memoryEntriesCount: 7,
    resourceUsage: { cpuPercent: 26.8, memoryKb: 1410 },
    crystallized: true
  },
  {
    id: "run-009",
    timestamp: Date.now() - 3600000 * 1,
    order: "Automated batch maintenance script",
    profile: "yolo",
    mode: "step",
    success: true,
    durationMs: 160,
    toolCallsCount: 2,
    toolsUsed: ["run_shell", "read_file"],
    tokens: { prompt: 460, completion: 110, total: 570 },
    memoryEntriesCount: 6,
    resourceUsage: { cpuPercent: 29.1, memoryKb: 1390 },
    crystallized: true
  },
  {
    id: "run-010",
    timestamp: Date.now() - 3600000 * 0.7,
    order: "Status ping to idle daemon process",
    profile: "default",
    mode: "step",
    success: false,
    durationMs: 95,
    toolCallsCount: 0,
    toolsUsed: [],
    tokens: { prompt: 210, completion: 0, total: 210 },
    memoryEntriesCount: 3,
    resourceUsage: { cpuPercent: 9.5, memoryKb: 890 },
    crystallized: false,
    failureReason: "NO OUTPUT: Empty model response disqualified"
  },
  {
    id: "run-011",
    timestamp: Date.now() - 3600000 * 0.4,
    order: "Deep git commit log analysis and diff check",
    profile: "default",
    mode: "solve_loop",
    success: true,
    durationMs: 275,
    toolCallsCount: 3,
    toolsUsed: ["run_shell", "diff_files", "read_file"],
    tokens: { prompt: 840, completion: 210, total: 1050 },
    memoryEntriesCount: 10,
    resourceUsage: { cpuPercent: 38.2, memoryKb: 1940 },
    crystallized: true
  },
  {
    id: "run-012",
    timestamp: Date.now() - 3600000 * 0.1,
    order: "Verify environment variables and secrets compare_digest",
    profile: "strict",
    mode: "constraint_loop",
    success: true,
    durationMs: 195,
    toolCallsCount: 2,
    toolsUsed: ["read_file", "analyze_python"],
    tokens: { prompt: 580, completion: 145, total: 725 },
    memoryEntriesCount: 7,
    resourceUsage: { cpuPercent: 22.4, memoryKb: 1360 },
    crystallized: true
  }
];

export function generateRandomSimulationRun(): SimulationRunRecord {
  const tools = ["read_file", "write_file", "edit_file", "glob_files", "web_search", "web_fetch", "run_shell", "analyze_python", "diff_files"];
  const profiles: ('default' | 'strict' | 'yolo')[] = ["default", "default", "strict", "yolo"];
  const modes: ('step' | 'solve_loop' | 'constraint_loop')[] = ["step", "step", "solve_loop", "constraint_loop"];
  
  const profile = profiles[Math.floor(Math.random() * profiles.length)];
  const mode = modes[Math.floor(Math.random() * modes.length)];
  
  const isStrictFail = profile === "strict" && Math.random() < 0.25;
  const isRandomFail = Math.random() < 0.15;
  const success = !isStrictFail && !isRandomFail;

  const toolCount = success ? Math.floor(Math.random() * 3) + 1 : (Math.random() < 0.5 ? 1 : 0);
  const selectedTools: string[] = [];
  for (let i = 0; i < toolCount; i++) {
    selectedTools.push(tools[Math.floor(Math.random() * tools.length)]);
  }

  const promptTokens = Math.floor(Math.random() * 600) + 200;
  const completionTokens = success ? Math.floor(Math.random() * 200) + 40 : (Math.random() < 0.3 ? 0 : 25);
  const durationMs = Math.floor(Math.random() * 250) + 70 + (toolCount * 45);

  const orders = [
    "Verify system architecture and active skills",
    "Inspect local configuration and test git integrity",
    "Search documentation for secrets.compare_digest usage",
    "Analyze Python AST tree for security vulnerabilities",
    "Run constraint satisfaction check on output text",
    "Validate multi-tenant isolation and memory bounds"
  ];

  return {
    id: `run-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 1000)}`,
    timestamp: Date.now(),
    order: orders[Math.floor(Math.random() * orders.length)],
    profile,
    mode,
    success,
    durationMs,
    toolCallsCount: toolCount,
    toolsUsed: selectedTools,
    tokens: {
      prompt: promptTokens,
      completion: completionTokens,
      total: promptTokens + completionTokens
    },
    memoryEntriesCount: toolCount * 2 + 3,
    resourceUsage: {
      cpuPercent: +(Math.random() * 25 + 15).toFixed(1),
      memoryKb: Math.floor(Math.random() * 800) + 1000
    },
    crystallized: success && toolCount >= 2,
    failureReason: !success ? (isStrictFail ? "TOOL BLOCKED: Shell execution disabled in strict profile" : "TOOL ERROR: Step evaluation failure") : undefined
  };
}
