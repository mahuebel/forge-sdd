---
name: brainstorm
description: Use when starting a new feature, subsystem, or architecture change — drives visual brainstorming in forge with structured decision records, producing a spec and decisions.json as handoff to forge-sdd:write-plan. Replaces superpowers:brainstorming for projects using forge-sdd.
---

# forge-sdd Brainstorm

Fork of `superpowers:brainstorming` adapted for forge-driven visual decision-making. Produces:

- `docs/sdd/specs/YYYY-MM-DD-<topic>-design.md` — narrative design with decision cross-references
- `.forge-sdd/sessions/<id>/decisions.json` — structured decision records (schema below)
- A forge workspace with one cluster topic per subsystem and drill-down sub-topics for annotated details

## Before starting

Invoke the existing `forge:forge` skill mechanics for workspace bootstrap — do not re-implement workspace launch, PID ownership, or version checking here. This skill orchestrates forge; it doesn't replace it.

## Hard gate

Do NOT write code, scaffold projects, or invoke implementation skills until the spec has been authored, reviewed, and committed, and the user has signaled readiness to move to plan-writing.

## Session bootstrap (first step in every brainstorm)

1. Derive a `topic_slug` from the user's initial idea (lowercase, hyphenated, ≤ 30 chars).
2. Create session via `lib/state.ts`:
   ```ts
   import { createSession } from "<plugin-root>/lib/state.ts";
   const s = await createSession({ projectRoot: process.cwd(), topicSlug });
   ```
3. Standard project-context exploration (same as superpowers brainstorming): recent commits, relevant files, existing docs.
4. Scope check: if the request spans multiple independent subsystems, decompose. Each sub-project gets its own SDD session.
5. Launch or reuse forge workspace. Invoke the `forge:forge` skill to handle the bootstrap. The `server-info.json` it writes gives you the workspace URL, session id, events file, and content directory base — capture these as a `ForgeWorkspace` value for subsequent API calls.

## Question loop

For each brainstorming question:

1. **Author the question and 3 candidate answers** yourself (senior-engineer mode, not multiple-choice prompting of the user).

2. **Classify** by invoking the `forge-sdd:decision-classifier` skill with the question + candidates. Capture the returned `{decision_type, rendering, suggested_stakes, cluster_id}`.

3. **Create or select the forge topic.** If this question belongs to a cluster that already has a topic, create a **sub-topic** with `id` of the form `<cluster_id>-<detail-slug>`. Otherwise create a cluster topic with `id = cluster_id`.

   ```ts
   import { createTopic } from "<plugin-root>/lib/forge-client.ts";
   const created = await createTopic(ws, { id: topicId, title: questionTitle, prompt: "3 variations" });
   ```

4. **Generate 3 HTML variations** per the chosen rendering:
   - `diagram` — self-contained HTML embedding a Mermaid (or D2) diagram + rationale panel (short prose on why this topology).
   - `card` — decision card layout: name, summary, pros/cons/risks columns, cost note, 5-10 line code snippet preview.
   - `mockup` — full UI mockup per existing forge conventions.
   - `multi-panel` — diagram + card + code sketch + blast-radius note, all on one page with clear panel boundaries.

   Each variation is a complete standalone HTML doc written to the topic's returned `contentDir`, named `round-1-a.html`, `round-1-b.html`, `round-1-c.html`.

5. **Append a `round` event** to `events.jsonl` via `lib/forge-client.ts:appendRound`. Include `topic_id`.

6. **Tell the user** the topic is ready. Keep it one sentence: "Topic `<id>` ready — tab at `<url>`."

7. **Wait for interaction.** Events stream into the Claude session via the forge channel (or arrive via the UserPromptSubmit hook fallback). Collect `verdict`, `annotate`, and `select` events tagged with this `topic_id`.

8. **When the user accepts for the topic** ("go with A", "accept B", "finalize"):
   - If any annotations flagged drill-down (heuristic: pin notes starting with "→" or containing phrases like "needs more thought", "what about X here"), spawn sub-topic(s) and loop the question loop inside them first. Parent cluster decision record waits on children.
   - Build the decision record (schema in the next section).
   - If `stakes == 3`, present the draft record to the user for approval or edit before locking.
   - If `stakes` is 1 or 2, commit record silently; print one-line readout.
   - Append record to `decisions.json`.

## Decision record

Schema (enforced by `lib/decisions.ts:DecisionRecord`):

```json
{
  "id": "d-003",
  "cluster_id": "auth",
  "question": "Session storage strategy",
  "decision_type": "library-or-pattern",
  "stakes": 3,
  "forge_topic_id": "auth-session-storage",
  "options_considered": ["jwt-cookies", "server-sessions", "event-sourced"],
  "chosen": "event-sourced",
  "variation_accepted": "round-2-a",
  "rationale": "auditability; team has Kafka experience",
  "annotations_addressed": [
    {"pin_id": "p-7", "note": "use refresh tokens not rolling", "resolution": "refresh"}
  ],
  "open_followups": [],
  "decided_at": "<ISO timestamp>"
}
```

Use `nextDecisionId(existing)` from `lib/decisions.ts` to assign the next id. Persist with `appendDecision(projectRoot, sessionId, record)`.

## Readout format

After each decision lands, emit exactly this (substituting values):

```
✓ Decision recorded: d-003 — Session storage: event-sourced
  Rationale: auditability; team has Kafka experience
  Addressed: pin-7 (refresh tokens over rolling)
  → Next: <next question title, or "brainstorm complete">
```

## Spec emission

When the user signals brainstorming is done:

1. Read full `decisions.json` via `readDecisions`.
2. Synthesize `docs/sdd/specs/YYYY-MM-DD-<topic>-design.md`. Sections, in order: Problem, Goals, Non-goals, Decisions reference (auto-generated table citing each `d-XXX`), Architecture, Component Breakdown, Data Flow, Error Handling, Testing strategy, Risks, Open items. Each load-bearing claim cites a decision id (e.g., "Sessions are event-sourced (d-003)").
3. Run the spec self-review loop adapted from superpowers:
   - Placeholder scan — no TBD/TODO/vague requirements
   - Internal consistency — sections don't contradict each other
   - Scope — one plan-worthy spec, not multiple
   - Ambiguity — pick one interpretation and make it explicit
   Fix inline.
4. Commit `spec.md` and `decisions.json` together: `docs: forge-sdd spec — <topic>`.
5. Present to user: "Spec at `<path>`. Review and tell me to proceed — I'll advance to plan-writing in this session."
6. **Wait for user acknowledgement.** On "proceed" / "looks good" / equivalent, update `state.json` (`stage: plan`, set `spec_path`, `decisions_path`) via `writeState`, then invoke `forge-sdd:write-plan` as the next skill.

## Do not

- Ask multiple questions in one message. One at a time.
- Write code, create a plan doc, or touch `executing-plans` — this skill's terminal state is invoking `write-plan`.
- Skip the forge variation step for a question because "it seems obvious" — the whole point is the visual layer. If it's truly obvious, it's not a question worth asking.
