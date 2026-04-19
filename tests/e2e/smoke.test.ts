import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, cp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSession, readState, writeState } from "../../lib/state.ts";
import { readDecisions } from "../../lib/decisions.ts";
import { parsePlan } from "../../lib/plan-parser.ts";
import { markTaskComplete } from "../../lib/plan-status.ts";

// Resolve fixtures relative to this test file so the suite is cwd-independent.
const FIXTURES = join(import.meta.dir, "..", "fixtures");

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "sdd-e2e-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("e2e smoke (subagent path)", () => {
  test("state → decisions → plan → status update", async () => {
    // 1. Brainstorm output
    const s = await createSession({ projectRoot: root, topicSlug: "counter" });
    await mkdir(join(root, ".forge-sdd/sessions", s.session_id), { recursive: true });
    await cp(
      join(FIXTURES, "mini-decisions.json"),
      join(root, ".forge-sdd/sessions", s.session_id, "decisions.json"),
    );
    const decisions = await readDecisions(root, s.session_id);
    expect(decisions).toHaveLength(1);

    // 2. Handoff state
    await writeState(root, s.session_id, {
      ...s,
      stage: "execute_pending",
      spec_path: join(root, "spec.md"),
      plan_path: join(root, "plan.md"),
      decisions_path: join(root, ".forge-sdd/sessions", s.session_id, "decisions.json"),
    });
    await cp(join(FIXTURES, "mini-spec.md"), join(root, "spec.md"));
    await writeFile(
      join(root, "plan.md"),
      `# Plan: counter
Spec: ${join(root, "spec.md")}  |  Decisions: ${join(root, ".forge-sdd/sessions", s.session_id, "decisions.json")}  |  Coverage: 1/1

## Phase 1 — core
execution: subagent

### Workstream: core
worktree: default
tasks:
  - id: t-001
    title: count function
    implements: [d-001]
    stakes: 1
    tdd: auto
    files: [count.ts]
`,
    );

    // 3. Parse and verify plan shape
    const plan = parsePlan(await Bun.file(join(root, "plan.md")).text());
    expect(plan.phases[0].workstreams[0].tasks[0].implements).toEqual(["d-001"]);

    // 4. Simulate task completion
    const updated = markTaskComplete(await Bun.file(join(root, "plan.md")).text(), "t-001", "abc123");
    expect(updated).toContain("commit: abc123");

    // 5. Confirm state survives round-trip
    const finalState = await readState(root, s.session_id);
    expect(finalState.stage).toBe("execute_pending");
  });
});
