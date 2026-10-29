export interface TraceStep {
  tool: string;
  args: Record<string, any>;
  result: string;
  ts: number;
}

export interface ExecutionTrace {
  id: string;
  task: string;
  steps: TraceStep[];
  success: boolean;
  started: number;
  finished?: number;
}

export interface Skill {
  id: string;
  task: string;
  description: string;
  trigger_keywords: string[];
  tool_sequence: string[];
  reflection: string;
  created_at: number;
}

export interface MemoryEntry {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  timestamp?: number;
}

export interface SafetyConfig {
  mode: 'default' | 'strict' | 'yolo';
  max_iterations: number;
  max_consecutive_failures: number;
}

export interface ToolsConfig {
  enable_shell: boolean;
  enable_web_fetch: boolean;
  enable_web_search: boolean;
  enable_code_analysis: boolean;
  shell_allowlist: string[];
  shell_denylist: string[];
}

export interface LearningConfig {
  enabled: boolean;
  min_tool_calls_for_skill: number;
  skills_dir: string;
}

export interface RunnerConfig {
  profile: string;
  safety: SafetyConfig;
  tools: ToolsConfig;
  learning: LearningConfig;
  memory: {
    backend: 'memory' | 'sqlite';
    path: string;
    max_rows: number;
    working_window: number;
    semantic_top_k: number;
  };
  system_prompt: string;
}

export interface BlockingItem {
  id: number;
  title: string;
  severity: 'BLOCKER' | 'CRITICAL' | 'SECURITY' | 'FIX';
  file: string;
  problem: string;
  fix: string;
  verified: boolean;
}

export interface SimulationRunRecord {
  id: string;
  timestamp: number;
  order: string;
  profile: 'default' | 'strict' | 'yolo';
  mode: 'step' | 'solve_loop' | 'constraint_loop';
  success: boolean;
  durationMs: number;
  toolCallsCount: number;
  toolsUsed: string[];
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  memoryEntriesCount: number;
  resourceUsage: {
    cpuPercent: number;
    memoryKb: number;
  };
  crystallized: boolean;
  failureReason?: string;
}

