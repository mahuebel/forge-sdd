---
name: write-plan
description: Author a forge-sdd implementation plan from a spec. Use after brainstorm completes, or invoked with --spec <path> for bring-your-own. Produces plan.md with workstream-first phases, UI skill defaults, and decision cross-references. Replaces superpowers:writing-plans for forge-sdd flows.
---

# forge-sdd Write Plan

Fork of `superpowers:writing-plans`. Retains: comprehensive task decomposition, TDD rhythm, DRY/YAGNI, exact file paths, no placeholders, spec self-review. Adds: workstream-first phase structure, UI skill defaults, decision cross-references, stakes-aware require_plan_approval defaults.

**Announce at start:** "I'm using the forge-sdd:write-plan skill to create the implementation plan."

## Input resolution

Two entry modes:

1. **Handoff from brainstorm** — read session state via `readState(projectRoot, sessionId)`; `spec_path` and `decisions_path` are pre-populated. This is the primary path.
2. **Standalone** — user supplies `--spec <path>`. Load decisions if a `decisions.json` sits alongside the spec; otherwise proceed with empty decisions (plan tasks cannot cite `implements:` references).

## Scope check

If the spec covers independent subsystems that should have been decomposed in brainstorming: suggest splitting into sub-project plans. Do not attempt to plan a spec that's too big to execute as one workstreamed implementation.

## Plan structure (mandatory)

Every plan has this shape — phases contain workstreams, workstreams contain tasks. Sequential work is a single workstream with task dependencies; parallel work is multiple workstreams.

```markdown
# Plan: <topic>
Spec: <path>  |  Decisions: <path>  |  Coverage: <implemented>/<total>

## Phase N — <name>
execution: subagent | team
team_size: <n>   # only if execution: team

### Workstream: <id>
worktree: default | required
default_skills: [<skill>, ...]   # optional
tasks:
  - id: t-001
    title: <short>
    implements: [d-XXX, d-YYY]   # optional
    stakes: 1 | 2 | 3
    tdd: auto | skip
    execution: subagent | team   # optional; inherits phase
    require_plan_approval: true | false   # defaults true if stakes: 3
    files: [<path>, ...]
    depends_on: [t-000, ...]   # optional

    (task body: TDD steps as in upstream writing-plans — writes failing test, runs to verify fail, implements, runs to verify pass, commits)
```

## UI workstream defaults (auto-applied)

If a workstream's tasks touch files matching `*.tsx`, `*.jsx`, `*.vue`, or known component directories, set:

```yaml
default_skills: [frontend-design, ui-ux-pro-max]
```

These skills are named in the workstream header so subagents and teammates invoke them when doing UI work. If a workstream mixes UI and non-UI files, split it into two workstreams rather than diluting the default.

## Execution tag heuristic

Default `execution: subagent`. Escalate to `execution: team` only when the phase is:

- **Cross-layer coordination** (e.g., simultaneous frontend + backend + infra changes that need to stay consistent during the work)
- **Competing-hypothesis debugging** (multiple plausible root causes to investigate in parallel)
- **Research/review across independent dimensions** (e.g., security + performance + accessibility review of the same surface)

Most implementation phases do **not** meet these criteria. When in doubt, choose `subagent`.

## Task tag defaults

| Tag | Default |
|---|---|
| `stakes` | Inherited from implementing decision (highest wins if multiple). Default 1 if no decisions. |
| `tdd` | `auto`. Allow `skip` for: pure config/docs changes, greenfield scaffolding before tests can exist, vendored asset updates. Rationale required in the task body. |
| `execution` | Inherits phase. |
| `require_plan_approval` | `true` if `stakes: 3`, else `false`. |
| `worktree` | `default` (plan worktree). Forced `required` inside `execution: team` phases. |
