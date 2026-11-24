# dsh-spec

English | [中文](README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![Node](https://img.shields.io/badge/node-24.11%2B%20%7C%2026%2B-339933) [![Release](https://img.shields.io/github/v/release/sunandsunshine-tech/dsh-spec)](https://github.com/sunandsunshine-tech/dsh-spec/releases/latest)

`dsh-spec` is a set of Agent Skills that carry the development pattern the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) team works by: decisions written down, prose kept honest, and skills built by the same procedure they document. A project installs the skills it needs into its own tree.

Skills are either ported from the DeepSeek Harness project or forged for this package. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) carries the provenance, the adapted files and the bundled npm packages.

## Prerequisites

| You need | Used for |
|---|---|
| [Node.js](https://nodejs.org/) 24.11+ on the 24 line, or 26+ | Running the test suite and the checks |
| [Git](https://git-scm.com/) | Cloning the repository, and the check that reads commits |
| [GitHub CLI](https://github.com/cli/cli) (`gh`), with its `skill` command | Installing and updating the skills |

The GitHub CLI ships an agent skill of its own; browse [its repository](https://github.com/cli/cli) to install one.

## Install

Install into the project, not into your home directory, and commit the result. A project-scoped copy puts every collaborator, every agent that discovers the same skills directory and CI on the revision you installed at; a user-scoped copy is per machine and changes only when `gh skill update` runs. At project scope, several agents share `.agents/skills/`; another host may use a different directory. Commit the installed project tree after the first install.

Install each skill with its own `gh skill install` invocation. By default, leave out `--pin`: the CLI installs the latest tagged release, or the default branch when the repository has no tagged release. Pass `--pin <tag-or-commit>` only when the project needs a fixed revision for CI, audit, reproducible builds or another fixed-version requirement.

The commands below use `--dir .agents/skills` for the shared tree. For a host with its own project-scoped directory, install the same skills with `--agent <host>` and omit `--dir`.

### Start with the universal group

The universal collaboration group covers project instructions, decision records, durable prose and document translation and pairing:

```sh
(
  set -e
  for skill in \
    dsh-spec-agent-experience \
    dsh-spec-agents-md \
    dsh-spec-agent-notes \
    dsh-spec-prose-standard \
    dsh-spec-translate-docs
  do
    gh skill install sunandsunshine-tech/dsh-spec "$skill" --dir .agents/skills
  done
)
```

Add individual skills from the other groups when their work enters the project. The [skill-selection guide](docs/choosing-skills.md) explains what each skill adds, why its recommended companions help and which combinations fit common work.

`--all` is available, but it is not the default adoption path. Unrelated skills add selection choices and update obligations without adding capability the project uses.

`gh skill update --all` refreshes unpinned installations. A pinned skill stays at its revision until `gh skill update --unpin` clears the pin.

### Install with an agent

Give your agent these instructions:

> Install `dsh-spec-agent-experience`, `dsh-spec-agents-md`, `dsh-spec-agent-notes`, `dsh-spec-prose-standard` and `dsh-spec-translate-docs` from `sunandsunshine-tech/dsh-spec` with the GitHub CLI into `.agents/skills/`. Run one `gh skill install` command per skill and leave out `--pin`, so each installs the latest tagged release. If I ask for a fixed revision for CI, audit, reproducible builds or another fixed-version requirement, pass that exact tag or commit with `--pin`; never use `--pin latest`. Check the prerequisites above first, and ask me if any of them is missing.

## Choose skills

Each skill is self-contained and installed on its own. Recommended companions are optional additions, not dependencies.

| Adopter need | Skills | Provenance |
|---|---|---|
| **Universal collaboration — start here** | `dsh-spec-agent-experience`, `dsh-spec-agents-md`, `dsh-spec-agent-notes`, `dsh-spec-prose-standard`, `dsh-spec-translate-docs` | DeepSeek Harness; `dsh-spec-agents-md` is forged here |
| **Software change and quality** | `dsh-spec-find-simplifications`, `dsh-spec-code-review`, `dsh-spec-pre-push-checks`, `dsh-spec-error-handling`, `dsh-spec-ci-test-reliability` | DeepSeek Harness |
| **Change descriptions and landing** | `dsh-spec-pr-description`, `dsh-spec-merging-stacked-prs` | DeepSeek Harness |
| **Browser UI evidence** | `dsh-spec-client-ui-ux`, `dsh-spec-record-browser-gif` | DeepSeek Harness |
| **Agent skill authoring** | `dsh-spec-skill-forge` | forged here |

`dsh-spec-agent-notes`, `dsh-spec-client-ui-ux` and `dsh-spec-prose-standard` keep composite names: they incorporate the upstream notes and archive workflows, `dsh-responsive-ui`, and `dsh-trim-cot-leakage`, respectively.

Read [Choosing dsh-spec skills](docs/choosing-skills.md) before adding a specialized group. It owns the group detail, companion explanations, common combinations and capability requirements.

## How the skills fit together

A change that needs a durable reason starts as a decision record: the note states what was decided, what lost and what proves it. Mechanical and local edits need no record. The prose and translation skills keep the text that carries those decisions readable and its language pairs in step. The forge is this package's own authoring mechanism: it turns an idea, a source or an existing skill into a new skill and records the decisions behind it. The review and delivery skills cover the path a change takes from a worktree to a landed branch. Every skill installs alone; where one names another, the name is an optional example.

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
| `docs/` | The maintained bilingual guides for adopter installation and skill selection |
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
- [Choosing dsh-spec skills](docs/choosing-skills.md) — group roles, recommended companions, common combinations and capability requirements.
- [`skills/dsh-spec-skill-forge/SKILL.md`](skills/dsh-spec-skill-forge/SKILL.md) — the skill-authoring entry.
- [The `dsh-spec-agent-notes` skill](skills/dsh-spec-agent-notes/SKILL.md) — the decision-record contract and lifecycle.

## License

This project is released under the MIT License. The full text and copyright line are in [LICENSE](LICENSE); the upstream notices, the adapted files and the bundled npm packages are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
