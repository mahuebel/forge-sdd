---
name: decision-classifier
description: Classify a brainstorming question's decision type and pick a forge rendering style. Use during forge-sdd brainstorm for each question before generating visual variations.
---

# Decision Classifier

Given a question and its candidate answers, decide how it should be rendered as forge variations.

## Classification

Assign one `decision_type`:

- **topology** — the decision is about system shape: service boundaries, data flow, deployment topology, event graph. Render as a diagram (Mermaid or D2) with a rationale panel.
- **library-or-pattern** — choosing a technology, library, algorithm, or design pattern. Render as a decision card: name, one-line summary, pros/cons/risks columns, cost note, 5-10 line code snippet preview.
- **ui** — user-facing interface, component layout, visual styling, interaction flow. Render as a mockup (existing forge UI pattern).
- **cross-cutting** — the decision spans multiple categories (e.g., "auth as service vs library" touches topology + library + deployment). Render as a multi-panel page: diagram + card + code sketch + "what changes if we pick this" blast-radius section.

## Stakes heuristic

Assign `suggested_stakes` 1–3:
- **3** — reversing this decision later requires rewriting multiple modules, a migration, or a public-interface break. Auth boundaries, core data models, deployment topology, dependency direction.
- **2** — reversing affects one module or requires refactoring but not rewrites. Library picks with clean abstractions, internal patterns.
- **1** — easy to change later. Copy tone, padding scale, minor visual choices, internal helpers.

## Output shape

Respond with a single JSON object:

```json
{
  "decision_type": "topology|library-or-pattern|ui|cross-cutting",
  "rendering": "diagram|card|mockup|multi-panel",
  "suggested_stakes": 1|2|3,
  "cluster_id": "<subsystem-slug>"
}
```

The calling skill uses `rendering` to choose HTML template shape and `suggested_stakes` as the default (user can override). `cluster_id` groups related questions for the forge topic structure (`auth`, `data-model`, `deploy`, etc.).
