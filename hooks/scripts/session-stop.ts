#!/usr/bin/env bun
// Writes a state snapshot so --resume is always current.
// Invoked on main-session Stop during executing stage.
import { readState, writeState } from "../../lib/state.ts";

const sessionId = process.env.SDD_SESSION_ID;
if (!sessionId) process.exit(0);
const projectRoot = process.cwd();
try {
  const s = await readState(projectRoot, sessionId);
  if (s.stage === "executing") {
    await writeState(projectRoot, sessionId, { ...s, stage_history: s.stage_history });
  }
} catch {
  // non-fatal
}
process.exit(0);
