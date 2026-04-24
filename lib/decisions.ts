import { readFile, writeFile, access } from "node:fs/promises";
import { sessionDir } from "./state.ts";
import { join } from "node:path";

export type DecisionType = "topology" | "library-or-pattern" | "ui" | "cross-cutting";
export type Stakes = 1 | 2 | 3;

export interface AnnotationResolution {
  pin_id: string;
  note: string;
  resolution: string;
}

export interface AngleExplored {
  slot: string;
  option: string;
  angle: string;
}

export interface DecisionRecord {
  id: string;
  cluster_id: string;
  question: string;
  decision_type: DecisionType;
  stakes: Stakes;
  forge_topic_id: string;
  options_considered: string[];
  angles_explored?: AngleExplored[];
  chosen: string;
  variation_accepted: string;
  rationale: string;
  annotations_addressed: AnnotationResolution[];
  open_followups: string[];
  decided_at: string;
}

function decisionsFile(projectRoot: string, sessionId: string): string {
  return join(sessionDir(projectRoot, sessionId), "decisions.json");
}

export async function readDecisions(projectRoot: string, sessionId: string): Promise<DecisionRecord[]> {
  const path = decisionsFile(projectRoot, sessionId);
  try {
    await access(path);
  } catch {
    return [];
  }
  const buf = await readFile(path, "utf8");
  const parsed = JSON.parse(buf) as { decisions: DecisionRecord[] };
  return parsed.decisions ?? [];
}

export async function appendDecision(
  projectRoot: string,
  sessionId: string,
  record: DecisionRecord,
): Promise<void> {
  const existing = await readDecisions(projectRoot, sessionId);
  if (existing.some((d) => d.id === record.id)) {
    throw new Error(`duplicate decision id: ${record.id}`);
  }
  const next = { decisions: [...existing, record] };
  await writeFile(decisionsFile(projectRoot, sessionId), JSON.stringify(next, null, 2));
}

export function nextDecisionId(existing: DecisionRecord[]): string {
  const max = existing.reduce((m, d) => {
    const n = parseInt(d.id.replace(/^d-/, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `d-${String(max + 1).padStart(3, "0")}`;
}
