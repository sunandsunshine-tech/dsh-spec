# dsh-spec

English | [中文](README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![Node](https://img.shields.io/badge/node-%E2%89%A5%2022.19-339933) [![Release](https://img.shields.io/github/v/release/sunandsunshine-tech/dsh-spec)](https://github.com/sunandsunshine-tech/dsh-spec/releases/latest)

`dsh-spec` is a set of Agent Skills that carry the development pattern the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) team works by: decisions written down, prose kept honest, and skills built by the same procedure they document. A project installs the skills it needs into its own tree.

Skills are either ported from the DeepSeek Harness project or forged for this package. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) carries the provenance, the adapted files and the bundled npm packages.

## Prerequisites

| You need | Used for |
|---|---|
| [Node.js](https://nodejs.org/) 22.19+ on the 22 line, or 24+ | Running the test suite and the checks |
| [Git](https://git-scm.com/) | Cloning the repository, and the check that reads commits |
| [GitHub CLI](https://github.com/cli/cli) (`gh`), with its `skill` command | Installing and updating the skills |

The GitHub CLI ships an agent skill of its own; browse [its repository](https://github.com/cli/cli) to install one.

## Install

Install into the project, not into your home directory, and commit the result. A project-scoped copy puts every collaborator, every agent and CI run on the revision you installed at; a user-scoped copy is per machine and changes only when `gh skill update` runs. Commit `.agents/skills/` after the first install.

Install each skill on its own. Name a version after `@` — a tag or a commit SHA — to pin it; with no version named the CLI takes the latest tagged release, or the default branch when the repository has no tagged release.

```sh
gh skill install sunandsunshine-tech/dsh-spec dsh-spec-agent-notes --dir .agents/skills
```

Install every skill in the repository with `--all`:

```sh
gh skill install sunandsunshine-tech/dsh-spec --all --dir .agents/skills
```

`gh skill update` refreshes an unpinned install; a pinned skill is skipped until it is unpinned.

### Install with an agent

Give your agent these instructions:

> Install the `dsh-spec` skills from `sunandsunshine-tech/dsh-spec` with the GitHub CLI into `.agents/skills/`. Check the prerequisites above first, and ask me if any of them is missing.

## The skills

Each skill is self-contained and installed on its own; a skill names another only as an availability-qualified example.

### Recording decisions

| Skill | What it is for | Source |
|---|---|---|
| `dsh-spec-agent-notes` | Decision records: when a change needs one, what it records, and how a note moves through `proposed/`, `implemented/` and `rejected/` | dsh |

### Shaping instructions and text

| Skill | What it is for | Source |
|---|---|---|
| `dsh-spec-agent-experience` | Writing prompts — system prompts, tool definitions, skill instructions and multi-step workflows — so their information is discoverable and context is used efficiently | dsh |
| `dsh-spec-agents-md` | Writing `AGENTS.md`: which content belongs there, which becomes a pointer to its owning document, and how scope and updates are settled | this package |
| `dsh-spec-prose-standard` | Durable prose: where text is required, keeping complete propositions while cutting transcripts, and auditing leakage | dsh |
| `dsh-spec-translate-docs` | Keeping a paired document's two sides in step: minimal updates, whole-document translation, and the pairing record and check | dsh |

### Reviewing and delivering a change

| Skill | What it is for | Source |
|---|---|---|
| `dsh-spec-code-review` | Reviewing a proposed change against the project's declared standards, plus the checks code alone cannot show | dsh |
| `dsh-spec-error-handling` | Error handling: failures, recovery, retries, background tasks and user-visible error reports | dsh |
| `dsh-spec-find-simplifications` | Finding evidence-backed simplifications, and writing or consolidating the proposals for them | dsh |
| `dsh-spec-merging-stacked-prs` | Landing dependent GitHub pull requests as one stacked-PR chain | dsh |
| `dsh-spec-pr-description` | Writing a change-request description: why it exists, what it changes, what proves it, and the AI Usage declaration | dsh |
| `dsh-spec-pre-push-checks` | Selecting the smallest tests and checks that cover an outgoing diff before pushing or claiming checks pass | dsh |

### Building a skill set

| Skill | What it is for | Source |
|---|---|---|
| `dsh-spec-skill-forge` | Forging a skill from an idea, a source, or an existing skill: pin the problem and the shape, anchor the domain, build a prototype, and keep the decision record | this package |

## How the skills fit together

A change starts as a decision record: the note states what was decided, what lost and what proves it. The prose and translation skills keep the text that carries those decisions readable and its language pairs in step. The forge is this package's own authoring mechanism: it turns an idea, a source or an existing skill into a new skill and records the decisions behind it. The review and delivery skills cover the path a change takes from a worktree to a landed branch. Every skill installs alone; where one names another, the name is an optional example.

## Working in a project that has them

1. **Decide in a note first.** A change worth recording starts as a record under `proposed/` with the problem, the options that lost and how it will be verified; a conclusion reached in conversation is recorded the same way.
2. **Close the loop with the checks the change owes.** The commands are the project's own; this repository's are listed in [AGENTS.md](AGENTS.md#commands).

## Working on this repository

- **Change the skills, not the installed copies.** Work lands in `skills/`; `.agents/skills/` is refreshed with `pnpm run skill:refresh`, so an edit there is lost.
- **Move the note as the decision ships.** Once a decision lands, its note moves to `implemented/` and speaks in the present tense, in the same change.

| Path | Job |
|---|---|
| `skills/` | The deliverable: the skills, each with its own entry |
| `package/` | Skill script sources, bundled into the work directory before landing |
| `scripts/` | Repository tooling that is not shipped: DCO, corpus gate, vendored notices, the bundle build/verify and refresh |
| `tests/` | The functional suite for the repository tooling and the shipped script contracts |
| `.agents/skills/` | Installed copies an agent loads: written by `gh skill install` or `pnpm run skill:refresh`, so an edit there is lost |
| `.agents/dsh-spec-agent-notes/` | The decision records |
| `.agents/dsh-spec-agents-md/` | Agent-facing detail the root `AGENTS.md` links |
| `.agents/dsh-spec-translate-docs/` | The terminology table the paired documents share |
| `.github/` | Issue templates, the CI workflows and the Dependabot configuration |
| `submodules/dsh/` | The pinned extraction baseline: read it, never edit it |

The commands this repository runs to format, test and check a change are in [AGENTS.md](AGENTS.md#commands).

## Read next

- [AGENTS.md](AGENTS.md) — the rules that hold in every session, and the commands this repository runs.
- [`skills/dsh-spec-skill-forge/SKILL.md`](skills/dsh-spec-skill-forge/SKILL.md) — the skill-authoring entry.
- [The `dsh-spec-agent-notes` skill](skills/dsh-spec-agent-notes/SKILL.md) — the decision-record contract and lifecycle.

## License

This project is released under the MIT License. The full text and copyright line are in [LICENSE](LICENSE); the upstream notices, the adapted files and the bundled npm packages are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
