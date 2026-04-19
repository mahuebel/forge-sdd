import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSession, readState, writeState, type SessionState } from "../../lib/state.ts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "sdd-state-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("state", () => {
  test("createSession writes initial state.json", async () => {
    const s = await createSession({ projectRoot: root, topicSlug: "test-topic" });
    expect(s.stage).toBe("brainstorm");
    expect(s.session_id).toMatch(/^\d{8}-\d{6}-test-topic$/);
    const read = await readState(root, s.session_id);
    expect(read).toEqual(s);
  });

  test("writeState updates stage and appends history", async () => {
    const s = await createSession({ projectRoot: root, topicSlug: "t" });
    await writeState(root, s.session_id, { ...s, stage: "plan", spec_path: "/tmp/spec.md" });
    const read = await readState(root, s.session_id);
    expect(read.stage).toBe("plan");
    expect(read.spec_path).toBe("/tmp/spec.md");
    expect(read.stage_history?.length).toBeGreaterThan(0);
  });
});
