import { describe, test, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { parsePlan } from "../../lib/plan-parser.ts";

describe("parsePlan", () => {
  test("parses fixture plan", async () => {
    const md = await readFile("tests/fixtures/sample-plan.md", "utf8");
    const plan = parsePlan(md);
    expect(plan.phases).toHaveLength(2);
    expect(plan.phases[0].name).toBe("setup");
    expect(plan.phases[0].execution).toBe("subagent");
    expect(plan.phases[0].workstreams).toHaveLength(2);
    expect(plan.phases[0].workstreams[1].tasks[0].id).toBe("t-002");
    expect(plan.phases[0].workstreams[1].tasks[0].require_plan_approval).toBe(true);
    expect(plan.phases[0].workstreams[1].tasks[0].depends_on).toEqual(["t-001"]);
    expect(plan.phases[1].execution).toBe("team");
    expect(plan.phases[1].team_size).toBe(3);
    expect(plan.phases[1].workstreams[0].default_skills).toEqual([
      "frontend-design",
      "ui-ux-pro-max",
    ]);
    expect(plan.phases[1].workstreams[0].tasks[0].tdd).toBe("skip");
  });

  test("stakes-3 task without explicit require_plan_approval defaults to true", () => {
    const md = `## Phase 1 — p
execution: subagent

### Workstream: w
worktree: default
tasks:
  - id: t-001
    title: t
    stakes: 3
    tdd: auto
    files: [x.ts]
`;
    const plan = parsePlan(md);
    expect(plan.phases[0].workstreams[0].tasks[0].require_plan_approval).toBe(true);
  });

  test("explicit require_plan_approval: false overrides stakes-3 default", () => {
    const md = `## Phase 1 — p
execution: subagent

### Workstream: w
worktree: default
tasks:
  - id: t-001
    title: t
    stakes: 3
    tdd: auto
    require_plan_approval: false
    files: [x.ts]
`;
    const plan = parsePlan(md);
    expect(plan.phases[0].workstreams[0].tasks[0].require_plan_approval).toBe(false);
  });

  test("explicit require_plan_approval: true overrides stakes-1 default", () => {
    const md = `## Phase 1 — p
execution: subagent

### Workstream: w
worktree: default
tasks:
  - id: t-001
    title: t
    stakes: 1
    tdd: auto
    require_plan_approval: true
    files: [x.ts]
`;
    const plan = parsePlan(md);
    expect(plan.phases[0].workstreams[0].tasks[0].require_plan_approval).toBe(true);
  });

  test("parses multiple tasks in one workstream separated by blank lines", () => {
    const md = `## Phase 1 — p
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
    stakes: 2
    tdd: auto
    files: [b.ts]
    depends_on: [t-001]
`;
    const plan = parsePlan(md);
    expect(plan.phases[0].workstreams[0].tasks).toHaveLength(2);
    expect(plan.phases[0].workstreams[0].tasks[0].id).toBe("t-001");
    expect(plan.phases[0].workstreams[0].tasks[1].id).toBe("t-002");
    expect(plan.phases[0].workstreams[0].tasks[1].depends_on).toEqual(["t-001"]);
  });
});
