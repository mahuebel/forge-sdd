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

## Subagent phase dispatch

Use `superpowers:subagent-driven-development` as the sub-skill for this path.

1. **Topological sort** of all tasks across the phase's workstreams by `depends_on`. Produce batches — tasks in batch N can run in parallel; batch N+1 waits for batch N.

2. **Dispatch each batch** in a single Claude turn with parallel Agent tool calls (multiple `Agent` invocations in one message). Each subagent receives a self-contained prompt:

   **Subagent prompt template:**
   ```
   You are executing one task in a forge-sdd plan.

   Task: <id> — <title>
   Files: <files>
   Stakes: <stakes>
   TDD: <tdd mode>
   Implements: <decision ids + excerpted rationale from decisions.json>

   [If UI workstream] Invoke these skills before coding: <default_skills>

   Follow the TDD steps in the plan task body exactly:
   <task body verbatim from plan.md>

   On completion, return: { diff_summary, test_results, commit_sha }.
   ```

3. **On subagent return:** record the commit sha in the plan.md task (append `commit: <sha>` to the task block) and mark task complete.

4. **On subagent failure:** re-dispatch once with accumulated context (error output, previous diff). Max 2 retries per task. After retry exhaustion, stop the phase and surface to the user with the partial state.

5. **Phase-boundary verification.** When all tasks in the phase report complete, invoke `superpowers:verification-before-completion` on the plan worktree: build, typecheck, lint, tests. Do not advance to the next phase on failure.

6. **Update plan.md** with phase status (commit sha for the most recent task, phase completion timestamp). Commit the plan.md update separately: `chore(plan): phase <n> complete`.
