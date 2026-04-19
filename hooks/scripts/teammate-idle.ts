#!/usr/bin/env bun
import { readFile } from "node:fs/promises";
import { readState } from "../../lib/state.ts";
import { parsePlan } from "../../lib/plan-parser.ts";

export interface TeammateIdleArgs {
  projectRoot: string;
  sessionId: string;
  workstreamId: string;
}

export interface TeammateIdleResult {
  nudge: boolean;
  reason?: string;
}

export async function checkTeammateIdle(args: TeammateIdleArgs): Promise<TeammateIdleResult> {
  const state = await readState(args.projectRoot, args.sessionId);
  if (!state.plan_path) return { nudge: false };
  const md = await readFile(state.plan_path, "utf8");
  const plan = parsePlan(md);
  const ws = plan.phases.flatMap((p) => p.workstreams).find((w) => w.id === args.workstreamId);
  if (!ws) return { nudge: false };
  // A task is incomplete if its block does not contain "status: complete" in the raw markdown.
  const rawLines = md.split("\n");
  const incomplete = ws.tasks.some((t) => {
    const start = rawLines.findIndex((l) => l.trim().startsWith(`- id: ${t.id}`));
    if (start < 0) return true;
    // Look ahead until next task or blank boundary for "status: complete"
    for (let i = start; i < rawLines.length; i++) {
      if (i !== start && rawLines[i].match(/^\s+- id:/)) break;
      if (rawLines[i].match(/^\s+status:\s*complete/)) return false;
    }
    return true;
  });
  return incomplete
    ? { nudge: true, reason: "Assigned workstream tasks remain incomplete" }
    : { nudge: false };
}

if (import.meta.main) {
  const payload = JSON.parse(await Bun.stdin.text()) as {
    projectRoot?: string;
    sessionId?: string;
    workstreamId?: string;
  };
  const projectRoot = payload.projectRoot ?? process.cwd();
  const sessionId = payload.sessionId ?? process.env.SDD_SESSION_ID ?? "";
  const workstreamId = payload.workstreamId ?? process.env.SDD_WORKSTREAM_ID ?? "";
  if (!sessionId || !workstreamId) process.exit(0);
  const r = await checkTeammateIdle({ projectRoot, sessionId, workstreamId });
  if (r.nudge) {
    console.error(r.reason);
    process.exit(2);
  }
  process.exit(0);
}
