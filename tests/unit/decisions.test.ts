import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendDecision, nextDecisionId, readDecisions, type DecisionRecord } from "../../lib/decisions.ts";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "sdd-dec-"));
  await mkdir(join(root, ".forge-sdd/sessions/s1"), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const sample: DecisionRecord = {
  id: "d-001",
  cluster_id: "auth",
  question: "Session storage",
  decision_type: "library-or-pattern",
  stakes: 3,
  forge_topic_id: "auth-session",
  options_considered: ["jwt", "event-sourced"],
  chosen: "event-sourced",
  variation_accepted: "round-1-b",
  rationale: "auditability",
  annotations_addressed: [],
  open_followups: [],
  decided_at: "2026-04-19T00:00:00Z",
};

describe("decisions", () => {
  test("appendDecision creates file and persists record", async () => {
    await appendDecision(root, "s1", sample);
    const read = await readDecisions(root, "s1");
    expect(read).toEqual([sample]);
  });

  test("appendDecision rejects duplicate id", async () => {
    await appendDecision(root, "s1", sample);
    await expect(appendDecision(root, "s1", sample)).rejects.toThrow(/duplicate/i);
  });

  test("readDecisions returns [] when no file", async () => {
    expect(await readDecisions(root, "s1")).toEqual([]);
  });
});

describe("nextDecisionId", () => {
  test("returns d-001 for empty array", () => {
    expect(nextDecisionId([])).toBe("d-001");
  });

  test("increments from a single existing id", () => {
    expect(nextDecisionId([{ ...sample, id: "d-001" }])).toBe("d-002");
  });

  test("returns max+1 across non-contiguous ids", () => {
    const records = [
      { ...sample, id: "d-001" },
      { ...sample, id: "d-003" },
    ];
    expect(nextDecisionId(records)).toBe("d-004");
  });

  test("ignores malformed ids when computing next", () => {
    const records = [
      { ...sample, id: "garbage" },
      { ...sample, id: "d-005" },
    ];
    expect(nextDecisionId(records)).toBe("d-006");
  });
});
