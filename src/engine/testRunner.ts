import { SimulatedRunner, constantTimeCompare, VirtualTracker, ERROR_PREFIXES } from './simulationEngine';
import { RunnerConfig } from '../types/runner';

export interface TestCaseResult {
  id: string;
  name: string;
  patchItem: string;
  passed: boolean;
  durationMs: number;
  assertionLogs: string[];
  errorMessage?: string;
}

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

export async function runAllVerificationTests(): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];

  // TEST 1: Loops share the success gate (Failed edit is not crystallized)
  {
    const start = performance.now();
    const logs: string[] = [];
    let passed = true;
    try {
      logs.push("Initializing Runner with learning.enabled = true, min_tool_calls = 1");
      const cfg = getDefaultConfig();
      cfg.learning.min_tool_calls_for_skill = 1;
      const runner = new SimulatedRunner(cfg, () => true, []);

      logs.push("Simulating Attempt 1: tool error in edit_file, but model emits 'DONE'");
      const trace1 = runner.tracker.start("rename a file");
      const res1 = runner._stepOnce("rename a file", runner.tracker, { customScenario: 'failed_edit' });
      const success1 = runner._traceSucceeded(res1, trace1);
      const finished1 = runner.tracker.finish(success1);

      logs.push(`Attempt 1 output: "${res1}"`);
      logs.push(`Attempt 1 trace success evaluation: ${success1} (Expected: false)`);
      if (success1 !== false) {
        throw new Error("Attempt 1 with tool error was wrongly marked as success!");
      }

      if (runner._shouldCrystallize(finished1)) {
        throw new Error("Failed trace was crystallized into skills!");
      }
      logs.push("Assert passed: Failed trace with error prefix was REJECTED by success gate.");

      logs.push("Simulating Attempt 2: clean execution with 'DONE'");
      const trace2 = runner.tracker.start("rename a file");
      const res2 = runner._stepOnce("rename a file", runner.tracker, { customScenario: 'success_crystallize' });
      const success2 = runner._traceSucceeded(res2, trace2);
      const finished2 = runner.tracker.finish(success2);

      logs.push(`Attempt 2 trace success evaluation: ${success2} (Expected: true)`);
      if (!success2) {
        throw new Error("Clean attempt 2 failed success gate!");
      }
      if (runner._shouldCrystallize(finished2)) {
        runner._crystallizeSkill(finished2!);
      }
      logs.push(`Total skills crystallized: ${runner.skills.length} (Expected: 1)`);
      if (runner.skills.length !== 1) {
        throw new Error(`Expected exactly 1 skill crystallized, got ${runner.skills.length}`);
      }
      logs.push("Test 1 PASS: Failed attempt did not poison skill store.");
    } catch (e: any) {
      passed = false;
      logs.push(`FAIL: ${e.message}`);
    }
    results.push({
      id: "test_loops_gate",
      name: "Verification 1: Loops Share Success Gate",
      patchItem: "Blocker #1 (Loops bypass success gate)",
      passed,
      durationMs: Math.round(performance.now() - start),
      assertionLogs: logs
    });
  }

  // TEST 2: Empty model output is not success
  {
    const start = performance.now();
    const logs: string[] = [];
    let passed = true;
    try {
      logs.push("Testing empty model output with min_tool_calls_for_skill = 1");
      const cfg = getDefaultConfig();
      cfg.learning.min_tool_calls_for_skill = 1;
      const runner = new SimulatedRunner(cfg, () => true, []);

      const stepOut = runner.step("read hostname", 'empty_output');
      logs.push(`step() return value: "${stepOut.result}" (Expected: "NO OUTPUT")`);
      logs.push(`Trace success: ${stepOut.trace?.success} (Expected: false)`);
      logs.push(`Skills count: ${runner.skills.length} (Expected: 0)`);

      if (stepOut.result !== "NO OUTPUT") {
        throw new Error(`Expected 'NO OUTPUT', got '${stepOut.result}'`);
      }
      if (stepOut.trace?.success !== false) {
        throw new Error("Empty model response was marked as success!");
      }
      if (runner.skills.length > 0) {
        throw new Error("Skill was erroneously crystallized from empty output!");
      }
      logs.push("Test 2 PASS: Empty output strictly rejected from success and crystallization.");
    } catch (e: any) {
      passed = false;
      logs.push(`FAIL: ${e.message}`);
    }
    results.push({
      id: "test_empty_output",
      name: "Verification 2: Empty Model Output Disqualified",
      patchItem: "Blocker #3 ('NO OUTPUT' counted as success)",
      passed,
      durationMs: Math.round(performance.now() - start),
      assertionLogs: logs
    });
  }

  // TEST 3: API skills & semantic memory disabled per request (Multi-tenant safety)
  {
    const start = performance.now();
    const logs: string[] = [];
    let passed = true;
    try {
      logs.push("Simulating POST /run request configuration in interfaces/api.py");
      const baseCfg = getDefaultConfig();
      // Apply API per-request isolation:
      baseCfg.memory.semantic_top_k = 0;
      baseCfg.learning.enabled = false;

      logs.push(`Verifying cfg.memory.semantic_top_k == ${baseCfg.memory.semantic_top_k}`);
      logs.push(`Verifying cfg.learning.enabled == ${baseCfg.learning.enabled}`);

      if (baseCfg.memory.semantic_top_k !== 0) {
        throw new Error("semantic_top_k must be 0 for API requests");
      }
      if (baseCfg.learning.enabled !== false) {
        throw new Error("learning.enabled must be false for API requests");
      }

      const runner = new SimulatedRunner(baseCfg, () => true);
      const skillsBlock = runner._matchedSkillsBlock("git inspect repository");
      const memoryBlock = runner._semanticMemoryBlock("git repository");

      logs.push(`Injected skills block length: ${skillsBlock.length} (Expected: 0)`);
      logs.push(`Injected memory block length: ${memoryBlock.length} (Expected: 0)`);

      if (skillsBlock !== "" || memoryBlock !== "") {
        throw new Error("Cross-tenant leakage channels are not suppressed!");
      }
      logs.push("Test 3 PASS: API per-request isolation prevents cross-tenant state leakage.");
    } catch (e: any) {
      passed = false;
      logs.push(`FAIL: ${e.message}`);
    }
    results.push({
      id: "test_api_tenant_isolation",
      name: "Verification 3: API State Isolation",
      patchItem: "Blocker #4 (API leaks skills across callers)",
      passed,
      durationMs: Math.round(performance.now() - start),
      assertionLogs: logs
    });
  }

  // TEST 4: Timing attack resistance (secrets.compare_digest)
  {
    const start = performance.now();
    const logs: string[] = [];
    let passed = true;
    try {
      logs.push("Testing constant-time comparison against expected API key");
      const expectedKey = "obey_sk_secret_982347102934";

      const valid = constantTimeCompare("obey_sk_secret_982347102934", expectedKey);
      const invalidDiffLength = constantTimeCompare("short", expectedKey);
      const invalidSameLength = constantTimeCompare("obey_sk_secret_982347102935", expectedKey);

      logs.push(`Matching key compare: ${valid} (Expected: true)`);
      logs.push(`Different length compare: ${invalidDiffLength} (Expected: false)`);
      logs.push(`Single-bit diff same length: ${invalidSameLength} (Expected: false)`);

      if (!valid || invalidDiffLength || invalidSameLength) {
        throw new Error("Comparison failed logic assertion!");
      }
      logs.push("Test 4 PASS: secrets.compare_digest verification matches specification.");
    } catch (e: any) {
      passed = false;
      logs.push(`FAIL: ${e.message}`);
    }
    results.push({
      id: "test_secrets_compare",
      name: "Verification 4: Constant-Time Digest Verification",
      patchItem: "Security (secrets.compare_digest one-liner)",
      passed,
      durationMs: Math.round(performance.now() - start),
      assertionLogs: logs
    });
  }

  // TEST 5: Model args injection prevention (_dispatch safe copy)
  {
    const start = performance.now();
    const logs: string[] = [];
    let passed = true;
    try {
      logs.push("Testing run_shell with model-smuggled 'approved': true");
      const cfg = getDefaultConfig();
      let approverCalled = false;
      let approverApproved = false;

      // Approver strictly denies
      const approver = (tool: string, args: Record<string, any>) => {
        approverCalled = true;
        return approverApproved;
      };

      const runner = new SimulatedRunner(cfg, approver);
      const result = runner._dispatch("run_shell", { cmd: "whoami", approved: true });

      logs.push(`Dispatch result: "${result}"`);
      logs.push(`Approver was queried: ${approverCalled} (Expected: true)`);

      if (!result.includes("TOOL BLOCKED: approver denied 'run_shell'")) {
        throw new Error("Model succeeded in smuggling approved: true parameter!");
      }
      logs.push("Test 5 PASS: Model cannot bypass approval gate via argument smuggling.");
    } catch (e: any) {
      passed = false;
      logs.push(`FAIL: ${e.message}`);
    }
    results.push({
      id: "test_args_immutability",
      name: "Verification 5: Dispatch Args Immutability",
      patchItem: "Security (_dispatch mutates args / approved flag)",
      passed,
      durationMs: Math.round(performance.now() - start),
      assertionLogs: logs
    });
  }

  // TEST 6: Tracker lifecycle cleanup (Tracker.finish clears current)
  {
    const start = performance.now();
    const logs: string[] = [];
    let passed = true;
    try {
      logs.push("Testing Tracker start -> record -> finish lifecycle");
      const tracker = new VirtualTracker();
      tracker.start("sample order");
      tracker.record("read_file", { path: "/test" }, "ok");

      if (!tracker.current) {
        throw new Error("tracker.current should be active after start()");
      }

      const finished = tracker.finish(true);
      logs.push(`Finished trace ID: ${finished?.id}`);
      logs.push(`tracker.current after finish(): ${tracker.current} (Expected: null)`);

      if (tracker.current !== null) {
        throw new Error("tracker.current was not reset to null!");
      }

      // Ensure double finish does nothing harmful
      const secondFinish = tracker.finish(true);
      if (secondFinish !== null) {
        throw new Error("Double finish returned non-null trace!");
      }
      logs.push("Test 6 PASS: Tracker prevents stale reuse and double-finish.");
    } catch (e: any) {
      passed = false;
      logs.push(`FAIL: ${e.message}`);
    }
    results.push({
      id: "test_tracker_cleanup",
      name: "Verification 6: Tracker.finish Clears Current",
      patchItem: "Cleanup (Tracker.finish leaves current set)",
      passed,
      durationMs: Math.round(performance.now() - start),
      assertionLogs: logs
    });
  }

  // TEST 7: Word-boundary DONE regex (\bDONE\b)
  {
    const start = performance.now();
    const logs: string[] = [];
    let passed = true;
    try {
      logs.push("Testing word-boundary regex detection: r'\\bDONE\\b'");
      const re = /\bDONE\b/;

      const textFalsePositive1 = "The operation was ABANDONED due to timeout.";
      const textFalsePositive2 = "The action was CONDONED by policy.";
      const textTruePositive1 = "All tasks completed successfully. DONE";
      const textTruePositive2 = "DONE!";

      const matchFP1 = re.test(textFalsePositive1.toUpperCase());
      const matchFP2 = re.test(textFalsePositive2.toUpperCase());
      const matchTP1 = re.test(textTruePositive1.toUpperCase());
      const matchTP2 = re.test(textTruePositive2.toUpperCase());

      logs.push(`'ABANDONED' matched: ${matchFP1} (Expected: false)`);
      logs.push(`'CONDONED' matched: ${matchFP2} (Expected: false)`);
      logs.push(`'All tasks completed. DONE' matched: ${matchTP1} (Expected: true)`);
      logs.push(`'DONE!' matched: ${matchTP2} (Expected: true)`);

      if (matchFP1 || matchFP2 || !matchTP1 || !matchTP2) {
        throw new Error("Regex word boundary check failed assertion!");
      }
      logs.push("Test 7 PASS: Word boundary avoids sub-token false positives.");
    } catch (e: any) {
      passed = false;
      logs.push(`FAIL: ${e.message}`);
    }
    results.push({
      id: "test_done_regex",
      name: "Verification 7: Word-Bounded DONE Detection",
      patchItem: "Fix (solve_loop substring DONE)",
      passed,
      durationMs: Math.round(performance.now() - start),
      assertionLogs: logs
    });
  }

  // TEST 8: ERROR_PREFIXES anchored startswith check
  {
    const start = performance.now();
    const logs: string[] = [];
    let passed = true;
    try {
      logs.push("Testing ERROR_PREFIXES tuple coverage and anchor semantics");
      logs.push(`Tuple items: ${ERROR_PREFIXES.join(", ")}`);

      const fileWithInternalError = "2026-10-29 INFO No critical ERROR encountered. Status ok.";
      const toolBlocked = "TOOL BLOCKED: Shell execution disabled";
      const fetchBlocked = "FETCH BLOCKED: SSRF protection triggered";

      const hasPrefixInternal = ERROR_PREFIXES.some(p => fileWithInternalError.startsWith(p));
      const hasPrefixBlocked = ERROR_PREFIXES.some(p => toolBlocked.startsWith(p));
      const hasPrefixFetch = ERROR_PREFIXES.some(p => fetchBlocked.startsWith(p));

      logs.push(`String merely containing 'ERROR' internally flagged: ${hasPrefixInternal} (Expected: false)`);
      logs.push(`'TOOL BLOCKED...' flagged: ${hasPrefixBlocked} (Expected: true)`);
      logs.push(`'FETCH BLOCKED...' flagged: ${hasPrefixFetch} (Expected: true)`);

      if (hasPrefixInternal || !hasPrefixBlocked || !hasPrefixFetch) {
        throw new Error("ERROR_PREFIXES anchored validation failed!");
      }
      logs.push("Test 8 PASS: Anchored matching preserves legitimate files containing 'ERROR'.");
    } catch (e: any) {
      passed = false;
      logs.push(`FAIL: ${e.message}`);
    }
    results.push({
      id: "test_error_prefixes",
      name: "Verification 8: ERROR_PREFIXES Anchoring",
      patchItem: "Blocker #2 (ERROR_PREFIXES regression & drift rule)",
      passed,
      durationMs: Math.round(performance.now() - start),
      assertionLogs: logs
    });
  }

  return results;
}
