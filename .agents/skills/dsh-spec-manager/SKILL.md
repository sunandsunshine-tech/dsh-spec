---
compatibility: Node 22.19+ or 24+; git for the archive seal, the pairing hashes and the change scope; no runtime dependencies; the GitHub CLI (`gh`) is needed only by install and upgrade.
description: 'Use when adopting the dsh development pattern in a project, or when an adopted project changes its skill set: initialize the root AGENTS.md and the Agent Note tree; install, update or remove the skill set at the ref the manager itself was installed from; read each installed ref from its metadata; choose the norms the project applies, and list, explain or update them; or run the checks the project owes. It owns project setup and the skill set, and reports what it could not determine.'
license: MIT
metadata:
    github-path: skills/dsh-spec-manager
    github-ref: refs/heads/refactor/manager-package
    github-repo: https://github.com/sunandsunshine-tech/dsh-spec
    github-tree-sha: a2b5dd976a8fcb09d97cb03725723e643d9782f3
name: dsh-spec-manager
---
# Managing an adopted project

This is the one skill of the set that a project installs by hand. Everything else arrives through it, at one revision, listed in its manifest. It owns the project's setup and the skill set — adoption, the files adoption writes, the checks an adopted project runs, and a report of what it could not determine — and it applies when a project is adopted, when an adopted project's skill set changes, or when the checks the project owes are run.

**`scripts/` here is the collection's engine, not this skill's private resources.** The other skills ship their `SKILL.md` and `references/` and no code at all, so a gate's bug is a bug in the collection rather than in the workflow this file describes; file it against the gate, and change it where every skill's checks already live.

## Install, update and inspect

`install` runs before any other skill: the standing orders and the decision-record tree have to exist before an agent has anywhere to record a decision. The same entry point then upgrades and removes the skills, and `status` reports each installed skill against the manager's own revision.

Read [`manager-lifecycle.md`](references/manager-lifecycle.md) before `install`, `upgrade`, `uninstall` or `status`: it owns the manifest's fields, the revision the set is installed at, the self-update behind `upgrade`, the engine directory, and the boundaries this skill keeps.

**One skill of the set is optional.** `dsh-agent-team-workflow` is installed only when a terminal answer or `--with dsh-agent-team-workflow` asks for it. An install with a terminal behind it asks about each optional skill and installs the ones answered yes; a shell without one — an agent's — names the flag instead, so the question belongs to the conversation before `install` runs and the answer travels as the flag. A refresh never asks: the optional skills a project already holds follow the revision, and the ones it never took stay uninstalled.

## What adoption writes

Adoption creates the project's standing orders, the decision-record tree with its contracts, the documentation folder and its empty vocabulary table, and the marked blocks inside the root `AGENTS.md`. It writes over no file it did not create, and a refresh creates nothing a project deleted on purpose. The delivery-plan tree and its hook belong to the optional workflow skill, so a project that leaves that skill out carries neither.

Read [`manager-install.md`](references/manager-install.md) when adopting a project, or when the question is what a project owns after an install: it is the file-by-file account, the project's own surfaces, and the initializer's flags.

## Checks and gates

The collection's engine answers to one entry point: a change's checks are selected by its paths or by `--base`, the tree checks take `--all`, and every run prints one line per subject. Before a push, run the smallest evidence the change owes rather than the whole suite.

Read [`cli.md`](references/cli.md) when a command's verbs, scope, flags or an example are needed: it is the same text `--help` prints, rendered from `--help --markdown`, so it cannot drift from what a reader sees in a terminal.

The norms are a catalogue rather than a fixed rulebook: `references/norms.json` is the data, `norms list` renders it, and `norms install` writes a project's selection into the project's own tree, where the project may edit it. `install` and `upgrade` report what a revision moves and never write those files.

## The boundary with notes and plans

The decision-record contract belongs to [`dsh-archive-agent-notes`](../dsh-archive-agent-notes/SKILL.md), and the evidence a change owes belongs to [`dsh-pre-push-checks`](../dsh-pre-push-checks/SKILL.md). Neither is restated here: this skill installs the notes tree and the delivery-plan surface, and owns the rules of neither. A delivery's plan and its working copy are working documents in the project's tree, deleted when the branch is folded; the contract above them is the plans README under `.agents/dsh-spec/plans/`, installed with the optional workflow skill.

Read [`upstream-notices.md`](references/upstream-notices.md) when the set has been installed away from this repository and the notice the copy carries matters: it is the upstream licence text an install brings with it, since the copy does not carry the repository around it.
