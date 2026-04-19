# Plan: sample
Spec: /tmp/spec.md  |  Decisions: /tmp/decisions.json  |  Coverage: 1/1

## Phase 1 — setup
execution: subagent

### Workstream: schema
worktree: default
tasks:
  - id: t-001
    title: Add users table migration
    implements: [d-004]
    stakes: 2
    tdd: auto
    files: [migrations/, db/schema.ts]

### Workstream: auth-service
worktree: default
tasks:
  - id: t-002
    title: Event-sourced session store
    implements: [d-003]
    stakes: 3
    tdd: auto
    require_plan_approval: true
    files: [services/auth/session.ts]
    depends_on: [t-001]

## Phase 2 — UI
execution: team
team_size: 3

### Workstream: login-flow
worktree: required
default_skills: [frontend-design, ui-ux-pro-max]
tasks:
  - id: t-010
    title: Login screen
    stakes: 1
    tdd: skip
    files: [app/login.tsx]
