#!/usr/bin/env bun
// Runs workstream-scoped verification when a teammate marks a task complete.
// For v0.1: passthrough that invokes `bun test` if a tests/ dir is present.
// Future: read workstream files from plan and run scoped tests.
import { access } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const cwd = process.cwd();
try {
  await access(join(cwd, "tests"));
} catch {
  process.exit(0); // no tests dir — nothing to verify
}
const r = spawnSync("bun", ["test"], { cwd, stdio: "inherit" });
process.exit(r.status ?? 0);
