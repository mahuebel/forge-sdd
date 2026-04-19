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

## Team phase dispatch

1. **Preconditions.** Verify `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set and Claude Code ≥ 2.1.32 (`claude --version`). If either fails, abort with actionable message and halt plan execution.

2. **Workstream worktrees.** For each workstream in the phase, `git worktree add` a branch off the plan worktree. Branch name: `sdd/<plan-slug>/<workstream-id>`. Each workstream's worktree is the `cwd` for its teammate.

3. **Spawn the team.** Request a team with `team_size` (from plan phase header) teammates. Type each teammate via existing subagent definitions — prefer user-scope specialists (`frontend-designer`, `backend-dev`, `test-writer-fixer`); fall back to generic.

4. **Teammate spawn prompt:**
   ```
   You are a teammate in a forge-sdd agent team executing phase <name>.

   Workstream: <id>
   Working directory: <workstream-worktree-path>
   Default skills: <default_skills joined>
   Tasks assigned: <task ids with titles>
   Decision context: <excerpted rationale from decisions.json for each implements:>

   Follow TDD for every task unless tdd: skip. Commit one task at a time
   inside your worktree. When all assigned tasks are done, mark them
   complete on the shared task list and go idle.

   Stakes-3 tasks require plan approval before implementation — plan in
   read-only mode and submit to the lead.
   ```

   Set `require_plan_approval: true` when spawning any teammate that owns a stakes-3 task.

5. **Seed the task list** from the plan's workstream tasks, preserving `depends_on`.

6. **Monitor via hooks** (see Phase 5 hook scripts). `TaskCreated` blocks off-plan tasks; `TaskCompleted` runs workstream-scoped verification; `TeammateIdle` nudges if assigned tasks remain.

7. **Phase end.** For each workstream: `git merge --squash sdd/<plan-slug>/<workstream-id>` into the plan worktree branch, commit with message `feat(<workstream-id>): <phase name>`, remove the workstream worktree. Then clean up the team (lead runs cleanup).

8. **Phase verification** on the plan worktree: build, typecheck, lint, tests.

## Plan completion

When all phases are green:
1. Invoke `superpowers:finishing-a-development-branch`. User picks merge / PR / keep-branch.
2. Update state: `stage: done`, `completed_at`, `final_commit` from the branch head.

## Failure recovery

- Subagent failure: retry once, then halt. State preserves mid-plan position.
- Team failure: lead messages the failing teammate or spawns replacement. On repeated failure, tear down team, checkpoint in plan.md, exit to main session.
- Session crash: `--resume <session-id>` re-reads state, re-enters worktree, skips completed tasks (per plan.md status), respawns teams if a team phase was in progress (teams don't survive `/resume` per docs).
