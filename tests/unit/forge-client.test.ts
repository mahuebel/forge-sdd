import { describe, test, expect, mock, beforeEach } from "bun:test";
import { createTopic, type ForgeWorkspace } from "../../lib/forge-client.ts";

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
});
