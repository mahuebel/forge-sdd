# forge-sdd

**A spec-driven design system for Claude Code — visual brainstorming with [forge](https://github.com/mahuebel/forge), structured plans with SDD defaults, and subagent/agent-team execution with the TDD, worktree, and commit hygiene of [superpowers](https://github.com/superpowersdev/superpowers).**

forge-sdd turns the superpowers `brainstorm → plan → execute` pipeline from prose-only into visual decision-making. Every architecture question becomes a forge topic with three rendered variations. Every accepted variation becomes a structured decision record that survives context compaction. Every plan cross-references the decisions it implements. Every execution phase runs under the right workflow: subagents by default, agent teams where parallel exploration genuinely pays off.

---

## Why this exists

Superpowers gives you a rigorous spec-driven workflow — but every stage is text. For UI and architecture decisions, text is a lossy translation layer. You describe visual intent in prose, Claude interprets, rounds of drift follow:

```
You:    We need to redesign auth. Tokens should rotate, MFA should be optional,
        and sessions need to be auditable.
Claude: Here's a plan using JWT cookies with rolling refresh...
You:    Actually I meant event-sourced sessions, and MFA might be required
        for some tenants, and auditability is a hard compliance requirement
        so it needs to be at the storage layer not the app layer...
Claude: [regenerates with partial understanding]
You:    Close, but the refresh strategy is wrong, and the topology has
        the wrong boundary between the auth service and...
```

forge solved this for UI (draw variations, click what you like). forge-sdd solves it for everything *upstream* of UI — architecture, topology, library choices, cross-cutting concerns:

```
You:    /sdd-brainstorm auth redesign
Claude: [creates forge topic "auth-session"]
        Topic ready at http://localhost:4546 — 3 approaches:
          A: JWT cookies + rolling refresh
          B: Server sessions (Redis)
          C: Event-sourced sessions (Kafka)

[you open the browser, look at three diagrammed approaches]
[you click "Like" on C]
[you drop a pin on C's MFA box: "must be tenant-configurable"]
[you drop a pin on A's refresh strategy: "use refresh tokens not rolling"]

Claude: ✓ Decision recorded: d-003 — Session storage: event-sourced
          Rationale: auditability; tenant-configurable MFA
          Addressed: pin-7 (refresh tokens over rolling)
          → Next: Auth — token rotation details

[you drill into the MFA sub-topic, accept a variation]
[continue for data model, deployment topology, API shape…]

Claude: Spec at docs/sdd/specs/2026-04-19-auth-redesign-design.md.
        Review and tell me to proceed — I'll advance to plan-writing.
```

You stay in visual flow through the *design* phase, and Claude walks out with a durable, structured understanding of what you picked and why.

---

## The pipeline

Three stages, each its own skill, connected by persisted state:

```
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ 1. Brainstorm        │   │ 2. Plan              │   │ 3. Execute           │
│                      │   │                      │   │                      │
│ /sdd-brainstorm      │──▶│ /sdd-plan            │──▶│ /sdd-execute         │
│                      │   │                      │   │                      │
│ forge topics per     │   │ fork of superpowers  │   │ subagent dispatch    │
│ cluster; decision    │   │ writing-plans with   │   │ (default) + agent    │
│ records on accept    │   │ UI skill defaults    │   │ teams for tagged     │
│                      │   │ and parallel         │   │ phases; native plan  │
│                      │   │ workstream shape     │   │ mode gate at entry   │
└──────────┬───────────┘   └──────────┬───────────┘   └──────────┬───────────┘
           │                          │                          │
           ▼                          ▼                          ▼
    spec.md                      plan.md                 worktree branch
    decisions.json             (commit shas              + squash-on-merge
                                land in-place)           + finishing-a-branch
```

Each stage produces a durable artifact. You can resume from any stage, or start at a later stage with a hand-written input.

---

## Quick start

### 1. Prerequisites

- Claude Code ≥ 2.1.32
- [Bun](https://bun.sh) ≥ 1.0 (`curl -fsSL https://bun.sh/install | bash`)
- [forge](https://github.com/mahuebel/forge) plugin installed
- [superpowers](https://github.com/superpowersdev/superpowers) plugin installed
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — only required if any phase in a plan uses `execution: team`

### 2. Install the plugin

```bash
/plugin marketplace add mahuebel/forge-sdd
/plugin install forge-sdd@forge-sdd-marketplace
```

Both commands run inside Claude Code. The first pulls the marketplace manifest from `github.com/mahuebel/forge-sdd`; the second installs the plugin from it.

**Channels:** forge-sdd piggybacks on forge's existing channel — it does not register one of its own. Your existing `--dangerously-load-development-channels plugin:forge@forge-marketplace` setup (if you have it) continues to work unchanged. No new flag is needed.

<details>
<summary>Prefer a local install for development?</summary>

```bash
git clone https://github.com/mahuebel/forge-sdd.git
# In Claude Code:
/plugin marketplace add ./forge-sdd
/plugin install forge-sdd@forge-sdd-marketplace
```

</details>

### 3. Use it

```
/sdd-brainstorm redesign billing to support usage-based pricing
```

Claude creates an SDD session, launches (or reuses) a forge workspace, and starts the brainstorm question loop. Open the forge URL when it prompts you; the rest is clicking and annotating.

When you signal brainstorm is done, it writes the spec, auto-advances to plan-writing, writes the plan, and stops at the hard checkpoint. When you say "execute," it gates on native plan mode approval, opens a worktree, and dispatches.

---

## Stage 1 — Brainstorm

Drives forge for structured visual decision-making across UI *and* architecture.

### Decision classification

Each question the skill asks is classified by a small `decision-classifier` skill:

| Decision type | Rendering | Typical questions |
|---|---|---|
| `topology` | Mermaid/D2 diagram + rationale panel | Service boundaries, data flow, deployment topology, event graph |
| `library-or-pattern` | Decision card (pros/cons/risks/snippet) | Library picks, algorithms, design patterns |
| `ui` | Full HTML mockup (forge's original sweet spot) | Component layout, visual styling, interaction flow |
| `cross-cutting` | Multi-panel: diagram + card + code + blast-radius | Decisions that span topology *and* library *and* deployment |

### Topic structure

Each brainstorm uses **cluster topics** (one per subsystem: `auth`, `data-model`, `deploy`, …) with **drill-down sub-topics** for details the user flags during annotation. The forge workspace tab bar becomes a live decision log:

```
[ auth-shape ✓ ]  [ → MFA details ✓ ]  [ → token rotation ✓ ]  [ data-model ← ]
```

### Decision records

Every accepted variation produces a record persisted to `.forge-sdd/sessions/<id>/decisions.json`:

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
    { "pin_id": "p-7", "note": "use refresh tokens not rolling", "resolution": "refresh" }
  ],
  "open_followups": [],
  "decided_at": "2026-04-19T20:15:00Z"
}
```

**Stakes 1 / 2 / 3** drives how much ceremony each decision gets:

- **3** — reversal requires rewriting modules, a migration, or a public-interface break. Auth boundaries, core data models, deployment topology. → Editable readout: Claude shows you the draft record, you approve/edit before it locks.
- **2** — reversal affects one module or requires refactoring. Library picks with clean abstractions. → Silent persist with one-line readout.
- **1** — easy to change later. Copy tone, padding scale, minor visual choices. → Silent persist with one-line readout.

### Spec emission

When brainstorm completes, the skill synthesizes `docs/sdd/specs/YYYY-MM-DD-<topic>-design.md` with sections (Problem, Goals, Non-goals, Architecture, Component Breakdown, Data Flow, Error Handling, Testing, Risks, Open items) where each load-bearing claim cites a decision id (`Sessions are event-sourced (d-003)`). Runs a superpowers-style self-review pass, commits the spec + decisions together, checkpoints with you for review, then auto-advances to plan-writing.

---

## Stage 2 — Plan

A fork of `superpowers:writing-plans` with a small, auditable additive diff. The fork keeps upstream's rigor (exact file paths, full TDD steps, no placeholders, spec self-review) and adds:

### Workstream-first phases

Every phase declares at least one workstream. Parallel work is multiple workstreams. Sequential work is one workstream with task-level `depends_on`. This maps cleanly onto both subagent dispatch (parallel task dispatch within one Claude turn) and agent teams (per-workstream worktrees).

### UI skill defaults

Workstreams whose tasks touch `*.tsx`, `*.jsx`, `*.vue`, or declared component directories auto-populate:

```yaml
default_skills: [frontend-design, ui-ux-pro-max]
```

Subagents and teammates working in those workstreams invoke those skills before coding.

### Decision cross-references

Each plan task can declare `implements: [d-003, d-007]`. The plan header reports coverage (decisions implemented / total). Advisory — plan drift doesn't block execution, but coverage gaps get surfaced.

### Task tags

| Tag | Default |
|---|---|
| `stakes` | Inherited from implementing decision (highest wins). Default 1 if no decisions. |
| `tdd` | `auto`. `skip` allowed per task with rationale (config/docs/scaffolding). |
| `execution` | Inherits phase. |
| `require_plan_approval` | `true` if `stakes: 3`, else `false`. Maps to agent-teams' native plan-approval feature. |
| `worktree` | `default` (plan worktree). Forced `required` inside `execution: team` phases. |

### Example plan shape

```markdown
# Plan: auth-redesign
Spec: docs/sdd/specs/2026-04-19-auth-redesign-design.md  |  Coverage: 8/9

## Phase 1 — core service
execution: subagent

### Workstream: schema
worktree: default
tasks:
  - id: t-001
    title: Event-sourced session store
    implements: [d-003]
    stakes: 3
    tdd: auto
    require_plan_approval: true
    files: [services/auth/session.ts, tests/auth/session.test.ts]

## Phase 2 — integration review
execution: team
team_size: 3

### Workstream: cross-layer-audit
worktree: required
default_skills: [frontend-design, ui-ux-pro-max]
tasks:
  - id: t-020
    title: Session flow across frontend/backend/infra
    stakes: 2
    tdd: auto
    files: [apps/web/, services/auth/, infra/]
```

---

## Stage 3 — Execute

Fork of `superpowers:executing-plans` with three additions.

### Native plan mode gate

Before any dispatch, the skill calls `EnterPlanMode` with a plan summary (phase count, stakes-3 task list, team phases, estimated commits). Your native approval is the go signal. Rejection returns to the plan-review checkpoint — no execution.

### Subagent dispatch (default)

Uses `superpowers:subagent-driven-development`. Topologically sorts tasks by `depends_on`, dispatches independent tasks in parallel within one Claude turn (multiple Agent tool calls in a single message), re-dispatches with accumulated context on retry (max 2), runs `superpowers:verification-before-completion` at phase boundaries.

### Agent teams (for tagged phases)

Phases declared `execution: team` spawn a Claude Code agent team. Each workstream gets:

- Its own git worktree branched off the plan worktree (prevents file conflicts per agent-teams docs)
- A typed teammate via existing subagent definitions (`frontend-designer`, `backend-dev`, etc. from user scope; falls back to generic)
- `require_plan_approval: true` if it owns any stakes-3 task — the teammate plans in read-only mode and the lead approves/rejects with reference to `decisions.json` rationale

At phase end, workstreams squash-merge back to the plan worktree. Team cleanup runs. Phase verification on the plan worktree.

Four hooks enforce quality gates:

| Hook | Role |
|---|---|
| `TaskCreated` | Block teammate-added tasks that aren't in the plan (keeps execution on-plan) |
| `TaskCompleted` | Run workstream-scoped verification (tests) when a teammate finishes a task |
| `TeammateIdle` | Nudge teammates back to work (exit 2) if their assigned tasks remain incomplete |
| `Stop` | Snapshot state.json on main-session stop so `--resume` is always current |

### Worktrees & commits

- **Default**: plan worktree via `superpowers:using-git-worktrees`. Branch: `sdd/<plan-slug>`.
- **Team phases**: per-workstream worktrees branched off the plan worktree. Branch: `sdd/<plan-slug>/<workstream-id>`. Squash-on-merge at phase end.
- **`--no-worktree` flag**: skip plan-level worktree. Team-phase worktrees are still forced (load-bearing for correctness).

Commits are granular (one per non-skip task) inside the working worktree, squashed on merge to the plan branch. When all phases are green, the skill invokes `superpowers:finishing-a-development-branch` so you pick merge / PR / keep-branch.

---

## Resume after interruption

Every command accepts `--resume <session-id>`. Session ids are directory names under `.forge-sdd/sessions/`:

```
/sdd-plan --resume 20260419-153000-auth-redesign
/sdd-execute --resume 20260419-153000-auth-redesign
```

The `Stop` hook writes a state snapshot on every main-session stop during execution, so the resume state is always current. Team phases mid-flight respawn on resume (teams don't survive `/resume` per agent-teams docs); already-completed tasks are pre-marked done from `plan.md` status.

## Bring-your-own

Each stage can be invoked standalone against a hand-authored input:

```
/sdd-plan --spec /path/to/my-spec.md
/sdd-execute --plan /path/to/my-plan.md
```

In `--spec` mode with no accompanying `decisions.json`, plan tasks won't have `implements:` cross-references — everything else works.

---

## Troubleshooting

**`bun: command not found` during install**
Install Bun: `curl -fsSL https://bun.sh/install | bash`. Claude Code plugins that use Bun need it on your PATH.

**forge workspace doesn't open on `/sdd-brainstorm`**
forge-sdd delegates workspace bootstrap to forge. Check forge is installed (`/plugin list`) and that `bun` is on your PATH. Try `/forge "test"` standalone to verify forge itself works first.

**Team phase aborts with "agent teams not enabled"**
Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in your environment or `settings.json`, and confirm Claude Code ≥ 2.1.32 (`claude --version`). Team phases are an opt-in feature.

**Plan execution fails at the native plan mode gate**
The skill calls `EnterPlanMode` before dispatch. If you reject the proposal, execution halts and you return to the plan-review checkpoint. To proceed, say "execute" again and approve the native plan mode prompt.

**Where does session state live?**
`<your-project>/.forge-sdd/sessions/<sessionId>/` — one directory per SDD session. Safe to inspect; regenerate-safe under normal use.

---

## Under the hood

forge-sdd ships four skills, three slash commands, four hook scripts, and five typed shared libraries:

| Piece | What it does |
|---|---|
| `skills/brainstorm/SKILL.md` | Fork of `superpowers:brainstorming` with forge-driven visual question loop |
| `skills/write-plan/SKILL.md` | Fork of `superpowers:writing-plans` with workstream-first phases, UI defaults, decision refs |
| `skills/execute/SKILL.md` | Fork of `superpowers:executing-plans` with native-plan-mode gate + agent-teams integration |
| `skills/decision-classifier/SKILL.md` | Small classifier: question → rendering type + suggested stakes |
| `commands/sdd-{brainstorm,plan,execute}.md` | Thin slash-command shortcuts (skills auto-trigger via description too) |
| `hooks/scripts/{task-created,task-completed,teammate-idle,session-stop}.ts` | Agent-teams quality gates + state snapshots |
| `lib/state.ts` | Session state schema + I/O |
| `lib/decisions.ts` | Decision records append-only store |
| `lib/plan-parser.ts` | Plan markdown parser (phases / workstreams / tagged tasks) |
| `lib/plan-status.ts` | In-place plan.md task-status mutator (idempotent) |
| `lib/forge-client.ts` | Typed forge HTTP API helpers |

**Dependencies:**
- **Hard:** forge (HTTP API + event stream for visual variations)
- **Soft:** superpowers (`test-driven-development`, `using-git-worktrees`, `verification-before-completion`, `finishing-a-development-branch`, `subagent-driven-development`, `receiving-code-review` — invoked by name from the forked skills)
- **On demand:** `frontend-design`, `ui-ux-pro-max` (baked as defaults into UI workstreams); Claude Code agent teams (experimental flag, only for team-tagged phases)

---

## Session layout

```
<your-project>/.forge-sdd/sessions/<sessionId>/
  state.json         current stage, artifact paths, history
  decisions.json     structured decision records (append-only)

<your-project>/docs/sdd/
  specs/YYYY-MM-DD-<topic>-design.md    emitted by brainstorm
  plans/YYYY-MM-DD-<topic>-plan.md      emitted by write-plan; status updated in-place during execute
```

Plus forge's own session state under `<your-project>/.forge/sessions/` — see [forge's docs](https://github.com/mahuebel/forge).

---

## Development

```bash
git clone https://github.com/mahuebel/forge-sdd.git
cd forge-sdd

bun install
bun test          # full suite (~21 tests across 8 files)
bun run typecheck # tsc --noEmit
```

### Project structure

```
forge-sdd/
  .claude-plugin/
    plugin.json            plugin manifest (hooks registered here)
    marketplace.json       single-plugin marketplace entry
  commands/
    sdd-brainstorm.md
    sdd-plan.md
    sdd-execute.md
  skills/
    brainstorm/SKILL.md
    write-plan/SKILL.md
    execute/SKILL.md
    decision-classifier/SKILL.md
  hooks/
    hooks.json             event → script mapping
    scripts/
      task-created.ts      block off-plan teammate tasks
      task-completed.ts    workstream-scoped verification
      teammate-idle.ts     nudge if assigned tasks remain
      session-stop.ts      state snapshot on main-session stop
  lib/
    state.ts, decisions.ts, plan-parser.ts, plan-status.ts, forge-client.ts
  tests/
    unit/                  one per lib + per hook with branching logic
    e2e/smoke.test.ts      state → decisions → plan → status-update pipeline
    fixtures/
  docs/
    USAGE.md               full flow + resume + flags
    specs/                 design spec (the "why" and "what")
    plans/                 implementation plan (the "how")
```

### Design documents

- [docs/specs/2026-04-19-forge-sdd-design.md](docs/specs/2026-04-19-forge-sdd-design.md) — full design spec, including all 10 decisions made during brainstorming
- [docs/plans/2026-04-19-forge-sdd.md](docs/plans/2026-04-19-forge-sdd.md) — the implementation plan this repo was built from

---

## What's next

v0.0.1 deliberately keeps scope tight. Deferred for manual verification and future iteration:

- **Live forge workspace integration** — the library layer is fully unit-tested, but the real brainstorm flow (forge events streaming into Claude, cluster-topic UX in the workspace tab bar) gets verified by using it.
- **Hooks manifest schema** — `hooks/hooks.json` uses a flat array form; may need conversion to Claude Code's nested `{EventName: [{matcher, hooks}]}` shape depending on how the plugin hook runtime resolves it.
- **Native plan mode gate** — verified in the spec and skill prompt; fires real `EnterPlanMode` only when `/sdd-execute` is run against a real plan.
- **Agent-teams team phase** — requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` and a real team-tagged phase to exercise workstream worktrees, teammate spawning with `require_plan_approval`, and squash-merge cleanup.

Out of scope for v0.x:

- Multi-user or remote collaboration
- Projects small enough to fit on one screen and one commit (SDD is for work that justifies a design stage)
- Replacing superpowers' TDD / worktree / verification / finishing-a-branch skills (forge-sdd invokes them; improvements there flow through for free)

If you have ideas, open an issue or PR at [github.com/mahuebel/forge-sdd](https://github.com/mahuebel/forge-sdd).

---

## License

MIT
