#!/usr/bin/env bun
import { readFile } from "node:fs/promises";
import { readState } from "../../lib/state.ts";
import { parsePlan } from "../../lib/plan-parser.ts";

export interface TaskCreatedArgs {
  projectRoot: string;
  sessionId: string;
  taskId: string;
}

export interface TaskCreatedResult {
  allow: boolean;
  reason?: string;
}

export async function checkTaskCreated(args: TaskCreatedArgs): Promise<TaskCreatedResult> {
  const state = await readState(args.projectRoot, args.sessionId);
  if (!state.plan_path) return { allow: true };
  const md = await readFile(state.plan_path, "utf8");
  const plan = parsePlan(md);
  const found = plan.phases.some((p) =>
    p.workstreams.some((w) => w.tasks.some((t) => t.id === args.taskId)),
  );
  return found
    ? { allow: true }
    : { allow: false, reason: `Task ${args.taskId} not in plan — off-plan teammate tasks are blocked by forge-sdd` };
}

// CLI entry — invoked by Claude Code hook runtime
if (import.meta.main) {
  const payload = JSON.parse(await Bun.stdin.text()) as {
    projectRoot?: string;
    sessionId?: string;
    task?: { id?: string };
  };
  const projectRoot = payload.projectRoot ?? process.cwd();
  const sessionId = payload.sessionId ?? process.env.SDD_SESSION_ID ?? "";
  const taskId = payload.task?.id ?? "";
  if (!sessionId || !taskId) {
    process.exit(0);
  }
  const r = await checkTaskCreated({ projectRoot, sessionId, taskId });
  if (!r.allow) {
    console.error(r.reason);
    process.exit(2);
  }
  process.exit(0);
}
