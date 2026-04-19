import { describe, test, expect, mock, beforeEach } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendRound, createTopic, type ForgeWorkspace } from "../../lib/forge-client.ts";

const ws: ForgeWorkspace = {
  url: "http://localhost:4546",
  sessionId: "s1",
  eventsFile: "/tmp/events.jsonl",
  contentDirBase: "/tmp/content",
};

describe("forge-client", () => {
  beforeEach(() => {
    globalThis.fetch = mock(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/topics")) {
        return new Response(
          JSON.stringify({
            topic: { id: "auth-session", title: "Auth session", createdAt: 1 },
            contentDir: "/tmp/content/auth-session",
          }),
          { status: 201 },
        );
      }
      throw new Error(`unexpected: ${url}`);
    }) as unknown as typeof fetch;
  });

  test("createTopic posts to /api/topics", async () => {
    const t = await createTopic(ws, { title: "Auth session", prompt: "3 variations" });
    expect(t.topic.id).toBe("auth-session");
    expect(t.contentDir).toBe("/tmp/content/auth-session");
  });

  test("appendRound writes one JSONL line per event", async () => {
    const dir = await mkdtemp(join(tmpdir(), "forge-client-"));
    const eventsFile = join(dir, "events.jsonl");
    const localWs = { ...ws, eventsFile };

    const ev1 = { type: "round" as const, topic_id: "t1", round: 1, variations: ["a.html"], at: 100 };
    const ev2 = { type: "round" as const, topic_id: "t1", round: 2, variations: ["b.html", "c.html"], at: 200 };

    await appendRound(localWs, ev1);
    await appendRound(localWs, ev2);

    const contents = await readFile(eventsFile, "utf8");
    const lines = contents.split("\n").filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toEqual(ev1);
    expect(JSON.parse(lines[1])).toEqual(ev2);
    expect(contents.endsWith("\n")).toBe(true);
  });
});
