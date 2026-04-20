import type { Stakes } from "./decisions.ts";

export type Execution = "subagent" | "team";
export type TDDMode = "auto" | "skip";
export type WorktreeMode = "default" | "required";

export interface PlanTask {
  id: string;
  title: string;
  implements?: string[];
  stakes: Stakes;
  tdd: TDDMode;
  execution?: Execution;
  require_plan_approval: boolean;
  files: string[];
  depends_on?: string[];
}

export interface PlanWorkstream {
  id: string;
  worktree: WorktreeMode;
  default_skills?: string[];
  tasks: PlanTask[];
}

export interface PlanPhase {
  name: string;
  execution: Execution;
  team_size?: number;
  workstreams: PlanWorkstream[];
}

export interface Plan {
  title: string;
  phases: PlanPhase[];
}

// Hand-rolled parser. Plan is structured markdown; we parse phase headers,
// workstream headers, and YAML-ish task blocks. Keeping it tight on purpose —
// a real YAML dep is heavier than the problem warrants.
export function parsePlan(md: string): Plan {
  const lines = md.split("\n");
  let title = "";
  const phases: PlanPhase[] = [];
  let currentPhase: PlanPhase | null = null;
  let currentWs: PlanWorkstream | null = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("# Plan:")) {
      title = line.replace(/^# Plan:\s*/, "").trim();
      i++;
      continue;
    }
    const phaseMatch = line.match(/^## Phase \d+\s*—\s*(.+)$/);
    if (phaseMatch) {
      currentPhase = { name: phaseMatch[1].trim(), execution: "subagent", workstreams: [] };
      currentWs = null;
      phases.push(currentPhase);
      i++;
      continue;
    }
    if (currentPhase && line.startsWith("execution:")) {
      const val = line.split(":")[1].trim();
      if (val === "team" || val === "subagent") currentPhase.execution = val;
      i++;
      continue;
    }
    if (currentPhase && line.startsWith("team_size:")) {
      currentPhase.team_size = parseInt(line.split(":")[1].trim(), 10);
      i++;
      continue;
    }
    const wsMatch = line.match(/^### Workstream:\s*(.+)$/);
    if (wsMatch && currentPhase) {
      currentWs = { id: wsMatch[1].trim(), worktree: "default", tasks: [] };
      currentPhase.workstreams.push(currentWs);
      i++;
      continue;
    }
    if (currentWs && line.startsWith("worktree:")) {
      const val = line.split(":")[1].trim();
      currentWs.worktree = val === "required" ? "required" : "default";
      i++;
      continue;
    }
    if (currentWs && line.startsWith("default_skills:")) {
      currentWs.default_skills = parseList(line.split(":").slice(1).join(":"));
      i++;
      continue;
    }
    if (currentWs && line.trim() === "tasks:") {
      i++;
      while (i < lines.length) {
        if (lines[i].trim() === "") { i++; continue; }
        if (!lines[i].match(/^\s+- id:/)) break;
        const { task, consumed } = parseTask(lines, i);
        currentWs.tasks.push(task);
        i += consumed;
      }
      continue;
    }
    i++;
  }
  return { title, phases };
}

function parseTask(lines: string[], start: number): { task: PlanTask; consumed: number } {
  const fields: Record<string, string> = {};
  let i = start;
  const indent = lines[i].match(/^(\s+)-/)?.[1].length ?? 4;
  // First line: "- id: x"
  const firstKv = lines[i].trim().replace(/^-\s*/, "");
  fields[firstKv.split(":")[0]] = firstKv.split(":").slice(1).join(":").trim();
  i++;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^(\s+)([a-z_]+):\s*(.+)$/);
    if (!m) break;
    if (m[1].length <= indent) break;
    fields[m[2]] = m[3].trim();
    i++;
  }
  const stakes = parseInt(fields.stakes ?? "1", 10) as Stakes;
  const task: PlanTask = {
    id: fields.id.replace(/^\[|\]$/g, ""),
    title: fields.title,
    implements: fields.implements ? parseList(fields.implements) : undefined,
    stakes,
    tdd: (fields.tdd === "skip" ? "skip" : "auto") as TDDMode,
    execution: fields.execution === "team" ? "team" : fields.execution === "subagent" ? "subagent" : undefined,
    require_plan_approval:
      fields.require_plan_approval === "false" ? false
        : fields.require_plan_approval === "true" ? true
        : stakes === 3,
    files: fields.files ? parseList(fields.files) : [],
    depends_on: fields.depends_on ? parseList(fields.depends_on) : undefined,
  };
  return { task, consumed: i - start };
}

function parseList(raw: string): string[] {
  const trimmed = raw.trim().replace(/^\[|\]$/g, "");
  if (!trimmed) return [];
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}
