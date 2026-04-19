import { appendFile } from "node:fs/promises";

export interface ForgeWorkspace {
  url: string;
  sessionId: string;
  eventsFile: string;
  contentDirBase: string;
}

export interface Topic {
  id: string;
  title: string;
  createdAt: number;
}

export interface TopicCreated {
  topic: Topic;
  contentDir: string;
}

export async function createTopic(
  ws: ForgeWorkspace,
  args: { title: string; prompt?: string; id?: string },
): Promise<TopicCreated> {
  const res = await fetch(`${ws.url}/api/topics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`createTopic failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as TopicCreated;
}

export interface RoundEvent {
  type: "round";
  topic_id: string;
  round: number;
  variations: string[];
  at: number;
}

export async function appendRound(ws: ForgeWorkspace, ev: RoundEvent): Promise<void> {
  await appendFile(ws.eventsFile, JSON.stringify(ev) + "\n");
}
