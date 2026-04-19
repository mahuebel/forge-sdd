---
description: Execute a forge-sdd plan with subagent/agent-team dispatch
---

The user has invoked `/sdd-execute`.

Parse arguments for flags:
- `--no-worktree` — skip plan-level worktree (team-phase worktrees still forced)
- `--resume <session-id>` — re-enter an in-progress session
- `--plan <path>` — standalone: execute a plan not created via brainstorm

Resolve input:
- If `--plan <path>`: load plan directly, no session state.
- If `--resume <session-id>`: read `.forge-sdd/sessions/<id>/state.json` and continue from `stage: execute_pending` or `stage: executing`.
- Otherwise: find the most recently modified session with `stage: execute_pending`. If none, instruct the user.

Invoke `forge-sdd:execute` once input is resolved.
