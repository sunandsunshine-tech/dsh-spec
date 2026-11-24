# Choosing dsh-spec skills

English | [中文](choosing-skills.zh.md)

This guide turns the groups in the project README into an installation choice. `dsh` below means DeepSeek Harness. Every skill installs on its own; a recommended companion is useful for related work, not a required dependency.

## Install model

Install into `.agents/skills/` at project scope and commit the result. The project then shares one reviewed revision with collaborators, agents and CI.

Use one `gh skill install` invocation per skill. Pass the same tag or commit to `--pin` for every skill in an installation so they share one revision. `gh skill update` refreshes unpinned skills only.

```sh
gh skill install sunandsunshine-tech/dsh-spec "<skill>" \
  --pin "<tag-or-commit>" --dir .agents/skills
```

Install the universal group in full at the start. For a specialized group, install only the skills the project's work uses. A specialized group is a curated set for one kind of work, not a runtime dependency bundle that a project must install in full.

Do not begin with `--all`. An unused skill adds a selection choice and an update obligation without adding capability the project uses. The universal group is the deliberate exception: its five responsibilities recur across project instructions, decision records, durable prose and the document pairs that often accompany notes, so the group is installed as one small common baseline.

## Universal collaboration

Install all five skills when the project starts using coding agents. They cover the instructions agents read, durable decisions, text quality and document translation.

| Skill | What it adds | Recommended companions |
|---|---|---|
| `dsh-spec-agent-experience` | Writes or revises prompts, tool definitions, skill entries and multi-step workflows so their information is discoverable and context is used efficiently | `dsh-spec-agents-md`, `dsh-spec-prose-standard` |
| `dsh-spec-agents-md` | Places standing instructions in `AGENTS.md`, with pointers and update boundaries that keep the file current | `dsh-spec-agent-experience`, `dsh-spec-prose-standard` |
| `dsh-spec-agent-notes` | Decides when a non-trivial change needs a durable decision record and maintains its lifecycle | `dsh-spec-prose-standard`, `dsh-spec-translate-docs` |
| `dsh-spec-prose-standard` | Keeps durable documentation, comments, instructions and visible strings complete without transcripts or decoration | `dsh-spec-translate-docs` |
| `dsh-spec-translate-docs` | Keeps translated Markdown pairs in step through minimal updates, whole-document translation and pairing checks | `dsh-spec-prose-standard`, `dsh-spec-agent-notes` |

`dsh-spec-agent-experience` supplies the prompt-discovery rules that `dsh-spec-agents-md` applies to standing instructions. `dsh-spec-agent-notes` gives decisions a durable home; `dsh-spec-prose-standard` keeps that home readable; `dsh-spec-translate-docs` carries a paired home across languages. The five responsibilities meet in ordinary agent work, which is why the group is installed as a unit.

All five skills are ported from dsh except `dsh-spec-agents-md`, which is forged for this package.

## Software change and quality

Add this group when the project changes code and needs repeatable review, evidence and failure handling.

| Skill | What it adds | Recommended companions |
|---|---|---|
| `dsh-spec-find-simplifications` | Finds evidence-backed reductions in code, APIs, tests, prose and maintenance machinery | `dsh-spec-code-review`, `dsh-spec-agent-notes` |
| `dsh-spec-code-review` | Reviews a change against the project's declared standards and the evidence code alone cannot show | `dsh-spec-pre-push-checks`, `dsh-spec-agent-notes` |
| `dsh-spec-pre-push-checks` | Selects the smallest sufficient checks for the outgoing diff before push or review | `dsh-spec-code-review`, `dsh-spec-test-reliability` |
| `dsh-spec-error-handling` | Designs error handling for failures, recovery, retries, background work and user-visible reports across machine boundaries | `dsh-spec-test-reliability`, `dsh-spec-code-review` |
| `dsh-spec-test-reliability` | Designs, reviews, diagnoses and redesigns slow, over-broad or unstable tests around isolation, shared resources, processes and cleanup | `dsh-spec-pre-push-checks`, `dsh-spec-error-handling` |

`dsh-spec-code-review` judges the change; `dsh-spec-pre-push-checks` proves the parts a local check can prove; `dsh-spec-test-reliability` owns the topology behind a slow or unstable test. `dsh-spec-error-handling` covers the failure paths those checks exercise. `dsh-spec-find-simplifications` proposes a reduction, and `dsh-spec-agent-notes` preserves a decision that needs more than the diff.

All five skills are ported from dsh.

## Change descriptions and landing

Add this group when work must be described for review or landed through dependent GitHub PRs. `dsh-spec-pr-description` applies to ordinary change requests; `dsh-spec-merging-stacked-prs` applies only to GitHub's official stacked-PR feature.

| Skill | What it adds | Recommended companions |
|---|---|---|
| `dsh-spec-pr-description` | Writes the change request's motivation, changes, test evidence, disclosures and AI Usage | `dsh-spec-code-review`, `dsh-spec-pre-push-checks` |
| `dsh-spec-merging-stacked-prs` | Lands an official GitHub PR stack as one dependency chain | `dsh-spec-pr-description`, `dsh-spec-pre-push-checks` |

`dsh-spec-code-review` supplies review findings, and `dsh-spec-pre-push-checks` supplies the evidence boundary the description must report. For a stack, `dsh-spec-pr-description` describes each layer while `dsh-spec-merging-stacked-prs` keeps the landing operation on GitHub's official stack mechanism.

Both skills are ported from dsh.

## Browser UI evidence

Add this group to projects that render a browser UI and accept user-visible changes.

| Skill | What it adds | Recommended companions |
|---|---|---|
| `dsh-spec-client-ui-ux` | Scopes affected consumers and states, inspects the real rendered result and reports evidence gaps | `dsh-spec-browser-gif-evidence`, `dsh-spec-code-review`, `dsh-spec-pre-push-checks` |
| `dsh-spec-browser-gif-evidence` | Captures, encodes, verifies and optionally publishes GIF evidence from one isolated run of the real build | `dsh-spec-client-ui-ux` |

`dsh-spec-client-ui-ux` decides what the rendered change must demonstrate; `dsh-spec-browser-gif-evidence` turns a user-visible browser interaction into verified evidence. `dsh-spec-code-review` and `dsh-spec-pre-push-checks` remain the implementation-review and local-evidence layers. Each skill reports the capability that prevents its own evidence instead of claiming visual completion; the media tools needed to encode a GIF do not prevent a project-declared screenshot review.

Both skills are ported from dsh.

## Agent skill authoring

Install this skill when the project creates, rewrites, migrates or checks Agent Skills.

| Skill | What it adds | Recommended companions |
|---|---|---|
| `dsh-spec-skill-forge` | Forges or revises an Agent Skill from an idea, source or existing skill and records the decisions behind it | `dsh-spec-agent-experience`, `dsh-spec-prose-standard`, `dsh-spec-agent-notes`, `dsh-spec-translate-docs` |

`dsh-spec-agent-experience` shapes the prompt surface; `dsh-spec-prose-standard` controls durable text; `dsh-spec-agent-notes` records the forging decisions; `dsh-spec-translate-docs` keeps any paired documentation in step. The forge owns the authoring procedure that coordinates them.

`dsh-spec-skill-forge` is forged for this package.

## Common combinations

| Work | Baseline | Work-specific group |
|---|---|---|
| Agent-assisted project work | Universal collaboration | Software change and quality when the work changes code |
| Ordinary software change with a PR | Universal collaboration | `dsh-spec-pr-description`, plus software change and quality for the implementation. Do not add `dsh-spec-merging-stacked-prs` unless the work uses GitHub's official stacked-PR workflow |
| Official stacked PR chain | Universal collaboration | `dsh-spec-pr-description` and `dsh-spec-merging-stacked-prs`, plus software change and quality for each layer's evidence |
| Browser UI change | Universal collaboration | Browser UI evidence, plus software change and quality for implementation review |
| Agent skill authoring | Universal collaboration | Agent skill authoring |

## Capability requirements

The requirements below supplement the global prerequisites in the project README.

- `dsh-spec-merging-stacked-prs` requires GitHub's official stacked-PR feature, `gh stack`, and head branches in the same repository.
- `dsh-spec-client-ui-ux` requires a way to run and inspect the affected UI, or an explicit handoff naming the missing scene or capability.
- `dsh-spec-browser-gif-evidence` requires Node.js 24.11+ on the 24 line or 26+, Git, `ffmpeg`, `ffprobe`, a runnable build and browser control or a project-declared Playwright setup. GitHub attachment also requires `gh` on `github.com` with write access.
- `dsh-spec-translate-docs` uses its bundled Node script for pairing checks. Installing it does not require every document to have a counterpart.

## Skip rules

| Situation | Do not install |
|---|---|
| The project has no browser UI | `dsh-spec-client-ui-ux`, `dsh-spec-browser-gif-evidence` |
| The project does not use GitHub stacked PRs | `dsh-spec-merging-stacked-prs` |
| The project does not author Agent Skills | `dsh-spec-skill-forge` |
| The project has no structured tool, service or process failures under review | `dsh-spec-error-handling` |

A skill remains usable when a recommended companion is absent; its instructions either complete through the project's equivalent mechanism or record the missing capability.
