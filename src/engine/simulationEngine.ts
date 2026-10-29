import { ExecutionTrace, TraceStep, Skill, MemoryEntry, RunnerConfig } from '../types/runner';

export const ERROR_PREFIXES = [
  "TOOL ERROR",
  "TOOL BLOCKED",
  "TOOL ARG ERROR",
  "UNKNOWN TOOL",
  "MODEL ERROR",
  "MAX ITERATIONS",
  "ERROR",
  "BLOCKED",
  "SEARCH ERROR",
  "FETCH ERROR",
  "FETCH BLOCKED",
  "SYNTAX ERROR",
] as const;

export type ErrorPrefix = typeof ERROR_PREFIXES[number];

export function hasErrorPrefix(text: string): boolean {
  if (!text) return false;
  return ERROR_PREFIXES.some(prefix => text.startsWith(prefix));
}

// Constant-time string comparison mimicking python's secrets.compare_digest
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Constant time dummy loop to avoid length timing leak
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export interface VirtualFileSystem {
  [path: string]: string;
}

export const INITIAL_FILESYSTEM: VirtualFileSystem = {
  "/etc/hostname": "prod-agent-worker-01\n",
  "config.yaml": "environment: production\nmodel: gemini-2.5-pro\ntimeout: 30\n",
  "src/utils.py": "def add(a, b):\n    return a + b\n\ndef multiply(a, b):\n    return a * b\n",
  "docs/architecture.md": "# Architecture Overview\nOBEY-RUNNER features self-healing, reflection, and skill crystallization.\n",
  "logs/app.log": "2026-10-29 04:00:00 INFO Service started\n2026-10-29 04:15:22 WARNING high memory usage\n"
};

export const INITIAL_SKILLS: Skill[] = [
  {
    id: "skill_git_inspect",
    task: "Inspect git repository status and configuration",
    description: "Read git status and config cleanly",
    trigger_keywords: ["git", "repository", "inspect"],
    tool_sequence: ["run_shell", "read_file"],
    reflection: "Checking git status first confirms working branch before inspecting config files.",
    created_at: Date.now() - 3600000
  },
  {
    id: "skill_code_audit",
    task: "Audit Python code syntax and run AST analysis",
    description: "Analyze python AST and diff against baseline",
    trigger_keywords: ["python", "ast", "audit", "diff"],
    tool_sequence: ["analyze_python", "diff_files"],
    reflection: "Analyzing AST catches syntax issues without executing potentially untrusted code.",
    created_at: Date.now() - 7200000
  }
];

export function getDefaultConfig(): RunnerConfig {
  return {
    profile: "default",
    safety: {
      mode: "default",
      max_iterations: 10,
      max_consecutive_failures: 3
    },
    tools: {
      enable_shell: true,
      enable_web_fetch: true,
      enable_web_search: true,
      enable_code_analysis: true,
      shell_allowlist: ["ls", "cat", "echo", "pwd"],
      shell_denylist: ["rm -rf", "sudo", ":(){ :|:& };:"]
    },
    learning: {
      enabled: true,
      min_tool_calls_for_skill: 2,
      skills_dir: "./skills"
    },
    memory: {
      backend: "memory",
      path: ":memory:",
      max_rows: 100,
      working_window: 10,
      semantic_top_k: 3
    },
    system_prompt: "You are an autonomous agent powered by OBEY-RUNNER."
  };
}

export class VirtualTracker {
  current: ExecutionTrace | null = null;

  start(task: string): ExecutionTrace {
    this.current = {
      id: "trace_" + Math.random().toString(36).substring(2, 9),
      task,
      steps: [],
      success: false,
      started: Date.now()
    };
    return this.current;
  }

  record(tool: string, args: Record<string, any>, result: string): void {
    if (this.current) {
      this.current.steps.push({
        tool,
        args,
        result,
        ts: Date.now()
      });
    }
  }

  finish(success: boolean): ExecutionTrace | null {
    const trace = this.current;
    if (trace) {
      trace.success = success;
      trace.finished = Date.now();
    }
    // Clean lifecycle on finish: Prevents double-finish & stale trace reuse
    this.current = null;
    return trace;
  }
}

export type ApproverFn = (tool: string, args: Record<string, any>) => boolean;

export class SimulatedRunner {
  cfg: RunnerConfig;
  approver?: ApproverFn;
  tracker: VirtualTracker;
  skills: Skill[];
  fs: VirtualFileSystem;
  workingMemory: MemoryEntry[] = [];
  consecutiveFailures: Record<string, number> = {};

  constructor(cfg: RunnerConfig, approver?: ApproverFn, initialSkills = INITIAL_SKILLS, fs = INITIAL_FILESYSTEM) {
    this.cfg = JSON.parse(JSON.stringify(cfg));
    this.approver = approver;
    this.tracker = new VirtualTracker();
    this.skills = [...initialSkills];
    this.fs = { ...fs };
  }

  // Token-matched keyword triggering with >= 2 keyword threshold
  _matches(order: string, kws: string[]): boolean {
    if (!kws || kws.length === 0) return false;
    const tokens = new Set((order.toLowerCase().match(/\b[a-z0-9_]+\b/g) || []));
    const hits = kws.filter(k => tokens.has(k.toLowerCase())).length;
    if (kws.length >= 2) {
      return hits >= 2;
    }
    return hits >= 1;
  }

  _matchedSkillsBlock(order: string): string {
    if (!this.cfg.learning.enabled) return "";
    const hits = this.skills.filter(s => this._matches(order, s.trigger_keywords));
    if (hits.length === 0) return "";
    const lines = ["", "KNOWN SKILLS (reusable tool sequences from past successes):"];
    for (const s of hits.slice(0, 3)) {
      lines.push(`- ${s.description}: ${s.tool_sequence.join(" -> ")}`);
    }
    return lines.join("\n");
  }

  _semanticMemoryBlock(query: string): string {
    if (!this.cfg.memory.semantic_top_k) return "";
    // Emulated semantic memory
    return "\n[PAST CONTEXT]\n- system: Historical context verified and safe.";
  }

  // Unified Success Gate (Fix for Blocker #1 & #3)
  _traceSucceeded(finalText: string, trace: ExecutionTrace): boolean {
    if (!finalText || finalText === "NO OUTPUT") {
      return false;
    }
    if (hasErrorPrefix(finalText)) {
      return false;
    }
    return !trace.steps.some(step => hasErrorPrefix(step.result));
  }

  // Core Dispatch Engine
  _dispatch(name: string, args: Record<string, any>): string {
    // 1. Safety Rules & Approvals
    let requiresApproval = false;
    if (name === "run_shell" || name === "write_file" || name === "edit_file") {
      requiresApproval = true;
    }

    // Safety profile checks
    if (this.cfg.safety.mode === "strict" && name === "run_shell") {
      return "TOOL BLOCKED: Shell execution disabled in strict profile";
    }

    let approved = false;
    if (requiresApproval && this.cfg.safety.mode !== "yolo") {
      if (!this.approver) {
        return `TOOL BLOCKED: ${name} requires approval (no approver configured)`;
      }
      try {
        approved = this.approver(name, args);
      } catch (e: any) {
        return `TOOL BLOCKED: approver raised ${e.message || e}`;
      }
      if (!approved) {
        return `TOOL BLOCKED: approver denied '${name}'`;
      }
    }

    // 2. Dispatch execution with safe copy of args (Fix for args injection)
    try {
      let result = "";
      if (name === "read_file") {
        const path = args.path;
        if (!path || this.fs[path] === undefined) {
          throw new Error(`File not found: ${path}`);
        }
        result = this.fs[path];
      } else if (name === "write_file") {
        const { path, content } = args;
        if (!path) throw new Error("Missing path");
        this.fs[path] = content || "";
        result = `Wrote ${content?.length || 0} bytes to ${path}`;
      } else if (name === "edit_file") {
        const { path, old: oldStr, new: newStr } = args;
        if (!path || this.fs[path] === undefined) {
          throw new Error(`File not found: ${path}`);
        }
        if (!this.fs[path].includes(oldStr)) {
          throw new Error(`Substring '${oldStr}' not found in ${path}`);
        }
        this.fs[path] = this.fs[path].replace(oldStr, newStr);
        result = `Successfully replaced occurrences in ${path}`;
      } else if (name === "glob_files") {
        const pattern = args.pattern || "*";
        const matches = Object.keys(this.fs).filter(p => p.includes(pattern.replace(/\*/g, '')));
        result = JSON.stringify(matches);
      } else if (name === "web_search") {
        const query = args.query || "";
        result = `[Search Results for "${query}"]:\n1. OBEY-RUNNER v4 Architecture Guide\n2. Python Secrets compare_digest docs`;
      } else if (name === "web_fetch") {
        const url = args.url || "";
        // SSRF protection
        if (url.includes("127.0.0.1") || url.includes("localhost") || url.includes("169.254")) {
          return "FETCH BLOCKED: SSRF protection triggered for private/local IP range";
        }
        result = `Cleaned text content for ${url} (HTTP 200 OK)`;
      } else if (name === "run_shell") {
        // Safe argument copy: Strips any model-smuggled approved: true flag
        const safeArgs = { ...args };
        delete safeArgs.approved;
        const cmd = safeArgs.cmd || "";
        if (this.cfg.tools.shell_denylist?.some(d => cmd.includes(d))) {
          return `TOOL BLOCKED: Command '${cmd}' matched denylist`;
        }
        result = `Executed [${cmd}]:\nOutput: success (exit code 0)`;
      } else if (name === "analyze_python") {
        const path = args.path;
        if (!path || this.fs[path] === undefined) {
          return `SYNTAX ERROR: Cannot analyze non-existent file '${path}'`;
        }
        result = `AST summary of ${path}: Functions: [add, multiply], Classes: []`;
      } else if (name === "diff_files") {
        result = `--- ${args.a}\n+++ ${args.b}\n@@ -1 +1 @@\n-old\n+new`;
      } else {
        return `UNKNOWN TOOL: ${name}`;
      }

      this.consecutiveFailures[name] = 0;
      return result;
    } catch (e: any) {
      const cnt = (this.consecutiveFailures[name] || 0) + 1;
      this.consecutiveFailures[name] = cnt;
      let hint = "";
      if (cnt >= this.cfg.safety.max_consecutive_failures) {
        hint = `\n[RECOVERY HINT: ${name} has failed ${cnt} times. Try a completely different approach.]`;
      }
      return `TOOL ERROR (${name}): ${e.message || e}${hint}`;
    }
  }

  // Simulated Single Step Pass
  _stepOnce(
    order: string,
    tracker?: VirtualTracker,
    options?: {
      searchQuery?: string;
      customScenario?: 'success_crystallize' | 'failed_edit' | 'empty_output' | 'model_error' | 'shell_injection' | 'done_subword';
    }
  ): string {
    this.consecutiveFailures = {};

    let systemPrompt = this.cfg.system_prompt;
    systemPrompt += this._matchedSkillsBlock(order);
    systemPrompt += this._semanticMemoryBlock(options?.searchQuery || order);

    this.workingMemory.push({ role: 'user', content: order });

    const scenario = options?.customScenario;

    // Simulation scenario routing
    if (scenario === 'model_error') {
      return "MODEL ERROR: Rate limit exceeded or upstream API unavailable";
    }

    if (scenario === 'empty_output') {
      // Returns empty string
      this.workingMemory.push({ role: 'assistant', content: "" });
      return "";
    }

    if (scenario === 'failed_edit') {
      // Attempting edit on non-existent file
      const toolName = "edit_file";
      const toolArgs = { path: "/no/such/file.py", old: "a", new: "b" };
      const toolResult = this._dispatch(toolName, toolArgs);
      if (tracker) {
        tracker.record(toolName, toolArgs, toolResult);
      }
      this.workingMemory.push({ role: 'assistant', content: "", tool_calls: [{ function: { name: toolName, arguments: JSON.stringify(toolArgs) } }] });
      this.workingMemory.push({ role: 'tool', content: toolResult });
      return "DONE"; // Model emits DONE but step had tool error!
    }

    if (scenario === 'shell_injection') {
      // Model tries to smuggle approved: true
      const toolName = "run_shell";
      const toolArgs = { cmd: "cat /etc/hostname", approved: true };
      const toolResult = this._dispatch(toolName, toolArgs);
      if (tracker) {
        tracker.record(toolName, toolArgs, toolResult);
      }
      return `Result: ${toolResult} DONE`;
    }

    if (scenario === 'done_subword') {
      // Emits ABANDONED (not word-bounded DONE)
      return "The process was ABANDONED due to environment limits.";
    }

    // Default multi-tool clean success scenario
    // Step 1: read_file
    const step1Name = "read_file";
    const step1Args = { path: "/etc/hostname" };
    const step1Res = this._dispatch(step1Name, step1Args);
    if (tracker) tracker.record(step1Name, step1Args, step1Res);

    // Step 2: glob_files
    const step2Name = "glob_files";
    const step2Args = { pattern: "*.yaml" };
    const step2Res = this._dispatch(step2Name, step2Args);
    if (tracker) tracker.record(step2Name, step2Args, step2Res);

    const finalText = `Successfully checked hostname and found configs: ${step2Res.trim()}. Task completed. DONE`;
    this.workingMemory.push({ role: 'assistant', content: finalText });
    return finalText;
  }

  step(order: string, scenario?: any): { result: string; trace: ExecutionTrace | null; crystallized: boolean } {
    const trace = this.tracker.start(order);
    const rawResult = this._stepOnce(order, this.tracker, { customScenario: scenario });
    const success = this._traceSucceeded(rawResult, trace);
    const finishedTrace = this.tracker.finish(success);

    let crystallized = false;
    if (this._shouldCrystallize(finishedTrace)) {
      this._crystallizeSkill(finishedTrace!);
      crystallized = true;
    }

    return {
      result: rawResult || "NO OUTPUT",
      trace: finishedTrace,
      crystallized
    };
  }

  _shouldCrystallize(trace: ExecutionTrace | null): boolean {
    if (!this.cfg.learning.enabled || !trace || !trace.success) return false;
    return trace.steps.length >= this.cfg.learning.min_tool_calls_for_skill;
  }

  _crystallizeSkill(trace: ExecutionTrace): Skill {
    const tokens = trace.task.toLowerCase().match(/\b[a-z0-9_]+\b/g) || [];
    const keywords = Array.from(new Set(tokens.filter(t => t.length > 3))).slice(0, 4);
    const newSkill: Skill = {
      id: "skill_" + Math.random().toString(36).substring(2, 9),
      task: trace.task,
      description: `Optimized workflow for ${trace.task.substring(0, 40)}`,
      trigger_keywords: keywords.length > 0 ? keywords : ["task", "execute"],
      tool_sequence: trace.steps.map(s => s.tool),
      reflection: `Successful execution verified with ${trace.steps.length} sequential steps without error prefixes.`,
      created_at: Date.now()
    };
    this.skills.push(newSkill);
    return newSkill;
  }
}
