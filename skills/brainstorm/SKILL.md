---
name: brainstorm
description: Use when starting a new feature, subsystem, or architecture change — drives visual brainstorming in forge with structured decision records, producing a spec and decisions.json as handoff to forge-sdd:write-plan. Replaces superpowers:brainstorming for projects using forge-sdd.
---

# forge-sdd Brainstorm

Fork of `superpowers:brainstorming` adapted for forge-driven visual decision-making. Produces:

- `docs/sdd/specs/YYYY-MM-DD-<topic>-design.md` — narrative design with decision cross-references
- `.forge-sdd/sessions/<id>/decisions.json` — structured decision records
- A forge workspace with one cluster topic per subsystem and drill-down sub-topics for annotated details

## Smoothness rules (read first)

These exist because the skill used to stall mid-flow. Don't re-introduce the stalls:

- **Never ask permission to use forge.** The user invoked this skill; forge is how it works. Don't say "want me to open forge?" or "should I create a topic?" — just do it.
- **The first turn is atomic.** On `/sdd-brainstorm <topic>` you: bootstrap the session, launch forge, classify question 1, create its topic, generate three variations, and tell the user the topic is ready — all in one turn, with one short final message. No intermediate status updates. No "before I proceed…".
- **Each subsequent question is also atomic.** Classify → create topic → three variations → one-sentence ready message. One turn, no pauses.
- **Classification is internal.** The rubric is inlined below — don't narrate it, don't surface the JSON, don't "pause to classify."
- **One short message per turn.** "Topic `<id>` ready — tab at `<url>`." That's it. The forge variations are the content; prose is the cursor.

## Hard gate

Do NOT write code, scaffold projects, or invoke implementation skills until the spec has been authored, reviewed, committed, and the user has signaled readiness to move to plan-writing.

## Session bootstrap (first step, done silently)

Do this without narrating it:

1. Derive `topic_slug` from the user's initial idea (lowercase, hyphenated, ≤ 30 chars).
2. Create session via `lib/state.ts`:
   ```ts
   import { createSession } from "<plugin-root>/lib/state.ts";
   const s = await createSession({ projectRoot: process.cwd(), topicSlug });
   ```
3. Quick project-context scan: recent commits, relevant files, existing docs. Use this to inform question authoring — don't report findings to the user.
4. Scope check: if the request spans multiple independent subsystems, decompose. Each sub-project gets its own SDD session. If decomposition is needed, raise it in the **final** message of turn 1, not before topic 1 is built.
5. Bootstrap the forge workspace inline. Use `lib/forge-client.ts` helpers directly against forge's HTTP API — don't invoke the `forge:forge` skill as a sub-skill (that introduces a ceremony pause). Capture workspace URL, session id, events file, content directory as a `ForgeWorkspace` value for subsequent calls.

## Per-question flow (atomic — one turn per question)

For every question, do all of this in one turn with no intermediate messages:

### 1. Author the question and 3 candidate answers

Senior-engineer mode. You pick the question and the three options; this is not multiple-choice prompting of the user.

### 2. Classify (inline — not a skill call)

Pick `decision_type`, `rendering`, `suggested_stakes`, `cluster_id` using this rubric:

**decision_type → rendering**
| decision_type | When | rendering |
|---|---|---|
| `topology` | System shape: service boundaries, data flow, deployment topology, event graph | `diagram` — self-contained HTML embedding Mermaid or D2 + rationale panel |
| `library-or-pattern` | Choosing a technology, library, algorithm, or design pattern | `card` — name, one-line summary, pros/cons/risks columns, cost note, 5–10 line code snippet |
| `ui` | User-facing interface, component layout, visual styling, interaction flow | `mockup` — full HTML mockup per forge conventions |
| `cross-cutting` | Spans multiple categories (e.g., "auth as service vs library" touches topology + library + deployment) | `multi-panel` — diagram + card + code sketch + blast-radius note |

**suggested_stakes**
- **3** — reversal requires rewriting multiple modules, a migration, or a public-interface break. Auth boundaries, core data models, deployment topology, dependency direction.
- **2** — reversal affects one module or requires refactoring. Library picks with clean abstractions, internal patterns.
- **1** — easy to change later. Copy tone, padding scale, minor visual choices, internal helpers.

**cluster_id** — subsystem slug (`auth`, `data-model`, `deploy`, `billing`, etc.). Questions in the same cluster share a forge topic; drill-downs use `<cluster_id>-<detail-slug>`.

### 3. Create or select the forge topic

If the cluster already has a topic, create a sub-topic with id `<cluster_id>-<detail-slug>`. Otherwise create a cluster topic with `id = cluster_id`.

```ts
import { createTopic } from "<plugin-root>/lib/forge-client.ts";
const created = await createTopic(ws, { id: topicId, title: questionTitle, prompt: "3 variations" });
```

### 4. Assign angles and dispatch 3 variation workers in parallel

In a **single assistant message**, issue three `Agent` tool calls with `subagent_type: "forge-variation-worker"` (defined in the `forge` plugin). They run concurrently; each writes one HTML file — `round-1-a.html`, `round-1-b.html`, `round-1-c.html` — to the topic's returned `contentDir`.

Before dispatching, pick three orthogonal **angles** within the chosen `rendering`. Angles are the axes that make variations meaningfully different. They are context-dependent — draw from the question, prior decisions in the same cluster, and anything the developer has emphasized. Examples:

- `library-or-pattern` card → ecosystem-default / minimal-dependency / future-proof
- `ui` mockup → information-dense / task-focused / progressive-disclosure
- `topology` diagram → monolith-first / service-per-bounded-context / event-backbone
- `cross-cutting` multi-panel → pick the dominant axis for each panel independently

Worker prompt template (fill every brace):

```
Variation {LETTER}, round {ROUND}.

Output path (absolute):
  {contentDir}/round-{ROUND}-{letter}.html

## Question
{question title + one-paragraph framing}

## Option this slot represents
{option name — e.g., "event-sourced"}

## Your angle
{one sentence — e.g., "auditability-first; optimize for traceability over latency"}

## Other slots — do NOT duplicate their direction
- A: {option A} — {angle A}
- B: {option B} — {angle B}
- C: {option C} — {angle C}

## Render as
{full rendering template from the Rendering templates appendix — inline it, don't reference it}

## Accumulated feedback from prior rounds
{liked / rejected / annotated synthesis — omit this block on round 1}

## Prior-variation excerpt to carry forward
{file contents if the developer said "more like A" — omit otherwise}
```

If the developer referenced a specific prior variation ("more like A's sidebar"), read that file yourself and embed the relevant contents in the worker prompt(s) that need it. Do not tell the worker to read it — the file may be overwritten by the time the worker runs.

**Partial failure:** if one of the three workers fails, re-dispatch just that slot once. If it fails again, ship the round with the slots that did land (the round event's `variations` array lists only the letters whose files exist) and tell the developer which slot was skipped.

Keep `{slot, option, angle}` per slot in memory — step 7 (lock decision) writes them into the decision record's `options_considered` (just the option names, ordered to match slots) and `angles_explored` (the full triples) fields.

### 5. Append a `round` event

Via `lib/forge-client.ts:appendRound`. Include `topic_id`.

### 6. Single ready message

Exactly one sentence, then stop and wait for events:

```
Topic `<id>` ready — tab at `<url>`.
```

Do not list the variation filenames. Do not summarize the options. The point is to make the user look at forge, not read prose.

## Handling events

Events stream in via the forge channel (or the UserPromptSubmit hook fallback). Collect `verdict`, `annotate`, and `select` events tagged with this `topic_id` silently. Reply only on terminal signals:

- **Accept** ("go with A", "accept B", "finalize") — lock the decision (see next section), then atomically start the next question (another full per-question flow in the same turn).
- **Annotate with drill-down signal** (pin notes starting with "→" or containing phrases like "needs more thought", "what about X here") — spawn a sub-topic, run the per-question flow inside it first. Parent decision waits on children.
- **Refine** — dispatch a new round of workers via the step 4 pattern, with the accumulated feedback inlined in every worker prompt and the round number incremented. After all workers return, append a `round` event. One ready message, then wait.

## Locking a decision

- Build the record (schema below) using `nextDecisionId` from `lib/decisions.ts`.
- If `stakes == 3`, present the draft to the user for approval/edit before locking. This is the ONLY user-prompt pause inside the question loop.
- If `stakes` is 1 or 2, append silently with `appendDecision(projectRoot, sessionId, record)`, then proceed.
- **After the record lands, fire an in-forge toast** via the `mcp__plugin_forge_forge__notify-workspace` tool so the confirmation shows up where the user's attention is (the forge tab), not just in chat. Message: ``Locked `<variation_accepted>` → <decision_id> — <chosen>`` (e.g. ``Locked `round-2-a` → d-003 — event-sourced``). Fire-and-forget; don't block on it and don't retry on failure — the chat readout is still the source of truth.

### Decision record schema

```json
{
  "id": "d-003",
  "cluster_id": "auth",
  "question": "Session storage strategy",
  "decision_type": "library-or-pattern",
  "stakes": 3,
  "forge_topic_id": "auth-session-storage",
  "options_considered": ["jwt-cookies", "server-sessions", "event-sourced"],
  "angles_explored": [
    {"slot": "a", "option": "jwt-cookies", "angle": "UX-first; zero server round-trips on read"},
    {"slot": "b", "option": "server-sessions", "angle": "infra-minimal; single Postgres table"},
    {"slot": "c", "option": "event-sourced", "angle": "auditability-first; append-only log"}
  ],
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

`angles_explored` should mirror the `{option, angle}` pairs you assigned per slot in step 4 of the per-question flow (whichever letters actually landed — if a slot was skipped due to worker failure, omit it). It is the design-space axis record, not the outcome record: `chosen` + `variation_accepted` capture which one won.

### Readout format

After each decision lands, emit exactly this (substituting values) — and then immediately start the next question's atomic flow in the same turn:

```
✓ Decision recorded: d-003 — Session storage: event-sourced
  Rationale: auditability; team has Kafka experience
  Addressed: pin-7 (refresh tokens over rolling)
  → Next: <next question title, or "brainstorm complete">
```

## Spec emission

When the user signals brainstorming is done:

1. Read full `decisions.json` via `readDecisions`.
2. Synthesize `docs/sdd/specs/YYYY-MM-DD-<topic>-design.md`. Sections, in order: Problem, Goals, Non-goals, Decisions reference, Architecture, Component Breakdown, Data Flow, Error Handling, Testing strategy, Risks, Open items.

   **Decisions reference** is an auto-generated table, one row per `d-XXX`:

   | ID | Question | Chosen | Rationale | Design space explored |
   |----|----------|--------|-----------|-----------------------|
   | d-003 | Session storage strategy | event-sourced | auditability; team Kafka experience | jwt-cookies [UX-first; zero server round-trips on read], server-sessions [infra-minimal; single Postgres table], event-sourced [auditability-first; append-only log] (chosen) |

   Build the "Design space explored" column from `angles_explored`: `<option> [<angle>]` per entry, comma-separated, with `(chosen)` appended to the option whose name matches `chosen`. If a record lacks `angles_explored` (older pre-#2 sessions), fall back to comma-joined `options_considered` with no angle annotations — don't fabricate angles.

   **Load-bearing claims in narrative sections cite a decision id** — e.g., "Sessions are event-sourced (d-003)". Where the narrative contrasts the chosen option against alternatives, cite the angle: "Sessions are event-sourced (d-003) — chosen for auditability; a JWT-cookies approach was considered for its UX-first angle but rejected because the audit trail requirement dominates." Do not invent angles or rationales not present in the record.
3. Run the spec self-review loop adapted from superpowers:
   - Placeholder scan — no TBD/TODO/vague requirements
   - Internal consistency — sections don't contradict
   - Scope — one plan-worthy spec, not multiple
   - Ambiguity — pick one interpretation and make it explicit

   Fix inline.
4. Commit `spec.md` and `decisions.json` together: `docs: forge-sdd spec — <topic>`.
5. Present to user: "Spec at `<path>`. Review and tell me to proceed — I'll advance to plan-writing in this session."
6. On "proceed" / "looks good" / equivalent, update `state.json` (`stage: plan`, set `spec_path`, `decisions_path`) via `writeState`, then invoke `forge-sdd:write-plan`.

## Do not

- Ask multiple questions in one message. One at a time — but atomically (no pauses between classify/create/render within a single question).
- Ask permission to launch forge, create topics, or classify. Just do it.
- Surface classification output (decision_type, stakes) as user-facing text. It's internal state.
- Narrate the bootstrap. The user sees one ready message per topic; everything before that is silent.
- Write code, create a plan doc, or touch `executing-plans` — this skill's terminal state is invoking `write-plan`.
- Skip the forge variation step because "it seems obvious" — if it's truly obvious, it's not a question worth asking.

## Rendering templates (reference)

Inline the full template for the chosen `rendering` into the worker prompt's `Render as` block. Do not abbreviate or link — the worker has no access to this file.

### `diagram`

> Render as a single HTML document with the diagram on top and a rationale panel below.
>
> - Use **Mermaid**. Load with: `<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>` and initialize with `mermaid.initialize({theme: 'dark', startOnLoad: true})`.
> - The diagram itself should concretely illustrate *this slot's option* applied to the question — not a generic template.
> - Below the diagram, a panel with: one-sentence summary of this topology, and a bullet list of the three most important trade-offs this shape makes.
> - Dark theme matching the workspace. No interaction required — this is a static comparator artifact.

### `card`

> Render as a polished comparison card, one card filling the page.
>
> - Header: option name (large), one-line summary below.
> - Body: three columns — **Pros** / **Cons** / **Risks**. 2–4 bullets each, specific to *this option*, not generic.
> - Cost note: one line on resource or operational cost (time, infra, team learning curve).
> - Code snippet: `<pre>` block with 5–10 lines showing the core API shape or canonical usage. Real code, not pseudocode.
> - Dark theme, system font stack. No external resources.

### `mockup`

> Render as a full dark-theme HTML mockup per standard forge conventions.
>
> - Full-page layout, responsive where appropriate.
> - Polished, realistic content — plausible names, numbers, labels. No lorem ipsum.
> - The mockup should make *this slot's angle* legible at a glance: an "information-dense" angle looks dense; a "task-focused" angle strips away everything that isn't the current task.
> - No external resources.

### `multi-panel`

> Render as four panels in a 2×2 grid on a single page. Each panel follows the template for its sub-rendering.
>
> - **Top-left — diagram panel.** Mermaid, same constraints as the `diagram` template above. CDN script allowed.
> - **Top-right — library/pattern card.** Same constraints as the `card` template above.
> - **Bottom-left — code sketch.** `<pre>` block, 5–10 lines showing the canonical shape of *this option*.
> - **Bottom-right — blast-radius panel.** One paragraph: what reversing this decision would cost, and what other decisions would be affected.
> - The four panels must all illustrate the *same* option from different angles — they are facets of one variation, not four sub-variations.
