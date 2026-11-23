# PR #122 workspace-boundary evidence

This run evaluates `workspace-boundaries-expose-reverse-edge` against the current
`dsh-spec-pr-description` skill tree.

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-pr-description \
  --scenario workspace-boundaries-expose-reverse-edge \
  --output tests/skill-evals/evidence/2026-11-23-pr122/dsh-spec-pr-description/workspace-boundaries-expose-reverse-edge \
  --sandbox workspace-write \
  --replace
```

| Scenario | Assertions | Status | Time |
|---|---:|---|---:|
| `workspace-boundaries-expose-reverse-edge` | 6/6 | pass | 45.90 s |

The response compares base and current manifests, names the affected responsibilities, records the
added `app → core` and removed `app → legacy` edges, preserves the existing `core → app` reverse
edge, and shows the cycle rather than hiding it behind a composition-only explanation.

The retained scenario hash is
`dd9ed325c19e97d048622bdc6557f7205b23c30cdba09d6adfbd37a691762b2d`. The complete current skill
manifest is:

```text
3601f5dd3a09fcc6a8ed73754c6532efccd8d16f5072930616e0828349e0803c  skills/dsh-spec-pr-description/SKILL.md
ca2eb8b691b2a704e3358f6e7648b37211e2a8c660f58c56c8cc6fcd0d147ec1  skills/dsh-spec-pr-description/THIRD_PARTY_NOTICES
3770ecf19f4e6f091801fe54cf35b876d75afcadbcaccafdd01c138f46cd0cb0  skills/dsh-spec-pr-description/references/ai-usage.md
b23492dbbbbfe0c95f85e9c696e6413b5ff27a3a5b176c65ef6296dbd1295e57  skills/dsh-spec-pr-description/references/default-conventions.md
```

Its aggregate SHA-256, without a trailing newline, is
`2983e0947da0b008168ec1c4f4d347deacaca5bdddb61100204dc4259c527194`. The trace has one
completed turn and 16 completed command records, remains answer-blind, and produced no project
changes.
