# forge-sdd

Spec-driven design system for Claude Code. Composes [forge](https://github.com/mahuebel/forge) (visual variations) with [superpowers](https://github.com/superpowersdev/superpowers) (TDD, worktrees, verification) into a brainstorm → plan → execute pipeline.

## Pipeline

1. **Brainstorm** (`/sdd-brainstorm <topic>`) — visual decision-making in forge across UI and architecture questions. Produces a spec and `decisions.json`.
2. **Plan** (auto-advance or `/sdd-plan <spec>`) — workstream-first implementation plan with UI skill defaults and decision cross-references.
3. **Execute** (`/sdd-execute` after plan review) — subagent dispatch by default; agent-teams for phases tagged `execution: team`. TDD, plan worktree, squash-on-merge.

## Prerequisites

- Claude Code ≥ 2.1.32
- Bun ≥ 1.0
- `forge` plugin installed
- `superpowers` plugin installed
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (only if using team phases)

## Install

```bash
/plugin marketplace add mahuebel/forge-sdd
/plugin install forge-sdd@forge-sdd-marketplace
```

## Quick start

```
/sdd-brainstorm auth redesign with refresh tokens
```

See [docs/USAGE.md](docs/USAGE.md) for the full flow and resume patterns.

## License

MIT
