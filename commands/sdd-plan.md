---
description: Author an implementation plan from a forge-sdd spec (or bring-your-own spec)
---

The user has invoked `/sdd-plan`.

Resolve input:
- If arguments contain a `--spec <path>` flag: standalone mode. Invoke `forge-sdd:write-plan` with that spec path.
- If arguments contain a session id: resume mode. Read `.forge-sdd/sessions/<id>/state.json` and invoke `forge-sdd:write-plan`.
- If neither: look for the most recently modified session in `.forge-sdd/sessions/` that has `stage: brainstorm` or `stage: plan`. If found, use it. Otherwise, tell the user to either run `/sdd-brainstorm` first or supply `--spec <path>`.

Invoke `forge-sdd:write-plan` once input is resolved.
