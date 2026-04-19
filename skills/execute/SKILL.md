---
name: execute
description: Execute a forge-sdd plan — subagent dispatch (default) with escalation to agent teams for tagged phases. Integrates native plan mode for the execute gate and per-task stakes-3 approvals. Replaces superpowers:executing-plans for forge-sdd flows.
---

# forge-sdd Execute

Fork of `superpowers:executing-plans`. Retains: task-by-task discipline, verification before completion, TDD adherence. Adds: workstream-aware dispatch, native-plan-mode gate at entry, agent-teams integration for tagged phases, per-workstream worktrees inside team phases.

**Announce at start:** "I'm using the forge-sdd:execute skill to run the plan."

## Preflight

1. **Load state and artifacts.**
   ```ts
   const state = await readState(projectRoot, sessionId);
   const plan = parsePlan(await readFile(state.plan_path, "utf8"));
   const decisions = state.decisions_path ? await readDecisions(projectRoot, sessionId) : [];
   ```
2. **Git state check.** Working tree must be clean, or user must confirm a stash. Abort otherwise.
3. **Native plan mode gate.** Call `EnterPlanMode` and present a summary proposal:
   - Phase count, workstream count, task count
   - Stakes-3 task list with titles
   - Team phases and team size
   - Estimated commit count (one per non-skip task)
   The user approves natively. Rejection returns to the plan-review checkpoint (no execution).
4. **Worktree setup.** Unless `--no-worktree` flag is set, invoke `superpowers:using-git-worktrees` to open a plan worktree. Branch name: `sdd/<plan-slug>`. Record `worktree_path` in state.
5. Update state: `stage: executing`, `started_at`.

## Phase dispatch

Phases run sequentially. For each phase, branch on `phase.execution`:
- `subagent` → subagent dispatch path (this skill, section below)
- `team` → agent-teams path (see "Team phase dispatch" section)
