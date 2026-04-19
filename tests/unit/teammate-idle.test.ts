import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkTeammateIdle } from "../../hooks/scripts/teammate-idle.ts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "sdd-idle-"));
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
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("teammate-idle", () => {
  test("nudges when assigned tasks remain", async () => {
    await writeFile(
      join(root, "plan.md"),
      `## Phase 1 — p\nexecution: team\n\n### Workstream: w\nworktree: required\ntasks:\n  - id: t-001\n    title: open\n    stakes: 1\n    tdd: auto\n    files: [a.ts]\n`,
    );
    const r = await checkTeammateIdle({
      projectRoot: root,
      sessionId: "s1",
      workstreamId: "w",
    });
    expect(r.nudge).toBe(true);
  });

  test("allows idle when all tasks complete", async () => {
    await writeFile(
      join(root, "plan.md"),
      `## Phase 1 — p\nexecution: team\n\n### Workstream: w\nworktree: required\ntasks:\n  - id: t-001\n    title: done\n    stakes: 1\n    tdd: auto\n    files: [a.ts]\n    status: complete\n    commit: abc\n`,
    );
    const r = await checkTeammateIdle({
      projectRoot: root,
      sessionId: "s1",
      workstreamId: "w",
    });
    expect(r.nudge).toBe(false);
  });
});
