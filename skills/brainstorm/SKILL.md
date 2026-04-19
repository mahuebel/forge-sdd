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
