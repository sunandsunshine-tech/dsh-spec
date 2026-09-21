---
description: "The smallest local evidence that covers an outgoing diff, and what to do when it fails."
---
# dsh-pre-push-checks

English | [中文](README.zh.md)

## Summary

Run relevant local evidence once before a push. The skill exists to stop the reflex that reaches for the whole repository suite: evidence is selected by the outgoing diff, and a check runs because the change can affect what it covers, not because a push is about to happen. CI owns exhaustive coverage and the platform matrix; the git hooks stay narrow — pre-commit fixes staged lint, checks staged whitespace and guards vendored-source metadata, and pre-push runs only the incremental typecheck.

## When to load it

Load it before pushing, force-pushing, marking a PR ready for review, or claiming that checks pass on a branch; immediately after `gh stack sync` publishes rewritten branches; and after merging a changed base, when the combined scope has to be reassessed. The sole ordering exception is `gh stack sync` itself, which cascades a rebase and a push as one operation and so cannot have local validation placed between rewrite and publication.

## Choosing evidence by surface

Confirm the checkout and branch, verify the live PR base or stack parent, fetch it, and take the scope from `git diff --name-only <verified-base-ref>...HEAD` plus whatever the worktree still holds. Then the narrowest test or purpose-built check that would fail for the regression:

| The change touches | Evidence |
|---|---|
| Module or script behavior | The owning test file, or the focused test inside it; adjacent module tests when a shared contract moved |
| Decision records or doc-linked comments | The note gates, selected by name through the dispatcher |
| A paired document or its translation | `verify-translation-pairing` |
| `skills/` | The gates covering the touched skill, plus this repository's `scripts/verify-skill-structure.ts` |
| Prose a reader arrives at | `verify-md-links`, `verify-md-link-syntax`, `verify-md-metadata` |
| Model-, editor-, CLI- or terminal-visible output | The focused recorded-output scenario or real runnable example that owns the output |
| Manifests, exports, build configuration or entry points | The build gate, the relevant hygiene checks, and a smoke test of the built artifact |
| Real provider or agent behavior | The end-to-end target, when credentials are available — and never print secrets |

When unit coverage is relevant, name both the owning tests and the source scope those tests must prove, and keep the configured thresholds inside the selected scope.

## What it refuses to run

- **No universal local baseline beyond the hooks**, and no repeated passing check merely because a commit or push follows — including a typecheck that would duplicate the pre-push hook.
- **No full local rehearsal** unless the user asks for one, a CI failure is being diagnosed, or the change is so broadly cross-cutting that no narrower set is credible.
- **No raw `--force`.** A standalone history rewrite is published with `--force-with-lease=<branch>:<observed-oid>` against a freshly fetched remote, so concurrent movement aborts the push.
- **No claim that a stack is ready because `gh stack sync` returned.** Every rewritten layer is re-scoped and re-validated against its live base, and the PRs stay unmerged until the selected checks pass.
- **No hiding an uncovered file**: never `--passWithNoTests`, never a lowered threshold, never a narrowed source scope chosen only to make a run green.

## How its checks are run

A gate is code in the collection's one code home, `../dsh-spec-manager/scripts/`; this skill ships prose and no code. It is addressed by name through the dispatcher `run.ts` beside it — never by path — and the dispatcher resolves the name against the gate scripts in that directory, refusing an unknown name instead of skipping it. One gate has no row in the table above on purpose: the credential scan is not selected by path, because any change can introduce a credential, so it rides the aggregate.

```sh
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts verify-agent-note-format --root .
pnpm dlx --allow-build=esbuild tsx@4.22.4 .agents/skills/dsh-spec-manager/scripts/run.ts --all --root .
```

`--all` runs every gate the engine directory holds, fails when one fails, and fails when it holds none — so it is what "the whole check" means, and it belongs before a push or at a milestone while the selected subset runs continuously.

## Read next

- [`SKILL.md`](SKILL.md) — the full selection rules, the failure procedure, and the push and post-sync sequences.
- [`dsh-spec-manager`](../dsh-spec-manager/SKILL.md) — the engine directory, the dispatcher, and the aggregate command this skill selects from.
- [`dsh-prose-standard`](../dsh-prose-standard/SKILL.md) — what the three Markdown gates check, and what remains review's job.
