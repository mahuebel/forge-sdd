# Usage

## Full flow

1. `/sdd-brainstorm <topic>` — describe the design problem. Forge opens; answer each visual question by accepting a variation (with optional annotations). Stakes-3 decisions prompt for rationale before locking.
2. When brainstorm is done, the skill writes `docs/sdd/specs/YYYY-MM-DD-<topic>-design.md` and `.forge-sdd/sessions/<id>/decisions.json`. Review the spec; say "proceed" to advance.
3. `forge-sdd:write-plan` auto-runs, emits `docs/sdd/plans/YYYY-MM-DD-<topic>-plan.md`. Review. This is the hard checkpoint.
4. `/sdd-execute` — native plan mode presents the plan summary; approve to start dispatch. Plan worktree opens; phases execute sequentially.

## Resume after interruption

```
/sdd-plan --resume <session-id>
/sdd-execute --resume <session-id>
```

Session ids are directory names under `.forge-sdd/sessions/`.

## Bring-your-own spec

```
/sdd-plan --spec /path/to/spec.md
/sdd-execute --plan /path/to/plan.md
```

## Flags

- `--no-worktree` (execute): skip plan-level worktree. Team-phase workstream worktrees are still forced.
- `--resume <session-id>` (plan, execute): continue an in-progress session.
