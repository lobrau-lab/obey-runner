export interface CodeFile {
  name: string;
  path: string;
  category: 'core' | 'learning' | 'loops' | 'interfaces';
  description: string;
  code: string;
  highlights: {
    lineStart: number;
    lineEnd: number;
    title: string;
    description: string;
    type: 'security' | 'fix' | 'refactor';
  }[];
}

export const PATCH_ITEMS = [
  {
    id: 1,
    tag: "BLOCKER #1",
    title: "Loops Bypassed Success Gate",
    file: "loops/problem_solving.py & loops/logic.py",
    severity: "BLOCKER",
    problem: "Retry loops (solve_loop, constraint_loop) evaluated success locally without honoring tool errors, and attempts shared or leaked trace state, potentially crystallizing failed traces with tool errors into the skill store.",
    solution: "Unified success gate in `Runner._trace_succeeded(final_text, trace)` called by both step and retry loops. Each attempt gets an isolated per-attempt trace (`trace = runner.tracker.start(...)`). Only genuinely successful attempts trigger `_learn_from_trace(trace)`.",
    impact: "Completely prevents poisonous skills generated from failed tool attempts from contaminating the knowledge base."
  },
  {
    id: 2,
    tag: "BLOCKER #2",
    title: "ERROR_PREFIXES Regression",
    file: "runner.py",
    severity: "BLOCKER",
    problem: "Limited error prefix matching allowed subtle tool failures (e.g., from `edit_file`, `shell`, `web_search`, `web_fetch`, `analyze_python`) to slip past the success gate when tools returned non-standard prefixes.",
    solution: "Comprehensive, anchored tuple of `ERROR_PREFIXES` covering `TOOL ERROR`, `TOOL BLOCKED`, `TOOL ARG ERROR`, `UNKNOWN TOOL`, `MODEL ERROR`, `MAX ITERATIONS`, `ERROR`, `BLOCKED`, `SEARCH ERROR`, `FETCH ERROR`, `FETCH BLOCKED`, `SYNTAX ERROR`. Documented drift rule.",
    impact: "Zero silent failures. Uses anchored `startswith` check so files merely containing the word 'ERROR' internally are not falsely flagged."
  },
  {
    id: 3,
    tag: "BLOCKER #3",
    title: "'NO OUTPUT' Counted as Success",
    file: "runner.py",
    severity: "BLOCKER",
    problem: "When the model generated empty content with a normal stop reason, the fallback 'NO OUTPUT' string was evaluated as successful text, potentially triggering skill crystallization with >= 5 tool calls.",
    solution: "`_step_once` returns `''` on empty output. `_trace_succeeded` explicitly checks `if not final_text or final_text == 'NO OUTPUT': return False`. The fallback `'NO OUTPUT'` is applied after trace evaluation.",
    impact: "Empty responses are strictly disqualified from being saved as successful learned skills."
  },
  {
    id: 4,
    tag: "BLOCKER #4",
    title: "API Leaked Skills Across Callers",
    file: "interfaces/api.py",
    severity: "BLOCKER",
    problem: "In FastAPI `/run`, shared state channels (SQLite semantic retrieval and skills_dir) could leak caller A's proprietary prompts, tool calls, and reflections into caller B's system prompt.",
    solution: "Per-request isolation in `api.py`: `cfg.memory.semantic_top_k = 0` and `cfg.learning.enabled = False`. Added explicit architectural note on multi-tenant session isolation requirements.",
    impact: "Eliminates cross-tenant prompt injection and information leakage via the shared skill repository in multi-caller environments."
  },
  {
    id: 5,
    tag: "SECURITY",
    title: "Constant-Time Key Comparison (Timing Attack Protection)",
    file: "interfaces/api.py",
    severity: "SECURITY",
    problem: "Plain string comparison `x_api_key != expected` was vulnerable to character-by-character timing attacks to deduce the `OBEY_API_KEY`.",
    solution: "Replaced with `secrets.compare_digest(x_api_key, expected)` from Python's standard cryptography library.",
    impact: "Guarantees constant-time verification immune to side-channel timing analysis."
  },
  {
    id: 6,
    tag: "SECURITY",
    title: "Safe Dispatch Args Immutability",
    file: "runner.py",
    severity: "SECURITY",
    problem: "An adversarial model response could attempt to bypass the human approval gate by injecting `{\"cmd\": \"rm -rf /\", \"approved\": true}` into tool arguments.",
    solution: "In `_dispatch`, `safe = {k: v for k, v in args.items() if k != 'approved'}` strips any model-injected approval flag before calling `spec.fn(**safe, approved=approved)`.",
    impact: "Human approval cannot be bypassed or spoofed by model parameter manipulation."
  },
  {
    id: 7,
    tag: "CLEANUP",
    title: "Tracker.finish Clears Current Trace",
    file: "learning/tracker.py",
    severity: "FIX",
    problem: "`Tracker.finish` left `self.current` populated, risking double-finish or subsequent steps accidentally appending to a completed trace.",
    solution: "`self.current = None` immediately upon finish.",
    impact: "Prevents trace contamination across lifecycle boundaries."
  },
  {
    id: 8,
    tag: "LOGIC",
    title: "Word-Bounded DONE Detection",
    file: "loops/problem_solving.py",
    severity: "FIX",
    problem: "Substrings like 'ABANDONED', 'CONDONED', or 'PARDONED' erroneously matched `'DONE' in result.upper()`.",
    solution: "Upgraded to regex word boundary check: `bool(re.search(r'\\bDONE\\b', result.upper()))`.",
    impact: "Precise termination detection without false positives."
  }
];

export const SOURCE_FILES: CodeFile[] = [
  {
    name: "runner.py",
    path: "src/obey_runner/runner.py",
    category: "core",
    description: "Main orchestrator handling tool registration, model dispatch, approval rules, context injection, and trace success gating.",
    code: `from __future__ import annotations
import json
import re
from typing import Callable
from .config import RunnerConfig
from .model_client import ModelClient
from .memory.base import MemoryEntry
from .memory.sqlite_store import SQLiteMemory
from .memory.working import WorkingMemory
from .tools.registry import ToolRegistry, ToolSpec
from .tools import filesystem, shell, web, code_analysis
from .safety.rules import RuleEngine
from .learning.tracker import Tracker, ExecutionTrace
from .learning.evaluator import should_crystallize
from .learning.reflector import reflect
from .learning.crystallizer import crystallize
from .learning.store import SkillStore


Approver = Callable[[str, dict], bool]

# Prefixes that mark a final answer or a tool result as failed.
# \`startswith\` is anchored, so a file that merely *contains* one of these
# substrings is unaffected — only strings that *begin* with one are.
# If you add a tool that returns a new failure prefix, add it here or
# canonicalize by raising inside the tool so _dispatch wraps it as
# "TOOL ERROR (...)".
ERROR_PREFIXES = (
    # _dispatch-produced
    "TOOL ERROR", "TOOL BLOCKED", "TOOL ARG ERROR", "UNKNOWN TOOL",
    # _step_once-produced
    "MODEL ERROR", "MAX ITERATIONS",
    # generic tool failure prefix (edit_file, shell, etc.)
    "ERROR", "BLOCKED",
    # compound tool failure prefixes
    "SEARCH ERROR", "FETCH ERROR", "FETCH BLOCKED", "SYNTAX ERROR",
)


class Runner:
    def __init__(self, cfg: RunnerConfig, approver: Approver | None = None):
        self.cfg = cfg
        self.approver = approver
        self.client = ModelClient(cfg.model)
        self.memory = (SQLiteMemory(cfg.memory.path, max_rows=cfg.memory.max_rows)
                       if cfg.memory.backend == "sqlite" else None)
        self.working = WorkingMemory(cfg.memory.working_window)
        self.registry = ToolRegistry()
        self.rules = RuleEngine(cfg.safety)
        self.tracker = Tracker()
        self.skill_store = SkillStore(cfg.learning.skills_dir)
        self._consecutive_failures: dict[str, int] = {}
        self._register_builtin_tools()

    def __enter__(self) -> "Runner":
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    # ---------- tool registration ----------

    def _register_builtin_tools(self) -> None:
        r = self.registry
        r.register(ToolSpec("read_file", "Read a file from disk.", {
            "type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]
        }, lambda path: filesystem.read_file(path)))

        r.register(ToolSpec("write_file", "Write content to a file.", {
            "type": "object",
            "properties": {"path": {"type": "string"}, "content": {"type": "string"}},
            "required": ["path", "content"],
        }, lambda path, content: filesystem.write_file(path, content), requires_approval=True))

        r.register(ToolSpec("edit_file", "Replace one occurrence of old with new in a file.", {
            "type": "object",
            "properties": {"path": {"type": "string"}, "old": {"type": "string"}, "new": {"type": "string"}},
            "required": ["path", "old", "new"],
        }, lambda path, old, new: filesystem.edit_file(path, old, new), requires_approval=True))

        r.register(ToolSpec("glob_files", "List files matching a glob pattern.", {
            "type": "object",
            "properties": {"pattern": {"type": "string"}, "root": {"type": "string", "default": "."}},
            "required": ["pattern"],
        }, lambda pattern, root=".": filesystem.glob_files(pattern, root)))

        if self.cfg.tools.enable_web_search:
            r.register(ToolSpec("web_search", "Search the web via DuckDuckGo.", {
                "type": "object",
                "properties": {"query": {"type": "string"}, "max_results": {"type": "integer", "default": 5}},
                "required": ["query"],
            }, lambda query, max_results=5: web.web_search(query, max_results)))

        if self.cfg.tools.enable_web_fetch:
            r.register(ToolSpec("web_fetch", "Fetch a URL and return cleaned text.", {
                "type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"],
            }, lambda url: web.web_fetch(url), requires_approval=False))

        if self.cfg.tools.enable_shell:
            r.register(ToolSpec("run_shell", "Execute a shell command.", {
                "type": "object", "properties": {"cmd": {"type": "string"}}, "required": ["cmd"],
            }, lambda cmd, approved=False: shell.run_shell(
                cmd,
                self.cfg.tools.shell_allowlist,
                self.cfg.tools.shell_denylist,
                yolo=self.cfg.safety.mode == "yolo",
                approved=approved,
            ), requires_approval=True))

        if self.cfg.tools.enable_code_analysis:
            r.register(ToolSpec("analyze_python", "Return AST summary of a Python file.", {
                "type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"],
            }, lambda path: code_analysis.analyze_python(path)))

            r.register(ToolSpec("diff_files", "Unified diff between two files.", {
                "type": "object",
                "properties": {"a": {"type": "string"}, "b": {"type": "string"}},
                "required": ["a", "b"],
            }, lambda a, b: code_analysis.diff_summary(a, b)))

    # ---------- dispatch ----------

    def _dispatch(self, name: str, args: dict) -> str:
        spec = self.registry.get(name)
        if not spec:
            return f"UNKNOWN TOOL: {name}"

        decision, reason = self.rules.evaluate(name, spec, args)
        approved = False
        if decision == "deny":
            return f"TOOL BLOCKED: {reason}"
        if decision == "approve":
            if self.approver is None:
                return f"TOOL BLOCKED: {reason} (no approver configured)"
            try:
                approved = bool(self.approver(name, args))
            except Exception as e:
                return f"TOOL BLOCKED: approver raised {e}"
            if not approved:
                return f"TOOL BLOCKED: approver denied '{name}'"

        try:
            if name == "run_shell":
                # Never let the model smuggle an "approved": true via args.
                safe = {k: v for k, v in args.items() if k != "approved"}
                result = spec.fn(**safe, approved=approved)
            else:
                result = spec.fn(**args)
            self._consecutive_failures[name] = 0
            return str(result)
        except Exception as e:
            cnt = self._consecutive_failures.get(name, 0) + 1
            self._consecutive_failures[name] = cnt
            hint = ""
            if cnt >= self.cfg.safety.max_consecutive_failures:
                hint = (f"\\n[RECOVERY HINT: {name} has failed {cnt} times. "
                        f"Try a completely different approach.]")
            return f"TOOL ERROR ({name}): {e}{hint}"

    # ---------- context injection ----------

    def _matches(self, order: str, kws: list[str]) -> bool:
        if not kws:
            return False
        toks = set(re.findall(r"\\b[a-z0-9_]+\\b", order.lower()))
        hits = sum(1 for k in kws if k in toks)
        if len(kws) >= 2:
            return hits >= 2
        return hits >= 1

    def _matched_skills_block(self, order: str) -> str:
        if not self.cfg.learning.enabled:
            return ""
        hits = [
            s for s in self.skill_store.list_skills()
            if self._matches(order, s.get("trigger_keywords") or [])
        ]
        if not hits:
            return ""
        lines = ["", "KNOWN SKILLS (reusable tool sequences from past successes):"]
        for s in hits[:3]:
            lines.append(f"- {s.get('description', '(no description)')}: "
                         f"{' -> '.join(s.get('tool_sequence', []))}")
        return "\\n".join(lines)

    def _semantic_memory_block(self, query: str) -> str:
        if not self.memory or not self.cfg.memory.semantic_top_k:
            return ""
        try:
            hits = self.memory.search_similar(query, self.cfg.memory.semantic_top_k)
        except Exception:
            return ""
        if not hits:
            return ""
        lines = ["", "[PAST CONTEXT]"]
        for h in hits:
            lines.append(f"- {h.role}: {h.content[:300]}")
        return "\\n".join(lines)

    # ---------- success gate ----------

    def _trace_succeeded(self, final_text: str, trace: ExecutionTrace) -> bool:
        """Single source of truth for 'this trace is worth learning from'.

        Called from \`step\` and from both loops. Returns False on empty or
        sentinel final answers, on any error-prefixed step result, and on
        the "NO OUTPUT" fallback. Model errors and iteration exhaustion
        are already error-prefixed, so they're covered by the tuple.
        """
        if not final_text or final_text == "NO OUTPUT":
            return False
        if final_text.startswith(ERROR_PREFIXES):
            return False
        return not any(s.result.startswith(ERROR_PREFIXES) for s in trace.steps)

    # ---------- main loop ----------

    def _step_once(
        self,
        order: str,
        tracker: Tracker | None = None,
        *,
        search_query: str | None = None,
    ) -> str:
        """One model-dispatch pass. Does not start or finish a trace.

        Returns "" when the model produced empty content with a normal
        stop reason; the caller (\`step\` or a loop) is responsible for
        treating that as a non-success. On iteration exhaustion or model
        error the return value starts with an ERROR_PREFIXES prefix.
        """
        self._consecutive_failures.clear()

        system_prompt = self.cfg.system_prompt
        system_prompt += self._matched_skills_block(order)
        system_prompt += self._semantic_memory_block(search_query or order)

        self.working.push(MemoryEntry(role="user", content=order))
        if self.memory:
            self.memory.add(MemoryEntry(role="user", content=order))

        final_text = ""
        truncated = False

        for _ in range(self.cfg.safety.max_iterations):
            messages = [{"role": "system", "content": system_prompt}]
            messages += self.working.to_messages()

            try:
                resp = self.client.chat(messages, tools=self.registry.openai_schemas())
            except Exception as e:
                return f"MODEL ERROR: {e}"

            choice = resp["choices"][0]
            msg = choice["message"]
            content = msg.get("content") or ""
            tool_calls = msg.get("tool_calls") or []
            finish_reason = choice.get("finish_reason")

            if tool_calls:
                self.working.push(MemoryEntry(
                    role="assistant", content=content, tool_calls=tool_calls))
                if self.memory:
                    self.memory.add(MemoryEntry(
                        role="assistant", content=content, tool_calls=tool_calls))

                for tc in tool_calls:
                    fn = tc["function"]
                    name = fn["name"]
                    try:
                        args = json.loads(fn.get("arguments") or "{}")
                    except json.JSONDecodeError as e:
                        result = (f"TOOL ARG ERROR: invalid JSON in '{name}' call: {e}. "
                                  f"Regenerate with valid JSON.")
                        if tracker is not None:
                            tracker.record(name, {}, result)
                        self.working.push(MemoryEntry(
                            role="tool", content=result, tool_call_id=tc["id"]))
                        if self.memory:
                            self.memory.add(MemoryEntry(
                                role="tool", content=result, tool_call_id=tc["id"]))
                        continue

                    result = self._dispatch(name, args)
                    if tracker is not None:
                        tracker.record(name, args, result)
                    self.working.push(MemoryEntry(
                        role="tool", content=result, tool_call_id=tc["id"]))
                    if self.memory:
                        self.memory.add(MemoryEntry(
                            role="tool", content=result, tool_call_id=tc["id"]))
                continue

            final_text = content
            truncated = finish_reason == "length"
            self.working.push(MemoryEntry(role="assistant", content=final_text))
            if self.memory:
                self.memory.add(MemoryEntry(role="assistant", content=final_text))
            break
        else:
            return "MAX ITERATIONS REACHED (no final answer from model)"

        if truncated:
            final_text += ("\\n[TRUNCATED: model hit max_tokens; "
                           "raise model.max_tokens or split the order]")
        return final_text

    def step(self, order: str) -> str:
        trace = self.tracker.start(order)
        final_text = self._step_once(order, tracker=trace)
        success = self._trace_succeeded(final_text, trace)
        trace = self.tracker.finish(success=success)
        self._learn_from_trace(trace)
        return final_text or "NO OUTPUT"

    # ---------- self-learning ----------

    def _learn_from_trace(self, trace: ExecutionTrace | None) -> None:
        if not self.cfg.learning.enabled or trace is None or not trace.success:
            return
        if not should_crystallize(trace, self.cfg.learning.min_tool_calls_for_skill):
            return
        skill = crystallize(trace)
        skill["reflection"] = reflect(trace)
        self.skill_store.save(skill)

    # ---------- shutdown ----------

    def close(self) -> None:
        self.client.close()
        if self.memory:
            self.memory.close()
`,
    highlights: [
      {
        lineStart: 41,
        lineEnd: 50,
        title: "Expanded ERROR_PREFIXES (Blocker #2)",
        description: "Covers all internal and external tool failure patterns without false positive substring matches.",
        type: "fix"
      },
      {
        lineStart: 156,
        lineEnd: 159,
        title: "Smuggle-proof run_shell dispatch",
        description: "Creates safe args dictionary without 'approved' key so the model cannot spoof approval.",
        type: "security"
      },
      {
        lineStart: 215,
        lineEnd: 227,
        title: "Unified Success Gate (Blockers #1 & #3)",
        description: "Validates final_text, rejects 'NO OUTPUT', and checks every step result against ERROR_PREFIXES.",
        type: "fix"
      }
    ]
  },
  {
    name: "tracker.py",
    path: "src/obey_runner/learning/tracker.py",
    category: "learning",
    description: "Thread-safe execution tracer tracking task steps, tool arguments, results, and timestamps.",
    code: `from __future__ import annotations
from dataclasses import dataclass, field
import time


@dataclass
class TraceStep:
    tool: str
    args: dict
    result: str
    ts: float = field(default_factory=time.time)


@dataclass
class ExecutionTrace:
    task: str
    steps: list[TraceStep] = field(default_factory=list)
    success: bool = False
    started: float = field(default_factory=time.time)


class Tracker:
    def __init__(self):
        self.current: ExecutionTrace | None = None

    def start(self, task: str) -> ExecutionTrace:
        self.current = ExecutionTrace(task=task)
        return self.current

    def record(self, tool: str, args: dict, result: str) -> None:
        if self.current is not None:
            self.current.steps.append(TraceStep(tool, args, result))

    def finish(self, success: bool) -> ExecutionTrace | None:
        trace = self.current
        if trace is not None:
            trace.success = success
        self.current = None  # prevent double-finish / stale reuse
        return trace
`,
    highlights: [
      {
        lineStart: 30,
        lineEnd: 32,
        title: "Clean Lifecycle on finish()",
        description: "Resets self.current = None to prevent stale reuse or cross-run trace contamination.",
        type: "fix"
      }
    ]
  },
  {
    name: "problem_solving.py",
    path: "src/obey_runner/loops/problem_solving.py",
    category: "loops",
    description: "Autonomous retry loop with bounded attempts, hint injection on failure, and trace isolation.",
    code: `from __future__ import annotations
import re
from ..runner import Runner


def solve_loop(runner: Runner, order: str, max_attempts: int = 5) -> str:
    """Bounded retry loop.

    Each attempt gets its own trace. An attempt is "successful" only if the
    model emitted a word-bounded DONE *and* the attempt's trace has no
    error-prefixed tool results. Only a successful attempt is crystallized,
    so a failed attempt's errors cannot poison the skill store.
    """
    last = ""
    for attempt in range(1, max_attempts + 1):
        prompt = (
            order if attempt == 1
            else f"{order}\\n\\nPREVIOUS ATTEMPT FAILED. Hint: {last[:400]}\\nTry a different approach."
        )
        trace = runner.tracker.start(order)
        result = runner._step_once(prompt, tracker=trace, search_query=order)
        success = bool(re.search(r"\\bDONE\\b", result.upper())) and runner._trace_succeeded(result, trace)
        trace = runner.tracker.finish(success=success)
        if success:
            runner._learn_from_trace(trace)
            return result
        last = result
    return f"EXHAUSTED after {max_attempts} attempts. Last: {last}"
`,
    highlights: [
      {
        lineStart: 18,
        lineEnd: 24,
        title: "Per-Attempt Isolated Traces (Blocker #1)",
        description: "Starts fresh trace per iteration and tests runner._trace_succeeded with \\bDONE\\b check.",
        type: "fix"
      }
    ]
  },
  {
    name: "logic.py",
    path: "src/obey_runner/loops/logic.py",
    category: "loops",
    description: "Constraint-driven verification loop asserting all specified conditions are satisfied in output.",
    code: `from __future__ import annotations
from ..runner import Runner


def constraint_loop(
    runner: Runner,
    order: str,
    constraints: list[str],
    max_rounds: int = 10,
) -> str:
    """Retry until every constraint substring appears in a non-error result.

    Per-attempt traces, same as solve_loop: an attempt that had tool errors
    is retried rather than crystallized. Empty / MAX-ITERATIONS results are
    treated as retryable, not as constraint violations, so the loop doesn't
    spin when the model never produces a final answer.
    """
    last = ""
    for _ in range(max_rounds):
        context = (
            order if not last
            else f"{order}\\n\\nPREVIOUS ATTEMPT FAILED: {last[:400]}\\nTry again."
        )
        trace = runner.tracker.start(order)
        result = runner._step_once(context, tracker=trace, search_query=order)

        if not result or result.startswith(("MAX ITERATIONS", "MODEL ERROR")):
            trace = runner.tracker.finish(success=False)
            last = result
            continue

        violations = [c for c in constraints if c.lower() not in result.lower()]
        success = not violations and runner._trace_succeeded(result, trace)
        trace = runner.tracker.finish(success=success)
        if success:
            runner._learn_from_trace(trace)
            return result
        last = result
    return f"CONSTRAINT LOOP EXHAUSTED. Last: {last}"
`,
    highlights: [
      {
        lineStart: 25,
        lineEnd: 32,
        title: "Constraint & Error Gate Verification",
        description: "Assures all constraints are met AND trace has no tool errors before crystallizing.",
        type: "fix"
      }
    ]
  },
  {
    name: "api.py",
    path: "src/obey_runner/interfaces/api.py",
    category: "interfaces",
    description: "FastAPI REST service exposing /run with constant-time API key auth and per-request tenant isolation.",
    code: `from __future__ import annotations
import os
import secrets
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from ..config import RunnerConfig
from ..runner import Runner


class OrderRequest(BaseModel):
    order: str
    profile: str = "default"
    approve_tools: list[str] = Field(default_factory=list)


class OrderResponse(BaseModel):
    result: str


def _make_approver(approve_tools: list[str]):
    def approver(tool_name: str, args: dict) -> bool:
        return tool_name in approve_tools
    return approver


def require_key(x_api_key: str = Header(default="")) -> None:
    """If OBEY_API_KEY is set, require it on every request."""
    expected = os.getenv("OBEY_API_KEY", "")
    if expected and not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail="invalid API key")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="OBEY-RUNNER API", lifespan=lifespan)


@app.post("/run", response_model=OrderResponse, dependencies=[Depends(require_key)])
def run_order(req: OrderRequest):
    cfg = RunnerConfig.load(req.profile)
    # Per-request Runner: fresh working memory, fresh SQLite connection,
    # fresh approver. Disable both cross-caller state channels:
    #   * semantic memory retrieval — shared SQLite could leak A's messages
    #     into B's system prompt
    #   * skill crystallization/retrieval — shared skills_dir could leak A's
    #     trace description and tool sequence into B's system prompt
    # For real multi-tenancy, add a per-session skills_dir and memory DB.
    cfg.memory.semantic_top_k = 0
    cfg.learning.enabled = False

    runner = Runner(cfg, approver=_make_approver(req.approve_tools))
    try:
        return OrderResponse(result=runner.step(req.order))
    finally:
        runner.close()
`,
    highlights: [
      {
        lineStart: 25,
        lineEnd: 29,
        title: "Timing Attack Defense with secrets.compare_digest",
        description: "Uses constant-time comparison to prevent timing leak attacks on OBEY_API_KEY.",
        type: "security"
      },
      {
        lineStart: 47,
        lineEnd: 52,
        title: "Tenant Isolation (Blocker #4)",
        description: "Disables semantic memory and skill learning per request so callers cannot leak prompts to others.",
        type: "security"
      }
    ]
  }
];
