import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

export type Stage = "brainstorm" | "plan" | "execute_pending" | "executing" | "done";

export interface SessionState {
  session_id: string;
  stage: Stage;
  topic_slug: string;
  spec_path?: string;
  plan_path?: string;
  decisions_path?: string;
  worktree_path?: string;
  started_at: string;
  completed_at?: string;
  stage_history?: Array<{ stage: Stage; at: string }>;
}

export function sessionsRoot(projectRoot: string): string {
  return join(projectRoot, ".forge-sdd", "sessions");
}

export function sessionDir(projectRoot: string, sessionId: string): string {
  return join(sessionsRoot(projectRoot), sessionId);
}

export function stateFile(projectRoot: string, sessionId: string): string {
  return join(sessionDir(projectRoot, sessionId), "state.json");
}

function ts(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export async function createSession(args: {
  projectRoot: string;
  topicSlug: string;
}): Promise<SessionState> {
  const session_id = `${ts()}-${args.topicSlug}`;
  const dir = sessionDir(args.projectRoot, session_id);
  await mkdir(dir, { recursive: true });
  const now = new Date().toISOString();
  const s: SessionState = {
    session_id,
    stage: "brainstorm",
    topic_slug: args.topicSlug,
    started_at: now,
    stage_history: [{ stage: "brainstorm", at: now }],
  };
  await writeFile(stateFile(args.projectRoot, session_id), JSON.stringify(s, null, 2));
  return s;
}

export async function readState(projectRoot: string, sessionId: string): Promise<SessionState> {
  const buf = await readFile(stateFile(projectRoot, sessionId), "utf8");
  return JSON.parse(buf) as SessionState;
}

export async function writeState(
  projectRoot: string,
  sessionId: string,
  next: SessionState,
): Promise<void> {
  const prev = await readState(projectRoot, sessionId).catch(() => null);
  const history = prev?.stage_history ?? [];
  if (!prev || prev.stage !== next.stage) {
    history.push({ stage: next.stage, at: new Date().toISOString() });
  }
  const merged: SessionState = { ...next, stage_history: history };
  await writeFile(stateFile(projectRoot, sessionId), JSON.stringify(merged, null, 2));
}

export async function sessionExists(projectRoot: string, sessionId: string): Promise<boolean> {
  try {
    await access(stateFile(projectRoot, sessionId));
    return true;
  } catch {
    return false;
  }
}
