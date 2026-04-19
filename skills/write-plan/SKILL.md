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
