import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkTaskCreated } from "../../hooks/scripts/task-created.ts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "sdd-hook-"));
  await mkdir(join(root, ".forge-sdd/sessions/s1"), { recursive: true });
  await writeFile(
    join(root, ".forge-sdd/sessions/s1/state.json"),
    JSON.stringify({
      session_id: "s1",
      stage: "executing",
      topic_slug: "t",
      plan_path: join(root, "plan.md"),
      started_at: new Date().toISOString(),
    }),
  );
  await writeFile(
    join(root, "plan.md"),
    `## Phase 1 — p\nexecution: team\n\n### Workstream: w\nworktree: required\ntasks:\n  - id: t-001\n    title: ok\n    stakes: 1\n    tdd: auto\n    files: [a.ts]\n`,
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("task-created hook", () => {
  test("allows a task in the plan", async () => {
    const r = await checkTaskCreated({ projectRoot: root, sessionId: "s1", taskId: "t-001" });
    expect(r.allow).toBe(true);
  });

  test("blocks a task not in the plan", async () => {
    const r = await checkTaskCreated({ projectRoot: root, sessionId: "s1", taskId: "t-999" });
    expect(r.allow).toBe(false);
    expect(r.reason).toMatch(/not in plan/i);
  });
});
