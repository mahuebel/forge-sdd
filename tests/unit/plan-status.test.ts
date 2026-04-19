import { describe, test, expect } from "bun:test";
import { markTaskComplete } from "../../lib/plan-status.ts";

const input = `## Phase 1 — p
execution: subagent

### Workstream: w
worktree: default
tasks:
  - id: t-001
    title: first
    stakes: 1
    tdd: auto
    files: [a.ts]

  - id: t-002
    title: second
    stakes: 1
    tdd: auto
    files: [b.ts]
`;

describe("markTaskComplete", () => {
  test("appends status and commit to specified task only", () => {
    const out = markTaskComplete(input, "t-001", "abc123");
    expect(out).toContain("    status: complete\n    commit: abc123");
    const t002Block = out.split("- id: t-002")[1];
    expect(t002Block).not.toContain("status: complete");
  });

  test("is idempotent (re-marking updates, doesn't duplicate)", () => {
    const once = markTaskComplete(input, "t-001", "abc123");
    const twice = markTaskComplete(once, "t-001", "def456");
    expect(twice).toContain("commit: def456");
    expect(twice).not.toContain("commit: abc123");
    expect((twice.match(/status: complete/g) ?? []).length).toBe(1);
  });
});
